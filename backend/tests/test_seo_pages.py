"""Unit tests for server-side SEO rendering (no app, no database)."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import seo_pages  # noqa: E402

INDEX = (Path(__file__).resolve().parent.parent.parent / "frontend" / "index.html").read_text(encoding="utf-8")
SITE = "https://halucinate.com"
PRODUCTS = [
    {"name": "Multiplayer Free Roam VR", "tag": "Most Selling", "price_label": "₹9,80,000",
     "image_url": "/assets/products/missionx-keyart.png", "hashtags": ["#FreeRoamVR"],
     "description": "Wireless arena for four or more players."},
    {"name": "Custom Event Activations", "tag": "Events", "price_label": "Based on requirement",
     "image_url": "", "hashtags": [], "description": "Activations for <brands> & \"events\"."},
    {"name": "AI Wellness Pod", "tag": "", "price_label": "", "image_url": "",
     "hashtags": ["#Wellness"], "description": "A new product added from the admin console."},
]


def _jsonld(html):
    return [json.loads(b) for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)]


def test_slug_and_lookup():
    assert seo_pages.slugify("Super Reality 360 Dome") == "super-reality-360-dome"
    assert seo_pages.product_path(PRODUCTS[0]) == "/products/multiplayer-free-roam-vr"
    assert seo_pages.find_product(PRODUCTS, "custom-event-activations") is PRODUCTS[1]
    assert seo_pages.find_product(PRODUCTS, "nope") is None


def test_every_seeded_product_has_tuned_copy_within_length_limits():
    for slug, meta in seo_pages.PRODUCT_SEO.items():
        assert len(meta["title"]) <= 70, slug
        assert 110 <= len(meta["description"]) <= 180, slug


def test_product_page_head_is_unique_and_canonical():
    html = seo_pages.render_product(INDEX, PRODUCTS[0], PRODUCTS, SITE)
    assert "<title>Free Roam VR Arena Setup in India" in html
    assert '<link rel="canonical" href="https://halucinate.com/products/multiplayer-free-roam-vr"' in html
    assert 'property="og:url" content="https://halucinate.com/products/multiplayer-free-roam-vr"' in html
    assert 'property="og:image" content="https://halucinate.com/assets/products/missionx-keyart.png"' in html
    assert "rakeshanjanappa" not in html  # every hardcoded host follows SITE_URL
    assert html.count("<title>") == 1 and html.count('rel="canonical"') == 1


def test_product_page_has_content_and_structured_data():
    html = seo_pages.render_product(INDEX, PRODUCTS[0], PRODUCTS, SITE)
    assert "<h1" in html and "Wireless arena for four or more players." in html
    assert 'href="/products/custom-event-activations"' in html  # internal links
    graphs = _jsonld(html)
    product = next(n for g in graphs for n in g.get("@graph", []) if n.get("@type") == "Product")
    assert product["offers"]["price"] == "980000" and product["offers"]["priceCurrency"] == "INR"
    assert any(n.get("@type") == "BreadcrumbList" for g in graphs for n in g.get("@graph", []))


def test_no_offer_without_a_rupee_price_and_html_is_escaped():
    html = seo_pages.render_product(INDEX, PRODUCTS[1], PRODUCTS, SITE)
    product = next(n for g in _jsonld(html) for n in g.get("@graph", []) if n.get("@type") == "Product")
    assert "offers" not in product
    assert "<brands>" not in html and "&lt;brands&gt;" in html


def test_admin_added_product_gets_generated_copy():
    meta = seo_pages.product_meta(PRODUCTS[2])
    assert meta["title"].startswith("AI Wellness Pod in India")
    assert "AI Wellness Pod" in seo_pages.render_product(INDEX, PRODUCTS[2], PRODUCTS, SITE)


def test_home_lists_every_product_and_keeps_admin_meta():
    html = seo_pages.render_home(INDEX, PRODUCTS, {"meta_title": "Custom & Title", "meta_description": "D"}, SITE)
    assert "<title>Custom &amp; Title</title>" in html
    assert '<link rel="canonical" href="https://halucinate.com/"' in html
    for p in PRODUCTS:
        assert f'href="{seo_pages.product_path(p)}"' in html
    assert any(g.get("@type") == "ItemList" for g in _jsonld(html))


def test_not_found_is_noindex():
    html = seo_pages.render_not_found(INDEX, PRODUCTS, SITE, "/products/nope")
    assert 'name="robots" content="noindex, follow"' in html


def test_crawl_files():
    sm = seo_pages.sitemap_xml(PRODUCTS, SITE)
    assert sm.count("<loc>") == len(PRODUCTS) + 1
    assert "<loc>https://halucinate.com/products/ai-wellness-pod</loc>" in sm
    assert "Sitemap: https://halucinate.com/sitemap.xml" in seo_pages.robots_txt(SITE)
    assert "(https://halucinate.com/products/multiplayer-free-roam-vr)" in seo_pages.llms_txt(PRODUCTS, SITE)


def test_site_url_and_redirect_hosts(monkeypatch):
    monkeypatch.setenv("SITE_URL", "https://halucinate.com/")
    monkeypatch.setenv("REDIRECT_HOSTS", "halucinate.rakeshanjanappa.com, www.halucinate.com, halucinate.com")
    assert seo_pages.site_url() == "https://halucinate.com"
    assert seo_pages.redirect_hosts() == ["halucinate.rakeshanjanappa.com", "www.halucinate.com"]
