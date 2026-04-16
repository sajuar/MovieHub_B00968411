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

# Start the dev server (proxies /api calls to localhost:5001)
npm start
```

Then open **http://localhost:4200** in your browser.

## Running Tests

```bash
ng test
```

Tests are in `src/app/services/*.spec.ts` and `src/app/app.component.spec.ts`.

## Building for Production

```bash
ng build
```

Output is placed in `dist/moviehub-frontend/`.

## Project Structure

```
src/
├── app/
│   ├── app.component.ts        # Root navbar + router outlet
│   ├── app.routes.ts           # Lazy-loaded routes
│   ├── app.config.ts           # Angular providers
│   ├── guards/
│   │   └── auth.guard.ts       # authGuard + adminGuard
│   ├── models/
│   │   └── models.ts           # TypeScript interfaces (Movie, Review, User, etc.)
│   ├── services/
│   │   ├── auth.service.ts     # Login, Register, Logout, token management
│   │   ├── movie.service.ts    # All movie API calls
│   │   ├── review.service.ts   # All review API calls
│   │   └── user.service.ts     # All user API calls
│   └── pages/
│       ├── home/               # Landing page with genre chart + top movies
│       ├── movies/             # Browse with filters, sort, pagination
│       ├── movie-detail/       # Movie info + reviews CRUD
│       ├── search/             # Search movies by title
│       ├── top-rated/          # Ranked list of top movies
│       ├── login/              # Login (username or email)
│       ├── register/           # Register new account
│       ├── users/              # All users + review panel
│       ├── profile/            # My profile + my reviews
│       └── admin/              # Add/edit/delete movies (admin only)
```

## API Endpoints Used

| Endpoint | Method | Auth |
|---|---|---|
| /api/auth/register | POST | No |
| /api/auth/login | POST | No |
| /api/auth/logout | POST | Token |
| /api/movies | GET | No |
| /api/movies/search | GET | No |
| /api/movies/top-rated | GET | No |
| /api/movies/stats/genres | GET | No |
| /api/movies/:id | GET | No |
| /api/movies | POST | Admin |
| /api/movies/:id | PUT | Admin |
| /api/movies/:id | DELETE | Admin |
| /api/movies/:id/reviews | GET | No |
| /api/movies/:id/reviews | POST | Token |
| /api/reviews/:id | PUT | Owner/Admin |
| /api/reviews/:id | DELETE | Owner/Admin |
| /api/users | GET | No |
| /api/users/:id | GET | No |
| /api/users/:id/reviews | GET | No |

## Notes

- Auth token stored in `localStorage` as `moviehub_token`
- All POST/PUT requests use `FormData` (matching Flask `request.form`)
- Token sent as `x-access-token` header on protected routes
- `proxy.conf.json` maps `/api/*` → `http://localhost:5001`
