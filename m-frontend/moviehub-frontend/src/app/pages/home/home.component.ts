import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MovieService } from '../../services/movie.service';
import { WatchlistService } from '../../services/watchlist.service';
import { Movie, GenreStat } from '../../models/models';

// heroSlides is stored as a plain array (not a getter) so Angular sees the same
// reference every change-detection cycle and avoids NG0956 warnings.
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
  heroSlides:   Movie[]     = [];
  loadingGenres = true;
  loadingTop    = true;
  maxCount      = 0;

  slideIdx     = 0;
  slideVisible = true;
  private slideTimer: any;

  constructor(
    private movieService: MovieService,
    public watchlistService: WatchlistService
  ) {}

  ngOnInit() {
    this.movieService.getGenreStats().subscribe({
      next:  (stats) => { this.genreStats = stats; this.maxCount = Math.max(...stats.map(s => s.count), 1); this.loadingGenres = false; },
      error: () => { this.loadingGenres = false; }
    });

    this.movieService.getTopRated(12).subscribe({
      next: (movies) => {
        this.topMovies  = movies;
        this.heroSlides = movies.slice(0, 6);
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

  // Manual dot click — resets the auto-advance timer
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
      setTimeout(() => { this.slideIdx = (this.slideIdx + 1) % this.heroSlides.length; this.slideVisible = true; }, 300);
    }, 3500);
  }

  private stopSlideshow() {
    if (this.slideTimer) { clearInterval(this.slideTimer); this.slideTimer = null; }
  }

  getBarWidth(count: number): number { return (count / this.maxCount) * 100; }

  getPoster(movie: Movie): string {
    return movie.image_url || `https://picsum.photos/seed/${movie.movie_id}/1400/800`;
  }

  toggleWatchlist(event: Event, movie: Movie) {
    event.preventDefault();
    event.stopPropagation();
    this.watchlistService.toggle(movie);
  }
}
