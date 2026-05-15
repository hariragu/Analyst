---
name: value-screener
description: Screens an equity market (India, US, etc.) to surface high-quality value picks using a senior-analyst methodology — quantitative quality and valuation gates, qualitative moat checks, and a macro overlay. Use when the user asks to "screen for value", "find value picks", "build a watchlist", "give me high-quality stocks", "what to buy in India / US", or "filter the market for compounders at reasonable prices". Outputs a structured screen JSON that drops into the Analyst site at data/screens/<id>.json and adds pending tickers to data/index.json.
---

# Value Screener — Senior Analyst Playbook

Build a curated watchlist of 8–15 high-quality businesses available at reasonable prices, using the same lens that the `value-analyst` skill expects downstream. **Be honest, not clever.**

## When to invoke

Trigger phrases the user may use:
- "screen for value in [market]"
- "find me value picks"
- "build a watchlist of high-quality [Indian/US/EU] stocks"
- "what would you buy in [market] right now?"
- "filter for compounders at reasonable price"

## Output

Produce one JSON file at `data/screens/<screen-id>.json` and update `data/index.json` so the picks appear in the site picker with `status: "screened"`.

## Methodology (five-phase funnel)

### Phase 1 — Universe Definition
- **India:** NSE 500 (broad enough; excludes microcap governance risk)
- **US:** S&P 1500
- **Europe:** STOXX 600
- **Exclude:** microcaps (< $300M / ₹2,000Cr), recent IPOs (< 3 years), companies with ongoing regulatory enforcement actions.

### Phase 2 — Quantitative Quality Gates (must pass ALL)
| Metric | Threshold | Notes |
|---|---|---|
| ROE (3y avg) | > 15% | Capital efficiency |
| ROCE | > 18% | True return on capital (skip for banks) |
| Debt / Equity | < 1.0 | Ex-banks/NBFCs |
| FCF positive | 3 of last 5 years | Real cash generation |
| Earnings growth | > 8% CAGR (3y) | Going concern |
| Promoter / Insider holding | > 25% **or** institutional > 60% | Skin in game |
| Promoter pledging | < 25% of holding | Governance flag |
| Audit qualifications | None in last 3 yrs | |

### Phase 3 — Valuation Gates (must satisfy ≥ 3 of 5)
- P/E < 1.3 × sector median
- PEG < 1.5
- EV/EBITDA < 18× (sector-adjusted)
- FCF yield > 3%
- P/B < 5× (ex asset-light businesses where TBV is not meaningful)

### Phase 4 — Qualitative Moat Check (analyst judgment)
- **Moat type:** brand / network / switching cost / regulatory / scale / IP
- **Management:** > 10 years track record, honest communication (read 3 annual letters), capital-allocation discipline (buybacks > dilution, sensible M&A only)
- **Industry:** not commoditizing rapidly; not at peak cycle multiples
- **Governance:** no related-party transaction abuse, no minority-squeeze patterns

### Phase 5 — Macro & Thematic Overlay
- Avoid sectors trading at peak-cycle multiples (e.g., capital goods at 60–80× in India 2026; defense PSUs at 50×).
- Tilt toward sectors with under-investment that could re-rate.
- Diversify across 6–8 sectors in the final list.
- Honest "what to avoid right now" call-out is required.

## Process steps

1. **Define market + as-of date.**
2. **Pull a snapshot** of universe metrics (from `stockanalysis.com`, `screener.in`, etc.) — or rely on encoded analyst knowledge if data fetch is slow.
3. **Apply Phases 2–3** to shortlist ~30–60 names.
4. **Apply Phase 4** (qualitative) to narrow to ~15–25.
5. **Apply Phase 5** (macro) to pick the final 8–15 with sector balance.
6. **Write the screen JSON** following the schema below.
7. **Update `data/index.json`** — for each pick, append a minimal entry with `status: "screened"`.
8. **Document deliberate exclusions** (what hot themes you skipped and why). This is the analyst's tell of honesty.

## Schema — `data/screens/<id>.json`

```json
{
  "id": "india-value-2026-05",
  "title": "India · Value & Quality Picks · May 2026",
  "market": "India (NSE)",
  "asOf": "2026-05-15",
  "analystVoice": "Senior value analyst, Khandelwal lens",
  "universe": "NSE 500",
  "methodologyNote": "Five-phase funnel: universe → quality gates → valuation gates → qualitative moat → macro overlay.",
  "filters": {
    "quality":   ["ROE > 15% (3y)", "ROCE > 18%", "D/E < 1 (ex-banks)", "FCF+ in 3/5 yrs", "Promoter > 25% or Inst > 60%"],
    "valuation": ["P/E < 1.3× sector", "PEG < 1.5", "EV/EBITDA < 18× (sector-adj)", "FCF yield > 3%"],
    "qualitative": ["Durable moat", "Mgmt > 10 yrs", "Honest letters", "Capital-allocation discipline"]
  },
  "exclusions": [
    { "theme": "Defense PSUs at 50× P/E", "reason": "Peak-cycle multiples; consensus crowded trade" },
    { "theme": "Capital goods at 60–80× (ABB, Siemens India)", "reason": "Pricing-in flawless execution for a decade" },
    { "theme": "New-age tech (Paytm, Nykaa, Zomato)", "reason": "No durable moat at current scale; not yet value" },
    { "theme": "Small-cap manufacturing momentum", "reason": "Broker-driven; quality of earnings unproven" }
  ],
  "picks": [
    {
      "ticker": "HDFCBANK",
      "name": "HDFC Bank Ltd.",
      "exchange": "NSE",
      "sector": "Banks · Private",
      "logoText": "H",
      "logoFrom": "#1e3a8a",
      "logoTo": "#06b6d4",
      "thesis": "India's best banking franchise; post-merger ROA normalising back to 1.9%+.",
      "valueAngle": "Available at ~2.5× P/B vs historical 3.5×; re-rating play as merger overhang clears.",
      "priorityRank": 1
    }
  ]
}
```

## Schema — entry in `data/index.json` for each pick

```json
{
  "ticker": "HDFCBANK",
  "name": "HDFC Bank Ltd.",
  "exchange": "NSE",
  "sector": "Banks · Private",
  "logoText": "H",
  "logoFrom": "#1e3a8a",
  "logoTo": "#06b6d4",
  "status": "screened",
  "screenId": "india-value-2026-05",
  "thesis": "Best private bank; post-merger ROA recovering.",
  "valueAngle": "Available at ~2.5× P/B vs historical 3.5×."
}
```

(Analyzed entries have `status: "analyzed"` plus the full snapshot/verdict fields the picker already uses.)

## Quality bar for output
- **Be opinionated.** No "balanced views" that hide behind hedging.
- **Be diversified.** No more than 2 names from the same sub-sector.
- **Be specific.** Each pick gets a one-line thesis + a one-line value angle (why now).
- **Write what you excluded.** This is your honesty signal.
- **Rank picks by priority** (1 = highest conviction).

## After producing the screen
- Commit with message: `Screen: <market> · <date> · <N> picks`
- Inform user the picks now appear in the picker as "Pending deep dive" and offer to invoke `value-analyst` per ticker.
