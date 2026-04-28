"""
MovieHub Backend — Integration Tests
Run with:  pytest test_routes.py -v
Requires:  Flask app running with MongoDB on mongodb://localhost:27017
"""
import pytest
from app import app as flask_app


@pytest.fixture
def client():
    flask_app.config['TESTING'] = True
    with flask_app.test_client() as client:
        yield client


# ──────────────────────────────────────────────
# Home
# ──────────────────────────────────────────────
class TestHomeEndpoint:
    def test_home_returns_200(self, client):
        res = client.get('/')
        assert res.status_code == 200
        assert 'message' in res.get_json()

    def test_unknown_route_returns_404(self, client):
        res = client.get('/api/nonexistent-route')
        assert res.status_code == 404


# ──────────────────────────────────────────────
# Movies — read endpoints (public)
# ──────────────────────────────────────────────
class TestMovieReadEndpoints:
    def test_get_movies_returns_200_and_list(self, client):
        res  = client.get('/api/movies')
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data, list)

    def test_get_movies_with_genre_filter_returns_list(self, client):
        res  = client.get('/api/movies?genre=Action')
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data, list)

    def test_get_movies_with_pagination_params(self, client):
        res  = client.get('/api/movies?pn=1&ps=3')
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data, list)
        assert len(data) <= 3

    def test_get_movies_with_sort_by_title(self, client):
        res = client.get('/api/movies?sort_by=title&order=asc')
        assert res.status_code == 200

    def test_get_movies_invalid_sort_field_returns_400(self, client):
        res = client.get('/api/movies?sort_by=invalid_column')
        assert res.status_code == 400

    def test_get_movies_invalid_order_returns_400(self, client):
        res = client.get('/api/movies?order=random')
        assert res.status_code == 400

    def test_search_movies_by_title_returns_list(self, client):
        res  = client.get('/api/movies/search?title=the')
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data, list)

    def test_search_movies_missing_title_param_returns_400(self, client):
        res = client.get('/api/movies/search')
        assert res.status_code == 400

    def test_get_top_rated_returns_sorted_list(self, client):
        res  = client.get('/api/movies/top-rated')
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data, list)

    def test_get_top_rated_respects_limit_param(self, client):
        res  = client.get('/api/movies/top-rated?limit=3')
        data = res.get_json()
        assert res.status_code == 200
        assert len(data) <= 3

    def test_get_genre_stats_returns_list_with_genre_and_count(self, client):
        res  = client.get('/api/movies/stats/genres')
        data = res.get_json()
        assert res.status_code == 200
        assert isinstance(data, list)
        if len(data) > 0:
            assert 'genre' in data[0]
            assert 'count' in data[0]

    def test_get_single_movie_returns_404_for_nonexistent_id(self, client):
        res  = client.get('/api/movies/NONEXISTENT_XYZ_999')
        data = res.get_json()
        assert res.status_code == 404
        assert 'Error' in data

    def test_get_reviews_for_nonexistent_movie_returns_404(self, client):
        res = client.get('/api/movies/NONEXISTENT_XYZ_999/reviews')
        assert res.status_code == 404


# ──────────────────────────────────────────────
# Movies — write endpoints (admin required)
# ──────────────────────────────────────────────
class TestMovieWriteEndpoints:
    def test_add_movie_without_auth_returns_403(self, client):
        res = client.post('/api/movies', data={
            'title': 'Unauthorised Movie',
            'release_year': '2026',
            'director': 'No One'
        })
        assert res.status_code == 403

    def test_update_movie_without_auth_returns_403(self, client):
        res = client.put('/api/movies/M001', data={'title': 'New Title'})
        assert res.status_code == 403

    def test_delete_movie_without_auth_returns_403(self, client):
        res = client.delete('/api/movies/M001')
        assert res.status_code == 403


