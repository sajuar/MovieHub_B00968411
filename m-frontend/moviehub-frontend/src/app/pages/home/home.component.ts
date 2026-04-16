import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MovieService } from '../../services/movie.service';
import { Movie, GenreStat } from '../../models/models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit {
  genreStats: GenreStat[] = [];
  topMovies: Movie[] = [];
  loadingGenres = true;
  loadingTop = true;
  maxCount = 0;

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.movieService.getGenreStats().subscribe({
      next: (stats) => {
        this.genreStats = stats;
        this.maxCount = Math.max(...stats.map(s => s.count), 1);
        this.loadingGenres = false;
      },
      error: () => { this.loadingGenres = false; }
    });

    this.movieService.getTopRated(6).subscribe({
      next: (movies) => { this.topMovies = movies; this.loadingTop = false; },
      error: () => { this.loadingTop = false; }
    });
  }

  getBarWidth(count: number): number {
    return (count / this.maxCount) * 100;
  }
}
