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
    const d = this.analyticsData;

    const palette = ['#E8A020','#2EC4B6','#E84060','#9F7AEA','#63B3ED','#68D391','#F6AD55','#FC8181'];
    const muted   = '#8899AA';
    const gridCol = 'rgba(255,255,255,0.05)';
    const textCol = '#C8D0DC';

    const baseFont = { family: "'DM Sans', sans-serif", size: 11 };
    const tickStyle = { color: muted, font: baseFont };
    const gridStyle = { color: gridCol, drawBorder: false };
    const noLegend  = { display: false };

    // ── Reviews per Month — smooth gradient line ──
    const rCtx = this.reviewsMonthCanvas.nativeElement.getContext('2d')!;
    const rGrad = rCtx.createLinearGradient(0, 0, 0, 220);
    rGrad.addColorStop(0,   'rgba(232,64,96,0.35)');
    rGrad.addColorStop(1,   'rgba(232,64,96,0)');

    this.charts.push(new Chart(this.reviewsMonthCanvas.nativeElement, {
      type: 'line',
      data: {
        labels:   d.reviews_by_month.map((x: any) => x.month),
        datasets: [{
          label: 'Reviews',
          data:  d.reviews_by_month.map((x: any) => x.count),
          borderColor: '#E84060',
          backgroundColor: rGrad,
          fill: true, tension: 0.45,
          pointRadius: 4, pointBackgroundColor: '#E84060',
          pointBorderColor: '#0F1623', pointBorderWidth: 2,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: noLegend, tooltip: this.tooltipStyle() },
        scales: {
          x: { ticks: { ...tickStyle, maxRotation: 0 }, grid: gridStyle },
          y: { ticks: tickStyle, grid: gridStyle, beginAtZero: true }
        }
      }
    }));

    // ── Average Rating by Genre — gradient bars ──
    const ratingColors = d.rating_by_genre.map((_: any, i: number) =>
      palette[i % palette.length] + 'CC'
    );
    this.charts.push(new Chart(this.ratingGenreCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels:   d.rating_by_genre.map((x: any) => x.genre),
        datasets: [{
          label: 'Avg Rating',
          data:  d.rating_by_genre.map((x: any) => x.avg_rating),
          backgroundColor: ratingColors,
          borderRadius: 6, borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: noLegend, tooltip: this.tooltipStyle() },
        scales: {
          x: { ticks: { ...tickStyle, maxRotation: 30 }, grid: { display: false } },
          y: { ticks: tickStyle, grid: gridStyle, beginAtZero: true, max: 10 }
        }
      }
    }));

    // ── Genre Distribution — doughnut ──
    this.charts.push(new Chart(this.genreCountCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels:   d.genre_counts.map((x: any) => x.genre),
        datasets: [{
          data:            d.genre_counts.map((x: any) => x.count),
          backgroundColor: palette,
          borderColor:     '#0F1623',
          borderWidth:     3,
          hoverOffset:     6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'right',
            labels: { color: textCol, font: baseFont, boxWidth: 10, padding: 10 }
          },
          tooltip: this.tooltipStyle()
        }
      }
    }));

    // ── Top Reviewed — horizontal bar ──
    this.charts.push(new Chart(this.topReviewedCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels:   d.top_reviewed.map((x: any) => x.title || x.movie_id),
        datasets: [{
          label: 'Reviews',
          data:  d.top_reviewed.map((x: any) => x.count),
          backgroundColor: palette.slice(0, 5).map(c => c + 'CC'),
          borderRadius: 6, borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y' as const,
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: noLegend, tooltip: this.tooltipStyle() },
        scales: {
          x: { ticks: tickStyle, grid: gridStyle, beginAtZero: true },
          y: { ticks: { ...tickStyle, font: { ...baseFont, size: 11 } }, grid: { display: false } }
        }
      }
    }));
  }

  private tooltipStyle(): any {
    return {
      backgroundColor: '#1A2235',
      titleColor: '#F0EDE8',
      bodyColor:  '#8899AA',
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      padding: 10,
      titleFont: { family: "'DM Sans', sans-serif", weight: '600' },
      bodyFont:  { family: "'DM Sans', sans-serif" }
    };
  }
}
