import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { WatchlistService } from '../../services/watchlist.service';
import { Movie } from '../../models/models';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './watchlist.component.html',
  styleUrl: './watchlist.component.css'
})
export class WatchlistComponent implements OnInit {
  movies: Movie[] = [];
  loading = true;

  constructor(private watchlistService: WatchlistService) {}

  ngOnInit() {
    this.watchlistService.getWatchlist().then(movies => {
      this.movies = movies;
      this.loading = false;
    }).catch(() => { this.loading = false; });
  }

  remove(movie: Movie) {
    this.watchlistService.toggle(movie);
    this.movies = this.movies.filter(m => m.movie_id !== movie.movie_id);
  }
}
