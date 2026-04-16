import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { Movie } from '../../models/models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit {
  query = '';
  lastQuery = '';
  movies: Movie[] = [];
  loading = false;
  error = '';
  searched = false;

  constructor(
    private movieService: MovieService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['title']) {
        this.query = params['title'];
        this.search();
      }
    });
  }

  search() {
    if (!this.query.trim()) return;
    this.loading = true;
    this.error = '';
    this.lastQuery = this.query.trim();

    this.movieService.searchMovies(this.lastQuery).subscribe({
      next: (movies) => {
        this.movies = movies;
        this.loading = false;
        this.searched = true;
      },
      error: (err) => {
        this.error = err.error?.Error || 'Search failed.';
        this.loading = false;
        this.searched = true;
      }
    });
  }
}
