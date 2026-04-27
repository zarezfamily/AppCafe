"""
Scrape unique images for each Alipende product using Google Images individual searches.
Each product gets its own Google search to find a unique image.
"""
from botasaurus.browser import browser, Driver
from botasaurus.soupify import soupify
import json, os, time

# Each product with very specific Google search query
PRODUCTS = [
    ("ahorramas_alipende_molido_natural_250", "alipende cafe molido natural 250g paquete"),
    ("ahorramas_alipende_molido_mezcla_250", "alipende cafe molido mezcla 50 250g paquete"),
    ("ahorramas_alipende_molido_descaf_250", "alipende cafe molido descafeinado 250g paquete"),
    ("ahorramas_alipende_molido_colombia_250", "alipende cafe molido colombia 250g paquete"),
    ("ahorramas_alipende_molido_natural_500", "alipende cafe molido natural 500g paquete"),
    ("ahorramas_alipende_grano_natural_500", "alipende cafe grano natural 500g bolsa"),
    ("ahorramas_alipende_grano_natural_1kg", "alipende cafe grano natural 1kg bolsa"),
    ("ahorramas_alipende_grano_mezcla_1kg", "alipende cafe grano mezcla 1kg bolsa"),
    ("ahorramas_alipende_grano_descaf_500", "alipende cafe grano descafeinado 500g bolsa"),
    ("ahorramas_alipende_capsulas_intenso_nesp_10", "alipende capsulas cafe intenso nespresso 10"),
    ("ahorramas_alipende_capsulas_espresso_nesp_10", "alipende capsulas cafe espresso nespresso 10"),
    ("ahorramas_alipende_capsulas_descaf_nesp_10", "alipende capsulas cafe descafeinado nespresso 10"),
    ("ahorramas_alipende_capsulas_lungo_nesp_10", "alipende capsulas cafe lungo nespresso 10"),
    ("ahorramas_alipende_capsulas_colombia_nesp_10", "alipende capsulas cafe colombia nespresso 10"),
    ("ahorramas_alipende_capsulas_intenso_nesp_20", "alipende capsulas cafe intenso nespresso 20 unidades"),
    ("ahorramas_alipende_capsulas_espresso_dg_16", "alipende capsulas cafe espresso dolce gusto 16"),
    ("ahorramas_alipende_capsulas_intenso_dg_16", "alipende capsulas cafe intenso dolce gusto 16"),
    ("ahorramas_alipende_capsulas_descaf_dg_16", "alipende capsulas cafe descafeinado dolce gusto 16"),
    ("ahorramas_alipende_soluble_natural_200", "alipende cafe soluble natural 200g tarro"),
    ("ahorramas_alipende_soluble_descaf_200", "alipende cafe soluble descafeinado 200g tarro"),
]

results = {}

@browser(headless=False, block_images=False, reuse_driver=True)
def scrape_google_individual(driver: Driver, data):
    """Search Google Images individually for each product."""
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
                btns = driver.select_all('button')
                for btn in btns:
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
        
        # Get thumbnail images from Google Images results
        # These are typically encrypted-tbn*.gstatic.com/shopping or /images URLs
        imgs = soup.select('img')
        good_imgs = []
        
        for img in imgs:
            src = img.get('src', '')
            # Skip Google UI images, logos, tiny icons
            if not src.startswith('http'):
                continue
            if 'google' in src and 'encrypted' not in src:
                continue
            if any(x in src for x in ['youtube', 'logo', 'icon', 'favicon', 'avatar', 'profile']):
                continue
            if 'gstatic.com' in src and 'encrypted' not in src:
                continue
            # Must be a reasonably long URL (not a placeholder)
            if len(src) < 80:
                continue
            good_imgs.append(src)
        
        if good_imgs:
            # Use first result (most relevant)
            found[cafe_id] = good_imgs[0]
            print(f"    FOUND: {good_imgs[0][:80]}...")
            if len(good_imgs) > 1:
                print(f"    (also {len(good_imgs)-1} more options)")
        else:
            # Try data-src attributes
            for img in soup.select('img[data-src]'):
                src = img.get('data-src', '')
                if len(src) > 80 and 'http' in src:
                    good_imgs.append(src)
            
            if good_imgs:
                found[cafe_id] = good_imgs[0]
                print(f"    FOUND (data-src): {good_imgs[0][:80]}...")
            else:
                print(f"    NO IMAGE FOUND")
        
        time.sleep(2)
    
    return found


if __name__ == "__main__":
    print("=== Google Images individual search for Alipende ===\n")
    r = scrape_google_individual() or {}
    results.update(r)
    
    outpath = os.path.join("scripts", "alipende_google_individual.json")
    with open(outpath, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved {len(results)} to {outpath}")
    
    # Check uniqueness
    url_to_ids = {}
    for k, v in results.items():
        # Normalize URL to check uniqueness
        base = v.split('?')[0] if 'gstatic' not in v else v[:100]
        if base not in url_to_ids:
            url_to_ids[base] = []
        url_to_ids[base].append(k.replace("ahorramas_alipende_", ""))
    
    unique = sum(1 for ids in url_to_ids.values() if len(ids) == 1)
    shared = sum(1 for ids in url_to_ids.values() if len(ids) > 1)
    print(f"\nUnique: {unique}, Shared groups: {shared}, Total: {len(results)}")
    for base_url, ids in url_to_ids.items():
        if len(ids) > 1:
            print(f"  SHARED ({len(ids)}): {', '.join(ids)}")
