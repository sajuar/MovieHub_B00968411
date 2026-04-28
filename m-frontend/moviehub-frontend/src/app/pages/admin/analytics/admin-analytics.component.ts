import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Chart } from 'chart.js/auto';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-admin-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-analytics.component.html',
  styleUrl:    './admin-analytics.component.css'
})
export class AdminAnalyticsComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartTopReviewed')  topReviewedCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('chartRatingGenre')  ratingGenreCanvas!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('chartReviewsMonth') reviewsMonthCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartGenreCount')   genreCountCanvas!:   ElementRef<HTMLCanvasElement>;

  totals   = { movies: 0, users: 0, reviews: 0 };
  loading  = true;
  private analyticsData: any = null;
  private charts: Chart[] = [];
  private pollTimer: any = null;

  constructor(private http: HttpClient, private auth: AuthService) {}

  ngOnInit() {
    this.http.get<any>('http://127.0.0.1:5001/api/admin/analytics', {
      headers: this.auth.getAuthHeaders()
    }).subscribe({
      next: (data) => {
        this.totals        = data.totals;
        this.analyticsData = data;
        this.loading       = false;
      },
      error: () => { this.loading = false; }
    });
  }

  ngAfterViewInit() {
    this.pollTimer = setInterval(() => {
      if (!this.loading && this.analyticsData) {
        clearInterval(this.pollTimer);
        this.pollTimer = null;
        this.drawCharts();
      }
    }, 100);
  }

  ngOnDestroy() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    this.charts.forEach(c => c.destroy());
  }

  private drawCharts() {
    const gold  = 'rgba(232,160,32,0.85)';
    const teal  = 'rgba(46,196,182,0.85)';
    const red   = 'rgba(232,64,96,0.85)';
    const blue  = 'rgba(99,179,237,0.85)';
    const d     = this.analyticsData;

    // Top 5 most reviewed movies
    this.charts.push(new Chart(this.topReviewedCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels:   d.top_reviewed.map((x: any) => x.title || x.movie_id),
        datasets: [{ label: 'Reviews', data: d.top_reviewed.map((x: any) => x.count), backgroundColor: gold, borderRadius: 6 }]
      },
      options: { ...this.baseOptions('Most Reviewed Movies') }
    }));

    // Average rating per genre
    this.charts.push(new Chart(this.ratingGenreCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels:   d.rating_by_genre.map((x: any) => x.genre),
        datasets: [{ label: 'Avg Rating', data: d.rating_by_genre.map((x: any) => x.avg_rating), backgroundColor: teal, borderRadius: 6 }]
      },
      options: { ...this.baseOptions('Average Rating by Genre'), scales: { y: { ...this.yScale(), max: 10 } } } as any
    }));

    // Reviews per month
    this.charts.push(new Chart(this.reviewsMonthCanvas.nativeElement, {
      type: 'line',
      data: {
        labels:   d.reviews_by_month.map((x: any) => x.month),
        datasets: [{
          label: 'Reviews', data: d.reviews_by_month.map((x: any) => x.count),
          borderColor: red, backgroundColor: 'rgba(232,64,96,0.12)',
          fill: true, tension: 0.4, pointBackgroundColor: red
        }]
      },
      options: { ...this.baseOptions('Reviews per Month') }
    }));

    // Movies per genre
    this.charts.push(new Chart(this.genreCountCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels:   d.genre_counts.map((x: any) => x.genre),
        datasets: [{ data: d.genre_counts.map((x: any) => x.count), backgroundColor: [gold, teal, red, blue, '#9F7AEA', '#68D391', '#F6AD55', '#FC8181'], borderWidth: 2 }]
      },
      options: {
        plugins: { legend: { labels: { color: '#8899AA', font: { family: "'DM Sans'" } } }, title: { display: true, text: 'Movies by Genre', color: '#F0EDE8', font: { family: "'Cormorant Garamond'", size: 15 } } },
        responsive: true, maintainAspectRatio: true
      }
    }));
  }

  private baseOptions(title: string): any {
    return {
      responsive: true, maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        title:  { display: true, text: title, color: '#F0EDE8', font: { family: "'Cormorant Garamond'", size: 15 } }
      },
      scales: { x: this.xScale(), y: this.yScale() }
    };
  }

  private xScale(): any {
    return { ticks: { color: '#8899AA', font: { family: "'DM Sans'" } }, grid: { color: 'rgba(255,255,255,0.04)' } };
  }

  private yScale(): any {
    return { ticks: { color: '#8899AA', font: { family: "'DM Sans'" } }, grid: { color: 'rgba(255,255,255,0.04)' }, beginAtZero: true };
  }
}
