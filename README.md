# Susan's Bagel Bakery

Order-only website. Customers build an order, it opens in WhatsApp, no money moves on the site.

```
site/   static storefront + /admin page  -> GitHub Pages
api/    FastAPI + Postgres               -> Render / Railway / Fly (any Python host)
tools/  build_static.py                  -> bakes menu, FAQ and JSON-LD into index.html for SEO/AEO
```

## Run locally

```bash
cd api && pip install -r requirements.txt && cp .env.example .env
uvicorn app.main:app --port 8710          # SQLite by default, seeds placeholder menu
python -m http.server 8080 --directory site
```

Site: http://localhost:8080  Admin: http://localhost:8080/admin/ (dev password in `api/.env`).
Tests: `cd api && python -m pytest`.

## Replace the placeholders

Everything marked placeholder lives in the **admin page** (Site info + Menu): WhatsApp number, Instagram handle, address, hours, delivery details, minimum order, Google review link, menu items and prices.
Then rebake the static HTML so search engines see the real content:

```bash
python tools/build_static.py --site-url https://YOUR-USER.github.io/susans-bagel-bakery --api https://YOUR-API-URL
```

Re-run it after menu or info changes (the live page always shows the latest from the API; the bake is for crawlers and offline fallback).

## Go live

1. **Database:** create a free Postgres (Neon). Copy its connection string.
2. **API:** deploy `api/` (start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`). Env vars: `DATABASE_URL`, `SECRET_KEY`, `ADMIN_PASSWORD_HASH` (from `python -m app.hashpw`), `CORS_ORIGINS=https://YOUR-USER.github.io`.
3. **Site:** set `API_URL` in `site/js/config.js`, run the bake command above, push `site/` to GitHub Pages.
4. **Later, custom domain:** re-run the bake with `--site-url https://yourdomain`. Add the domain to `CORS_ORIGINS`.

Free API hosts sleep when idle; the storefront renders from `menu.json` first, so ordering still works while the API wakes.
