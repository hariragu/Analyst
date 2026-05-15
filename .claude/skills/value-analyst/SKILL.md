---
name: value-analyst
description: Performs a deep equity analysis on a single ticker using Vishal Khandelwal's 15-question framework (Business · Management · Price). Use when the user asks to "analyze [TICKER]", "deep-dive on [stock]", "run the 15 questions on [stock]", "do a value analysis of [company]", "is [TICKER] worth owning?", or "add [ticker] to the analyst site". Outputs a complete JSON to data/stocks/<TICKER>.json, updates data/index.json with full snapshot fields, optionally generates Markdown + DOCX reports, commits and pushes.
---

# Value Analyst — Senior Analyst Playbook

Run a thorough, honest equity analysis for a single ticker and ship it to the Analyst site. **Be honest, not clever.** The output is a JSON that drives an immersive analysis page; quality is judged by the quality of thinking, not the length of prose.

## When to invoke

Trigger phrases:
- "analyze [TICKER]" / "deep-dive on [TICKER]"
- "run the 15 questions on [TICKER]"
- "is [TICKER] worth owning?"
- "add [TICKER] to the analyst site"
- "value analysis of [company]"

## The 15 questions

### Section 1 · Business — Do I truly understand it?
1. What does this company actually do? (Explain to a 10-year-old in one plain sentence.)
2. How do they make money, and from whom? (Who pays, for what, at what margin.)
3. Am I pretending to understand it, or do I really?
4. Would I be happy owning this for 10 years if the market shut tomorrow?
5. What could kill this business? (Technology, regulation, changing habits.)

### Section 2 · Management — Can I trust these people with my capital?
1. Would I trust these people to run my family's money?
2. How do they treat minority shareholders when no one is watching?
3. What do their last 10 years of capital allocation tell me?
4. Do they tell the truth in good years and in bad? (Read 3 annual letters.)
5. Do they have real skin in the game, and for how long?

### Section 3 · Price — Am I paying a sensible price?
1. What am I paying today? (P/E, earnings yield, EV/FCF — whichever lens fits.)
2. What is the market implicitly expecting, and do I agree?
3. What would I pay if I were buying the whole business?
4. At what price would I sell, and why? (Decided before I buy, not after.)
5. If this drops 40% next month, do I buy more or panic?

## Process steps

### Step 1 — Data gathering (~10 min)
- TTM and 5-yr financials: revenue, FCF, operating margin, ROE, ROIC, debt, cash. Sources:
  - **US:** `stockanalysis.com/stocks/<ticker>/`, `/statistics/`, `/financials/`, `/financials/balance-sheet/`, `/financials/cash-flow-statement/`
  - **India:** `screener.in/company/<ticker>/`, `tickertape.in`
- Capital allocation: buybacks, dividends, M&A history (last 10 yrs).
- Insider ownership %, founder presence, dual-class structure.
- Read latest **three** shareholder letters or annual report MD&A sections — note honesty signals.
- Read latest 10-K / annual report risk factors.

