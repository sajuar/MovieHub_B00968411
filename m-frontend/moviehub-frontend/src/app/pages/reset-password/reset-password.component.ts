import { Component, OnInit } from '@angular/core';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent implements OnInit {
  token           = '';
  password        = '';
  confirmPassword = '';
  showPassword    = false;
  error           = '';
  success         = '';
  loading         = false;
  invalidToken    = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) this.invalidToken = true;
  }

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

  get strengthLabel(): string  { return ['','Weak','Fair','Good','Strong'][this.passwordStrength]; }
  get strengthColor(): string  { return ['','#E84060','#E8A020','#2EC4B6','#2ecc71'][this.passwordStrength]; }

  submit() {
    this.error = '';
    if (!this.password) { this.error = 'Please enter a new password.'; return; }
    if (this.password.length < 6) { this.error = 'Password must be at least 6 characters.'; return; }
    if (this.password !== this.confirmPassword) { this.error = 'Passwords do not match.'; return; }

    this.loading = true;
    const formData = new FormData();
    formData.append('token',    this.token);
    formData.append('password', this.password);

    this.http.post<any>('http://127.0.0.1:5001/api/auth/reset-password', formData).subscribe({
      next: (res) => {
        this.success = res.message;
        this.loading = false;
        setTimeout(() => this.router.navigate(['/login']), 2500);
      },
      error: (err) => {
        this.error   = err.error?.Error || 'Reset failed. Please request a new link.';
        this.loading = false;
      }
    });
  }
}
