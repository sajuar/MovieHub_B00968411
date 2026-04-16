# Import Flask utilities for routes and JSON responses
from flask import Blueprint, request, jsonify, make_response

# Used for assigning today's date when a review date is not provided
from datetime import date

# Import MongoDB collections from the config file
from config import movies, users, reviews, tokens
from helpers import get_logged_in_user, valid_movie_id, valid_user_id


# Blueprint for all review-related routes
review_bp = Blueprint('review_bp', __name__)

# --------------------------------------------------
# Generate the next review ID (e.g. R001, R002, R003)
# --------------------------------------------------
def get_next_review_id():
    last_review = reviews.find_one(sort=[("review_id", -1)])

    if last_review is None:
        return "R001"

    try:
        number = int(last_review["review_id"][1:]) + 1
    except:
        number = 1

    return f"R{number:03d}"


# --------------------------------------------------
# Recalculate and update a movie's average rating
# after review changes
# --------------------------------------------------
def update_movie_rating(movie_id):
    movie_reviews = list(reviews.find({"movie_id": movie_id}))

    if len(movie_reviews) > 0:
        # Reviews are stored on a 1–5 scale
        average_5 = sum(review["rating"] for review in movie_reviews) / len(movie_reviews)

        # Convert to a 1–10 scale for the movie document
        average_10 = round(average_5 * 2, 1)

        movies.update_one(
            {"movie_id": movie_id},
            {"$set": {"ratings.average": average_10}}
        )
    else:
        # If no reviews remain, reset average rating to 0
        movies.update_one(
            {"movie_id": movie_id},
            {"$set": {"ratings.average": 0}}
        )



# --------------------------------------------------
# Get reviews for a specific movie with pagination
# --------------------------------------------------
@review_bp.route('/api/movies/<string:movie_id>/reviews', methods=['GET'])
def get_reviews(movie_id):
    if valid_movie_id(movie_id) is None:
        return make_response(jsonify({"Error": "Movie not found"}), 404)

    # Pagination parameters
    page_num = request.args.get('pn', default=1, type=int)
    page_size = request.args.get('ps', default=5, type=int)
    page_start = (page_num - 1) * page_size

    # Validate pagination values
    if page_num < 1 or page_size < 1:
        return make_response(jsonify({"Error": "pn and ps must be greater than 0"}), 400)

    data_to_return = []

    # Query reviews for the requested movie
    movie_reviews = reviews.find({"movie_id": movie_id}).skip(page_start).limit(page_size)

    for review in movie_reviews:
        review["_id"] = str(review["_id"])
        data_to_return.append(review)

    return make_response(jsonify(data_to_return), 200)


# --------------------------------------------------
# Get all reviews written by a specific user
# --------------------------------------------------
@review_bp.route('/api/users/<string:user_id>/reviews', methods=['GET'])
def get_reviews_by_user(user_id):
    if valid_user_id(user_id) is None:
        return make_response(jsonify({"Error": "User not found"}), 404)

    data_to_return = []
    user_reviews = reviews.find({"user_id": user_id})

    for review in user_reviews:
        review["_id"] = str(review["_id"])
        data_to_return.append(review)

    return make_response(jsonify(data_to_return), 200)


