# Equity Analyst

A scalable, data-driven equity-analysis site built around Vishal Khandelwal's [15-question framework](https://safalniveshak.com). Each company is described in a single JSON file; the site renders it into an immersive, navigable analysis page.

**Live site:** https://hariragu.github.io/Analyst/

---

## Structure

```
.
├── index.html                # Landing page — stock picker (search + filter)
├── stock.html                # Generic analysis viewer (reads ?ticker=XXX)
├── data/
│   ├── index.json            # Master list of covered tickers (drives the picker)
│   └── stocks/
│       └── UBER.json         # One file per company — drives the full analysis
├── assets/
│   ├── css/styles.css        # Shared styles
│   └── js/
│       ├── util.js           # Markdown, fetch, helpers (ES module)
│       ├── index-renderer.js # Landing-page logic
│       └── stock-renderer.js # Analysis-page renderer + Chart.js
├── reports/                  # Long-form prose, .docx, etc. (per-company)
└── .github/workflows/deploy.yml  # GitHub Pages deploy
```

---

## Add a new company in 3 steps

1. **Copy** `data/stocks/UBER.json` to `data/stocks/<TICKER>.json` and edit. Schema below.
2. **Add an entry** to `data/index.json` under `stocks`. Minimum fields:

   ```json
   {
     "ticker": "MSFT",
     "name": "Microsoft Corp.",
     "exchange": "NASDAQ",
     "sector": "Software · Cloud",
     "logoText": "M",
     "logoFrom": "#0078d4",
     "logoTo": "#7c3aed",
     "rating": "HOLD",
     "price": 420.10,
     "priceChange52w": 12.5,
     "marketCap": "$3.1T",
     "fcfTtm": "$78B",
     "evFcf": "39×",
     "summary": "Best-in-class software franchise; price reflects most of the AI optionality.",
     "buyBelow": 360,
     "loadBelow": 300,
     "trimAbove": 520
   }
   ```

3. **Commit & push.** GitHub Pages re-deploys automatically. The new ticker appears in the picker and is viewable at `/stock.html?ticker=MSFT`.

No code changes needed.

---

## Per-stock JSON schema (`data/stocks/<TICKER>.json`)

Top level:

| Field | Type | Notes |
|---|---|---|
| `ticker` | string | e.g. `"UBER"` |
| `name`, `exchange`, `sector` | string | |
| `logoText`, `logoFrom`, `logoTo` | string | Single letter + two hex colors for the gradient logo |
| `asOf` | string (date) | YYYY-MM-DD |
| `framework` | string | Credit line |
| `verdict` | object | `{ rating, ratingColor, summary, buyBelow, loadBelow, trimAbove }` |
| `snapshot` | object | KPI strip: price, marketCap, ev, fcfTtm, revTtm, evFcf, fcfYield, roic, wacc, fcfGrowth4y, analystPT, analystUpside, analystRating |
| `executiveSummary` | object | `{ pros: [string], cons: [string] }` — supports `**bold**` and `_italic_` |
| `financials` | object | See below |
| `sections` | array | 3 sections of 5 questions — see below |
| `scorecard` | object | `{ dimensions: [{label, score}], summary }` |

### `financials`

```json
{
  "years": ["FY21","FY22","FY23","FY24","FY25","TTM"],
  "revenueB": [17.46, 31.88, ...],
  "fcfB":     [-0.74, 0.39,  ...],
  "opMargin": [-21.97, -5.75, ...],
  "mix":      { "labels":["Mobility","Delivery","Freight"], "values":[57,37,6] },
  "valuation": [
    {"label":"Trailing P/E","value":18.5,"tone":"neutral"},
    {"label":"EV/FCF",      "value":15.8,"tone":"pos"}
  ],
  "tables": {
    "valuation":     [["Trailing P/E","18.5×"], ...],
    "balance":       [["Cash & ST inv.","$6.1B"], ...],
    "capitalReturn": [["Buyback FY25","$6.5B"], ...]
  }
}
```

### `sections` — question shapes

Each section is one of `business` / `management` / `price`. Every question supports a different combination of optional blocks; the renderer picks whichever are present.

```json
{
  "id": "b1", "n": 1,
  "title": "What does Uber actually do?",
  "sub": "Explain like to a 10-year-old.",
  "chip": "Clear", "chipTone": "pos",  // pos | warn | neg | neutral
  "body": "Plain text with **bold** and _italic_.",

  // optional building blocks (use any combination):
  "bullets":  ["bullet 1", "bullet 2"],
  "ordered":  ["1st step", "2nd step"],
  "table":    { "header":[...], "rows":[[...]] },
  "footnote": "Markdown footnote under the table.",
  "splitList":{
    "leftTitle":"+", "leftTone":"pos",  "left":["..."],
    "rightTitle":"−", "rightTone":"warn","right":["..."]
  },
  "riskMatrix":[["Risk","Probability","Severity","Mitigant"], ...],
  "timeline": [{"era":"...","tone":"pos","note":"..."}],
  "tiles":    [{"label":"Normalized FCF","value":"$11B"}],
  "triggers": [{"title":"Price trigger","tone":"neg","body":"..."}],
  "chart":    "valuation"   // renders the valuation bar chart inline
}
```

### `scorecard`

```json
{
  "dimensions": [
    {"label":"Business quality","score":4.0}
  ],
  "summary":"Position sizing notes..."
}
```

---

## Local preview

Browsers block ES-module imports over `file://`. Run a static server:

```bash
# Python
python -m http.server 8000

# Node
npx serve .
```

Then open `http://localhost:8000`.

---

## GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) deploys on every push to `main`. Enable once in **Settings → Pages → Source → GitHub Actions**.

---

## License & disclaimer

Educational use only. Not investment advice. Framework credit: [Vishal Khandelwal · safalniveshak.com](https://safalniveshak.com).
