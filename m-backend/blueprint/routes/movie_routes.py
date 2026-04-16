# Import Flask utilities
from flask import Blueprint, request, jsonify, make_response
from helpers import get_logged_in_user, get_admin_user, valid_movie_id

# Import MongoDB collections
from config import movies, reviews, users, tokens
import re  # Used for input validation


# Blueprint for movie-related API routes
movie_bp = Blueprint('movie_bp', __name__)

# --------------------------------------------------
# Generate the next movie ID (e.g. M001, M002, M003)
# --------------------------------------------------
def get_next_movie_id():
    last_movie = movies.find_one(sort=[("movie_id", -1)])

    if last_movie is None:
        return "M001"

    try:
        number = int(last_movie["movie_id"][1:]) + 1
    except:
        number = 1

    return f"M{number:03d}"


# --------------------------------------------------
# Get movies with pagination, filtering and sorting
# --------------------------------------------------
@movie_bp.route('/api/movies', methods=['GET'])
def get_movies():
    data_to_return = []

    # Pagination parameters
    page_num = request.args.get('pn', default=1, type=int)
    page_size = request.args.get('ps', default=5, type=int)
    page_start = (page_num - 1) * page_size

    # other filter parameters
    title = request.args.get('title')
    genre = request.args.get('genre')
    min_rating = request.args.get('min_rating', type=float)
    language = request.args.get('language')
    director = request.args.get('director')
    release_year = request.args.get('release_year', type=int)

    # Sorting parameters
    sort_by = request.args.get('sort_by', default='title')
    order = request.args.get('order', default='asc')

    query = {}

    # Apply filters if they were provided
    if title is not None and title.strip() != "":
        query["title"] = {"$regex": re.escape(title.strip()), "$options": "i"}

    if genre is not None:
        query["genres"] = genre

    if min_rating is not None:
        query["ratings.average"] = {"$gte": min_rating}

    if language is not None:
        query["language"] = language

    if director is not None:
        query["director"] = director

    if release_year is not None:
        query["release_year"] = release_year

    # Only allow safe sort fields
    allowed_sort_fields = ["title", "release_year", "ratings.average", "director", "language"]
    if sort_by not in allowed_sort_fields:
        return make_response(jsonify({"Error": "invalid sort_by field"}), 400)

    if order not in ["asc", "desc"]:
        return make_response(jsonify({"Error": "order must be asc or desc"}), 400)

    sort_order = 1 if order == "asc" else -1

    # Validate pagination values
    if page_num < 1 or page_size < 1:
        return make_response(jsonify({"Error": "pn and ps must be greater than 0"}), 400)

    try:
        # Query movies collection with filters, sorting and pagination
        movies_cursor = movies.find(query).sort(sort_by, sort_order).skip(page_start).limit(page_size)

        for movie in movies_cursor:
            movie["_id"] = str(movie["_id"])
            data_to_return.append(movie)

        return make_response(jsonify(data_to_return), 200)

    except ConnectionError:
        return make_response(jsonify({"Error": "Database not connected"}), 500)

    except Exception as ex:
        return make_response(jsonify({"Error": "Internal server", "details": str(ex)}), 500)


# --------------------------------------------------
# Search movies by title using case-insensitive match
# --------------------------------------------------
@movie_bp.route('/api/movies/search', methods=['GET'])
def search_movies():
    title = request.args.get('title')

    if title is None or title.strip() == "":
        return make_response(jsonify({"Error": "title parameter is required"}), 400)
    
    safe_title = re.escape(title.strip())

    data_to_return = []
    movies_cursor = movies.find({
        "title": {"$regex": safe_title, "$options": "i"}
    })

    for movie in movies_cursor:
        movie["_id"] = str(movie["_id"])
        data_to_return.append(movie)

    return make_response(jsonify(data_to_return), 200)


