from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017")
db = client.MovieHub_data

movies    = db.movies
users     = db.users
reviews   = db.reviews
tokens    = db.tokens
watchlist = db.watchlist

# Prevent duplicate IDs and usernames at the database level
movies.create_index("movie_id",   unique=True)
users.create_index("user_id",     unique=True)
users.create_index("username",    unique=True)
users.create_index("email",       unique=True)
reviews.create_index("review_id", unique=True)

# MongoDB will automatically delete token documents when their expires_at time is reached
# expireAfterSeconds=0 means delete exactly at the stored datetime, not after an extra delay
tokens.create_index("expires_at", expireAfterSeconds=0)
