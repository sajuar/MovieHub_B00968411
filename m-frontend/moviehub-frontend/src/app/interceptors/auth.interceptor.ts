import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

// Slides the session cookie forward on every successful authenticated
// request and tears the session down if the backend reports the token
// is no longer valid.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
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
