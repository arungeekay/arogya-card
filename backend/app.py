"""AROGYA CARD backend (BUILD_SPEC §6.2) — Track 3 MSME alt-data health score.

Orchestrates the mock data-source services into a five-vital health card, unified score, bucket,
confidence and Verification Triangle. Every score carries reason codes; thin files get low
confidence and REFER, never an automatic NO-GO.
"""

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from core.serving import get_bundle
from core.serving.webapp import create_app, mount_frontend, register_warmup
from core.models.arogya_score import score_arogya, AROGYA_PILLARS
from core.models.triangle import verification_triangle
from core.llm import generate
from .mock_services import router as mock_router, LATENCY_S

app: FastAPI = create_app("AROGYA CARD API", "AROGYA")
register_warmup(app, "AROGYA")
app.include_router(mock_router)
_FRONTEND = os.environ.get("FRONTEND_DIR", str(Path(__file__).resolve().parents[1] / "frontend" / "dist"))


def B():
    return get_bundle()


class ScoreRequest(BaseModel):
    gstin: str


class WhatIfRequest(BaseModel):
    gstin: str
    margin_uplift: float = 0.0        # e.g. +0.10 = assume 10% better margins
    seasonality_smoothing: float = 0.0  # 0..1 dampen seasonal dips


def _resolve(gstin: str):
    b = B()
    bid = b.gstin_to_borrower.get(gstin, gstin)
    if bid not in b.borrowers.index:
        raise HTTPException(404, f"no applicant for {gstin}")
    return b, bid


def _score_payload(b, bid: str) -> dict:
    row = b.borrowers.loc[bid]
    g = b.msme_group(bid)
    sc = score_arogya(row, g)
    tri = verification_triangle(row, g)
    pillars = sc["pillars"]
    # reason codes: weakest pillars + any broken triangle side
    ranked = sorted(pillars.items(), key=lambda kv: kv[1])
    reasons = [f"{name}: {val:.0f}/100 ({'weak' if val < 55 else 'moderate' if val < 72 else 'strong'})"
               for name, val in ranked]
    for s in tri["sides"]:
        if s["verdict"] == "anomaly":
            reasons.insert(0, s["hypothesis"])
    sanctioned_limit = float(row.sanctioned_limit)
    return dict(
        gstin=b.gstin_to_borrower and next((k for k, v in b.gstin_to_borrower.items() if v == bid), bid),
        borrower_id=bid, name=row["name"], sector=row.sector, city=row.city, state=row.state,
        vitals=[dict(name=k, value=v) for k, v in pillars.items()],
        unified_score=sc["unified_score"], bucket=sc["bucket"], confidence=sc["confidence"],
        thin_file=sc["thin_file"], coverage_months=sc["coverage_months"],
        triangle=tri, reason_codes=reasons,
        sanctioned_limit=sanctioned_limit,
        # ₹ money moment: exposure the Triangle protects (fraud) or the alt-data unlocks (thin file)
        exposure_at_risk=round(sanctioned_limit, 2) if tri["overall"] == "broken" else 0.0,
        exposure_unlocked=round(sanctioned_limit, 2) if (sc["thin_file"] and sc["bucket"] != "NO-GO") else 0.0,
    )


@app.post("/api/score")
async def score(req: ScoreRequest):
    b, bid = _resolve(req.gstin)
    # simulate orchestration latency across the four sources (they'd run concurrently)
    await asyncio.sleep(LATENCY_S)
    payload = _score_payload(b, bid)
    payload["sources_called"] = ["GSTN", "Account Aggregator", "Electricity Board", "EPFO"]
    return payload


