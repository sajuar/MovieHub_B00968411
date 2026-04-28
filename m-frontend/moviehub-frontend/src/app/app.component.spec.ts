import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

const clearCookies = () =>
  ['moviehub_token', 'moviehub_user_id', 'moviehub_role', 'moviehub_username', 'moviehub_expires_at']
    .forEach(k => document.cookie = `${k}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`);

describe('AppComponent', () => {
  beforeEach(async () => {
    clearCookies();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  });

  afterEach(() => clearCookies());

  it('should create the app component', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should initialise isLoggedIn as false when no session cookie exists', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();
    expect(app.isLoggedIn).toBeFalse();
  });

  it('should have quickSearch as an empty string on initialisation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.quickSearch).toBe('');
  });

  it('should have mobileOpen as false on initialisation', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.mobileOpen).toBeFalse();
  });

  it('should default to dark mode', () => {
    localStorage.removeItem('mh_dark');
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app.darkMode).toBeTrue();
  });

  it('should render the app root element', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled).toBeTruthy();
  });
});
