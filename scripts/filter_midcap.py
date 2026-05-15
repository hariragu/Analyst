"""
Mid-cap value funnel — applies quant gates to the NSE 500 snapshot.

Universe -> mkt-cap band -> quality gates -> shortlist with PASS/FAIL audit.
Outputs:
  data/screens/raw/midcap-funnel-2026-05.json   (full audit trail)
"""
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "screens" / "raw"
SNAP = RAW / "nse500-snapshot.json"


# Mid-cap band: ₹15,000 Cr - ₹75,000 Cr (was 60k; widened so we have enough names)
MIN_MCAP = 15000
MAX_MCAP = 75000

# Quality gates (each row is annotated with pass/fail)
GATES = {
    "mkt_cap_band":  lambda r: r.get("mkt_cap_cr") and MIN_MCAP <= r["mkt_cap_cr"] <= MAX_MCAP,
    "roe_gt_18":     lambda r: (r.get("roe_pct") or 0) > 18,
    "low_debt":      lambda r: r.get("de") is not None and r["de"] < 60,   # yfinance debt/equity is %-ish; <60 ≈ <0.6
    "fcf_positive":  lambda r: (r.get("fcf") or 0) > 0,
    "op_margin_gt15":lambda r: (r.get("op_margin_pct") or 0) > 15,
    "pe_sanity":     lambda r: r.get("pe") is not None and 0 < r["pe"] < 60,
    "not_banking":   lambda r: (r.get("sector") or "").lower() not in {"financial services"} or "bank" not in (r.get("yf_industry") or "").lower(),
}


def grade(r):
    res = {k: bool(g(r)) for k, g in GATES.items()}
    res["_passes"] = sum(res.values())
    res["_total"] = len(GATES)
    res["_all_pass"] = res["_passes"] == res["_total"]
    return res


def main():
    snap = json.loads(SNAP.read_text(encoding="utf-8"))
    rows = snap["rows"]
    print(f"Loaded {len(rows)} rows from {SNAP.name}", flush=True)

    # First, drill into mid-cap band only
    band = [r for r in rows if r.get("mkt_cap_cr") and MIN_MCAP <= r["mkt_cap_cr"] <= MAX_MCAP]
    print(f"Mid-cap band (\u20b9{MIN_MCAP:,}-{MAX_MCAP:,} Cr): {len(band)} companies", flush=True)

    # Grade them all
    graded = []
    for r in band:
        g = grade(r)
        graded.append({**r, "_gates": g})

    # Tier them
    all_pass = [r for r in graded if r["_gates"]["_all_pass"]]
    close = [r for r in graded if r["_gates"]["_passes"] == r["_gates"]["_total"] - 1]

    # Sort all_pass by ROE descending
    all_pass.sort(key=lambda r: r.get("roe_pct") or 0, reverse=True)
    close.sort(key=lambda r: r.get("roe_pct") or 0, reverse=True)

    print(f"\n=== {len(all_pass)} pass ALL gates ===", flush=True)
    for r in all_pass[:30]:
        print(f"  {r['ticker']:<14} | \u20b9{r.get('mkt_cap_cr',0):>8,.0f}Cr | ROE {r.get('roe_pct',0):>5}% | D/E {r.get('de',0):>5} | P/E {r.get('pe') or 0:>6.1f} | OPM {r.get('op_margin_pct') or 0:>5.1f}% | {r.get('sector','')[:18]:<18} | {r.get('yf_industry','')[:36]}", flush=True)

    print(f"\n=== {len(close)} pass all-but-one ===", flush=True)
    for r in close[:30]:
        fails = [k for k, v in r["_gates"].items() if k not in ("_passes", "_total", "_all_pass") and not v]
        print(f"  {r['ticker']:<14} | \u20b9{r.get('mkt_cap_cr',0):>8,.0f}Cr | ROE {r.get('roe_pct',0)}% | failed: {','.join(fails)} | {r.get('yf_industry','')[:36]}", flush=True)

    out = {
        "asOf": time.strftime("%Y-%m-%d"),
        "source": "Yahoo Finance via yfinance",
        "universe": snap["universe"],
        "snapshotRows": len(rows),
        "filters": {
            "mkt_cap_min_cr": MIN_MCAP,
            "mkt_cap_max_cr": MAX_MCAP,
            "roe_pct_min": 18,
            "de_max_pct": 60,
            "fcf": ">0",
            "op_margin_pct_min": 15,
            "pe_max": 60,
            "exclude": "banks (different metric base)",
        },
        "midcap_band_size": len(band),
        "all_pass_count": len(all_pass),
        "close_count": len(close),
        "all_pass": all_pass,
        "close": close,
    }
    out_path = RAW / "midcap-funnel-2026-05.json"
    out_path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"\nSaved -> {out_path}", flush=True)


if __name__ == "__main__":
    main()
