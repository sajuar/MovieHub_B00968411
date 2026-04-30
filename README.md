<div align="center">

# 🎬 MovieHub

**A full-stack movie review and discovery platform**

![Angular](https://img.shields.io/badge/Angular-21-DD0031?style=flat-square&logo=angular)
![Flask](https://img.shields.io/badge/Flask-3.1-000000?style=flat-square&logo=flask)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?style=flat-square&logo=mongodb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)
![Python](https://img.shields.io/badge/Python-3.14-3776AB?style=flat-square&logo=python)


</div>

---

## Overview

MovieHub is a full-stack web application that allows users to browse a curated catalogue of films, write community reviews, manage a personal watchlist, and share movies. Administrators have access to a live analytics dashboard and full content management tools.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Setup & Installation](#setup--installation)
- [Environment Variables](#environment-variables)
- [Security](#security)
- [Role & Permission Matrix](#role--permission-matrix)

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Frontend | Angular | 21 | SPA — standalone components, lazy loading |
| Frontend | TypeScript | 5.9 | Static typing |
| Frontend | Bootstrap | 5.3 | UI layout and components |
| Frontend | Chart.js | 4.5 | Admin analytics charts |
| Backend | Flask | 3.1 | REST API server |
| Backend | Flask-CORS | 5.0 | Cross-origin request handling |
| Backend | Flask-Limiter | 3.9 | Rate limiting on auth endpoints |
| Backend | Flask-Mail | 0.10 | Password reset emails |
| Backend | bcrypt | 5.0 | Password hashing |
| Database | MongoDB | 7.x | NoSQL document store |
| Database | PyMongo | 4.16 | Python MongoDB driver |
| Auth | UUID tokens | — | Session tokens with MongoDB TTL index |

---

## Features

<details>
<summary><strong>All Visitors</strong></summary>

- **Hero Slideshow** — auto-advancing backdrop of top-rated films with dot navigation
- **Browse & Filter** — paginated catalogue filterable by title, genre, language, director, rating, and year
- **Sort** — by title, release year, average rating, director, or language (asc/desc)
- **Movie Detail** — cast, genres, tags, runtime, language, and community rating
- **Top Rated** — ranked list ordered by average community rating
- **Quick Search** — global search bar in the navbar
- **Dark / Light Mode** — toggle with preference persisted across reloads

</details>

<details>
<summary><strong>Registered Users</strong></summary>

- **Authentication** — register or login with username or email; inline validation with password strength indicator
- **Secure Sessions** — token stored in a short-lived cookie, never in `localStorage`
- **Silent Refresh** — token refreshed 60 seconds before expiry; active users are never interrupted
- **Sliding Session** — every authenticated request extends the session
- **Reviews** — rate movies 1–10, leave a comment; one review per movie per user
- **Edit / Delete Own Reviews**
- **Helpful Votes** — vote reviews as Helpful or Not Helpful; mutually exclusive; cannot vote own reviews
- **Watchlist** — save movies with the heart icon; dedicated `/watchlist` page
- **Movie Sharing** — Web Share API on mobile; clipboard copy on desktop
- **Password Reset** — reset link sent by email; expires in 30 minutes
- **Profile Page** — account details and review history

</details>

<details>
<summary><strong>Administrators</strong></summary>

- **Movie Management** — add, edit, and delete movies
- **Review Moderation** — delete any review; admins cannot write or edit reviews
- **User Management** — view all users, promote to admin, delete accounts
- **Analytics Dashboard** — four Chart.js charts: most reviewed movies, average rating by genre, reviews per month (last 6), movie count by genre

</details>

---

## Project Structure

```
MovieHub_B00968411/
│
├── m-backend/
│   ├── app.py                     # App factory — blueprints, CORS, Mail, Limiter
│   ├── config.py                  # MongoDB connection, collections, indexes
│   ├── helpers.py                 # Token validation, sliding session
│   ├── extensions.py              # Flask-Limiter instance
│   ├── seed_data.py               # Database seed script
│   ├── test_routes.py             # Integration tests (46 tests)
│   ├── requirements.txt
│   ├── .env
│   ├── .env.example
│   └── blueprint/routes/
│       ├── auth_routes.py
│       ├── movie_routes.py
│       ├── review_routes.py
│       ├── user_routes.py
│       ├── watchlist_routes.py
│       ├── analytics_routes.py
│       └── password_reset_routes.py
│
└── m-frontend/moviehub-frontend/
    └── src/
        ├── styles.css             # Global CSS design tokens (dark/light)
        └── app/
            ├── app.component.ts
            ├── app.routes.ts
            ├── app.config.ts
            ├── guards/
            │   └── auth.guard.ts
            ├── interceptors/
            │   └── auth.interceptor.ts
            ├── models/
            │   └── models.ts
            ├── services/
            │   ├── auth.service.ts
            │   ├── movie.service.ts
            │   ├── review.service.ts
            │   ├── user.service.ts
            │   └── watchlist.service.ts
            └── pages/
                ├── home/
                ├── movies/
                ├── movie-detail/
                ├── top-rated/
                ├── login/
                ├── register/
                ├── watchlist/
                ├── profile/
                ├── users/
                ├── forgot-password/
                ├── reset-password/
                └── admin/
                    └── analytics/
```

---

## Database Schema

MovieHub uses MongoDB with four collections. Relationships are maintained through shared ID fields.

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │         │   reviews    │         │    movies    │
│──────────────│         │──────────────│         │──────────────│
│ user_id  PK  │──────<  │ user_id  FK  │  >──────│ movie_id PK  │
│ username     │         │ movie_id FK  │         │ title        │
│ email        │         │ review_id PK │         │ release_year │
│ password     │         │ rating       │         │ genres[]     │
│ role         │         │ comment      │         │ director     │
│ joined_date  │         │ review_date  │         │ language     │
└──────────────┘         │ helpful_votes│         │ duration     │
        │                └──────────────┘         │ cast[]       │
        │                                         │ ratings{}    │
        │                ┌──────────────┐         │ tags[]       │
        │                │  watchlist   │         └──────────────┘
        └───────────────>│──────────────│
                         │ user_id  FK  │
                         │ movie_id FK  │         ┌──────────────┐
                         │ added_at     │         │    tokens    │
                         └──────────────┘         │──────────────│
                                                  │ user_id  FK  │
                                                  │ token        │
                                                  │ type         │
                                                  │ expires_at   │
                                                  └──────────────┘
```

### Collection Schemas

<details>
<summary><strong>movies</strong></summary>

| Field | Type | Notes |
|---|---|---|
| `movie_id` | String | Primary key, e.g. `M001` |
| `title` | String | |
| `release_year` | Integer | 1888–2100 |
| `genres` | Array\<String\> | |
| `duration_minutes` | Integer | |
| `director` | String | |
| `language` | String | |
| `release.country` | String | |
| `release.date` | String | ISO date |
| `cast` | Array\<Object\> | `[{ actor_name, role }]` |
| `ratings.average` | Float | Recalculated on each review change |
| `ratings.votes` | Integer | |
| `tags` | Array\<String\> | |
| `image_url` | String | Optional poster URL |

</details>

<details>
<summary><strong>users</strong></summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | String | Primary key, e.g. `U001` |
| `username` | String | Unique |
| `email` | String | Unique, lowercased |
| `password` | String | bcrypt hash |
| `role` | String | `"user"` or `"admin"` |
| `joined_date` | String | ISO date |

</details>

<details>
<summary><strong>reviews</strong></summary>

| Field | Type | Notes |
|---|---|---|
| `review_id` | String | Primary key, e.g. `R001` |
| `movie_id` | String | Foreign key |
| `user_id` | String | Foreign key |
| `rating` | Integer | 1–10 |
| `comment` | String | |
| `review_date` | String | ISO date |
| `helpful_votes` | Integer | |
| `helpful_votes_users` | Array\<String\> | User IDs who voted helpful |
| `not_helpful_votes` | Integer | |
| `not_helpful_votes_users` | Array\<String\> | |

</details>

<details>
<summary><strong>tokens</strong></summary>

| Field | Type | Notes |
|---|---|---|
| `user_id` | String | Foreign key |
| `token` | String | UUID v4 |
| `type` | String | `"session"` or `"password_reset"` |
| `expires_at` | DateTime (UTC) | TTL index — auto-deleted by MongoDB on expiry |

</details>

---

## API Reference

All endpoints are prefixed with `/api`. Protected endpoints require the `x-access-token` header.

### Authentication

| Method | Endpoint | Auth | Rate Limit | Description |
|---|---|---|---|---|
| `POST` | `/api/auth/register` | — | 3/min | Register a new user |
| `POST` | `/api/auth/login` | — | 3/min | Login; returns session token |
| `POST` | `/api/auth/logout` | Token | — | Invalidate session token |
| `POST` | `/api/auth/refresh` | Token | — | Silent token refresh |
| `POST` | `/api/auth/forgot-password` | — | 3/min | Send password reset email |
| `POST` | `/api/auth/reset-password` | — | — | Set new password via reset token |

### Movies

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/movies` | — | Paginated list — params: `title`, `genre`, `language`, `director`, `min_rating`, `release_year`, `sort_by`, `order`, `pn`, `ps` |
| `GET` | `/api/movies/search` | — | Title search — param: `title` |
| `GET` | `/api/movies/top-rated` | — | Top N movies — param: `limit` |
| `GET` | `/api/movies/stats/genres` | — | Movie count per genre |
| `GET` | `/api/movies/:id` | — | Single movie |
| `POST` | `/api/movies` | Admin | Add movie |
| `PUT` | `/api/movies/:id` | Admin | Update movie |
| `DELETE` | `/api/movies/:id` | Admin | Delete movie and all its reviews |

### Reviews

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/movies/:id/reviews` | — | Paginated reviews — params: `pn`, `ps` |
| `GET` | `/api/users/:id/reviews` | — | All reviews by a user |
| `POST` | `/api/movies/:id/reviews` | User | Add review (admins blocked) |
| `PUT` | `/api/reviews/:id` | Owner | Edit review (admins blocked) |
| `DELETE` | `/api/reviews/:id` | Owner / Admin | Delete review |
| `POST` | `/api/reviews/:id/vote/:type` | User | Toggle helpful / not_helpful vote |

### Users

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users` | Admin | List all users |
| `GET` | `/api/users/:id` | — | Single user profile |
| `PUT` | `/api/users/:id/promote` | Admin | Promote to admin |
| `DELETE` | `/api/users/:id` | Owner / Admin | Delete account |

### Watchlist

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/users/:id/watchlist` | Token | Full watchlist with movie details |
| `GET` | `/api/users/:id/watchlist/ids` | Token | Watchlist movie IDs only |
| `POST` | `/api/users/:id/watchlist/:movie_id` | Token | Add to watchlist |
| `DELETE` | `/api/users/:id/watchlist/:movie_id` | Token | Remove from watchlist |

### Admin & Analytics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/analytics` | Admin | Totals, top reviewed, avg rating by genre, reviews per month, genre counts |
| `POST` | `/api/contact` | — | Contact form submission |

---

## Setup & Installation

### Prerequisites

| Tool | Minimum Version |
|---|---|
| Python | 3.10+ |
| Node.js | 18+ |
| MongoDB | 7.x |
| Angular CLI | Latest — `npm install -g @angular/cli` |

### Backend

```bash
cd m-backend
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env        # fill in credentials
python seed_data.py         # seeds the database from data/ folder
python app.py               # http://localhost:5001
```

### Frontend

```bash
cd m-frontend/moviehub-frontend
npm install
ng serve                    # http://localhost:4200
```

Both servers must be running simultaneously. The Angular app communicates with Flask directly via CORS — no proxy configuration required.

### Test Accounts

After running `seed_data.py` the following accounts are available:

| Role | Username | Password |
|---|---|---|
| Admin | `sh` | `admin123` |
| Admin | `parkeranderson` | `admin123` |
| User | any other username | `user123` |

> Admin accounts have access to the Movies management panel, Analytics dashboard, and User management. The seed script prints these credentials to the terminal when it completes.

---

## Environment Variables

Create `m-backend/.env` from `.env.example`:

```env
SECRET_KEY=your-secret-key
MAIL_USERNAME=your-gmail@gmail.com
MAIL_PASSWORD=your-gmail-app-password
```

> `MAIL_PASSWORD` must be a **Gmail App Password** generated under  
> Google Account → Security → 2-Step Verification → App Passwords.  
> The `.env` file is excluded from version control via `.gitignore`.

---

## Security

| Feature | Implementation |
|---|---|
| Token storage | Short-lived cookies (5-min expiry) — not `localStorage` |
| Silent refresh | Scheduled 60 s before expiry — active users never interrupted |
| Sliding session | Every authenticated request extends token expiry |
| Token rotation | Login deletes all previous tokens; new token on each login |
| Auto-expiry | MongoDB TTL index deletes expired tokens automatically |
| Password hashing | bcrypt with per-user salt |
| Rate limiting | Login, register, forgot-password: 3 requests / min per IP |
| CORS | Restricted to `http://localhost:4200` |
| Input validation | Frontend inline errors + backend 400 responses |
| Email enumeration | Forgot-password always returns 200 regardless of email existence |
| Admin review restriction | Admins can delete reviews but cannot write or edit them |

---

## Role & Permission Matrix

| Action | Guest | User | Admin |
|---|---|---|---|
| Browse & view movies | ✅ | ✅ | ✅ |
| Register / Login | ✅ | — | — |
| Write a review | ❌ | ✅ | ❌ |
| Edit own review | ❌ | ✅ | ❌ |
| Delete own review | ❌ | ✅ | ✅ |
| Delete any review | ❌ | ❌ | ✅ |
| Vote on reviews | ❌ | ✅ | ❌ |
| Watchlist | ❌ | ✅ | ✅ |
| Share a movie | ✅ | ✅ | ✅ |
| Add / Edit / Delete movies | ❌ | ❌ | ✅ |
| View all users | ❌ | ❌ | ✅ |
| Promote user to admin | ❌ | ❌ | ✅ |
| Analytics dashboard | ❌ | ❌ | ✅ |

---

