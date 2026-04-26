from flask import Flask, jsonify, make_response
from flask_cors import CORS
from extensions import limiter

from blueprint.routes.auth_routes import auth_bp
from blueprint.routes.movie_routes import movie_bp
from blueprint.routes.review_routes import review_bp
from blueprint.routes.user_routes import user_bp
from blueprint.routes.watchlist_routes import watchlist_bp
from blueprint.routes.analytics_routes import analytics_bp

app = Flask(__name__)
CORS(app)

# Connect the rate limiter to this Flask app
limiter.init_app(app)

# Return a clean JSON message instead of the default HTML page when rate limit is hit
@app.errorhandler(429)
def rate_limit_exceeded(e):
    return make_response(jsonify({"Error": "Too many requests. Please wait and try again."}), 429)

app.register_blueprint(auth_bp)
app.register_blueprint(movie_bp)
app.register_blueprint(review_bp)
app.register_blueprint(user_bp)
app.register_blueprint(watchlist_bp)
app.register_blueprint(analytics_bp)

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
