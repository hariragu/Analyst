"""Quick render smoke test for upcoming.html."""
import sys
import time
from contextlib import contextmanager
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


@contextmanager
def serve(port=8765):
    import functools
    handler = functools.partial(SimpleHTTPRequestHandler, directory=str(ROOT))
    httpd = HTTPServer(("127.0.0.1", port), handler)
    t = Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        yield f"http://127.0.0.1:{port}"
    finally:
        httpd.shutdown()


def main():
    with serve() as base:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(("pageerror", str(e))))
            page.on("console", lambda m: errors.append(("console-" + m.type, m.text)) if m.type in ("error",) else None)

            page.goto(f"{base}/upcoming.html")
            page.wait_for_selector(".screen-section", timeout=10_000)
            time.sleep(0.5)

            sections = page.locator(".screen-section").count()
            cards = page.locator(".stock-card.pending").count()
            watchlist_cards = page.locator(".stock-card.watchlist").count()
            badges = page.locator(".method-badge").count()
            wl_pills = page.locator(".badge-watchlist").count()
            counter = page.locator("#upcomingCount").inner_text()
            titles = [page.locator(".screen-title").nth(i).inner_text() for i in range(sections)]

            print(f"Sections: {sections}")
            print(f"Cards (pending): {cards}")
            print(f"Watchlist cards: {watchlist_cards}")
            print(f"Watchlist pills: {wl_pills}")
            print(f"Method badges: {badges}")
            print(f"Counter: {counter}")
            for t in titles:
                print(f"  -> {t}")

            # Now check stock page for a published one
            page.goto(f"{base}/stock.html?ticker=COALINDIA")
            page.wait_for_function("document.body.innerText.includes('Coal India')", timeout=10_000)
            time.sleep(0.5)
            body = page.locator("body").inner_text()
            print(f"COALINDIA page has '\u20b9462': {'\u20b9462' in body}")
            print(f"COALINDIA page has 'BUY': {'BUY' in body}")

            page.goto(f"{base}/stock.html?ticker=UBER")
            page.wait_for_function("document.body.innerText.includes('Uber')", timeout=10_000)
            time.sleep(0.5)
            body_u = page.locator("body").inner_text()
            print(f"UBER page has '$74.69': {'$74.69' in body_u}")
            print(f"UBER page has 'HOLD': {'HOLD' in body_u}")

            browser.close()

            crit = [e for e in errors if e[0].startswith("pageerror") or e[0] == "console-error"]
            if crit:
                print("\nERRORS:")
                for e in crit:
                    print(f"  {e[0]}: {e[1][:200]}")
                sys.exit(1)

            print("\n[OK] all checks pass.")


if __name__ == "__main__":
    main()
