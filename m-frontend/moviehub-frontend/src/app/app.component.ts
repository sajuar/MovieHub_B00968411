import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isLoggedIn = false;
  isAdmin = false;
  username = '';
  quickSearch = '';
  mobileOpen = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      this.isAdmin = this.authService.isAdmin();
      this.username = this.authService.getUsername() || 'Profile';
    });
  }

  doQuickSearch() {
    if (this.quickSearch.trim()) {
      this.router.navigate(['/movies'], { queryParams: { title: this.quickSearch.trim() } });
      this.quickSearch = '';
    }
  }

  logout() {
    this.authService.logout().subscribe({
      next: () => this.router.navigate(['/']),
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/']);
      }
    });
  }
}
