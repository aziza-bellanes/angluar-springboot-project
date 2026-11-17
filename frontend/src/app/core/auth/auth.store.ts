import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest, RoleName, UserProfile } from '../models/api.models';

interface Session {
  token: string;
  expiresAt: string;
  user: UserProfile;
}

const STORAGE_KEY = 'atelier.session';

/**
 * Holds the authenticated session as signals. The JWT is kept in localStorage so a refresh keeps
 * the visitor signed in; it is discarded as soon as it expires or the API answers 401.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly session = signal<Session | null>(readStoredSession());

  readonly user = computed(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.token ?? null);
  readonly isAuthenticated = computed(() => this.session() !== null);
  readonly roles = computed<RoleName[]>(() => this.user()?.roles ?? []);
  readonly isAdmin = computed(() => this.hasRole('ADMIN'));
  readonly isStaff = computed(() => this.hasRole('ADMIN', 'COLLABORATEUR'));
  readonly isBidder = computed(() => this.hasRole('BIDDER'));

  hasRole(...roles: RoleName[]): boolean {
    return this.roles().some((role) => roles.includes(role));
  }

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/login', request).pipe(tap((res) => this.store(res)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>('/api/auth/register', request).pipe(tap((res) => this.store(res)));
  }

  /** Clears the session; when `returnUrl` is given the visitor is sent to the login page. */
  logout(returnUrl?: string): void {
    this.session.set(null);
    safeStorage(() => localStorage.removeItem(STORAGE_KEY));
    if (returnUrl !== undefined) {
      void this.router.navigate(['/login'], { queryParams: returnUrl ? { returnUrl } : {} });
    }
  }

  private store(response: AuthResponse): void {
    const session: Session = { token: response.token, expiresAt: response.expiresAt, user: response.user };
    this.session.set(session);
    safeStorage(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(session)));
  }
}

function readStoredSession(): Session | null {
  const raw = safeStorage(() => localStorage.getItem(STORAGE_KEY));
  if (!raw) {
    return null;
  }
  try {
    const session = JSON.parse(raw) as Session;
    return new Date(session.expiresAt).getTime() > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function safeStorage<T>(operation: () => T): T | null {
  try {
    return operation();
  } catch {
    return null;
  }
}
