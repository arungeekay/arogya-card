"""Mock external data-source services (BUILD_SPEC §6.1).

These read as real integrations — GST filing history, Account-Aggregator statement, electricity
board, EPFO — with realistic request/response JSON and ~400 ms artificial latency so the vitals
animation lands. In phase 2 these swap to the IDBI sandbox APIs; the response shapes are chosen
to match those contracts. All data is derived from the borrower's synthetic behavioural series.
"""

from __future__ import annotations

import asyncio

from fastapi import APIRouter, HTTPException

from core.serving import get_bundle

router = APIRouter(prefix="/mock", tags=["mock-data-sources"])
LATENCY_S = 0.4


def _borrower_for(identifier: str):
    b = get_bundle()
    bid = b.gstin_to_borrower.get(identifier, identifier)
    if bid not in b.borrowers.index:
        raise HTTPException(404, f"no record for {identifier}")
    return b, bid, b.msme_group(bid), b.borrowers.loc[bid]


@router.get("/gst/{gstin}")
async def mock_gst(gstin: str):
    await asyncio.sleep(LATENCY_S)
    b, bid, g, row = _borrower_for(gstin)
    filings = [dict(period=r.month_date, turnover=round(float(r.gst_turnover), 2),
                    filing_delay_days=int(r.gst_filing_delay_days),
                    status="filed_late" if r.gst_filing_delay_days > 5 else "filed_on_time")
               for r in g.itertuples(index=False)]
    return dict(source="GSTN", gstin=gstin, legal_name=row["name"], sector=row.sector,
                place_of_business=f"{row.city}, {row.state}", filing_count=len(filings), filings=filings)


@router.get("/aa/{gstin}")
async def mock_account_aggregator(gstin: str):
    await asyncio.sleep(LATENCY_S)
    b, bid, g, row = _borrower_for(gstin)
    txns = [dict(month=r.month_date, credits=round(float(r.credits), 2), debits=round(float(r.debits), 2),
                 closing_balance=round(float(r.month_end_balance), 2),
                 inward_returns=int(r.cheque_bounces_inward), outward_returns=int(r.cheque_bounces_outward))
            for r in g.itertuples(index=False)]
    return dict(source="Account Aggregator (Sahamati)", account_ref=gstin, account_holder=row["name"],
                consent_status="ACTIVE", months=len(txns), statement=txns)


@router.get("/electricity/{gstin}")
async def mock_electricity(gstin: str):
    await asyncio.sleep(LATENCY_S)
    b, bid, g, row = _borrower_for(gstin)
    usage = [dict(month=r.month_date, units_kwh=round(float(r.electricity_units), 1)) for r in g.itertuples(index=False)]
    return dict(source="State Electricity Board", consumer_id=f"EB-{bid}", sanctioned_load_kw=round(
        float(row.base_turnover) / 1e5 * 0.5, 1), months=len(usage), consumption=usage)


@router.get("/epfo/{gstin}")
async def mock_epfo(gstin: str):
    await asyncio.sleep(LATENCY_S)
    b, bid, g, row = _borrower_for(gstin)
    hist = [dict(month=r.month_date, employee_count=int(r.epfo_employee_count),
                 contribution_delay_days=int(r.epfo_contribution_delay_days)) for r in g.itertuples(index=False)]
    return dict(source="EPFO", establishment_id=f"EPF-{bid}", establishment_name=row["name"],
                months=len(hist), history=hist)
