import os

os.environ["DATABASE_URL"] = "sqlite:///./test_bagels.db"
os.environ["ADMIN_PASSWORD"] = "pw"
os.environ["SECRET_KEY"] = "test"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
    from app.db import engine

    engine.dispose()
    os.remove("test_bagels.db")


def login(client):
    r = client.post("/api/admin/login", json={"password": "pw"})
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_public_has_seeded_menu(client):
    d = client.get("/api/public").json()
    assert len(d["menu"]) >= 5 and d["settings"]["whatsapp"]


def test_admin_requires_auth(client):
    assert client.get("/api/admin/menu").status_code == 401
    assert client.post("/api/admin/login", json={"password": "nope"}).status_code == 401


def test_review_must_be_approved_before_public(client):
    h = login(client)
    before = client.get("/api/public").json()["rating"]["count"]
    assert client.post("/api/reviews", json={"name": "Ann", "rating": 4, "comment": "Lovely bagels"}).status_code == 201
    assert client.get("/api/public").json()["rating"]["count"] == before
    pending = [r for r in client.get("/api/admin/reviews", headers=h).json() if r["status"] == "pending"]
    assert pending
    client.patch(f"/api/admin/reviews/{pending[0]['id']}", json={"status": "approved"}, headers=h)
    assert client.get("/api/public").json()["rating"]["count"] == before + 1


def test_honeypot_stores_nothing(client):
    h = login(client)
    n = len(client.get("/api/admin/reviews", headers=h).json())
    client.post("/api/reviews", json={"name": "Bot", "rating": 5, "comment": "spam spam", "website": "http://x"})
    assert len(client.get("/api/admin/reviews", headers=h).json()) == n


def test_menu_crud_and_sold_out(client):
    h = login(client)
    new = client.post("/api/admin/menu", headers=h, json={"name": "Test", "price_kes": 50}).json()
    new["available"] = False
    client.put(f"/api/admin/menu/{new['id']}", headers=h, json=new)
    item = [m for m in client.get("/api/public").json()["menu"] if m["id"] == new["id"]][0]
    assert item["available"] is False
    assert client.delete(f"/api/admin/menu/{new['id']}", headers=h).status_code == 204
