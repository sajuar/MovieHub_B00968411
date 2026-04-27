import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './contact.component.html',
  styleUrl: './contact.component.css'
})
export class ContactComponent implements OnInit {
  name    = '';
  email   = '';
  subject = '';
  message = '';
  loading = false;
  success = '';
  error   = '';
  isReport = false;

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit() {
    this.isReport = this.route.snapshot.queryParamMap.get('type') === 'report';
  }

  get pageTitle()    { return this.isReport ? 'Report an Issue' : 'Contact Us'; }
  get pageSub()      { return this.isReport ? 'Found a bug or problem? Describe it below and we will look into it.' : 'Have a question or feedback? We would love to hear from you.'; }
  get placeholder()  { return this.isReport ? 'Describe the issue you encountered...' : 'Write your message here...'; }

  submit() {
    this.error   = '';
    this.success = '';

    if (!this.name.trim() || !this.email.trim() || !this.message.trim()) {
      this.error = 'Please fill in all required fields.';
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(this.email.trim())) {
      this.error = 'Please enter a valid email address.';
      return;
    }

    this.loading = true;
    const formData = new FormData();
    formData.append('name',    this.name.trim());
    formData.append('email',   this.email.trim());
    formData.append('subject', this.subject.trim() || (this.isReport ? 'Issue Report' : 'General Enquiry'));
    formData.append('message', this.message.trim());

    this.http.post<any>('http://127.0.0.1:5001/api/contact', formData).subscribe({
      next: () => {
        this.success = this.isReport ? 'Issue reported! We will investigate shortly.' : 'Message sent! We will get back to you soon.';
        this.loading = false;
        this.name = this.email = this.subject = this.message = '';
      },
      error: () => {
        this.error   = 'Failed to send. Please try again.';
        this.loading = false;
      }
    });
  }
}
