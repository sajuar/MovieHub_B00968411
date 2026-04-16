import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Review } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  constructor(private http: HttpClient, private auth: AuthService) {}

  getMovieReviews(movieId: string, pn: number = 1, ps: number = 5): Observable<Review[]> {
    const params = new HttpParams().set('pn', pn).set('ps', ps);
    return this.http.get<Review[]>(`http://127.0.0.1:5001/api/movies/${movieId}/reviews`, { params });
  }

  getUserReviews(userId: string): Observable<Review[]> {
    return this.http.get<Review[]>(`http://127.0.0.1:5001/api/users/${userId}/reviews`);
  }

  addReview(movieId: string, rating: number, comment: string): Observable<any> {
    const formData = new FormData();
    formData.append('rating', rating.toString());
    formData.append('comment', comment);
    return this.http.post(`http://127.0.0.1:5001/api/movies/${movieId}/reviews`, formData, {
      headers: this.auth.getAuthHeaders()
    });
  }

  updateReview(reviewId: string, rating: number, comment: string): Observable<any> {
    const formData = new FormData();
    formData.append('rating', rating.toString());
    formData.append('comment', comment);
    return this.http.put(`http://127.0.0.1:5001/api/reviews/${reviewId}`, formData, {
      headers: this.auth.getAuthHeaders()
    });
  }

  deleteReview(reviewId: string): Observable<any> {
    return this.http.delete(`http://127.0.0.1:5001/api/reviews/${reviewId}`, {
      headers: this.auth.getAuthHeaders()
    });
  }
}
