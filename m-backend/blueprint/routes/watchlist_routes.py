from flask import Blueprint, jsonify, make_response
from datetime import datetime, timezone
from config import watchlist, movies
from helpers import get_logged_in_user, valid_movie_id, valid_user_id

watchlist_bp = Blueprint('watchlist_bp', __name__)


@watchlist_bp.route('/api/users/<string:user_id>/watchlist', methods=['GET'])
def get_watchlist(user_id):
    user = get_logged_in_user()
    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)
    if user["user_id"] != user_id:
        return make_response(jsonify({"Error": "Not allowed"}), 403)

    entries = list(watchlist.find({"user_id": user_id}))
    result  = []

    # Return full movie documents rather than just IDs so the frontend can display them
    for entry in entries:
        movie = movies.find_one({"movie_id": entry["movie_id"]})
        if movie:
            movie["_id"]      = str(movie["_id"])
            movie["added_at"] = entry.get("added_at", "")
            result.append(movie)

    return make_response(jsonify(result), 200)


# Lightweight endpoint — only returns IDs so the frontend knows which hearts to fill
# without having to load full movie details on every page
@watchlist_bp.route('/api/users/<string:user_id>/watchlist/ids', methods=['GET'])
def get_watchlist_ids(user_id):
    user = get_logged_in_user()
    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)
    if user["user_id"] != user_id:
        return make_response(jsonify({"Error": "Not allowed"}), 403)

    entries = list(watchlist.find({"user_id": user_id}, {"movie_id": 1, "_id": 0}))
    ids     = [e["movie_id"] for e in entries]
    return make_response(jsonify({"movie_ids": ids}), 200)


@watchlist_bp.route('/api/users/<string:user_id>/watchlist/<string:movie_id>', methods=['POST'])
def add_to_watchlist(user_id, movie_id):
    user = get_logged_in_user()
    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)
    if user["user_id"] != user_id:
        return make_response(jsonify({"Error": "Not allowed"}), 403)
    if valid_movie_id(movie_id) is None:
        return make_response(jsonify({"Error": "Movie not found"}), 404)

    existing = watchlist.find_one({"user_id": user_id, "movie_id": movie_id})
    if existing is not None:
        return make_response(jsonify({"Error": "Movie already in watchlist"}), 400)

    watchlist.insert_one({
        "user_id":  user_id,
        "movie_id": movie_id,
        "added_at": datetime.now(timezone.utc).isoformat()
    })
    return make_response(jsonify({"message": "Added to watchlist"}), 201)


@watchlist_bp.route('/api/users/<string:user_id>/watchlist/<string:movie_id>', methods=['DELETE'])
def remove_from_watchlist(user_id, movie_id):
    user = get_logged_in_user()
    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)
    if user["user_id"] != user_id:
        return make_response(jsonify({"Error": "Not allowed"}), 403)

    result = watchlist.delete_one({"user_id": user_id, "movie_id": movie_id})

    if result.deleted_count == 1:
        return make_response(jsonify({"message": "Removed from watchlist"}), 200)
    else:
        return make_response(jsonify({"Error": "Movie not in watchlist"}), 404)
