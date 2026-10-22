import time
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import config
from .db import Base, SessionLocal, engine, get_db
from .models import MenuItem, Review, Setting
from .security import make_token, require_admin, verify_password
from .seed import seed


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        seed(db)
    yield


app = FastAPI(title="Susan's Bagel Bakery API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

# ---------- schemas ----------


class MenuItemIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=240)
    price_kes: int = Field(ge=0, le=1_000_000)
    category: Literal["bagel", "spread", "box", "drink"] = "bagel"
    art: str = Field(default="plain", max_length=24)
    available: bool = True
    sort_order: int = 0


class ReviewIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=3, max_length=800)
    website: str = ""  # honeypot: real people leave this empty


class ReviewStatusIn(BaseModel):
    status: Literal["approved", "rejected", "pending"]


class LoginIn(BaseModel):
    password: str


def item_out(m: MenuItem) -> dict:
    return {c: getattr(m, c) for c in ("id", "name", "description", "price_kes", "category", "art", "available", "sort_order")}


def review_out(r: Review, admin: bool = False) -> dict:
    out = {"id": r.id, "name": r.name, "rating": r.rating, "comment": r.comment, "created_at": r.created_at.isoformat()}
    if admin:
        out["status"] = r.status
    return out


# ---------- tiny in-memory rate limit for the public review form ----------
_hits: dict[str, deque] = defaultdict(deque)


def _limited(ip: str, limit: int = 5, window: int = 3600) -> bool:
    q, now = _hits[ip], time.time()
    while q and q[0] < now - window:
        q.popleft()
    if len(q) >= limit:
        return True
    q.append(now)
    return False


# ---------- public ----------


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/public")
def public(db: Session = Depends(get_db)):
    """Everything the storefront needs in one request (also what menu.json mirrors)."""
    menu = db.scalars(select(MenuItem).order_by(MenuItem.sort_order, MenuItem.id)).all()
    settings = {s.key: s.value for s in db.scalars(select(Setting))}
    approved = db.scalars(select(Review).where(Review.status == "approved").order_by(Review.created_at.desc()).limit(30)).all()
    count, avg = db.execute(select(func.count(Review.id), func.avg(Review.rating)).where(Review.status == "approved")).one()
    return {
        "menu": [item_out(m) for m in menu],
        "settings": settings,
        "reviews": [review_out(r) for r in approved],
        "rating": {"count": count, "average": round(float(avg), 1) if avg else None},
    }


@app.post("/api/reviews", status_code=201)
def submit_review(body: ReviewIn, request: Request, db: Session = Depends(get_db)):
    if body.website:  # bot filled the honeypot: pretend success, store nothing
        return {"status": "pending"}
    ip = request.client.host if request.client else "?"
    if _limited(ip):
        raise HTTPException(429, "Too many reviews from this connection. Try again later.")
    db.add(Review(name=body.name.strip(), rating=body.rating, comment=body.comment.strip(), status="pending"))
    db.commit()
    return {"status": "pending"}


# ---------- admin ----------


@app.post("/api/admin/login")
def login(body: LoginIn):
    if not verify_password(body.password):
        time.sleep(0.6)  # slow down guessing
        raise HTTPException(401, "Wrong password")
    return {"token": make_token()}


admin = [Depends(require_admin)]


@app.get("/api/admin/menu", dependencies=admin)
def admin_menu(db: Session = Depends(get_db)):
    return [item_out(m) for m in db.scalars(select(MenuItem).order_by(MenuItem.sort_order, MenuItem.id))]


@app.post("/api/admin/menu", dependencies=admin, status_code=201)
def admin_menu_create(body: MenuItemIn, db: Session = Depends(get_db)):
    m = MenuItem(**body.model_dump())
    db.add(m)
    db.commit()
    return item_out(m)


@app.put("/api/admin/menu/{item_id}", dependencies=admin)
def admin_menu_update(item_id: int, body: MenuItemIn, db: Session = Depends(get_db)):
    m = db.get(MenuItem, item_id)
    if not m:
        raise HTTPException(404, "No such item")
    for k, v in body.model_dump().items():
        setattr(m, k, v)
    db.commit()
    return item_out(m)


@app.delete("/api/admin/menu/{item_id}", dependencies=admin, status_code=204)
def admin_menu_delete(item_id: int, db: Session = Depends(get_db)):
    m = db.get(MenuItem, item_id)
    if m:
        db.delete(m)
        db.commit()


@app.get("/api/admin/reviews", dependencies=admin)
def admin_reviews(db: Session = Depends(get_db)):
    rows = db.scalars(select(Review).order_by(Review.created_at.desc())).all()
    return [review_out(r, admin=True) for r in rows]


@app.patch("/api/admin/reviews/{review_id}", dependencies=admin)
def admin_review_status(review_id: int, body: ReviewStatusIn, db: Session = Depends(get_db)):
    r = db.get(Review, review_id)
    if not r:
        raise HTTPException(404, "No such review")
    r.status = body.status
    db.commit()
    return review_out(r, admin=True)


@app.delete("/api/admin/reviews/{review_id}", dependencies=admin, status_code=204)
def admin_review_delete(review_id: int, db: Session = Depends(get_db)):
    r = db.get(Review, review_id)
    if r:
        db.delete(r)
        db.commit()


@app.get("/api/admin/settings", dependencies=admin)
def admin_settings(db: Session = Depends(get_db)):
    return {s.key: s.value for s in db.scalars(select(Setting))}


@app.put("/api/admin/settings", dependencies=admin)
def admin_settings_update(body: dict[str, str], db: Session = Depends(get_db)):
    for key, value in body.items():
        if len(key) > 48 or len(value) > 1000:
            raise HTTPException(422, "Value too long")
        row = db.get(Setting, key)
        if row:
            row.value = value
        else:
            db.add(Setting(key=key, value=value))
    db.commit()
    return {s.key: s.value for s in db.scalars(select(Setting))}
