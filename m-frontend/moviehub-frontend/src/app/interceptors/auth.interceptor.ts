import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// ── authInterceptor ──────────────────────────────────────────────────────────
// Runs on every outgoing HTTP request.
//
// On a successful response that carried the auth token:
//   → calls refreshSession() to slide the cookie expiry forward so the browser
//     cookie stays alive as long as the backend token does.
//
// On a 401 Unauthorized response:
//   → the backend has rejected the token (expired or tampered); clear the
//     local session and redirect to /login so the user can re-authenticate.
// ─────────────────────────────────────────────────────────────────────────────
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const sentWithToken = req.headers.has('x-access-token');

  return next(req).pipe(
    tap(event => {
      if (sentWithToken && event instanceof HttpResponse) {
        auth.refreshSession();
      }
    }),
    catchError(err => {
      if (sentWithToken && err.status === 401) {
        auth.clearSession();
        router.navigate(['/login']);
      }
      return throwError(() => err);
    })
  );
};