# --------------------------------------------------
# Add a new review for a movie
# --------------------------------------------------
@review_bp.route('/api/movies/<string:movie_id>/reviews', methods=['POST'])
def add_review(movie_id):
    # User must be logged in to add a review
    user = get_logged_in_user()

    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)

    # Movie must exist before review can be added
    if valid_movie_id(movie_id) is None:
        return make_response(jsonify({"Error": "Movie not found"}), 404)

    data = request.form

    # Rating is required
    if not (data and "rating" in data):
        return make_response(jsonify({"Error": "missing data"}), 400)

    # Prevent the same user from reviewing the same movie more than once
    existing_review = reviews.find_one({
        "movie_id": movie_id,
        "user_id": user["user_id"]
    })

    if existing_review is not None:
        return make_response(jsonify({"Error": "You have already reviewed this movie"}), 400)

    # Validate rating type
    try:
        rating = int(data.get("rating"))
    except:
        return make_response(jsonify({"Error": "rating must be an integer"}), 400)

    # Validate rating range
    if rating < 1 or rating > 5:
        return make_response(jsonify({"Error": "rating must be between 1 and 5"}), 400)

    # Validate helpful_votes type
    try:
        helpful_votes = int(data.get("helpful_votes", 0))
    except ValueError:
        return make_response(jsonify({"Error": "helpful_votes must be an integer"}), 400)

    # Validate helpful_votes range
    if helpful_votes < 0:
        return make_response(jsonify({"Error": "helpful_votes cannot be negative"}), 400)

    # Build the new review document
    new_review = {
        "review_id": get_next_review_id(),
        "movie_id": movie_id,
        "user_id": user["user_id"],
        "rating": rating,
        "comment": data.get("comment", "").strip(),
        "review_date": data.get("review_date", date.today().isoformat()),
        "helpful_votes": helpful_votes
    }

    # Insert review and update the movie's average rating
    reviews.insert_one(new_review)
    update_movie_rating(movie_id)

    return make_response(jsonify({"message": "Review added"}), 201)


# --------------------------------------------------
# Update an existing review
# Only the review owner or an admin may update it
# --------------------------------------------------
@review_bp.route('/api/reviews/<string:review_id>', methods=['PUT'])
def update_review(review_id):
    user = get_logged_in_user()

    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)

    review = reviews.find_one({"review_id": review_id})

    if review is None:
        return make_response(jsonify({"Error": "Review not found"}), 404)

    # Check ownership/admin permissions
    if review["user_id"] != user["user_id"] and user["role"] != "admin":
        return make_response(jsonify({"Error": "Not allowed"}), 403)

    data = request.form
    update_fields = {}

    # Update rating if provided
    if data.get("rating"):
        try:
            rating = int(data.get("rating"))
        except:
            return make_response(jsonify({"Error": "rating must be an integer"}), 400)

        if rating < 1 or rating > 5:
            return make_response(jsonify({"Error": "rating must be between 1 and 5"}), 400)

        update_fields["rating"] = rating

    # Update comment if provided (empty string allowed)
    if data.get("comment") is not None:
        update_fields["comment"] = data.get("comment").strip()

    # Update helpful_votes if provided
    if data.get("helpful_votes") is not None:
        try:
            helpful_votes = int(data.get("helpful_votes"))
        except ValueError:
            return make_response(jsonify({"Error": "helpful_votes must be an integer"}), 400)

        if helpful_votes < 0:
            return make_response(jsonify({"Error": "helpful_votes cannot be negative"}), 400)

        update_fields["helpful_votes"] = helpful_votes

    # Apply update to database
    result = reviews.update_one(
        {"review_id": review_id},
        {"$set": update_fields}
    )

    if result.matched_count == 1:
        # Recalculate movie rating after review update
        update_movie_rating(review["movie_id"])
        return make_response(jsonify({"message": "Review updated"}), 200)

    else:
        return make_response(jsonify({"Error": "Review not found"}), 404)


# --------------------------------------------------
# Delete an existing review
# Only the review owner or an admin may delete it
# --------------------------------------------------
@review_bp.route('/api/reviews/<string:review_id>', methods=['DELETE'])
def delete_review(review_id):
    user = get_logged_in_user()

    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)

    review = reviews.find_one({"review_id": review_id})

    if review is None:
        return make_response(jsonify({"Error": "Review not found"}), 404)

    # Check ownership/admin permissions
    if review["user_id"] != user["user_id"] and user["role"] != "admin":
        return make_response(jsonify({"Error": "Not allowed"}), 403)

    result = reviews.delete_one({"review_id": review_id})

    if result.deleted_count == 1:
        # Recalculate movie rating after review deletion
        update_movie_rating(review["movie_id"])
        return make_response(jsonify({"message": "Review deleted"}), 200)

    else:
        return make_response(jsonify({"Error": "Review not found"}), 404)