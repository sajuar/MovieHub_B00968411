import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MovieService } from '../../services/movie.service';
import { Movie, GenreStat } from '../../models/models';

// ── HomeComponent ────────────────────────────────────────────────────────────
// Fetches the top-rated movies and genre statistics from the API,
// then drives the full-screen hero slideshow.
//
// Slideshow notes:
//   • heroSlides is a stored property (not a getter) so Angular's change
//     detection always sees the same array reference — avoids NG0956 warnings.
//   • The interval is cleared in ngOnDestroy to prevent memory leaks when
//     the user navigates away from the home page.
// ─────────────────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {
  genreStats:   GenreStat[] = [];
  topMovies:    Movie[]     = [];
  heroSlides:   Movie[]     = [];   // first 6 top-rated movies used for the slideshow
  loadingGenres = true;
  loadingTop    = true;
  maxCount      = 0;

  slideIdx     = 0;
  slideVisible = true;
  private slideTimer: any;

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.movieService.getGenreStats().subscribe({
      next: (stats) => {
        this.genreStats = stats;
        this.maxCount   = Math.max(...stats.map(s => s.count), 1);
        this.loadingGenres = false;
      },
      error: () => { this.loadingGenres = false; }
    });

    this.movieService.getTopRated(12).subscribe({
      next: (movies) => {
        this.topMovies  = movies;
        this.heroSlides = movies.slice(0, 6);  // only first 6 used in the slideshow
        this.loadingTop = false;
        this.startSlideshow();
      },
      error: () => { this.loadingTop = false; }
    });
  }

  ngOnDestroy() { this.stopSlideshow(); }

  get heroMovie(): Movie | null {
    return this.heroSlides.length ? this.heroSlides[this.slideIdx] : null;
  }

  // Manual dot navigation — also resets the auto-advance timer
  goSlide(i: number) {
    this.slideVisible = false;
    setTimeout(() => { this.slideIdx = i; this.slideVisible = true; }, 300);
    this.stopSlideshow();
    this.startSlideshow();
  }

  private startSlideshow() {
    if (this.heroSlides.length < 2) return;
    this.slideTimer = setInterval(() => {
      this.slideVisible = false;
      setTimeout(() => {
        this.slideIdx    = (this.slideIdx + 1) % this.heroSlides.length;
        this.slideVisible = true;
      }, 300);
    }, 3500);
  }

  private stopSlideshow() {
    if (this.slideTimer) { clearInterval(this.slideTimer); this.slideTimer = null; }
  }

  getBarWidth(count: number): number {
    return (count / this.maxCount) * 100;
  }

  getPoster(movie: Movie): string {
    return movie.image_url || `https://picsum.photos/seed/${movie.movie_id}/1400/800`;
  }
}
