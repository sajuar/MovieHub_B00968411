from flask import request
from datetime import datetime, timedelta, timezone
from config import users, tokens, movies, reviews

# How long a token stays valid after the most recent authenticated request
TOKEN_LIFETIME_MINUTES = 5


# ── get_logged_in_user ──────────────────────────────────────────────────────
# Reads the token from the request header, validates it, and returns the
# matching user document.  Two security checks run here:
#   1. Hard expiry  — rejects tokens whose `expires_at` has already passed,
#      acting as a backup to the MongoDB TTL index.
#   2. Sliding session — extends `expires_at` on every successful request so
#      an active user is never logged out mid-session.
# Returns None if the token is missing, invalid, or expired.
# ────────────────────────────────────────────────────────────────────────────
def get_logged_in_user():
    token = request.headers.get("x-access-token")

    if token is None:
        return None

    saved_token = tokens.find_one({"token": token})

    if saved_token is None:
        return None

    # Reject tokens whose expiry has already passed
    expires_at = saved_token.get("expires_at")
    if expires_at is not None and expires_at <= datetime.utcnow():
        tokens.delete_one({"token": token})
        return None

    user = users.find_one({"user_id": saved_token["user_id"]})

    if user is None:
        return None

    # Sliding session: push the expiry forward on every valid request
    new_expiry = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTES)
    tokens.update_one(
        {"token": token},
        {"$set": {"expires_at": new_expiry}}
    )

    return user


# ── get_admin_user ──────────────────────────────────────────────────────────
# Wraps get_logged_in_user and adds a role check.
# Used by any route that requires admin privileges.
# ────────────────────────────────────────────────────────────────────────────
def get_admin_user():
    user = get_logged_in_user()

    if user is None:
        return None

    if user["role"] != "admin":
        return None

    return user


def valid_movie_id(movie_id):
    return movies.find_one({"movie_id": movie_id})


def valid_user_id(user_id):
    return users.find_one({"user_id": user_id})
