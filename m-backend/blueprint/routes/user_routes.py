# Import Flask tools for API responses
from flask import Blueprint, jsonify, make_response, request
from helpers import get_admin_user

# Import users and tokens collections
from config import users, tokens


# Blueprint for user-related routes
user_bp = Blueprint('user_bp', __name__)

# --------------------------------------------------
# Get a list of all users
# --------------------------------------------------
@user_bp.route('/api/users', methods=['GET'])
def get_users():

    # Only admins can view the full user list
    admin = get_admin_user()
    if admin is None:
        return make_response(jsonify({"error": "Admin access required"}), 403)

    data_to_return = []

    # Retrieve all users from database
    users_cursor = users.find()

    for user in users_cursor:

        # Convert MongoDB ObjectId to string
        user["_id"] = str(user["_id"])

        # Remove password before returning user data
        user.pop("password", None)

        data_to_return.append(user)

    return make_response(jsonify(data_to_return), 200)


# --------------------------------------------------
# Get a single user by user_id
# --------------------------------------------------
@user_bp.route('/api/users/<string:user_id>', methods=['GET'])
def get_one_user(user_id):

    user = users.find_one({"user_id": user_id})

    if user is not None:

        user["_id"] = str(user["_id"])

        # Never expose password in API responses
        user.pop("password", None)

        return make_response(jsonify(user), 200)

    else:
        return make_response(jsonify({"Error": "User not found"}), 404)
    

# --------------------------------------------------
# Promote a user to admin (admin only)
# --------------------------------------------------
@user_bp.route('/api/users/<string:user_id>/promote', methods=['PUT'])
def promote_user(user_id):

    # Only an admin can promote others
    admin = get_admin_user()
    if admin is None:
        return make_response(jsonify({"error": "Admin access required"}), 403)

    # Can't promote yourself — you're already admin
    if user_id == admin["user_id"]:
        return make_response(jsonify({"error": "You are already an admin"}), 400)

    # Check the target user exists
    user = users.find_one({"user_id": user_id})
    if user is None:
        return make_response(jsonify({"error": "User not found"}), 404)

    # Check they aren't already an admin
    if user["role"] == "admin":
        return make_response(jsonify({"error": "User is already an admin"}), 400)

    # Promote them
    users.update_one(
        {"user_id": user_id},
        {"$set": {"role": "admin"}}
    )

    return make_response(jsonify({"message": f"{user['username']} promoted to admin"}), 200)



# --------------------------------------------------
# Delete a user by user_id
# --------------------------------------------------
@user_bp.route('/api/users/<string:user_id>', methods=['DELETE'])
def delete_user(user_id):

    # Step 1 — check the caller is logged in
    token = request.headers.get("x-access-token")
    if token is None:
        return make_response(jsonify({"error": "Token missing"}), 401)

    saved_token = tokens.find_one({"token": token})
    if saved_token is None:
        return make_response(jsonify({"error": "Invalid token"}), 401)

    logged_in_user = users.find_one({"user_id": saved_token["user_id"]})
    if logged_in_user is None:
        return make_response(jsonify({"error": "User not found"}), 401)

    # Step 2 — allow if they're deleting their own account OR they're an admin
    if logged_in_user["user_id"] != user_id and logged_in_user["role"] != "admin":
        return make_response(jsonify({"error": "Not allowed"}), 403)

    # Step 3 — admins cannot delete other admins
    target_user = users.find_one({"user_id": user_id})
    if target_user and target_user["role"] == "admin" and logged_in_user["user_id"] != user_id:
        return make_response(jsonify({"error": "Admins cannot delete other admin accounts"}), 403)

    # Step 4 — delete the user
    result = users.delete_one({"user_id": user_id})

    if result.deleted_count == 1:
        return make_response(jsonify({"message": "User deleted successfully"}), 200)
    else:
        return make_response(jsonify({"error": "User not found"}), 404)