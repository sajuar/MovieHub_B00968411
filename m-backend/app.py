# Import Flask framework and helper functions for API responses
from flask import Flask, jsonify, make_response

# Import all blueprint route modules
from blueprint.routes.auth_routes import auth_bp
from blueprint.routes.movie_routes import movie_bp
from blueprint.routes.review_routes import review_bp
from blueprint.routes.user_routes import user_bp
from flask_cors import CORS

# Create the Flask application instance
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Register all blueprints so their routes become part of the API
app.register_blueprint(auth_bp)
app.register_blueprint(movie_bp)
app.register_blueprint(review_bp)
app.register_blueprint(user_bp)

# Root endpoint to confirm the API is running
@app.route('/', methods=['GET'])
def home():
    return make_response(jsonify({"message": "Welcome to MovieHub"}), 200)

# Global error handlers
@app.errorhandler(404)
def not_found(error):
    return make_response(jsonify({"Error": "Endpoint not found"}), 404)


@app.errorhandler(500)
def internal_error(error):
    return make_response(jsonify({"Error": "Internal server error"}), 500)

# Run the Flask development server
if __name__ == '__main__':
    app.run(debug=True, port=5001)  