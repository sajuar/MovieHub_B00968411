from flask import request
from datetime import datetime, timedelta, timezone
from config import users, tokens, movies, reviews

# Tokens stay alive for this many minutes after the most recent
# authenticated request (sliding session)
TOKEN_LIFETIME_MINUTES = 5


# --------------------------------------------------
# Get the currently logged-in user from the token
# Returns the user document or None
# --------------------------------------------------
def get_logged_in_user():
    token = request.headers.get("x-access-token")

    if token is None:
        return None

    saved_token = tokens.find_one({"token": token})

    if saved_token is None:
        return None

    # Reject tokens whose expiry has already passed (in case the TTL
    # cleanup hasn't run yet). Stored value is a naive UTC datetime
    # written by PyMongo, so compare against utcnow().
    expires_at = saved_token.get("expires_at")
    if expires_at is not None and expires_at <= datetime.utcnow():
        tokens.delete_one({"token": token})
        return None

    user = users.find_one({"user_id": saved_token["user_id"]})

    if user is None:
        return None

    # Sliding session: extend the token's expiry every time it is used,
    # so an active user stays signed in even though tokens are short-lived
    new_expiry = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTES)
    tokens.update_one(
        {"token": token},
        {"$set": {"expires_at": new_expiry}}
    )

    return user


# --------------------------------------------------
# Get the logged-in user only if they are an admin
# Returns the user document or None
# --------------------------------------------------
def get_admin_user():
    user = get_logged_in_user()

    if user is None:
        return None

    if user["role"] != "admin":
        return None

    return user

# --------------------------------------------------
# Check whether a movie exists by movie_id
# Returns the movie document or None
# --------------------------------------------------
def valid_movie_id(movie_id):
    return movies.find_one({"movie_id": movie_id})


# --------------------------------------------------
# Check whether a user exists by user_id
# Returns the user document or None
# --------------------------------------------------
def valid_user_id(user_id):
    return users.find_one({"user_id": user_id})
