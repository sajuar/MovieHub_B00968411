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
        # Reviews are on a 1–10 scale, same as the movie rating
        average = round(sum(review["rating"] for review in movie_reviews) / len(movie_reviews), 1)

        movies.update_one(
            {"movie_id": movie_id},
            {"$set": {"ratings.average": average}}
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
    user = get_logged_in_user()

    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)

    # Admins manage the platform — they moderate reviews but do not write them
    if user["role"] == "admin":
        return make_response(jsonify({"Error": "Admins cannot write reviews"}), 403)

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
    if rating < 1 or rating > 10:
        return make_response(jsonify({"Error": "rating must be between 1 and 10"}), 400)

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
# Only the review owner can edit — admins can delete but not edit
# --------------------------------------------------
@review_bp.route('/api/reviews/<string:review_id>', methods=['PUT'])
def update_review(review_id):
    user = get_logged_in_user()

    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)

    # Admins can delete reviews for moderation but cannot edit them
    if user["role"] == "admin":
        return make_response(jsonify({"Error": "Admins cannot edit reviews"}), 403)

    review = reviews.find_one({"review_id": review_id})

    if review is None:
        return make_response(jsonify({"Error": "Review not found"}), 404)

    # Only the review owner can edit their own review
    if review["user_id"] != user["user_id"]:
        return make_response(jsonify({"Error": "Not allowed"}), 403)

    data = request.form
    update_fields = {}

    # Update rating if provided
    if data.get("rating"):
        try:
            rating = int(data.get("rating"))
        except:
            return make_response(jsonify({"Error": "rating must be an integer"}), 400)

        if rating < 1 or rating > 10:
            return make_response(jsonify({"Error": "rating must be between 1 and 10"}), 400)

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


# --------------------------------------------------
# Toggle helpful / not-helpful vote on a review
# vote_type must be "helpful" or "not_helpful"
# One vote per type per user — clicking again removes it
# Admins and the review author cannot vote
# --------------------------------------------------
@review_bp.route('/api/reviews/<string:review_id>/vote/<string:vote_type>', methods=['POST'])
def toggle_vote(review_id, vote_type):
    if vote_type not in ("helpful", "not_helpful"):
        return make_response(jsonify({"Error": "vote_type must be helpful or not_helpful"}), 400)

    user = get_logged_in_user()
    if user is None:
        return make_response(jsonify({"Error": "Authentication required"}), 401)

    if user["role"] == "admin":
        return make_response(jsonify({"Error": "Admins cannot vote on reviews"}), 403)

    review = reviews.find_one({"review_id": review_id})
    if review is None:
        return make_response(jsonify({"Error": "Review not found"}), 404)

    if review["user_id"] == user["user_id"]:
        return make_response(jsonify({"Error": "You cannot vote on your own review"}), 400)

    user_id        = user["user_id"]
    opposite_type  = "not_helpful" if vote_type == "helpful" else "helpful"
    field_count    = f"{vote_type}_votes"
    field_users    = f"{vote_type}_votes_users"
    opp_count      = f"{opposite_type}_votes"
    opp_users      = f"{opposite_type}_votes_users"

    voters        = review.get(field_users, [])
    already_voted = user_id in voters

    if already_voted:
        # Clicking the same button again removes the vote
        reviews.update_one(
            {"review_id": review_id},
            {"$pull": {field_users: user_id}, "$inc": {field_count: -1}}
        )
        new_count = max(0, review.get(field_count, 0) - 1)
        return make_response(jsonify({
            field_count: new_count,
            opp_count:   review.get(opp_count, 0),
            "user_voted": False
        }), 200)
    else:
        update_op = {
            "$addToSet": {field_users: user_id},
            "$inc":      {field_count: 1}
        }
        # If the user had the opposite vote, remove it at the same time
        opp_new_count = review.get(opp_count, 0)
        if user_id in review.get(opp_users, []):
            update_op["$pull"] = {opp_users: user_id}
            update_op["$inc"][opp_count] = -1
            opp_new_count = max(0, opp_new_count - 1)

        reviews.update_one({"review_id": review_id}, update_op)
        new_count = review.get(field_count, 0) + 1
        return make_response(jsonify({
            field_count:  new_count,
            opp_count:    opp_new_count,
            "user_voted": True
        }), 200)