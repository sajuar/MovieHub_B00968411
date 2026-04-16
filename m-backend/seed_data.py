# Import MongoDB client
from pymongo import MongoClient

# Import JSON library to read dataset file
import json

# Import bcrypt for password hashing
import bcrypt

# Connect to MongoDB server
client = MongoClient("mongodb://localhost:27017")

# Select MovieHub database
db = client.MovieHub_data

# Reference collections
movies = db.movies
users = db.users
reviews = db.reviews
tokens = db.tokens


# ----------------------------------------------------
# Function to create unique usernames
# ----------------------------------------------------
def make_unique_username(base_username, user_id, used_usernames):

    # Clean and normalize username
    username = (base_username or "").strip().lower()

    # If username is empty, create one from user_id
    if not username:
        username = f"user_{user_id.lower()}"

    # If username is not used yet, return it
    if username not in used_usernames:
        used_usernames.add(username)
        return username

    # Otherwise generate a unique variation
    new_username = f"{username}_{user_id.lower()}"
    counter = 1

    while new_username in used_usernames:
        new_username = f"{username}_{user_id.lower()}_{counter}"
        counter += 1

    used_usernames.add(new_username)
    return new_username


# ----------------------------------------------------
# Function to generate unique emails
# ----------------------------------------------------
def make_unique_email(username, used_emails):

    email = f"{username}@moviehub.com"

    if email not in used_emails:
        used_emails.add(email)
        return email

    # If email already exists add numbers
    counter = 1
    new_email = f"{username}{counter}@moviehub.com"

    while new_email in used_emails:
        counter += 1
        new_email = f"{username}{counter}@moviehub.com"

    used_emails.add(new_email)
    return new_email


# ----------------------------------------------------
# Function to hash passwords if they are not hashed
# ----------------------------------------------------
def hash_password_if_needed(password_text):

    password_text = str(password_text)

    # Check if password is already hashed
    if password_text.startswith("$2a$") or password_text.startswith("$2b$") or password_text.startswith("$2y$"):
        return password_text

    # Hash the password using bcrypt
    return bcrypt.hashpw(
        password_text.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")


# ----------------------------------------------------
# Load dataset file
# ----------------------------------------------------
with open("moviehub_sample_dataset.json", "r", encoding="utf-8") as f:
    data = json.load(f)

entities = data.get("entities", {})

movie_data = entities.get("movies", [])
user_data = entities.get("users", [])
review_data = entities.get("reviews", [])


# Sets used to ensure usernames and emails stay unique
used_usernames = set()
used_emails = set()

prepared_users = []


# ----------------------------------------------------
# Process users before inserting into database
# ----------------------------------------------------
for user in user_data:

    user_copy = dict(user)

    user_id = user_copy.get("user_id", "").strip()
    base_username = user_copy.get("username", "").strip()
    role = user_copy.get("role", "user").strip().lower()

    # Ensure role is valid
    if role not in ["admin", "user"]:
        role = "user"

    # Generate unique username and email
    unique_username = make_unique_username(base_username, user_id, used_usernames)
    unique_email = make_unique_email(unique_username, used_emails)

    # Assign default passwords
    plain_password = "admin123" if role == "admin" else "user123"

    user_copy["username"] = unique_username
    user_copy["email"] = unique_email
    user_copy["password"] = hash_password_if_needed(plain_password)
    user_copy["role"] = role

    prepared_users.append(user_copy)


# ----------------------------------------------------
# Insert movies if collection is empty
# ----------------------------------------------------
if movies.count_documents({}) == 0:

    if movie_data:
        movies.insert_many(movie_data)
        print("Movies imported")

else:
    print("Movies collection already has data")


# ----------------------------------------------------
# Insert users if collection is empty
# ----------------------------------------------------
if users.count_documents({}) == 0:

    if prepared_users:
        users.insert_many(prepared_users)
        print("Users imported")

else:
    print("Users collection already has data")


# ----------------------------------------------------
# Insert reviews if collection is empty
# ----------------------------------------------------
if reviews.count_documents({}) == 0:

    if review_data:
        reviews.insert_many(review_data)
        print("Reviews imported")

else:
    print("Reviews collection already has data")


# ----------------------------------------------------
# Clear tokens collection (tokens should not persist)
# ----------------------------------------------------
tokens.delete_many({})
print("Tokens cleared")

print("Finished")