# ──────────────────────────────────────────────
# Authentication
# ──────────────────────────────────────────────
class TestAuthEndpoints:
    def test_register_missing_fields_returns_400(self, client):
        res = client.post('/api/auth/register', data={'username': 'onlyusername'})
        assert res.status_code == 400

    def test_register_invalid_email_format_returns_400(self, client):
        res = client.post('/api/auth/register', data={
            'username': 'validuser_test_x1',
            'email':    'not-an-email',
            'password': 'password123'
        })
        assert res.status_code == 400

    def test_register_password_too_short_returns_400(self, client):
        res = client.post('/api/auth/register', data={
            'username': 'validuser_test_x2',
            'email':    'x2@testmovie.com',
            'password': 'abc'
        })
        assert res.status_code == 400

    def test_login_missing_password_returns_400(self, client):
        res = client.post('/api/auth/login', data={'username': 'someuser'})
        assert res.status_code == 400

    def test_login_wrong_credentials_returns_401(self, client):
        res = client.post('/api/auth/login', data={
            'username': 'nonexistent_user_xyz_999',
            'password': 'wrongpassword'
        })
        assert res.status_code == 401

    def test_logout_without_token_returns_401(self, client):
        res = client.post('/api/auth/logout')
        assert res.status_code == 401

    def test_logout_with_invalid_token_returns_401(self, client):
        res = client.post('/api/auth/logout', headers={'x-access-token': 'fake-token-xyz'})
        assert res.status_code == 401

    def test_forgot_password_missing_email_returns_400(self, client):
        res = client.post('/api/auth/forgot-password', data={})
        assert res.status_code == 400

    def test_forgot_password_unknown_email_still_returns_200(self, client):
        # Returns 200 regardless to prevent email enumeration attacks
        res  = client.post('/api/auth/forgot-password', data={'email': 'notregistered@nowhere.com'})
        data = res.get_json()
        assert res.status_code == 200
        assert 'message' in data

    def test_reset_password_missing_token_returns_400(self, client):
        res = client.post('/api/auth/reset-password', data={'password': 'newpassword123'})
        assert res.status_code == 400

    def test_reset_password_invalid_token_returns_400(self, client):
        res = client.post('/api/auth/reset-password', data={
            'token':    'completely-invalid-token-xyz',
            'password': 'newpassword123'
        })
        assert res.status_code == 400

    def test_token_refresh_without_token_returns_401(self, client):
        res = client.post('/api/auth/refresh')
        assert res.status_code == 401


# ──────────────────────────────────────────────
# Reviews
# ──────────────────────────────────────────────
class TestReviewEndpoints:
    def test_add_review_without_auth_returns_401(self, client):
        res = client.post('/api/movies/M001/reviews', data={'rating': '7', 'comment': 'Good film'})
        assert res.status_code == 401

    def test_edit_review_without_auth_returns_401(self, client):
        res = client.put('/api/reviews/R001', data={'rating': '8'})
        assert res.status_code == 401

    def test_delete_review_without_auth_returns_401(self, client):
        res = client.delete('/api/reviews/R001')
        assert res.status_code == 401

    def test_vote_with_invalid_type_returns_400_before_auth_check(self, client):
        # vote_type validation runs before the auth check — so this returns 400 without a token
        res  = client.post('/api/reviews/R001/vote/thumbs_up')
        data = res.get_json()
        assert res.status_code == 400
        assert 'Error' in data

    def test_vote_helpful_without_auth_returns_401(self, client):
        res = client.post('/api/reviews/R001/vote/helpful')
        assert res.status_code == 401


# ──────────────────────────────────────────────
# Users
# ──────────────────────────────────────────────
class TestUserEndpoints:
    def test_get_all_users_without_auth_returns_403(self, client):
        res = client.get('/api/users')
        assert res.status_code == 403

    def test_get_user_by_nonexistent_id_returns_404(self, client):
        res  = client.get('/api/users/NONEXISTENT_USER_999')
        data = res.get_json()
        assert res.status_code == 404
        assert 'Error' in data

    def test_promote_user_without_auth_returns_403(self, client):
        res = client.put('/api/users/U002/promote')
        assert res.status_code == 403

    def test_delete_user_without_token_returns_401(self, client):
        res = client.delete('/api/users/U001')
        assert res.status_code == 401


# ──────────────────────────────────────────────
# Watchlist
# ──────────────────────────────────────────────
class TestWatchlistEndpoints:
    def test_get_watchlist_without_auth_returns_401(self, client):
        res = client.get('/api/users/U001/watchlist')
        assert res.status_code == 401

    def test_get_watchlist_ids_without_auth_returns_401(self, client):
        res = client.get('/api/users/U001/watchlist/ids')
        assert res.status_code == 401

    def test_add_to_watchlist_without_auth_returns_401(self, client):
        res = client.post('/api/users/U001/watchlist/M001')
        assert res.status_code == 401

    def test_remove_from_watchlist_without_auth_returns_401(self, client):
        res = client.delete('/api/users/U001/watchlist/M001')
        assert res.status_code == 401


# ──────────────────────────────────────────────
# Admin Analytics
# ──────────────────────────────────────────────
class TestAnalyticsEndpoints:
    def test_analytics_without_auth_returns_403(self, client):
        res = client.get('/api/admin/analytics')
        assert res.status_code == 403


# ──────────────────────────────────────────────
# Contact
# ──────────────────────────────────────────────
class TestContactEndpoint:
    def test_contact_missing_required_fields_returns_400(self, client):
        res = client.post('/api/contact', data={'name': 'Test Only'})
        assert res.status_code == 400

    def test_contact_valid_submission_returns_200(self, client):
        res  = client.post('/api/contact', data={
            'name':    'Test User',
            'email':   'test@testmovie.com',
            'subject': 'Test Subject',
            'message': 'This is a test message from the automated test suite.'
        })
        data = res.get_json()
        assert res.status_code == 200
        assert 'message' in data
