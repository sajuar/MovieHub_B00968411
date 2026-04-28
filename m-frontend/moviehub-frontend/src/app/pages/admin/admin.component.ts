import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MovieService } from '../../services/movie.service';
import { Movie } from '../../models/models';
import { AdminAnalyticsComponent } from './analytics/admin-analytics.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, AdminAnalyticsComponent],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  activeTab: 'movies' | 'analytics' = 'movies';

  movies: Movie[] = [];
  listLoading = false;
  submitting = false;
  editMode = false;
  editingMovieId = '';
  formAlert     = '';
  formAlertType = 'success';
  deleteAlert     = '';
  deleteAlertType = 'success';
  showDeleteModal = false;
  movieToDelete: Movie | null = null;
  searchText = '';
  listPage = 1;
  listPageSize = 20;

  form: any = {
    title: '', release_year: '', director: '', genres: '',
    duration_minutes: '', language: 'English', country: 'USA',
    release_date: '', hero_name: '', villain_name: '',
    tags: '', average_rating: 0, votes: 0
  };

  constructor(
    private movieService: MovieService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.loadMovies();
    this.route.queryParams.subscribe(params => {
      if (params['edit']) {
        this.movieService.getMovie(params['edit']).subscribe({
          next: (movie) => this.startEdit(movie),
          error: () => {}
        });
      }
    });
  }

  get filteredMovies(): Movie[] {
    if (!this.searchText.trim()) return this.movies;
    const q = this.searchText.toLowerCase();
    return this.movies.filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.director.toLowerCase().includes(q) ||
      m.movie_id.toLowerCase().includes(q)
    );
  }

  loadMovies() {
    this.listLoading = true;
    this.movieService.getMovies({ pn: this.listPage, ps: this.listPageSize, sort_by: 'title', order: 'asc' }).subscribe({
      next: (movies) => { this.movies = movies; this.listLoading = false; },
      error: () => { this.listLoading = false; }
    });
  }

  prevPage() { if (this.listPage > 1) { this.listPage--; this.loadMovies(); } }
  nextPage() { this.listPage++; this.loadMovies(); }

  startEdit(movie: Movie) {
    this.editMode = true;
    this.editingMovieId = movie.movie_id;
    this.form = {
      title: movie.title,
      release_year: movie.release_year,
      director: movie.director,
      genres: movie.genres.join(', '),
      duration_minutes: movie.duration_minutes,
      language: movie.language,
      country: movie.release.country,
      release_date: movie.release.date,
      hero_name: movie.cast[0]?.actor_name || '',
      villain_name: movie.cast[1]?.actor_name || '',
      tags: movie.tags.join(', '),
      average_rating: movie.ratings.average,
      votes: movie.ratings.votes
    };
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.editMode = false;
    this.editingMovieId = '';
    this.resetForm();
  }

  resetForm() {
    this.form = {
      title: '', release_year: '', director: '', genres: '',
      duration_minutes: '', language: 'English', country: 'USA',
      release_date: '', hero_name: '', villain_name: '',
      tags: '', average_rating: 0, votes: 0
    };
  }

  submitForm() {
    if (!this.form.title || !this.form.release_year || !this.form.director) {
      this.showFormAlert('Title, release year, and director are required.', 'error');
      return;
    }

    this.submitting = true;

    const obs = this.editMode
      ? this.movieService.updateMovie(this.editingMovieId, this.form)
      : this.movieService.addMovie(this.form);

    obs.subscribe({
      next: () => {
        this.showFormAlert(this.editMode ? 'Movie updated!' : 'Movie added!', 'success');
        this.submitting = false;
        this.cancelEdit();
        this.loadMovies();
      },
      error: (err) => {
        this.showFormAlert(err.error?.Error || 'Operation failed.', 'error');
        this.submitting = false;
      }
    });
  }

  requestDelete(movie: Movie) {
    this.movieToDelete = movie;
    this.showDeleteModal = true;
  }

  cancelDelete() {
    this.showDeleteModal = false;
    this.movieToDelete = null;
  }

  confirmDelete() {
    if (!this.movieToDelete) return;
    const movie = this.movieToDelete;
    this.showDeleteModal = false;
    this.movieToDelete = null;

    this.movieService.deleteMovie(movie.movie_id).subscribe({
      next: () => {
        this.showDeleteAlert(`"${movie.title}" deleted successfully.`, 'success');
        this.loadMovies();
      },
      error: (err) => {
        this.showDeleteAlert(err.error?.Error || 'Delete failed.', 'error');
      }
    });
  }

  showFormAlert(msg: string, type: string) {
    this.formAlert = msg;
    this.formAlertType = type;
    setTimeout(() => this.formAlert = '', 4000);
  }

  showDeleteAlert(msg: string, type: string) {
    this.deleteAlert = msg;
    this.deleteAlertType = type;
    setTimeout(() => this.deleteAlert = '', 4000);
  }

  // Allow only digit keys (0-9), plus control keys like Backspace, Delete, arrows
  onlyDigits(e: KeyboardEvent) {
    const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  }
}
