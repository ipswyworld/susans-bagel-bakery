"""Placeholder content. Every value here is a stand-in until the owner supplies the real thing."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import MenuItem, Review, Setting

DEFAULT_SETTINGS = {
    "whatsapp": "254708817454",  # digits only, country code first
    "instagram": "susans_bagel_bakery_",  # no @
    "email": "nyobunasusan@gmail.com",
    "address": "Add street address, Nairobi",
    "hours": "Mon to Sat, 7am to 5pm",
    "delivery_info": "Delivery within [your area]. Fee confirmed on WhatsApp.",
    "min_order_kes": "0",
    "lead_time": "Order by 6pm for next-morning bagels.",
    "google_review_url": "",
}

MENU = [
    ("Plain Bagel", "Chewy inside, golden outside. The one that started it all.", 90, "bagel", "plain"),
    ("Sesame Bagel", "Toasted sesame crust, classic and nutty.", 100, "bagel", "sesame"),
    ("Everything Bagel", "Sesame, poppy, garlic and onion. Loud in the best way.", 120, "bagel", "everything"),
    ("Cinnamon Raisin", "Sweet swirl, plump raisins, breakfast and dessert in one.", 120, "bagel", "cinnamon"),
    ("Cheese Bagel", "Baked with a golden cap of melted cheese.", 130, "bagel", "cheese"),
    ("Cream Cheese Tub", "Plain whipped cream cheese, 150g.", 250, "spread", "tub"),
    ("Half Dozen Box", "Six bagels, mix your own flavours.", 520, "box", "box"),
    ("Dozen Box", "Twelve bagels, mix your own flavours.", 980, "box", "box"),
]

# Never seed fake reviews: they would feed fake AggregateRating markup to Google.
SAMPLE_REVIEWS: list[tuple[str, int, str, str]] = []


def seed(db: Session, with_samples: bool = False) -> None:
    for k, v in DEFAULT_SETTINGS.items():
        if db.get(Setting, k) is None:
            db.add(Setting(key=k, value=v))
    if db.scalar(select(MenuItem.id).limit(1)) is None:
        for i, (name, desc, price, cat, art) in enumerate(MENU):
            db.add(MenuItem(name=name, description=desc, price_kes=price, category=cat, art=art, sort_order=i))
    if with_samples and db.scalar(select(Review.id).limit(1)) is None:
        for name, rating, comment, status in SAMPLE_REVIEWS:
            db.add(Review(name=name, rating=rating, comment=comment, status=status))
    db.commit()
