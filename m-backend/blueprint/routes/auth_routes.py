# Import Flask utilities for creating routes and returning responses
from flask import Blueprint, request, jsonify, make_response

# Libraries used for authentication
import uuid        # Generates unique login tokens
import bcrypt      # Hashes and verifies passwords
import re          # Used to validate email format

from datetime import date

# Import MongoDB collections from config file
from config import users, tokens


# --------------------------------------------------
# Blueprint for authentication routes
# --------------------------------------------------
auth_bp = Blueprint('auth_bp', __name__)


# --------------------------------------------------
# Generate the next user ID (e.g. U001, U002, U003)
# --------------------------------------------------
def get_next_user_id():

    # Find the last inserted user sorted by user_id
    last_user = users.find_one(sort=[("user_id", -1)])

    # If there are no users yet, start from U001
    if last_user is None:
        return "U001"

    try:
        number = int(last_user["user_id"][1:]) + 1
    except:
        number = 1

    return f"U{number:03d}"


# --------------------------------------------------
# Register a new user
# --------------------------------------------------
@auth_bp.route('/api/auth/register', methods=['POST'])
def register_user():

    # Get submitted form data
    data = request.form

    # Ensure required fields are present
    if data and "username" in data and "email" in data and "password" in data:

        username = data.get("username").strip()
        email = data.get("email").strip().lower()
        password = data.get("password")
        role = "user"  # Default role is "user"

        # Prevent empty fields
        if username == "" or email == "" or password == "":
            return make_response(jsonify({"Error": "username, email and password cannot be empty"}), 400)

        # Validate email format
        email_pattern = r"^[^@]+@[^@]+\.[^@]+$"
        if not re.match(email_pattern, email):
            return make_response(jsonify({"Error": "invalid email format"}), 400)

        # Enforce minimum password length
        if len(password) < 6:
            return make_response(jsonify({"Error": "password must be at least 6 characters"}), 400)

        # Check username uniqueness
        existing_user = users.find_one({"username": username})
        if existing_user is not None:
            return make_response(jsonify({"Error": "username already exists"}), 400)

        # Check email uniqueness
        existing_email = users.find_one({"email": email})
        if existing_email is not None:
            return make_response(jsonify({"Error": "email already exists"}), 400)

        # Hash password before storing it
        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
        ).decode("utf-8")

        # Create user document
        new_user = {
            "user_id": get_next_user_id(),
            "username": username,
            "email": email,
            "password": hashed_password,
            "role": role,
            "joined_date": date.today().isoformat()
        }

        # Insert user into database
        users.insert_one(new_user)

        return make_response(jsonify({"message": "User registered successfully"}), 201)

    else:
        return make_response(jsonify({"Error": "missing data"}), 400)


# --------------------------------------------------
# Login user and generate authentication token
# --------------------------------------------------
@auth_bp.route('/api/auth/login', methods=['POST'])
def login_user():

    data = request.form

    # Require password and either username or email
    if data and "password" in data and ("username" in data or "email" in data):

        password = data.get("password")

        # Prevent empty password
        if password.strip() == "":
            return make_response(jsonify({"Error": "password cannot be empty"}), 400)

        user = None

        # Try login with username
        if data.get("username") and data.get("username").strip() != "":
            user = users.find_one({
                "username": data.get("username").strip()
            })

        # Or login with email
        elif data.get("email") and data.get("email").strip() != "":
            user = users.find_one({
                "email": data.get("email").strip().lower()
            })

        else:
            return make_response(jsonify({"Error": "username or email is required"}), 400)

        # If user does not exist
        if user is None:
            return make_response(jsonify({"Error": "Invalid username/email or password"}), 401)

        # Verify password using bcrypt
        if not bcrypt.checkpw(
                password.encode("utf-8"),
                user["password"].encode("utf-8")):

            return make_response(jsonify({"Error": "Invalid username/email or password"}), 401)

        # Generate unique session token
        token = str(uuid.uuid4())

        # Store token in tokens collection
        tokens.insert_one({
            "user_id": user["user_id"],
            "token": token
        })

        # Return login result
        return make_response(jsonify({
            "message": "Login successful",
            "token": token,
            "user_id": user["user_id"],
            "role": user["role"]
        }), 200)

    else:
        return make_response(jsonify({"Error": "missing data"}), 400)


# --------------------------------------------------
# Logout user (remove authentication token)
# --------------------------------------------------
@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout_user():

    # Token is sent via request header
    token = request.headers.get("x-access-token")

    if token is None:
        return make_response(jsonify({"Error": "Token missing"}), 401)

    # Remove token from database
    result = tokens.delete_one({"token": token})

    if result.deleted_count == 1:
        return make_response(jsonify({"message": "Logout successful"}), 200)

    else:
        return make_response(jsonify({"Error": "Invalid token"}), 401)