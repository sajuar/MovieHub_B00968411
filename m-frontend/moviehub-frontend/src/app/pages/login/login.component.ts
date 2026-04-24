import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  identifier = '';
  password = '';
  error = '';
  loading = false;
  showPassword = false;

  touched = { identifier: false, password: false };

  constructor(private authService: AuthService, private router: Router) {}

  // ── Field validators ────────────────────────────────────────────────

  get identifierError(): string {
    if (!this.touched.identifier) return '';
    const val = this.identifier.trim();
    if (!val) return 'Username or email is required.';
    // If it contains @ treat as email and validate fully
    if (val.includes('@')) {
      if (!this.validEmail(val)) return 'Please enter a valid email address (e.g. name@example.com).';
      return '';
    }
    // Looks like an email attempt (contains a dot followed by a known TLD) but missing @
    if (/\.[a-zA-Z]{2,}$/.test(val) && val.includes('.')) {
      return 'Looks like an email address — did you forget the @ symbol?';
    }
    return '';
  }

  get passwordError(): string {
    if (!this.touched.password) return '';
    if (!this.password) return 'Password is required.';
    if (this.password.length < 6) return 'Password must be at least 6 characters.';
    return '';
  }

  get isFormValid(): boolean {
    return !this.identifierError && !this.passwordError &&
           !!this.identifier.trim() && !!this.password;
  }

  touch(field: keyof typeof this.touched) {
    this.touched[field] = true;
  }

  private validEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Submit ──────────────────────────────────────────────────────────

  login() {
    // Mark all fields touched to show any remaining errors
    this.touched.identifier = true;
    this.touched.password = true;

    if (!this.isFormValid) return;

    this.loading = true;
    this.error = '';

    const isEmail = this.identifier.includes('@');
    const credentials = isEmail
      ? { email: this.identifier.trim(), password: this.password }
      : { username: this.identifier.trim(), password: this.password };

    this.authService.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.error = err.error?.Error || 'Login failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
