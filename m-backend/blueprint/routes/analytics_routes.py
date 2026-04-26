from flask import Blueprint, jsonify, make_response
from config import movies, users, reviews
from helpers import get_admin_user

analytics_bp = Blueprint('analytics_bp', __name__)


@analytics_bp.route('/api/admin/analytics', methods=['GET'])
def get_analytics():
    # Admin only
    if get_admin_user() is None:
        return make_response(jsonify({"Error": "Admin access required"}), 403)

    # Total counts
    total_movies  = movies.count_documents({})
    total_users   = users.count_documents({})
    total_reviews = reviews.count_documents({})

    # Top 5 most reviewed movies
    top_reviewed_pipeline = [
        {"$group": {"_id": "$movie_id", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
        {"$lookup": {
            "from": "movies",
            "localField": "_id",
            "foreignField": "movie_id",
            "as": "movie"
        }},
        {"$project": {
            "movie_id": "$_id",
            "title":    {"$arrayElemAt": ["$movie.title", 0]},
            "count":    1
        }}
    ]
    top_reviewed = list(reviews.aggregate(top_reviewed_pipeline))
    for item in top_reviewed:
        item.pop("_id", None)

    # Average rating per genre (top 8 genres)
    rating_by_genre_pipeline = [
        {"$unwind": "$genres"},
        {"$group": {
            "_id":        "$genres",
            "avg_rating": {"$avg": "$ratings.average"}
        }},
        {"$sort": {"avg_rating": -1}},
        {"$limit": 8},
        {"$project": {
            "genre":      "$_id",
            "avg_rating": {"$round": ["$avg_rating", 1]}
        }}
    ]
    rating_by_genre = list(movies.aggregate(rating_by_genre_pipeline))
    for item in rating_by_genre:
        item.pop("_id", None)

    # Reviews per month — last 6 months
    reviews_by_month_pipeline = [
        {"$group": {
            "_id":   {"$substr": ["$review_date", 0, 7]},
            "count": {"$sum": 1}
        }},
        {"$sort":  {"_id": -1}},  # most recent first
        {"$limit": 6},
        {"$sort":  {"_id": 1}},   # sort ascending so chart reads left to right
        {"$project": {"month": "$_id", "count": 1}}
    ]
    reviews_by_month = list(reviews.aggregate(reviews_by_month_pipeline))
    for item in reviews_by_month:
        item.pop("_id", None)

    # Movies count per genre
    genre_count_pipeline = [
        {"$unwind": "$genres"},
        {"$group": {"_id": "$genres", "count": {"$sum": 1}}},
        {"$sort":  {"count": -1}},
        {"$limit": 8},
        {"$project": {"genre": "$_id", "count": 1}}
    ]
    genre_counts = list(movies.aggregate(genre_count_pipeline))
    for item in genre_counts:
        item.pop("_id", None)

    return make_response(jsonify({
        "totals": {
            "movies":  total_movies,
            "users":   total_users,
            "reviews": total_reviews
        },
        "top_reviewed":     top_reviewed,
        "rating_by_genre":  rating_by_genre,
        "reviews_by_month": reviews_by_month,
        "genre_counts":     genre_counts
    }), 200)
