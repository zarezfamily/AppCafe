#!/usr/bin/env python3
"""Download Guilis product images using Botasaurus to bypass Cloudflare."""
import os
from pathlib import Path
from botasaurus.browser import browser, Driver

ROOT = Path(__file__).resolve().parents[1]
TMP_DIR = ROOT / 'tmp_photos'
TMP_DIR.mkdir(exist_ok=True)

GUILIS_IMAGES = {
    'guilis_blend_gourmet_grano_1kg': 'https://cafesguilis.com/wp-content/uploads/2022/04/cafes-guilis-black-blend-arabica-ligero-cafe-cuerpo-aroma-centro-sudamerica-cafe-grano-tueste-natural-12119-1-1.jpg',
    'guilis_colombiano_grano_1kg': 'https://cafesguilis.com/wp-content/uploads/2025/09/Cafe-Colombia-1kg-Frade-trade-2-web.jpg',
    'guilis_etiopia_grano_1kg': 'https://cafesguilis.com/wp-content/uploads/2022/06/cafes-guilis-ecologico-organico-arabica-ligero-afrutado-cafe-grano-tueste-natural-utz-kraft-1.jpg',
}


@browser(headless=True)
def download_image(driver: Driver, data: dict):
    """Navigate to image URL and save screenshot / download."""
    name = data['name']
    url = data['url']
    out_path = TMP_DIR / f'{name}.jpg'

    print(f'  Downloading {name}...')
    print(f'    URL: {url}')

    driver.get(url)
    import time
    time.sleep(3)

    # Try to get the image bytes via JavaScript
    js_code = """
    return await (async () => {
        try {
            const img = document.querySelector('img');
            if (img && img.src) {
                const resp = await fetch(img.src);
                const blob = await resp.blob();
                const reader = new FileReader();
                return new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
            // If no img tag, the browser loaded the image directly
            const resp = await fetch(window.location.href);
            const blob = await resp.blob();
            const reader = new FileReader();
            return new Promise((resolve) => {
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            return null;
        }
    })();
    """

    try:
        data_url = driver.run_js(js_code)
        if data_url and ',' in data_url:
            import base64
            b64_data = data_url.split(',', 1)[1]
            img_bytes = base64.b64decode(b64_data)
            out_path.write_bytes(img_bytes)
            print(f'    Saved: {out_path} ({len(img_bytes) // 1024} KB)')
            return {'name': name, 'ok': True, 'size': len(img_bytes)}
    except Exception as e:
        print(f'    JS download failed: {e}')

    # Fallback: take a screenshot
    try:
        ss_path = str(TMP_DIR / f'{name}_screenshot.png')
        driver.save_screenshot(ss_path)
        size = os.path.getsize(ss_path)
        # Rename to expected filename
        os.rename(ss_path, str(out_path))
        print(f'    Screenshot saved: {out_path} ({size // 1024} KB)')
        return {'name': name, 'ok': True, 'size': size}
    except Exception as e:
        print(f'    Screenshot failed: {e}')

    return {'name': name, 'ok': False}


def main():
    print('=== Downloading Guilis images via Botasaurus ===\n')

    tasks = [{'name': name, 'url': url} for name, url in GUILIS_IMAGES.items()]
    results = download_image(tasks)

    print('\n=== Results ===')
    for r in results:
        status = 'OK' if r.get('ok') else 'FAIL'
        print(f'  {status} {r["name"]}')


if __name__ == '__main__':
    main()
