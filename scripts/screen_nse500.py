"""
Systematic India NSE 500 value screener.

Pipeline:
  Stage 1: Pull NIFTY 500 list (universe = official NSE 500 by mkt cap).
  Stage 2: Use yfinance to fetch fundamentals for each (<TICKER>.NS).
  Stage 3: Save raw snapshot for downstream filtering.

Output: data/screens/raw/nse500-snapshot.json
"""
import csv
import json
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "screens" / "raw"
RAW.mkdir(parents=True, exist_ok=True)


def fetch(args):
    symbol, name, industry = args
    try:
        t = yf.Ticker(f"{symbol}.NS")
        info = t.info or {}
        if not info or not info.get("marketCap"):
            return None
        mkt_cap_cr = (info.get("marketCap") or 0) / 1e7
        roe = info.get("returnOnEquity")
        de = info.get("debtToEquity")
        dy = info.get("dividendYield")
        return {
            "ticker": symbol,
            "name": name,
            "industry": industry,
            "sector": info.get("sector"),
            "yf_industry": info.get("industry"),
            "mkt_cap_cr": round(mkt_cap_cr, 1),
            "price": info.get("currentPrice"),
            "pe": info.get("trailingPE"),
            "fwd_pe": info.get("forwardPE"),
            "pb": info.get("priceToBook"),
            "ev_ebitda": info.get("enterpriseToEbitda"),
            "roe_pct": round(roe * 100, 1) if isinstance(roe, (int, float)) else None,
            "de": de,
            "div_yield_pct": dy if isinstance(dy, (int, float)) else None,
            "fcf": info.get("freeCashflow"),
            "op_margin_pct": (info.get("operatingMargins") or 0) * 100 if info.get("operatingMargins") else None,
            "profit_margin_pct": (info.get("profitMargins") or 0) * 100 if info.get("profitMargins") else None,
            "rev_growth_pct": (info.get("revenueGrowth") or 0) * 100 if info.get("revenueGrowth") else None,
            "earn_growth_pct": (info.get("earningsGrowth") or 0) * 100 if info.get("earningsGrowth") else None,
            "beta": info.get("beta"),
            "52w_low": info.get("fiftyTwoWeekLow"),
            "52w_high": info.get("fiftyTwoWeekHigh"),
        }
    except Exception as e:
        return {"ticker": symbol, "name": name, "industry": industry, "error": str(e)[:120]}


def main():
    csv_path = RAW / "nifty500-list-2026-05.csv"
    if not csv_path.exists():
        print(f"ERROR: {csv_path} not found", file=sys.stderr)
        sys.exit(1)
    universe = []
    with open(csv_path, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            sym = (r.get("Symbol") or "").strip()
            if not sym:
                continue
            universe.append((sym, r.get("Company Name", "").strip(), r.get("Industry", "").strip()))
    print(f"Universe: {len(universe)} NSE 500 companies", flush=True)

    results = []
    errors = []
    started = time.time()

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(fetch, u): u for u in universe}
        done = 0
        for fut in as_completed(futures):
            r = fut.result()
            done += 1
            if r and "error" not in r:
                results.append(r)
            elif r:
                errors.append(r)
            if done % 25 == 0:
                elapsed = time.time() - started
                print(f"  ... {done}/{len(universe)} | parsed={len(results)} | err={len(errors)} | {elapsed:.0f}s", flush=True)

    elapsed = time.time() - started
    print(f"\nFetched {len(results)}/{len(universe)} in {elapsed:.0f}s. Errors: {len(errors)}", flush=True)

    out = RAW / "nse500-snapshot.json"
    out.write_text(json.dumps({
        "asOf": time.strftime("%Y-%m-%d"),
        "source": "yfinance (Yahoo Finance)",
        "universe": len(universe),
        "parsed": len(results),
        "errors": errors[:30],
        "rows": results,
    }, indent=2), encoding="utf-8")
    print(f"Saved snapshot -> {out}", flush=True)


if __name__ == "__main__":
    main()


