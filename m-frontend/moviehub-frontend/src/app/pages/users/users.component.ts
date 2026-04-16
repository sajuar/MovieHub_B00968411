import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { ReviewService } from '../../services/review.service';
import { AuthService } from '../../services/auth.service';
import { User, Review } from '../../models/models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  error = '';
  alert = '';
  alertType = 'success';

  currentUserId: string | null = null;

  expandedUserId: string | null = null;
  expandMode: 'info' | 'reviews' = 'info';
  expandedUser: User | null = null;
  userReviews: Review[] = [];
  loadingReviews = false;

  constructor(
    private userService: UserService,
    private reviewService: ReviewService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.currentUserId = this.authService.getUserId();
    this.userService.getUsers().subscribe({
      next: (users) => { this.users = users; this.loading = false; },
      error: (err) => { this.error = err.error?.Error || 'Failed to load users.'; this.loading = false; }
    });

    this.route.queryParams.subscribe(params => {
      if (params['userId']) {
        this.userService.getUser(params['userId']).subscribe({
          next: (user) => this.openInfo(user),
          error: () => {}
        });
      }
    });
  }

  openInfo(user: User) {
    if (this.expandedUserId === user.user_id && this.expandMode === 'info') {
      this.collapse();
      return;
    }
    this.expandedUserId = user.user_id;
    this.expandedUser = user;
    this.expandMode = 'info';
    this.userReviews = [];
  }

  openReviews(user: User) {
    if (this.expandedUserId === user.user_id && this.expandMode === 'reviews') {
      this.collapse();
      return;
    }
    this.expandedUserId = user.user_id;
    this.expandedUser = user;
    this.expandMode = 'reviews';
    this.userReviews = [];
    this.loadingReviews = true;
    this.reviewService.getUserReviews(user.user_id).subscribe({
      next: (reviews) => { this.userReviews = reviews; this.loadingReviews = false; },
      error: () => { this.loadingReviews = false; }
    });
  }

  collapse() {
    this.expandedUserId = null;
    this.expandedUser = null;
    this.userReviews = [];
  }

  promoteUser(user: User) {
    if (!confirm(`Promote "${user.username}" to admin?`)) return;
    this.userService.promoteUser(user.user_id).subscribe({
      next: (res) => {
        user.role = 'admin';
        this.showAlert(res.message || `${user.username} promoted to admin.`, 'success');
      },
      error: (err) => this.showAlert(err.error?.error || 'Promote failed.', 'error')
    });
  }

  deleteUser(user: User) {
    if (!confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    this.userService.deleteUser(user.user_id).subscribe({
      next: () => {
        this.users = this.users.filter(u => u.user_id !== user.user_id);
        if (this.expandedUserId === user.user_id) this.collapse();
        this.showAlert(`User "${user.username}" deleted.`, 'success');
      },
      error: (err) => this.showAlert(err.error?.error || 'Delete failed.', 'error')
    });
  }

  showAlert(msg: string, type: string) {
    this.alert = msg;
    this.alertType = type;
    setTimeout(() => this.alert = '', 4000);
  }

  getStars(rating: number): string {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  }
}
