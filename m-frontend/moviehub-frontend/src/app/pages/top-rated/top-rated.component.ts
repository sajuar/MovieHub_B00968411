import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { WatchlistService } from '../../services/watchlist.service';
import { Movie } from '../../models/models';

@Component({
  selector: 'app-top-rated',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './top-rated.component.html',
  styleUrl: './top-rated.component.css'
})
export class TopRatedComponent implements OnInit {
  movies: Movie[] = [];
  loading = false;
  error = '';
  limit = 10;

  constructor(
    private movieService: MovieService,
    public watchlistService: WatchlistService
  ) {}

  ngOnInit() { this.loadTopRated(); }

  loadTopRated() {
    this.loading = true;
    this.movieService.getTopRated(this.limit).subscribe({
      next: (movies) => { this.movies = movies; this.loading = false; },
      error: (err) => { this.error = err.error?.Error || 'Failed to load.'; this.loading = false; }
    });
  }

  toggleWatchlist(event: Event, movie: Movie) {
    event.preventDefault();
    event.stopPropagation();
    this.watchlistService.toggle(movie);
  }
}
