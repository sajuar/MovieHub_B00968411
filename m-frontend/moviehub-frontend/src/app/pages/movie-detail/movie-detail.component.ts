import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { Movie, Review } from '../../models/models';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './movie-detail.component.html',
  styleUrl: './movie-detail.component.css'
})
export class MovieDetailComponent implements OnInit {
  movie: Movie | null = null;
  allReviews: Review[] = [];   // all reviews for this movie
  reviews: Review[] = [];      // current page slice shown in template
  loading = true;
  loadingReviews = false;
  submitting = false;
  newRating = 5;
  newComment = '';
  editingReviewId: string | null = null;
  editRating = 5;
  editComment = '';
  alert = '';
  alertType = 'success';
  hasUserReviewed = false;
  reviewPage = 1;
  reviewPageSize = 5;
  movieId = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService,
    private reviewService: ReviewService,
    public authService: AuthService
  ) {}

  readonly Math = Math;

  get isLoggedIn() { return this.authService.isLoggedIn(); }
  get isAdmin() { return this.authService.isAdmin(); }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.movieId = params.get('id') || '';
      this.loadMovie();
    });
  }

  loadMovie() {
    this.loading = true;
    this.movieService.getMovie(this.movieId).subscribe({
      next: (movie) => {
        this.movie = movie;
        this.loading = false;
        this.loadReviews();
      },
      error: () => { this.loading = false; }
    });
  }

  loadReviews() {
    this.loadingReviews = true;
    // Load all reviews at once (large limit) so the total count is accurate,
    // then paginate client-side
    this.reviewService.getMovieReviews(this.movieId, 1, 1000).subscribe({
      next: (reviews) => {
        this.allReviews = reviews;
        this.loadingReviews = false;
        const userId = this.authService.getUserId();
        if (userId) {
          this.hasUserReviewed = reviews.some(r => r.user_id === userId);
        }
        this.applyPage();
      },
      error: () => { this.loadingReviews = false; }
    });
  }

  private applyPage() {
    const start = (this.reviewPage - 1) * this.reviewPageSize;
    this.reviews = this.allReviews.slice(start, start + this.reviewPageSize);
  }

  prevReviewPage() {
    if (this.reviewPage > 1) { this.reviewPage--; this.applyPage(); }
  }

  nextReviewPage() {
    if (this.reviewPage * this.reviewPageSize < this.allReviews.length) {
      this.reviewPage++;
      this.applyPage();
    }
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }

  canModifyReview(review: Review): boolean {
    const userId = this.authService.getUserId();
    return this.authService.isAdmin() || review.user_id === userId;
  }

  submitReview() {
    this.submitting = true;
    this.reviewService.addReview(this.movieId, this.newRating, this.newComment).subscribe({
      next: () => {
        this.showAlert('Review submitted!', 'success');
        this.newRating = 5;
        this.newComment = '';
        this.submitting = false;
        this.reviewPage = 1;
        this.loadReviews();
        this.loadMovie();
      },
      error: (err) => {
        this.showAlert(err.error?.Error || 'Failed to submit review.', 'error');
        this.submitting = false;
      }
    });
  }

  startEditReview(review: Review) {
    this.editingReviewId = review.review_id;
    this.editRating = review.rating;
    this.editComment = review.comment;
  }

  cancelEdit() { this.editingReviewId = null; }

  submitEditReview(review: Review) {
    this.reviewService.updateReview(review.review_id, this.editRating, this.editComment).subscribe({
      next: () => {
        this.showAlert('Review updated!', 'success');
        this.editingReviewId = null;
        this.loadReviews();
        this.loadMovie();
      },
      error: (err) => {
        this.showAlert(err.error?.Error || 'Failed to update review.', 'error');
      }
    });
  }

  deleteReview(review: Review) {
    if (!confirm('Delete this review?')) return;
    this.reviewService.deleteReview(review.review_id).subscribe({
      next: () => {
        this.showAlert('Review deleted.', 'success');
        this.loadReviews();
        this.loadMovie();
      },
      error: (err) => {
        this.showAlert(err.error?.Error || 'Failed to delete.', 'error');
      }
    });
  }

  confirmDeleteMovie() {
    if (!confirm(`Delete "${this.movie?.title}"? This will also remove all its reviews.`)) return;
    this.movieService.deleteMovie(this.movieId).subscribe({
      next: () => this.router.navigate(['/movies']),
      error: (err) => this.showAlert(err.error?.Error || 'Failed to delete movie.', 'error')
    });
  }

  showAlert(msg: string, type: string) {
    this.alert = msg;
    this.alertType = type;
    setTimeout(() => this.alert = '', 4000);
  }

  shareMovie() {
    const url   = window.location.href;
    const title = this.movie?.title || 'MovieHub';

    // Use Web Share API on mobile/supported browsers, fall back to clipboard copy
    if (navigator.share) {
      navigator.share({ title, text: `Check out "${title}" on MovieHub!`, url })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        this.showAlert('Link copied to clipboard!', 'success');
      });
    }
  }
}
