from flask import Blueprint, request, jsonify, make_response
import uuid
import bcrypt
import re
from datetime import date, datetime, timedelta, timezone
from config import users, tokens
from extensions import limiter

# Tokens expire after 5 minutes — the frontend silently refreshes them before they run out
TOKEN_LIFETIME_MINUTES = 5

auth_bp = Blueprint('auth_bp', __name__)


def get_next_user_id():
    last_user = users.find_one(sort=[("user_id", -1)])
    if last_user is None:
        return "U001"
    try:
        number = int(last_user["user_id"][1:]) + 1
    except:
        number = 1
    return f"U{number:03d}"


@auth_bp.route('/api/auth/register', methods=['POST'])
@limiter.limit("3 per minute")
def register_user():
    data = request.form

    if data and "username" in data and "email" in data and "password" in data:
        username = data.get("username").strip()
        email    = data.get("email").strip().lower()
        password = data.get("password")
        role     = "user"

        if username == "" or email == "" or password == "":
            return make_response(jsonify({"Error": "username, email and password cannot be empty"}), 400)

        email_pattern = r"^[^@]+@[^@]+\.[^@]+$"
        if not re.match(email_pattern, email):
            return make_response(jsonify({"Error": "invalid email format"}), 400)

        if len(password) < 6:
            return make_response(jsonify({"Error": "password must be at least 6 characters"}), 400)

        if users.find_one({"username": username}) is not None:
            return make_response(jsonify({"Error": "username already exists"}), 400)

        if users.find_one({"email": email}) is not None:
            return make_response(jsonify({"Error": "email already exists"}), 400)

        # Hash password with bcrypt before storing — never store plain text passwords
        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt()
        ).decode("utf-8")

        new_user = {
            "user_id":     get_next_user_id(),
            "username":    username,
            "email":       email,
            "password":    hashed_password,
            "role":        role,
            "joined_date": date.today().isoformat()
        }

        users.insert_one(new_user)
        return make_response(jsonify({"message": "User registered successfully"}), 201)

    else:
        return make_response(jsonify({"Error": "missing data"}), 400)


@auth_bp.route('/api/auth/login', methods=['POST'])
@limiter.limit("3 per minute")
def login_user():
    data = request.form

    if data and "password" in data and ("username" in data or "email" in data):
        password = data.get("password")

        if password.strip() == "":
            return make_response(jsonify({"Error": "password cannot be empty"}), 400)

        user = None
        if data.get("username") and data.get("username").strip() != "":
            user = users.find_one({"username": data.get("username").strip()})
        elif data.get("email") and data.get("email").strip() != "":
            user = users.find_one({"email": data.get("email").strip().lower()})
        else:
            return make_response(jsonify({"Error": "username or email is required"}), 400)

        if user is None:
            return make_response(jsonify({"Error": "Invalid username/email or password"}), 401)

        if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
            return make_response(jsonify({"Error": "Invalid username/email or password"}), 401)

        # Delete old tokens so only one active session exists per user (token rotation)
        tokens.delete_many({"user_id": user["user_id"]})

        token      = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTES)

        tokens.insert_one({
            "user_id":    user["user_id"],
            "token":      token,
            "expires_at": expires_at
        })

        return make_response(jsonify({
            "message":    "Login successful",
            "token":      token,
            "user_id":    user["user_id"],
            "username":   user["username"],
            "role":       user["role"],
            "expires_in": TOKEN_LIFETIME_MINUTES * 60
        }), 200)

    else:
        return make_response(jsonify({"Error": "missing data"}), 400)


# Called by the Angular frontend about 60 seconds before the token expires.
# Issues a new token so the user stays logged in without noticing.
@auth_bp.route('/api/auth/refresh', methods=['POST'])
def refresh_token():
    token = request.headers.get("x-access-token")

    if token is None:
        return make_response(jsonify({"Error": "Token missing"}), 401)

    saved_token = tokens.find_one({"token": token})
    if saved_token is None:
        return make_response(jsonify({"Error": "Invalid token"}), 401)

    expires_at = saved_token.get("expires_at")
    if expires_at and expires_at <= datetime.utcnow():
        tokens.delete_one({"token": token})
        return make_response(jsonify({"Error": "Token expired"}), 401)

    user_id = saved_token["user_id"]
    tokens.delete_one({"token": token})

    new_token      = str(uuid.uuid4())
    new_expires_at = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_LIFETIME_MINUTES)

    tokens.insert_one({
        "user_id":    user_id,
        "token":      new_token,
        "expires_at": new_expires_at
    })

    return make_response(jsonify({
        "token":      new_token,
        "expires_in": TOKEN_LIFETIME_MINUTES * 60
    }), 200)


@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout_user():
    token = request.headers.get("x-access-token")

    if token is None:
        return make_response(jsonify({"Error": "Token missing"}), 401)

    result = tokens.delete_one({"token": token})

    if result.deleted_count == 1:
        return make_response(jsonify({"message": "Logout successful"}), 200)
    else:
        return make_response(jsonify({"Error": "Invalid token"}), 401)
