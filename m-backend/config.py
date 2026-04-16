# Import MongoDB client library
from pymongo import MongoClient

# Create a connection to the local MongoDB server
client = MongoClient("mongodb://localhost:27017")

# Select the MovieHub database
db = client.MovieHub_data

# Create references to each collection used in the project
movies = db.movies
users = db.users
reviews = db.reviews
tokens = db.tokens

# Enforce uniqueness at the database level
movies.create_index("movie_id", unique=True)
users.create_index("user_id", unique=True)
users.create_index("username", unique=True)
users.create_index("email", unique=True)
reviews.create_index("review_id", unique=True)