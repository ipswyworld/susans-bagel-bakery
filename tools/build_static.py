"""Bake the storefront's SEO-critical content into plain HTML.

Search engines and AI answer engines read the HTML they are served, so the menu, FAQ and
structured data must exist in index.html itself, not only after JavaScript runs. This script
renders site/index.template.html -> site/index.html and writes site/menu.json (the offline
fallback the page loads first), sitemap.xml and robots.txt.

    python tools/build_static.py --site-url https://you.github.io/susans-bagel-bakery
    python tools/build_static.py --site-url ... --api https://your-api.onrender.com   # use live data
"""
import argparse
import json
import sys
import urllib.request
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
sys.path.insert(0, str(ROOT / "api"))

CATEGORY_TITLES = {"bagel": "Bagels", "spread": "Spreads", "box": "Boxes", "drink": "Drinks"}


def load_data(api: str | None) -> dict:
    if api:
        with urllib.request.urlopen(api.rstrip("/") + "/api/public", timeout=30) as r:
            return json.load(r)
    from app.seed import DEFAULT_SETTINGS, MENU  # placeholder content

    menu = [
        {"id": i + 1, "name": n, "description": d, "price_kes": p, "category": c, "art": a, "available": True, "sort_order": i}
        for i, (n, d, p, c, a) in enumerate(MENU)
    ]
    return {"menu": menu, "settings": dict(DEFAULT_SETTINGS), "reviews": [], "rating": {"count": 0, "average": None}}


def faq(s: dict) -> list[tuple[str, str]]:
    return [
        ("How do I order from Susan's Bagel Bakery?",
         "Add bagels on this page, press Review order, enter your name and when you want them, then send. WhatsApp opens with your whole order already written out. Your order is confirmed once we reply."),
        ("Do you take payment on the website?",
         "No. This site only sends your order to us. Payment is arranged directly with us on WhatsApp, at pickup or on delivery."),
        ("Do you deliver?", s["delivery_info"]),
        ("How much notice do you need?", s["lead_time"]),
        ("Where are you and when are you open?", f"{s['address']}. Open {s['hours']}."),
        ("Can I change or cancel my order?",
         "Message us in the same WhatsApp chat as soon as you can. Changes are easiest before baking starts, so earlier is better."),
    ]


def menu_html(menu: list[dict]) -> str:
    out = []
    for cat, title in CATEGORY_TITLES.items():
        items = [m for m in menu if m["category"] == cat]
        if not items:
            continue
        out.append(f'<h3 class="menu-cat">{title}</h3><ul class="static-menu">')
        for m in items:
            out.append(
                f'<li><strong>{escape(m["name"])}</strong> <span>KES {m["price_kes"]:,}</span>'
                f'<p>{escape(m["description"])}</p></li>'
            )
        out.append("</ul>")
    return "\n".join(out)


def faq_html(items: list[tuple[str, str]]) -> str:
    return "\n".join(
        f'<details class="faq-item"><summary>{escape(q)}</summary><p>{escape(a)}</p></details>' for q, a in items
    )


def json_ld(data: dict, site_url: str) -> str:
    s, menu = data["settings"], data["menu"]
    prices = [m["price_kes"] for m in menu] or [0]
    wa = f"https://wa.me/{s['whatsapp']}"
    sections = []
    for cat, title in CATEGORY_TITLES.items():
        items = [m for m in menu if m["category"] == cat]
        if items:
            sections.append({
                "@type": "MenuSection",
                "name": title,
                "hasMenuItem": [{
                    "@type": "MenuItem",
                    "name": m["name"],
                    "description": m["description"],
                    "offers": {"@type": "Offer", "price": str(m["price_kes"]), "priceCurrency": "KES",
                               "availability": "https://schema.org/InStock" if m["available"] else "https://schema.org/SoldOut"},
                } for m in items],
            })
    bakery = {
        "@type": ["Bakery", "LocalBusiness"],
        "@id": site_url + "/#bakery",
        "name": "Susan's Bagel Bakery",
        "slogan": "Your Daily Dose of Fresh-Baked Goodness.",
        "url": site_url + "/",
        "image": site_url + "/assets/og-image.jpg",
        "logo": site_url + "/assets/icon-512.png",
        "telephone": "+" + s["whatsapp"],
        "email": s.get("email", ""),
        "priceRange": f"KES {min(prices)} - KES {max(prices)}",
        "servesCuisine": "Bagels",
        "address": {"@type": "PostalAddress", "streetAddress": s["address"], "addressLocality": "Nairobi", "addressCountry": "KE"},
        "openingHours": s["hours"],
        "sameAs": [f"https://www.instagram.com/{s['instagram']}/"],
        "hasMenu": {"@type": "Menu", "name": "Bagel menu", "hasMenuSection": sections},
        "potentialAction": {"@type": "OrderAction", "target": {"@type": "EntryPoint", "urlTemplate": wa, "actionPlatform": "http://schema.org/DesktopWebPlatform"},
                            "deliveryMethod": ["http://purl.org/goodrelations/v1#DeliveryModePickUp", "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet"]},
    }
    if data["rating"]["count"]:  # only ever from approved, real reviews
        bakery["aggregateRating"] = {"@type": "AggregateRating", "ratingValue": data["rating"]["average"],
                                     "reviewCount": data["rating"]["count"], "bestRating": 5, "worstRating": 1}
    faq_ld = {
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faq(s)],
    }
    site_ld = {"@type": "WebSite", "name": "Susan's Bagel Bakery", "url": site_url + "/"}
    return json.dumps({"@context": "https://schema.org", "@graph": [bakery, faq_ld, site_ld]}, ensure_ascii=False, indent=2)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--site-url", default="https://YOUR-GITHUB-USERNAME.github.io/susans-bagel-bakery")
    ap.add_argument("--api", default=None, help="pull live menu/settings/reviews from this API instead of placeholders")
    ap.add_argument("--noindex", action="store_true", help="preview builds: ask search engines to stay away")
    args = ap.parse_args()
    site_url = args.site_url.rstrip("/")

    data = load_data(args.api)
    s = data["settings"]
    html = (SITE / "index.template.html").read_text(encoding="utf-8")
    subs = {f"{{{{{k}}}}}": escape(v) for k, v in s.items()}
    subs.update({
        "{{site_url}}": site_url,
        "{{MENU_HTML}}": menu_html(data["menu"]),
        "{{FAQ_HTML}}": faq_html(faq(s)),
        "{{LD_JSON}}": json_ld(data, site_url).replace("</", "<\\/"),
        "{{instagram_url}}": f"https://www.instagram.com/{escape(s['instagram'])}/",
        "{{wa_url}}": f"https://wa.me/{escape(s['whatsapp'])}",
    })
    for k, v in subs.items():
        html = html.replace(k, v)
    if args.noindex:
        html = html.replace('content="index, follow, max-image-preview:large"', 'content="noindex, nofollow"')
    (SITE / "index.html").write_text(html, encoding="utf-8")
    (SITE / "menu.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    (SITE / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"  <url><loc>{site_url}/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n",
        encoding="utf-8",
    )
    robots = "User-agent: *\nDisallow: /\n" if args.noindex else f"User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: {site_url}/sitemap.xml\n"
    (SITE / "robots.txt").write_text(robots, encoding="utf-8")
    print(f"built {SITE / 'index.html'} for {site_url} ({len(data['menu'])} menu items)")


if __name__ == "__main__":
    main()
