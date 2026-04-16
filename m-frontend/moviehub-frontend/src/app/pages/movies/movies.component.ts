import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { Movie, MovieFilters } from '../../models/models';

@Component({
  selector: 'app-movies',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './movies.component.html',
  styleUrl: './movies.component.css'
})
export class MoviesComponent implements OnInit {
  movies: Movie[] = [];
  genres = ['Action', 'Drama', 'Comedy', 'Thriller', 'Horror', 'Romance', 'Sci-Fi',
    'Adventure', 'Animation', 'Crime', 'Documentary', 'Fantasy', 'Mystery'];
  loading = false;
  error = '';
  currentPage = 1;
  totalLabel = '';

  filters: MovieFilters = {
    pn: 1,
    ps: 10,
    sort_by: 'title',
    order: 'asc'
  };

  constructor(
    private movieService: MovieService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['genre']) this.filters.genre = params['genre'];
      if (params['title']) this.filters.title = params['title'];
      this.loadMovies();
    });
  }

  loadMovies() {
    this.loading = true;
    this.error = '';
    this.filters.pn = this.currentPage;

    this.movieService.getMovies(this.filters).subscribe({
      next: (movies) => {
        this.movies = movies;
        this.loading = false;
        this.totalLabel = `Showing ${movies.length} movies (page ${this.currentPage})`;
      },
      error: (err) => {
        this.error = err.error?.Error || 'Failed to load movies.';
        this.loading = false;
      }
    });
  }

  applyFilters() {
    this.currentPage = 1;
    this.loadMovies();
  }

  clearFilters() {
    this.filters = { title: '', pn: 1, ps: 10, sort_by: 'title', order: 'asc' };
    this.currentPage = 1;
    this.loadMovies();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadMovies();
    }
  }

  nextPage() {
    this.currentPage++;
    this.loadMovies();
  }
}
