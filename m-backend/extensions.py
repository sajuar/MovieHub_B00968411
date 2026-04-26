from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Defined here instead of app.py to avoid circular imports with auth_routes.py
# Rate limit counters are stored in memory — resets on server restart but works fine for development
limiter = Limiter(key_func=get_remote_address, default_limits=[], storage_uri="memory://")
