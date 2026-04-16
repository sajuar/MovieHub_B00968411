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

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (!this.identifier.trim() || !this.password) {
      this.error = 'Please enter your username/email and password.';
      return;
    }
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
