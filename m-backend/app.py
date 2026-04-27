import os
from flask import Flask, jsonify, make_response, request as flask_request
from flask_cors import CORS
from flask_mail import Mail
from dotenv import load_dotenv
from extensions import limiter

from blueprint.routes.auth_routes import auth_bp
from blueprint.routes.movie_routes import movie_bp
from blueprint.routes.review_routes import review_bp
from blueprint.routes.user_routes import user_bp
from blueprint.routes.watchlist_routes import watchlist_bp
from blueprint.routes.analytics_routes import analytics_bp
from blueprint.routes.password_reset_routes import password_reset_bp

load_dotenv()

app = Flask(__name__)

# Secret key required by Flask internals — loaded from .env
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'fallback-dev-key')

# Restrict CORS to the Angular dev server only — prevents other origins
# from making requests to the API
CORS(app, origins=['http://localhost:4200'])

# Flask-Mail configuration using Gmail credentials stored in .env
app.config['MAIL_SERVER']         = 'smtp.gmail.com'
app.config['MAIL_PORT']           = 587
app.config['MAIL_USE_TLS']        = True
app.config['MAIL_USERNAME']       = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD']       = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = ('MovieHub', os.getenv('MAIL_USERNAME'))

mail = Mail(app)
limiter.init_app(app)

@app.errorhandler(429)
def rate_limit_exceeded(e):
    return make_response(jsonify({"Error": "Too many requests. Please wait and try again."}), 429)

app.register_blueprint(auth_bp)
app.register_blueprint(movie_bp)
app.register_blueprint(review_bp)
app.register_blueprint(user_bp)
app.register_blueprint(watchlist_bp)
app.register_blueprint(analytics_bp)
app.register_blueprint(password_reset_bp)

@app.route('/api/contact', methods=['POST'])
def contact():
    data    = flask_request.form
    name    = data.get('name',    '').strip()
    email   = data.get('email',   '').strip()
    subject = data.get('subject', 'General Enquiry').strip()
    message = data.get('message', '').strip()

    if not name or not email or not message:
        return make_response(jsonify({"Error": "Name, email and message are required"}), 400)

    print("\n" + "="*60)
    print(f"  CONTACT FORM SUBMISSION")
    print(f"  From   : {name} ({email})")
    print(f"  Subject: {subject}")
    print(f"  Message: {message}")
    print("="*60 + "\n")

    return make_response(jsonify({"message": "Message received"}), 200)


@app.route('/', methods=['GET'])
def home():
    return make_response(jsonify({"message": "Welcome to MovieHub"}), 200)

@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({"Error": "Endpoint not found"}), 404)

@app.errorhandler(500)
def internal_error(error):
    return make_response(jsonify({"Error": "Internal server error"}), 500)

if __name__ == '__main__':
    app.run(debug=True, port=5001)
