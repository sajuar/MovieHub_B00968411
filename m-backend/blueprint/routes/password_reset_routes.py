from flask import Blueprint, request, jsonify, make_response, current_app
from flask_mail import Message
from extensions import limiter
import uuid
import bcrypt
from datetime import datetime, timedelta, timezone
from config import users, tokens

password_reset_bp = Blueprint('password_reset_bp', __name__)

RESET_TOKEN_EXPIRY_MINUTES = 30


@password_reset_bp.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit("3 per minute")
def forgot_password():
    data  = request.form
    email = data.get('email', '').strip().lower()

    if not email:
        return make_response(jsonify({"Error": "Email is required"}), 400)

    user = users.find_one({"email": email})

    # Always return success even if email not found — prevents email enumeration
    if user is None:
        return make_response(jsonify({"message": "If that email exists, a reset link has been sent."}), 200)

    # Delete any existing reset tokens for this user
    tokens.delete_many({"user_id": user["user_id"], "type": "password_reset"})

    reset_token = str(uuid.uuid4())
    expires_at  = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_EXPIRY_MINUTES)

    tokens.insert_one({
        "user_id":    user["user_id"],
        "token":      reset_token,
        "type":       "password_reset",
        "expires_at": expires_at
    })

    # Build the reset link pointing to the Angular frontend
    reset_link = f"http://localhost:4200/reset-password?token={reset_token}"

    mail = current_app.extensions['mail']
    msg  = Message(
        subject = "MovieHub — Password Reset",
        recipients = [email],
        html = f"""
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem">
          <h2 style="color:#E8A020">MovieHub</h2>
          <p>Hi <strong>{user['username']}</strong>,</p>
          <p>We received a request to reset your password. Click the button below to set a new one.</p>
          <a href="{reset_link}"
             style="display:inline-block;background:#E8A020;color:#080C14;padding:12px 28px;
                    border-radius:8px;text-decoration:none;font-weight:700;margin:1rem 0">
            Reset Password
          </a>
          <p style="color:#666;font-size:0.85rem">
            This link expires in {RESET_TOKEN_EXPIRY_MINUTES} minutes.<br>
            If you did not request this, you can safely ignore this email.
          </p>
        </div>
        """
    )
    mail.send(msg)

    return make_response(jsonify({"message": "If that email exists, a reset link has been sent."}), 200)


@password_reset_bp.route('/api/auth/reset-password', methods=['POST'])
def reset_password():
    data     = request.form
    token    = data.get('token', '').strip()
    password = data.get('password', '').strip()

    if not token or not password:
        return make_response(jsonify({"Error": "Token and new password are required"}), 400)

    if len(password) < 6:
        return make_response(jsonify({"Error": "Password must be at least 6 characters"}), 400)

    saved = tokens.find_one({"token": token, "type": "password_reset"})

    if saved is None:
        return make_response(jsonify({"Error": "Invalid or expired reset link"}), 400)

    exp = saved["expires_at"]
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp <= datetime.now(timezone.utc):
        tokens.delete_one({"token": token})
        return make_response(jsonify({"Error": "Reset link has expired. Please request a new one."}), 400)

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    users.update_one(
        {"user_id": saved["user_id"]},
        {"$set": {"password": hashed}}
    )

    # Invalidate the reset token and all active session tokens for this user
    tokens.delete_many({"user_id": saved["user_id"]})

    return make_response(jsonify({"message": "Password reset successfully. You can now log in."}), 200)
