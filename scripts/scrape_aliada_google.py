"""
Scrape full-resolution images for Aliada coffees via Google Images.
Extract original source URLs (not thumbnails) from Google script data.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time, re

# Each Aliada product with a specific Google search query
PRODUCTS = [
    ("eci_aliada_molido_natural_250", "aliada cafe molido natural 250g el corte ingles"),
    ("eci_aliada_molido_descaf_250", "aliada cafe molido descafeinado 250g el corte ingles"),
    ("eci_aliada_molido_mezcla_250", "aliada cafe molido mezcla 250g el corte ingles"),
    ("eci_aliada_grano_natural_500", "aliada cafe grano natural 500g el corte ingles"),
    ("eci_aliada_grano_natural_1kg", "aliada cafe grano natural 1kg el corte ingles"),
    ("eci_aliada_capsulas_intenso_nesp_10", "aliada capsulas cafe intenso nespresso 10 el corte ingles"),
    ("eci_aliada_capsulas_descaf_nesp_10", "aliada capsulas cafe descafeinado nespresso 10 el corte ingles"),
    ("eci_aliada_capsulas_lungo_nesp_10", "aliada capsulas cafe lungo nespresso 10 el corte ingles"),
    ("eci_aliada_capsulas_espresso_nesp_20", "aliada capsulas cafe espresso nespresso 20 el corte ingles"),
    ("eci_aliada_soluble_200", "aliada cafe soluble natural 200g el corte ingles"),
]

@browser(headless=False, block_images=False, reuse_driver=True)
def scrape_google_fullres(driver: Driver, data):
    """Search Google Images for each product and extract full-res source URLs."""
    found = {}
    cookies_done = False

    for cafe_id, query in PRODUCTS:
        search_url = f"https://www.google.com/search?q={query.replace(' ', '+')}&tbm=isch&hl=es"
        print(f"\n  [{cafe_id}]")
        print(f"    Query: {query}")

        driver.get(search_url)
        time.sleep(3)

        if not cookies_done:
            try:
                for btn in driver.select_all('button'):
                    txt = (btn.text or '').lower()
                    if 'aceptar' in txt or 'accept' in txt or 'todo' in txt:
                        btn.click()
                        cookies_done = True
                        time.sleep(1)
                        break
            except:
                pass
            time.sleep(2)

        soup = soupify(driver)

        # Method 1: Extract full-res URLs from script tags
        full_urls = []
        for script in soup.select('script'):
            txt = script.string or ''
            urls = re.findall(r'\["(https?://(?!encrypted-tbn|www\.google|www\.gstatic|lh\d|play\.google)[^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"[,\]]', txt)
            for u in urls:
                if len(u) > 50 and 'gstatic' not in u:
                    full_urls.append(u)

        # Prefer ECI/sgfm URLs, then other URLs
        eci_urls = [u for u in full_urls if 'elcorteingles' in u or 'sgfm' in u]
        if eci_urls:
            found[cafe_id] = eci_urls[0]
            print(f"    FOUND (ECI): {eci_urls[0][:100]}...")
        elif full_urls:
            found[cafe_id] = full_urls[0]
            print(f"    FOUND (script): {full_urls[0][:100]}...")
        else:
            # Fallback: thumbnail
            imgs = []
            for img in soup.select('img'):
                src = img.get('src', '')
                if src.startswith('http') and 'encrypted-tbn' in src and len(src) > 80:
                    imgs.append(src)
            if imgs:
                found[cafe_id] = imgs[0]
                print(f"    FOUND (thumb): {imgs[0][:80]}...")
            else:
                print(f"    NOT FOUND")

        time.sleep(2)

    return found


if __name__ == "__main__":
    print("=== Google Images full-res for Aliada coffees ===\n")
    results = scrape_google_fullres() or {}

    outpath = os.path.join("scripts", "aliada_google_fullres.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} to {outpath}")

    for k, v in results.items():
        short = k.replace("eci_aliada_", "")
        is_eci = 'elcorteingles' in v or 'sgfm' in v
        print(f"  {'ECI' if is_eci else 'OTH'} {short}: {v[:80]}...")
