import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription, filter } from 'rxjs';
import { AuthService } from './services/auth.service';

// Root component — controls the navbar, footer, dark/light mode and scroll behaviour.
// The transparent navbar is only active on the home page where the hero image is shown.
// On all other pages the navbar always has a solid background.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  isLoggedIn    = false;
  isAdmin       = false;
  username      = '';
  quickSearch   = '';
  mobileOpen    = false;
  scrolled      = false;
  showScrollTop = false;
  darkMode      = true;
  isHomePage    = false;

  private routerSub?: Subscription;

  constructor(private authService: AuthService, private router: Router) {
    const saved   = localStorage.getItem('mh_dark');
    this.darkMode = saved !== 'false';
    this.applyTheme();
  }

  ngOnInit() {
    this.authService.isLoggedIn$.subscribe(loggedIn => {
      this.isLoggedIn = loggedIn;
      this.isAdmin    = this.authService.isAdmin();
      this.username   = this.authService.getUsername() || '';
    });

    // Track the current route so the transparent navbar only shows on '/'
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
    this.scrolled      = window.scrollY > 40;
    this.showScrollTop = window.scrollY > 300;
  }

  get navTransparent(): boolean { return this.isHomePage && !this.scrolled; }

  toggleDarkMode() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('mh_dark', String(this.darkMode));
    this.applyTheme();
  }

  // Sets a data-theme attribute on <html> which the CSS variables read to switch all colours
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
