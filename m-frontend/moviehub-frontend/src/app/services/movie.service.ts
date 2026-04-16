import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Movie, MovieFilters, GenreStat } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getMovies(filters: MovieFilters = {}): Observable<Movie[]> {
    let params = new HttpParams();
    if (filters.title) params = params.set('title', filters.title);
    if (filters.pn) params = params.set('pn', filters.pn);
    if (filters.ps) params = params.set('ps', filters.ps);
    if (filters.genre) params = params.set('genre', filters.genre);
    if (filters.min_rating != null) params = params.set('min_rating', filters.min_rating);
    if (filters.language) params = params.set('language', filters.language);
    if (filters.director) params = params.set('director', filters.director);
    if (filters.release_year) params = params.set('release_year', filters.release_year);
    if (filters.sort_by) params = params.set('sort_by', filters.sort_by);
    if (filters.order) params = params.set('order', filters.order);
    return this.http.get<Movie[]>('http://127.0.0.1:5001/api/movies', { params });
  }

  searchMovies(title: string): Observable<Movie[]> {
    return this.http.get<Movie[]>('http://127.0.0.1:5001/api/movies/search', {
      params: new HttpParams().set('title', title)
    });
  }

  getTopRated(limit: number = 10): Observable<Movie[]> {
    return this.http.get<Movie[]>('http://127.0.0.1:5001/api/movies/top-rated', {
      params: new HttpParams().set('limit', limit)
    });
  }

  getGenreStats(): Observable<GenreStat[]> {
    return this.http.get<GenreStat[]>('http://127.0.0.1:5001/api/movies/stats/genres');
  }

  getMovie(movieId: string): Observable<Movie> {
    return this.http.get<Movie>(`http://127.0.0.1:5001/api/movies/${movieId}`);
  }

  addMovie(data: any): Observable<any> {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    return this.http.post('http://127.0.0.1:5001/api/movies', formData, {
      headers: this.auth.getAuthHeaders()
    });
  }

  updateMovie(movieId: string, data: any): Observable<any> {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        formData.append(key, data[key]);
      }
    });
    return this.http.put(`http://127.0.0.1:5001/api/movies/${movieId}`, formData, {
      headers: this.auth.getAuthHeaders()
    });
  }

  deleteMovie(movieId: string): Observable<any> {
    return this.http.delete(`http://127.0.0.1:5001/api/movies/${movieId}`, {
      headers: this.auth.getAuthHeaders()
    });
  }
}
