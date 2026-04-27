import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ReviewService } from '../../services/review.service';
import { User, Review } from '../../models/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  user: User | null = null;
  reviews: Review[] = [];
  loading = true;
  loadingReviews = true;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private reviewService: ReviewService
  ) {}

  ngOnInit() {
    const userId = this.authService.getUserId();
    if (!userId) return;

    this.userService.getUser(userId).subscribe({
      next: (user) => { this.user = user; this.loading = false; },
      error: () => { this.loading = false; }
    });

    this.reviewService.getUserReviews(userId).subscribe({
      next: (reviews) => { this.reviews = reviews; this.loadingReviews = false; },
      error: () => { this.loadingReviews = false; }
    });
  }

  getStars(rating: number): string {
    const filled = Math.round(rating / 2);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }
}
