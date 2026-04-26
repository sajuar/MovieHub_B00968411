import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { Movie } from '../models/models';
import { AuthService } from './auth.service';

// Manages the watchlist state across the whole app.
// Movie IDs are stored in a Set so checking "is this movie saved?" is fast
// without making an API call on every render.
// The heart icon updates instantly (optimistic update) then syncs with the backend.
@Injectable({ providedIn: 'root' })
export class WatchlistService {
  private readonly BASE = 'http://127.0.0.1:5001/api/users';

  private idsSubject = new BehaviorSubject<Set<string>>(new Set());
  watchlistIds$ = this.idsSubject.asObservable();

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router
  ) {
    // Load watchlist IDs whenever the user logs in, clear them on logout
    this.auth.isLoggedIn$.subscribe(loggedIn => {
      loggedIn ? this.loadIds() : this.idsSubject.next(new Set());
    });
  }

  loadIds(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.http.get<{ movie_ids: string[] }>(
      `${this.BASE}/${userId}/watchlist/ids`,
      { headers: this.auth.getAuthHeaders() }
    ).subscribe({
      next:  (res) => this.idsSubject.next(new Set(res.movie_ids)),
      error: () => {}
    });
  }

  isInWatchlist(movieId: string): boolean {
    return this.idsSubject.value.has(movieId);
  }

  getWatchlist(): Promise<Movie[]> {
    const userId = this.auth.getUserId();
    if (!userId) return Promise.resolve([]);
    return this.http.get<Movie[]>(
      `${this.BASE}/${userId}/watchlist`,
      { headers: this.auth.getAuthHeaders() }
    ).toPromise().then(r => r ?? []);
  }

  // If not logged in, redirect to login. Otherwise add or remove the movie.
  toggle(movie: Movie): void {
    if (!this.auth.isLoggedIn()) { this.router.navigate(['/login']); return; }
    this.isInWatchlist(movie.movie_id) ? this.remove(movie.movie_id) : this.add(movie.movie_id);
  }

  private add(movieId: string): void {
    const userId  = this.auth.getUserId()!;
    const updated = new Set(this.idsSubject.value);
    updated.add(movieId);
    this.idsSubject.next(updated); // update UI immediately

    this.http.post(
      `${this.BASE}/${userId}/watchlist/${movieId}`, {},
      { headers: this.auth.getAuthHeaders() }
    ).subscribe({ error: () => this.loadIds() }); // reload from server if something went wrong
  }

  private remove(movieId: string): void {
    const userId  = this.auth.getUserId()!;
    const updated = new Set(this.idsSubject.value);
    updated.delete(movieId);
    this.idsSubject.next(updated);

    this.http.delete(
      `${this.BASE}/${userId}/watchlist/${movieId}`,
      { headers: this.auth.getAuthHeaders() }
    ).subscribe({ error: () => this.loadIds() });
  }
}
