"""
MovieHub — Database Seed Script
================================
Imports all collections from the exported JSON files in the data/ folder.

Run this ONCE on a fresh MongoDB instance:
    python seed_data.py

Requirements:
    - MongoDB must be running on localhost:27017
    - The data/ folder must exist with the 4 exported JSON files:
        data/movies.json
        data/users.json
        data/reviews.json
        data/watchlist.json  (can be empty array [] if no watchlist data)

After running, use these credentials to log in:
    Admin  — username: sh           password: admin123
    Admin  — username: parkeranderson  password: admin123
    Users  — any other username     password: user123
"""

import json
import os
import bcrypt
from pymongo import MongoClient, ASCENDING

# ── Database connection ──────────────────────────────────────────────────────
client = MongoClient("mongodb://localhost:27017")
db     = client.MovieHub_data

movies_col    = db.movies
users_col     = db.users
reviews_col   = db.reviews
tokens_col    = db.tokens
watchlist_col = db.watchlist


# ── Helper: load a JSON file from the data/ folder ──────────────────────────
def load_json(filename):
    path = os.path.join(os.path.dirname(__file__), "data", filename)
    if not os.path.exists(path):
        print(f"  WARNING: {path} not found — skipping.")
        return []
    with open(path, "r", encoding="utf-8") as f:
        content = f.read().strip()
        if not content or content == "[]":
            return []
        # mongoexport uses Extended JSON — strip _id fields and parse
        raw = json.loads(content)
        # Remove MongoDB _id so fresh ObjectIds are assigned on insert
        for doc in raw:
            doc.pop("_id", None)
        return raw


# ── Helper: reset passwords to known values for professor testing ─────────────
def reset_passwords(user_list):
    admin_usernames = {"sh", "parkeranderson"}
    for user in user_list:
        plain = "admin123" if user.get("username", "").lower() in admin_usernames or user.get("role") == "admin" else "user123"
        user["password"] = bcrypt.hashpw(
            plain.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")
    return user_list


# ── Create MongoDB indexes ───────────────────────────────────────────────────
def create_indexes():
    movies_col.create_index("movie_id",  unique=True)
    users_col.create_index("user_id",    unique=True)
    users_col.create_index("username",   unique=True)
    users_col.create_index("email",      unique=True)
    reviews_col.create_index("review_id", unique=True)
    # TTL index: MongoDB auto-deletes expired tokens
    tokens_col.create_index("expires_at", expireAfterSeconds=0)
    print("  Indexes created.")


# ── Seed movies ───────────────────────────────────────────────────────────────
def seed_movies():
    if movies_col.count_documents({}) > 0:
        print(f"  Movies: already has {movies_col.count_documents({})} documents — skipped.")
        return
    data = load_json("movies.json")
    if data:
        movies_col.insert_many(data)
        print(f"  Movies: inserted {len(data)} documents.")
    else:
        print("  Movies: no data to insert.")


# ── Seed users ────────────────────────────────────────────────────────────────
def seed_users():
    if users_col.count_documents({}) > 0:
        print(f"  Users: already has {users_col.count_documents({})} documents — skipped.")
        return
    data = load_json("users.json")
    if data:
        data = reset_passwords(data)
        users_col.insert_many(data)
        print(f"  Users: inserted {len(data)} documents.")
        print("         Passwords reset — admins: admin123 | users: user123")
    else:
        print("  Users: no data to insert.")


# ── Seed reviews ──────────────────────────────────────────────────────────────
def seed_reviews():
    if reviews_col.count_documents({}) > 0:
        print(f"  Reviews: already has {reviews_col.count_documents({})} documents — skipped.")
        return
    data = load_json("reviews.json")
    if data:
        reviews_col.insert_many(data)
        print(f"  Reviews: inserted {len(data)} documents.")
    else:
        print("  Reviews: no data to insert.")


# ── Seed watchlist ────────────────────────────────────────────────────────────
def seed_watchlist():
    if watchlist_col.count_documents({}) > 0:
        print(f"  Watchlist: already has {watchlist_col.count_documents({})} documents — skipped.")
        return
    data = load_json("watchlist.json")
    if data:
        watchlist_col.insert_many(data)
        print(f"  Watchlist: inserted {len(data)} documents.")
    else:
        print("  Watchlist: empty — skipped.")


# ── Clear tokens (sessions should never persist across installs) ─────────────
def clear_tokens():
    result = tokens_col.delete_many({})
    print(f"  Tokens: cleared {result.deleted_count} stale session tokens.")


# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("\nMovieHub — Database Seed")
    print("=" * 40)

    create_indexes()
    seed_movies()
    seed_users()
    seed_reviews()
    seed_watchlist()
    clear_tokens()

    print("=" * 40)
    print("Done! You can now start the server with:  python app.py")
    print()
    print("Login credentials:")
    print("  Admin   — sh             / admin123")
    print("  Admin   — parkeranderson / admin123")
    print("  Users   — any username   / user123")
    print()
