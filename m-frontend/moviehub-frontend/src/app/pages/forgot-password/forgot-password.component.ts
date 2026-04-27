import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email   = '';
  error   = '';
  success = '';
  loading = false;

  constructor(private http: HttpClient) {}

  submit() {
    this.error   = '';
    this.success = '';

    if (!this.email.trim()) {
      this.error = 'Please enter your email address.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email.trim())) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.loading = true;
    const formData = new FormData();
    formData.append('email', this.email.trim().toLowerCase());

    this.http.post<any>('http://127.0.0.1:5001/api/auth/forgot-password', formData).subscribe({
      next: (res) => {
        this.success = res.message;
        this.loading = false;
      },
      error: (err) => {
        this.error   = err.error?.Error || 'Something went wrong. Please try again.';
        this.loading = false;
      }
    });
  }
}
