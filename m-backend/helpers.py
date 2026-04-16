from flask import request
from config import users, tokens, movies, reviews


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

    user = users.find_one({"user_id": saved_token["user_id"]})
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