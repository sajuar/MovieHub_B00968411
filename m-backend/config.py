# Import MongoDB client library
from pymongo import MongoClient

# Connect to the local MongoDB server
client = MongoClient("mongodb://localhost:27017")

# Select the MovieHub database
db = client.MovieHub_data

# References to each collection used across the project
movies  = db.movies
users   = db.users
reviews = db.reviews
tokens  = db.tokens

# ── Uniqueness indexes ──────────────────────────────────────────────────────
# These prevent duplicate documents from being inserted at the database level,
# providing a safety net even if application-level checks are bypassed.
movies.create_index("movie_id",  unique=True)
users.create_index("user_id",    unique=True)
users.create_index("username",   unique=True)
users.create_index("email",      unique=True)
reviews.create_index("review_id", unique=True)

# ── Token TTL index ─────────────────────────────────────────────────────────
# MongoDB automatically deletes any token document whose `expires_at` datetime
# has passed. expireAfterSeconds=0 means "delete exactly at the stored time".
# This is the database-side cleanup that works alongside the app-level expiry
# checks in helpers.py.
tokens.create_index("expires_at", expireAfterSeconds=0)
