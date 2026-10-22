"""Placeholder content. Every value here is a stand-in until the owner supplies the real thing."""
from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import MenuItem, Review, Setting

DEFAULT_SETTINGS = {
    "whatsapp": "254708817454",  # digits only, country code first
    "instagram": "susans_bagel_bakery_",  # no @
    "email": "nyobungasusan@gmail.com",
    "address": "Add street address, Nairobi",
    "hours": "Mon to Sat, 7am to 5pm",
    "delivery_info": "We deliver via Uberboda. Delivery cost is confirmed on WhatsApp.",
    "min_order_kes": "0",
    "lead_time": "Order by 6pm for next-morning bagels.",
    "google_review_url": "",
}

MENU = [  # from the bakery's own flyer (prices in KES)
    ("Plain Bagel", "Our classic. Chewy inside, golden outside.", 80, "bagel", "plain"),
    ("Whole Wheat Bagel", "Wholesome and hearty, baked fresh.", 100, "bagel", "wholewheat"),
    ("Salt Bagel", "Topped with coarse salt for a savoury bite.", 100, "bagel", "salt"),
    ("Sesame Bagel", "Toasted sesame crust, classic and nutty.", 100, "bagel", "sesame"),
    ("Poppy Seed Bagel", "Crunchy poppy seed crust.", 100, "bagel", "poppy"),
    ("Cinnamon Raisin Bagel", "Sweet cinnamon swirl with plump raisins.", 100, "bagel", "cinnamon"),
    ("Gingerbread Bagel", "New flavour. Warm gingerbread spices.", 100, "bagel", "gingerbread"),
    ("Everything Bagel", "Sesame, poppy, garlic and onion all in one.", 120, "bagel", "everything"),
    ("Whole Wheat Cinnamon Raisin", "Whole wheat dough with cinnamon and raisins.", 120, "bagel", "wwcinnamon"),
    ("Chocolate Chip Bagel", "Sweet, with chocolate chips baked in.", 120, "bagel", "chocolate"),
    ("Sundried Tomato Bagel", "New flavour. Savoury sundried tomato.", 150, "bagel", "tomato"),
    ("Jalapeno & Cheddar Bagel", "New flavour. Cheddar and jalapeno, a little heat.", 200, "bagel", "jalapeno"),
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
