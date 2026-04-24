import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  success = '';
  loading = false;
  showPassword = false;
  showConfirm = false;

  touched = { username: false, email: false, password: false, confirmPassword: false };

  constructor(private authService: AuthService, private router: Router) {}

  // ── Field validators ────────────────────────────────────────────────

  get usernameError(): string {
    if (!this.touched.username) return '';
    if (!this.username.trim()) return 'Username is required.';
    if (this.username.trim().length < 3) return 'Username must be at least 3 characters.';
    if (/\s/.test(this.username)) return 'Username cannot contain spaces.';
    if (!/^[a-zA-Z0-9_]+$/.test(this.username.trim())) return 'Only letters, numbers and underscores allowed.';
    return '';
  }

  get emailError(): string {
    if (!this.touched.email) return '';
    if (!this.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) return 'Please enter a valid email address.';
    return '';
  }

  get passwordError(): string {
    if (!this.touched.password) return '';
    if (!this.password) return 'Password is required.';
    if (this.password.length < 6) return 'Password must be at least 6 characters.';
    if (!/[a-zA-Z]/.test(this.password)) return 'Password must contain at least one letter.';
    if (!/[0-9]/.test(this.password)) return 'Password must contain at least one number.';
    return '';
  }

  get confirmPasswordError(): string {
    if (!this.touched.confirmPassword) return '';
    if (!this.confirmPassword) return 'Please confirm your password.';
    if (this.confirmPassword !== this.password) return 'Passwords do not match.';
    return '';
  }

  // Password strength: 0–4
  get passwordStrength(): number {
    const p = this.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 6)  score++;
    if (p.length >= 10) score++;
    if (/[a-zA-Z]/.test(p) && /[0-9]/.test(p)) score++;
    if (/[^a-zA-Z0-9]/.test(p)) score++;
    return score;
  }

  get passwordStrengthLabel(): string {
    return ['', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength];
  }

  get passwordStrengthColor(): string {
    return ['', '#E84060', '#E8A020', '#2EC4B6', '#2ecc71'][this.passwordStrength];
  }

  get isFormValid(): boolean {
    return !this.usernameError && !this.emailError &&
           !this.passwordError && !this.confirmPasswordError &&
           !!this.username.trim() && !!this.email.trim() &&
           !!this.password && !!this.confirmPassword;
  }

  touch(field: keyof typeof this.touched) {
    this.touched[field] = true;
  }

  // ── Submit ──────────────────────────────────────────────────────────

  register() {
    this.touched = { username: true, email: true, password: true, confirmPassword: true };
    this.error = '';

    if (!this.isFormValid) return;

    this.loading = true;
    this.authService.register({
      username: this.username.trim(),
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: () => {
        this.success = 'Account created successfully! Redirecting to login...';
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.error = err.error?.Error || 'Registration failed. Please try again.';
        this.loading = false;
      }
    });
  }
}