@app.get("/api/cluster/{sector}/{city}")
def cluster(sector: str, city: str):
    """Applicant-vs-peer percentile per vital for a sector+city cluster (BUILD_SPEC §6.3)."""
    b = B()
    peers = b.borrowers[(b.borrowers.sector == sector) & (b.borrowers.city == city)]
    if len(peers) < 3:
        peers = b.borrowers[b.borrowers.sector == sector]
    vitals_by_peer = []
    for bid in peers.borrower_id:
        sc = score_arogya(b.borrowers.loc[bid], b.msme_group(bid))
        vitals_by_peer.append(sc["pillars"])
    dist = {p: np.array([v[p] for v in vitals_by_peer]) for p in AROGYA_PILLARS}
    return dict(sector=sector, city=city, peer_count=len(peers),
                percentiles={p: dict(p25=round(float(np.percentile(a, 25)), 1),
                                     p50=round(float(np.percentile(a, 50)), 1),
                                     p75=round(float(np.percentile(a, 75)), 1)) for p, a in dist.items()})


@app.post("/api/whatif")
def whatif(req: WhatIfRequest):
    b, bid = _resolve(req.gstin)
    base = _score_payload(b, bid)
    # apply optimistic assumptions to the turnover/cashflow vitals and recompute unified
    adj = {v["name"]: v["value"] for v in base["vitals"]}
    adj["Turnover Pulse"] = min(100, adj["Turnover Pulse"] * (1 + req.margin_uplift))
    adj["Cash-flow Discipline"] = min(100, adj["Cash-flow Discipline"] + 15 * req.seasonality_smoothing)
    from core.models.arogya_score import PILLAR_WEIGHTS
    new_unified = int(round(10 * sum(PILLAR_WEIGHTS[k] * v for k, v in adj.items())))
    return dict(base_score=base["unified_score"], adjusted_score=new_unified,
                delta=new_unified - base["unified_score"],
                assumptions=dict(margin_uplift=req.margin_uplift, seasonality_smoothing=req.seasonality_smoothing),
                explanation="Recomputed with the officer's margin / seasonality assumptions applied to "
                            "the Turnover and Cash-flow vitals.")


@app.post("/api/appraisal-note/{gstin}")
def appraisal_note(gstin: str):
    b, bid = _resolve(gstin)
    p = _score_payload(b, bid)
    row = b.borrowers.loc[bid]
    prescription = None
    if p["thin_file"]:
        prescription = generate("prescription", dict(
            name=row["name"], confidence=p["confidence"], bucket=p["bucket"],
            steps=[dict(text="Add 3 more months of GST filings", gain=14),
                   dict(text="Grant 6-month Account-Aggregator consent", gain=12)],
            projected_confidence=min(0.97, p["confidence"] + 0.28)), product="AROGYA")
    text = generate("appraisal_note", dict(
        name=row["name"], sector=row.sector, city=row.city,
        score=p["unified_score"], bucket=p["bucket"], confidence=p["confidence"],
        pillars=[dict(name=v["name"], value=v["value"]) for v in p["vitals"]],
        triangle_summary=p["triangle"]["summary"],
        assessment=("Behavioural signals are internally consistent." if p["triangle"]["overall"] == "closed"
                    else "Verification Triangle anomaly detected — corroborate before sanction."),
        refer_reason=("Thin file — corroborate with additional data (see prescription)." if p["thin_file"] else None),
    ), product="AROGYA")
    return dict(document_type="Credit appraisal note", gstin=gstin, text=text, prescription=prescription)


@app.get("/api/demo-applicants")
def demo_applicants():
    """The scripted AROGYA cast with their GSTINs, for one-click demo selection (§9.2)."""
    b = B()
    out = []
    for demo in ("verma", "gupta", "nisha"):
        rows = b.borrowers[b.borrowers.demo == demo]
        if len(rows):
            bid = rows.index[0]
            gstin = next((k for k, v in b.gstin_to_borrower.items() if v == bid), bid)
            out.append(dict(demo=demo, gstin=gstin, name=rows.iloc[0]["name"],
                            tag={"verma": "clean twin", "gupta": "fraud twin", "nisha": "thin file"}[demo]))
    return dict(applicants=out)


mount_frontend(app, _FRONTEND)
