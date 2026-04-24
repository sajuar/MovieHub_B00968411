import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, filter } from 'rxjs';
import { AuthService } from './services/auth.service';

// ── AppComponent ─────────────────────────────────────────────────────────────
// Root component — owns the navbar, footer, and two global UI features:
//
//   Dark / Light mode: persisted in localStorage so the preference survives
//   page reloads. Toggling sets a `data-theme` attribute on <html> which CSS
//   variables read to swap every colour on the page instantly.
//
//   Transparent navbar: the navbar should be transparent only on the home page
//   (where a full-screen hero image provides the background). On every other
//   page the navbar shows its solid background immediately. A router subscription
//   tracks the current URL so the correct style is applied on every navigation.
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn  = false;
  isAdmin     = false;
  username    = '';
  quickSearch = '';
  mobileOpen  = false;
  scrolled    = false;
  showScrollTop = false;
  darkMode    = true;
  isHomePage  = false;

  private routerSub?: Subscription;

  constructor(private authService: AuthService, private router: Router) {
    const saved = localStorage.getItem('mh_dark');
    this.darkMode = saved !== 'false';
    this.applyTheme();
  }

  ngOnInit() {
    // Keep navbar username/role in sync whenever login state changes
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      this.isAdmin    = this.authService.isAdmin();
      this.username   = this.authService.getUsername() || '';
    });

    // Track the current route so the transparent-navbar logic only fires on '/'
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.isHomePage = e.urlAfterRedirects === '/' || e.urlAfterRedirects === '';
        this.mobileOpen = false;
      });

    this.isHomePage = this.router.url === '/' || this.router.url === '';
  }

  ngOnDestroy() { this.routerSub?.unsubscribe(); }

  @HostListener('window:scroll')
  onScroll() {
    this.scrolled     = window.scrollY > 40;
    this.showScrollTop = window.scrollY > 300;
  }

  // Transparent navbar only when on the home page and the user hasn't scrolled
  get navTransparent(): boolean {
    return this.isHomePage && !this.scrolled;
  }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('mh_dark', String(this.darkMode));
    this.applyTheme();
  }

  private applyTheme() {
    document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
  }

  scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); }

  doQuickSearch() {
    if (this.quickSearch.trim()) {
      this.router.navigate(['/movies'], { queryParams: { title: this.quickSearch.trim() } });
      this.quickSearch = '';
      this.mobileOpen  = false;
    }
  }

  logout() {
    this.authService.logout().subscribe({
      next:  () => this.router.navigate(['/']),
      error: () => { this.authService.clearSession(); this.router.navigate(['/']); }
    });
    this.mobileOpen = false;
  }
}
