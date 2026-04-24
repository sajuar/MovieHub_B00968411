from flask import Blueprint, request, jsonify, make_response
import uuid
import bcrypt
import re
from datetime import date, datetime, timedelta, timezone
from config import users, tokens

# Short-lived token lifetime — keeps sessions secure while
# the frontend's silent refresh keeps active users signed in
TOKEN_LIFETIME_MINUTES = 5

auth_bp = Blueprint('auth_bp', __name__)


# ── ID generator ────────────────────────────────────────────────────────────
def get_next_user_id():
    last_user = users.find_one(sort=[("user_id", -1)])
    if last_user is None:
        return "U001"
    try:
        number = int(last_user["user_id"][1:]) + 1
    except:
        number = 1
    return f"U{number:03d}"


# ── Register ─────────────────────────────────────────────────────────────────
# Validates all fields, hashes the password with bcrypt (never stored in
# plain text), then inserts the new user document.
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/auth/register', methods=['POST'])
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

        # Hash the password before storing — bcrypt salts automatically
        hashed_password = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt()
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


# ── Login ────────────────────────────────────────────────────────────────────
# Accepts either username or email + password.
# On success:
#   1. Deletes any existing tokens for this user (token rotation — a new token
#      is issued on every login, old ones are invalidated immediately).
#   2. Creates a fresh token with a short expiry stored in MongoDB.
#   3. Returns the token and user details to the frontend.
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/auth/login', methods=['POST'])
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

        # Verify password against the stored bcrypt hash
        if not bcrypt.checkpw(password.encode("utf-8"), user["password"].encode("utf-8")):
            return make_response(jsonify({"Error": "Invalid username/email or password"}), 401)

        # Token rotation: remove old tokens so only one active session exists
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


# ── Refresh token ────────────────────────────────────────────────────────────
# Called automatically by the Angular frontend ~60 seconds before the current
# token expires.  Issues a brand-new token and deletes the old one so the user
# stays signed in without interruption while short-lived tokens remain secure.
# ─────────────────────────────────────────────────────────────────────────────
@auth_bp.route('/api/auth/refresh', methods=['POST'])
def refresh_token():
    token = request.headers.get("x-access-token")

    if token is None:
        return make_response(jsonify({"Error": "Token missing"}), 401)

    saved_token = tokens.find_one({"token": token})

    if saved_token is None:
        return make_response(jsonify({"Error": "Invalid token"}), 401)

    # Reject if already expired
    expires_at = saved_token.get("expires_at")
    if expires_at and expires_at <= datetime.utcnow():
        tokens.delete_one({"token": token})
        return make_response(jsonify({"Error": "Token expired"}), 401)

    # Rotate: delete old token and issue a fresh one
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


# ── Logout ───────────────────────────────────────────────────────────────────
# Deletes the token from the database immediately, invalidating the session.
# The frontend also clears all session cookies on its side.
# ─────────────────────────────────────────────────────────────────────────────
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
