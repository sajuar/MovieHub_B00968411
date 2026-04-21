// models/movie.model.ts

export interface Release {
  country: string;
  date: string;
}

export interface CastMember {
  actor_name: string;
  role: string;
}

export interface Ratings {
  average: number;
  votes: number;
}

export interface Movie {
  _id?: string;
  movie_id: string;
  title: string;
  image_url?: string;
  release_year: number;
  genres: string[];
  duration_minutes: number;
  director: string;
  language: string;
  release: Release;
  cast: CastMember[];
  ratings: Ratings;
  tags: string[];
  created_at: string;
}

export interface Review {
  _id?: string;
  review_id: string;
  movie_id: string;
  user_id: string;
  rating: number;
  comment: string;
  review_date: string;
  helpful_votes: number;
}

export interface User {
  _id?: string;
  user_id: string;
  username: string;
  email?: string;
  role: string;
  joined_date: string;
}

export interface AuthResponse {
  message: string;
  token: string;
  user_id: string;
  username: string;
  role: string;
}

export interface LoginCredentials {
  username?: string;
  email?: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface GenreStat {
  genre: string;
  count: number;
}

export interface MovieFilters {
  title?: string;
  genre?: string;
  min_rating?: number;
  language?: string;
  director?: string;
  release_year?: number;
  sort_by?: string;
  order?: string;
  pn?: number;
  ps?: number;
}