# --------------------------------------------------
# Get movie counts grouped by genre using aggregation
# --------------------------------------------------
@movie_bp.route('/api/movies/stats/genres', methods=['GET'])
def get_genre_stats():
    pipeline = [
        {"$unwind": "$genres"},
        {"$group": {"_id": "$genres", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]

    results = list(movies.aggregate(pipeline))

    # Rename _id field to genre for clearer output
    for item in results:
        item["genre"] = item.pop("_id")

    return make_response(jsonify(results), 200)


# --------------------------------------------------
# Get top-rated movies sorted by average rating
# --------------------------------------------------
@movie_bp.route('/api/movies/top-rated', methods=['GET'])
def get_top_rated_movies():
    data_to_return = []

    limit_num = request.args.get('limit', default=10, type=int)

    if limit_num < 1:
        return make_response(jsonify({"Error": "limit must be greater than 0"}), 400)

    movies_cursor = movies.find().sort("ratings.average", -1).limit(limit_num)

    for movie in movies_cursor:
        movie["_id"] = str(movie["_id"])
        data_to_return.append(movie)

    return make_response(jsonify(data_to_return), 200)


# --------------------------------------------------
# Get a single movie by movie_id
# --------------------------------------------------
@movie_bp.route('/api/movies/<string:movie_id>', methods=['GET'])
def get_one_movie(movie_id):
    movie = movies.find_one({"movie_id": movie_id})

    if movie is not None:
        movie["_id"] = str(movie["_id"])
        return make_response(jsonify(movie), 200)

    else:
        return make_response(jsonify({"Error": "Movie not found"}), 404)
    
    

# --------------------------------------------------
# Add a new movie (admin only)
# --------------------------------------------------
@movie_bp.route('/api/movies', methods=['POST'])
def add_movie():
    admin_user = get_admin_user()

    if admin_user is None:
        return make_response(jsonify({"Error": "Admin access required"}), 403)

    data = request.form

    # Required fields for movie creation
    if not (data and "title" in data and "release_year" in data and "director" in data):
        return make_response(jsonify({"Error": "missing data"}), 400)

    # Read and clean text fields
    title = data.get("title").strip()
    director = data.get("director").strip()
    language = data.get("language", "en").strip()
    country = data.get("country", "USA").strip()
    release_date = data.get("release_date", "2026-01-01").strip()
    hero_name = data.get("hero_name", "Unknown Hero").strip()
    villain_name = data.get("villain_name", "Unknown Villain").strip()

    if title == "" or director == "":
        return make_response(jsonify({"Error": "title and director cannot be empty"}), 400)

    # Validate numeric fields
    try:
        release_year = int(data.get("release_year"))
        duration_minutes = int(data.get("duration_minutes", 120))
        average_rating = float(data.get("average_rating", 0))
        votes = int(data.get("votes", 0))
    except ValueError:
        return make_response(jsonify({"Error": "invalid numeric input"}), 400)

    # Apply value-range validation
    if release_year < 1888 or release_year > 2100:
        return make_response(jsonify({"Error": "invalid release_year"}), 400)

    if duration_minutes <= 0:
        return make_response(jsonify({"Error": "duration_minutes must be greater than 0"}), 400)

    if average_rating < 0 or average_rating > 10:
        return make_response(jsonify({"Error": "average_rating must be between 0 and 10"}), 400)

    if votes < 0:
        return make_response(jsonify({"Error": "votes cannot be negative"}), 400)

    # Build the new movie document
    new_movie = {
        "movie_id": get_next_movie_id(),
        "title": title,
        "release_year": release_year,
        "genres": [g.strip() for g in data.get("genres", "").split(",") if g.strip()],
        "duration_minutes": duration_minutes,
        "director": director,
        "language": language if language != "" else "en",
        "release": {
            "country": country if country != "" else "USA",
            "date": release_date if release_date != "" else "2026-01-01"
        },
        "cast": [
            {"actor_name": hero_name if hero_name != "" else "Unknown Hero", "role": "Hero"},
            {"actor_name": villain_name if villain_name != "" else "Unknown Villain", "role": "Villain"}
        ],
        "ratings": {
            "average": average_rating,
            "votes": votes
        },
        "tags": [t.strip() for t in data.get("tags", "").split(",") if t.strip()],
        "created_at": data.get("created_at", "2026-03-09T00:00:00Z")
    }

    movies.insert_one(new_movie)

    # Return URL of created resource
    new_movie_link = f"http://127.0.0.1:5001/api/movies/{new_movie['movie_id']}"
    return make_response(jsonify({"Movie added successfully": new_movie_link}), 201)


# --------------------------------------------------
# Update an existing movie (admin only)
# --------------------------------------------------
@movie_bp.route('/api/movies/<string:movie_id>', methods=['PUT'])
def update_movie(movie_id):
    admin_user = get_admin_user()

    if admin_user is None:
        return make_response(jsonify({"Error": "Admin access required"}), 403)

    if valid_movie_id(movie_id) is None:
        return make_response(jsonify({"Error": "Movie not found"}), 404)

    data = request.form
    update_fields = {}

    # Update title if provided
    if data.get("title") is not None:
        title = data.get("title").strip()
        if title == "":
            return make_response(jsonify({"Error": "title cannot be empty"}), 400)
        update_fields["title"] = title

    # Update release year if provided
    if data.get("release_year"):
        try:
            release_year = int(data.get("release_year"))
        except ValueError:
            return make_response(jsonify({"Error": "release_year must be an integer"}), 400)

        if release_year < 1888 or release_year > 2100:
            return make_response(jsonify({"Error": "invalid release_year"}), 400)

        update_fields["release_year"] = release_year

    # Update director if provided
    if data.get("director") is not None:
        director = data.get("director").strip()
        if director == "":
            return make_response(jsonify({"Error": "director cannot be empty"}), 400)
        update_fields["director"] = director

    # Update duration if provided
    if data.get("duration_minutes"):
        try:
            duration_minutes = int(data.get("duration_minutes"))
        except ValueError:
            return make_response(jsonify({"Error": "duration_minutes must be an integer"}), 400)

        if duration_minutes <= 0:
            return make_response(jsonify({"Error": "duration_minutes must be greater than 0"}), 400)

        update_fields["duration_minutes"] = duration_minutes

    # Update language if provided
    if data.get("language") is not None:
        language = data.get("language").strip()
        if language == "":
            return make_response(jsonify({"Error": "language cannot be empty"}), 400)
        update_fields["language"] = language

    # Update genres if provided
    if data.get("genres"):
        update_fields["genres"] = [g.strip() for g in data.get("genres").split(",") if g.strip()]

    # Update release country if provided
    if data.get("country") is not None:
        country = data.get("country").strip()
        if country == "":
            return make_response(jsonify({"Error": "country cannot be empty"}), 400)
        update_fields["release.country"] = country

    # Update release date if provided
    if data.get("release_date") is not None:
        release_date = data.get("release_date").strip()
        if release_date == "":
            return make_response(jsonify({"Error": "release_date cannot be empty"}), 400)
        update_fields["release.date"] = release_date

    # Update average rating if provided
    if data.get("average_rating"):
        try:
            average_rating = float(data.get("average_rating"))
        except ValueError:
            return make_response(jsonify({"Error": "average_rating must be a number"}), 400)

        if average_rating < 0 or average_rating > 10:
            return make_response(jsonify({"Error": "average_rating must be between 0 and 10"}), 400)

        update_fields["ratings.average"] = average_rating

    # Update vote count if provided
    if data.get("votes"):
        try:
            votes = int(data.get("votes"))
        except ValueError:
            return make_response(jsonify({"Error": "votes must be an integer"}), 400)

        if votes < 0:
            return make_response(jsonify({"Error": "votes cannot be negative"}), 400)

        update_fields["ratings.votes"] = votes

    # Update tags if provided
    if data.get("tags"):
        update_fields["tags"] = [t.strip() for t in data.get("tags").split(",") if t.strip()]

    # Update hero actor if provided
    if data.get("hero_name") is not None:
        hero_name = data.get("hero_name").strip()
        if hero_name == "":
            return make_response(jsonify({"Error": "hero_name cannot be empty"}), 400)
        update_fields["cast.0.actor_name"] = hero_name

    # Update villain actor if provided
    if data.get("villain_name") is not None:
        villain_name = data.get("villain_name").strip()
        if villain_name == "":
            return make_response(jsonify({"Error": "villain_name cannot be empty"}), 400)
        update_fields["cast.1.actor_name"] = villain_name

    # Apply update to database
    result = movies.update_one(
        {"movie_id": movie_id},
        {"$set": update_fields}
    )

    if result.matched_count == 1:
        update_movie_link = f"http://127.0.0.1:5001/api/movies/{movie_id}"
        return make_response(jsonify({"URL": update_movie_link}), 200)

    else:
        return make_response(jsonify({"Error": "Movie not found"}), 404)


# --------------------------------------------------
# Delete a movie and all related reviews (admin only)
# --------------------------------------------------
@movie_bp.route('/api/movies/<string:movie_id>', methods=['DELETE'])
def delete_movie(movie_id):
    admin_user = get_admin_user()

    if admin_user is None:
        return make_response(jsonify({"Error": "Admin access required"}), 403)

    result = movies.delete_one({"movie_id": movie_id})

    if result.deleted_count == 1:
        # Remove reviews linked to the deleted movie
        reviews.delete_many({"movie_id": movie_id})
        return make_response(jsonify({"message": "Movie deleted"}), 200)

    else:
        return make_response(jsonify({"Error": "Movie not found"}), 404)