### Step 2 — Answer the 15 questions honestly
- Quantify what you can; flag what you can't ("~80% understood" is better than fake precision).
- For Q1.2: build the segment table (segment, what's sold, who pays, % rev, take rate, segment margin).
- For Q1.5: build the risk matrix (risk × probability × severity × mitigant).
- For Q2.3: build the capital-allocation timeline (era × move × grade).
- For Q3.1: build the valuation snapshot (P/E, EV/FCF, FCF yield).
- For Q3.3: do a reverse-DCF and a private-market-value estimate.
- For Q3.4: pre-commit price + fundamental + capital-allocation sell triggers.
- For Q3.5: pre-commit "buy or panic if -40%" conditions.

### Step 3 — Synthesize
- 8-dimension scorecard (1–5): Business quality · Durability (10y) · Mgmt quality · Skin in game · Capital allocation · Price today · Price if -40% · Asymmetry.
- One-line verdict.
- Action zones: buy below $X · load below $Y · trim above $Z.
- Position-sizing recommendation.

### Step 4 — Write JSON
Produce a complete `data/stocks/<TICKER>.json` matching the schema in the repo `README.md`. Use Markdown (`**bold**`, `_italic_`) in any string field — the renderer handles it.

### Step 4b — Cite every non-obvious claim (MANDATORY)

**The output is not credible without sources.** Treat this like a published equity research note: every specific number, quote, or factual claim must trace back to a primary source the reader can click and verify.

#### When to cite
Cite when you state:
- A specific financial figure (revenue, FCF, margin, buyback amount, segment data) → cite the **10-K, 10-Q, earnings press release, or investor day deck**.
- A management statement, tone signal, or strategy claim → cite the **shareholder letter, earnings call transcript, or interview**.
- Insider ownership, comp design, dual-class structure → cite the **DEF 14A (proxy)**.
- A regulatory event or risk → cite the **regulator's filing or a tier-1 news outlet** (Reuters, Bloomberg, WSJ, FT, The Hindu BusinessLine for India).
- A historical event (acquisition, divestiture, CEO change) → cite the **original press release or tier-1 news**.
- Competitor or industry data (e.g., "Waymo at 250k rides/week") → cite the **competitor's own disclosure or tier-1 news**.

#### When you do NOT need to cite
- Universal definitions (e.g., "FCF = OCF − capex" — every analyst knows this).
- Pure opinion ("I think the market is over-discounting AVs" — this is your judgment, not a fact).
- Numbers already shown in the financials chart/tables (the financials block carries an implicit single citation: the latest 10-K).

#### How to cite in the JSON

**1. Inline marker** — anywhere inside a markdown string field, append `[^source-id]` immediately after the claim:
```
"FCF margin reached **18.8%** in FY24[^uber-10k-2024]."
"Buybacks scaled to **$6.5B in 2025**[^uber-q4-2024-pr]."
"Foodpanda Taiwan blocked by FTC Dec 2024[^foodpanda-taiwan-2024]."
```

Multiple sources for a single claim: `claim[^src-a][^src-b]`.

**2. Sources array** — add a top-level `sources` array (last block in the JSON):
```json
"sources": [
  {
    "id": "uber-10k-2024",
    "type": "10-K",
    "title": "Uber Technologies — Annual Report (Form 10-K) for FY2024",
    "publisher": "SEC EDGAR",
    "date": "2025-02-21",
    "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001543151&type=10-K",
    "pages": "p. 47 (FCF reconciliation)",
    "note": "Source for FCF, SBC, insurance reserves."
  }
]
```

Required fields: `id`, `type`, `title`, `url`.
Optional but recommended: `publisher`, `date` (YYYY-MM-DD), `pages`, `note`, `accessed`.

#### Source IDs — naming convention
`<ticker-lower>-<type>-<year>` or `<topic>-<year>`.
Examples: `uber-10k-2024`, `uber-q1-2025-pr`, `uber-def14a-2025`, `waymo-milestone-2025`, `ab5-prop22`.

#### Type taxonomy (used for grouping in the rendered Bibliography)
`10-K` · `10-Q` · `Annual Report` · `Shareholder Letter` · `Earnings Call` · `Investor Presentation` · `Regulatory Filing` · `News` · `Research` · `Blog` · `Podcast` · `Interview` · `Reference`.

#### Minimum source bar per analysis
For a complete deep-dive, expect **10–18 sources** spanning:
- 2–3 annual reports / 10-Ks (current + 1–2 historical for trend honesty)
- 1 latest quarterly earnings release/call
- 1 latest shareholder letter
- 1 proxy statement (DEF 14A) for insider/comp data
- 1 investor day deck if recent
- 3–6 tier-1 news pieces for material events (M&A, regulation, leadership changes, competitive milestones)
- 1–2 regulatory references for any disclosed risk

#### URL discipline
- Use **canonical / stable URLs** (SEC EDGAR, company IR pages, publisher article URLs).
- If you cannot find the exact filing URL, link to the **company's IR filings page** or the **SEC EDGAR company-search URL** so the reader can find it.
- **Never fabricate URLs.** If unsure, use a known parent URL (e.g., `investor.uber.com/financials/`) and let `note` explain.
- All news links: prefer the publisher's own domain over aggregators.

#### Honesty check
- If a claim has **no citable source**, either remove it or rewrite as opinion ("In my view…").
- If a number comes from your own calculation, mark it: "(my estimate, based on [^src])".
- If a primary source contradicts your number, **use the source's number** and adjust your analysis.

### Step 5 — Update index
In `data/index.json`, locate the ticker entry (it may already exist with `status: "screened"`) and **replace it** with the analyzed-state schema:
```json
{
  "ticker": "...", "name": "...", "exchange": "...", "sector": "...",
  "logoText": "...", "logoFrom": "...", "logoTo": "...",
  "status": "analyzed",
  "rating": "BUY|HOLD|SELL",
  "price": 0.0, "priceChange52w": 0.0,
  "marketCap": "...", "fcfTtm": "...", "evFcf": "...",
  "asOf": "YYYY-MM-DD",
  "summary": "One-line verdict.",
  "buyBelow": 0, "loadBelow": 0, "trimAbove": 0
}
```

### Step 6 — Optional: long-form & DOCX
- Long-form prose Markdown → `reports/<TICKER>_Analysis.md`
- Concise analyst note DOCX → run `reports/build_docx.py` adapted for the new ticker.

### Step 7 — Verify locally (optional)
```bash
python -m http.server 8000
# Open http://localhost:8000/stock.html?ticker=<TICKER>
```

### Step 8 — Commit + push
```bash
git add data/stocks/<TICKER>.json data/index.json reports/<TICKER>_Analysis.* 2>/dev/null
git commit -m "Analysis: <TICKER> · <one-line verdict>

- 15-Q framework applied
- Verdict: <rating> · Buy < $X · Trim > $Z
- Position: <sizing>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
git push
```

GitHub Pages auto-deploys.

## Honesty principles (from Khandelwal)

1. **Be honest, not clever.** No hedging dressed up as nuance.
2. **Express uncertainty explicitly.** "~80% understood" beats false precision.
3. **Note what you can't model.** Accounting geography, insurance reserves, AV economics — name them.
4. **Pre-commit to sell rules before buying.** Most failures are emotional, not analytical.
5. **Distinguish accounting earnings from owner earnings.** FCF is usually the right lens.
6. **Read 3 annual letters.** Honest in good years AND bad years is the tell.
7. **Skin-in-the-game matters.** Insider %, founder presence, comp-plan design.
8. **Cite everything that isn't your own opinion.** A claim with no source is a claim the reader cannot defend in front of a portfolio manager. (See Step 4b.)

## Anti-patterns to avoid

- ❌ Sell-side summaries of "balanced views" with no opinion.
- ❌ Quoting analyst PTs as evidence (they're consensus, not analysis).
- ❌ Skipping the "what could kill it" section because the company looks bulletproof.
- ❌ Setting sell triggers _after_ the price falls.
- ❌ Overstating moat strength; understating regulation/AV/disruption risk.
- ❌ **Stating specific numbers without citing the filing / press release they came from.**
- ❌ **Fabricating URLs** to make a source look real. Use the canonical IR/EDGAR/parent URL with a note instead.

## Quality bar for output

A finished analysis should let a reader, in 5 minutes, answer:
- What does the company do, and how does it earn?
- What is the central debate?
- What is the price right now, and is it fair?
- At what price do I add? At what price do I exit?
- What single piece of news would change the thesis?
- **Where did each number come from?** (Every citation should resolve to a primary source within one click.)

If any of those is not crisp, rewrite that section.

## Output examples
- Reference implementation: `data/stocks/UBER.json` and `reports/UBER_Analysis.md` in this repo.
- Khandelwal source: https://safalniveshak.com
