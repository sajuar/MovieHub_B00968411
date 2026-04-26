# MovieHub Frontend

Angular 17 frontend for the MovieHub Full Stack application (COM661 CW2).

## Prerequisites

- Node.js >= 18
- npm >= 9
- Angular CLI: `npm install -g @angular/cli`
- Flask backend running on **port 5001**

## Setup

```bash
# Install dependencies
npm install

# Start the dev server
ng serve
```

Then open **http://localhost:4200** in your browser.

## Building for Production

```bash
ng build
```

Output is placed in `dist/moviehub-frontend/`.

## Features

- **Browse & Search** — filter movies by title, genre, language, director, rating and year with sort and pagination
- **Movie Detail** — full movie info, cast, tags, paginated reviews with edit and delete
- **Top Rated** — ranked list sorted by average rating
- **Reviews** — logged-in users can add, edit and delete their own reviews; admins can delete any review
- **Authentication** — register and login with username or email; tokens stored in short-lived cookies with silent background refresh so the user stays signed in
- **Rate Limiting** — login and register are limited to 3 attempts per minute per IP
- **Watchlist** — logged-in users can save movies with the heart icon; dedicated watchlist page at `/watchlist`
- **Admin Dashboard** — add, edit and delete movies; analytics tab with Chart.js charts (most reviewed movies, average rating by genre, reviews per month, movies by genre)
- **Movie Sharing** — share button on each movie detail page uses Web Share API on mobile, copies link to clipboard on desktop
- **Dark / Light Mode** — toggle in the navbar, preference saved across page reloads
- **Form Validation** — inline per-field validation on login and register with password strength indicator
- **Responsive Design** — works on desktop and mobile

## Project Structure

```
src/
├── app/
│   ├── app.component.ts          # Root navbar, footer, dark mode, scroll-to-top
│   ├── app.routes.ts             # Lazy-loaded routes
│   ├── app.config.ts             # Angular providers + auth interceptor
│   ├── guards/
│   │   └── auth.guard.ts         # authGuard (login required) + adminGuard (admin only)
│   ├── interceptors/
│   │   └── auth.interceptor.ts   # Attaches token header; auto-logout on 401
│   ├── models/
│   │   └── models.ts             # TypeScript interfaces (Movie, Review, User, etc.)
│   ├── services/
│   │   ├── auth.service.ts       # Login, register, logout, cookie session, silent token refresh
│   │   ├── movie.service.ts      # All movie API calls
│   │   ├── review.service.ts     # All review API calls
│   │   ├── user.service.ts       # All user API calls
│   │   └── watchlist.service.ts  # Watchlist state (in-memory Set) + toggle with optimistic update
│   └── pages/
│       ├── home/                 # Hero slideshow, stats, genre bars, top-rated grid
│       ├── movies/               # Browse with filters, sort, pagination
│       ├── movie-detail/         # Movie info, cast, reviews CRUD, share button
│       ├── search/               # Search movies by title
│       ├── top-rated/            # Ranked list with ratings
│       ├── login/                # Login with inline validation
│       ├── register/             # Register with password strength indicator
│       ├── watchlist/            # Saved movies list
│       ├── users/                # All users, expandable info and reviews (admin)
│       ├── profile/              # My profile, my reviews
│       └── admin/
│           ├── admin.component   # Add/edit/delete movies (Movies tab)
│           └── analytics/        # Chart.js analytics dashboard (Analytics tab)
```

## API Endpoints Used

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| /api/auth/register | POST | No | Register new user (rate limited 3/min) |
| /api/auth/login | POST | No | Login, returns token (rate limited 3/min) |
| /api/auth/logout | POST | Token | Invalidate session token |
| /api/auth/refresh | POST | Token | Issue new token (called silently before expiry) |
| /api/movies | GET | No | List movies with filters, sort, pagination |
| /api/movies/search | GET | No | Search movies by title |
| /api/movies/top-rated | GET | No | Top N movies by rating |
| /api/movies/stats/genres | GET | No | Movie count per genre |
| /api/movies/:id | GET | No | Single movie detail |
| /api/movies | POST | Admin | Add a new movie |
| /api/movies/:id | PUT | Admin | Update a movie |
| /api/movies/:id | DELETE | Admin | Delete movie and its reviews |
| /api/movies/:id/reviews | GET | No | Paginated reviews for a movie |
| /api/movies/:id/reviews | POST | Token | Add a review |
| /api/reviews/:id | PUT | Owner/Admin | Edit a review |
| /api/reviews/:id | DELETE | Owner/Admin | Delete a review |
| /api/users | GET | Admin | List all users |
| /api/users/:id | GET | No | Single user profile |
| /api/users/:id/reviews | GET | No | All reviews by a user |
| /api/users/:id/promote | PUT | Admin | Promote user to admin |
| /api/users/:id | DELETE | Owner/Admin | Delete a user |
| /api/users/:id/watchlist | GET | Token | Get full watchlist with movie details |
| /api/users/:id/watchlist/ids | GET | Token | Get watchlist movie IDs only |
| /api/users/:id/watchlist/:movieId | POST | Token | Add movie to watchlist |
| /api/users/:id/watchlist/:movieId | DELETE | Token | Remove movie from watchlist |
| /api/admin/analytics | GET | Admin | Aggregated stats for charts |

## Security Notes

- Auth token stored in **short-lived cookies** (5-minute expiry, SameSite=Lax) — not localStorage
- Silent refresh runs 60 seconds before expiry so active users stay signed in
- Token is rotated on every login — old tokens are deleted immediately
- MongoDB TTL index auto-deletes expired tokens from the database
- Login and register endpoints are **rate limited to 3 requests per minute** per IP using Flask-Limiter — prevents brute force attacks
- All POST/PUT requests use `FormData` (matching Flask `request.form`)
- Token sent as `x-access-token` header on protected routes
