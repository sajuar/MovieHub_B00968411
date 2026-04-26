from flask import request
from datetime import datetime, timedelta, timezone
from config import users, tokens, movies, reviews

TOKEN_LIFETIME_MINUTES = 5


def get_logged_in_user():
    token = request.headers.get("x-access-token")
    if token is None:
        return None

    saved_token = tokens.find_one({"token": token})
    if saved_token is None:
        return None

    # Double-check expiry in case the MongoDB TTL cleanup hasn't run yet
    expires_at = saved_token.get("expires_at")
    if expires_at is not None and expires_at <= datetime.utcnow():
        tokens.delete_one({"token": token})
        return None

    user = users.find_one({"user_id": saved_token["user_id"]})
    if user is None:
        return None

    # Sliding session — push the expiry forward every time the token is used
    # so active users are never logged out mid-session
    new_expiry = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTES)
    tokens.update_one({"token": token}, {"$set": {"expires_at": new_expiry}})

    return user


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
