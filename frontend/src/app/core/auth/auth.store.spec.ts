import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthResponse, RoleName, UserProfile } from '../models/api.models';
import { AuthStore } from './auth.store';

const STORAGE_KEY = 'atelier.session';

const user = (roles: RoleName[]): UserProfile => ({
  id: 7,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.test',
  enabled: true,
  roles,
  createdAt: '2026-01-01T00:00:00Z',
});

const response = (roles: RoleName[], expiresAt = new Date(Date.now() + 3_600_000).toISOString()): AuthResponse => ({
  token: 'jwt-abc',
  expiresAt,
  user: user(roles),
});

describe('AuthStore', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it('starts signed out when nothing is stored', () => {
    const store = TestBed.inject(AuthStore);
    expect(store.isAuthenticated()).toBe(false);
    expect(store.roles()).toEqual([]);
  });

  it('login stores the session and exposes the bidder role', () => {
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);

    store.login({ email: 'ada@example.test', password: 'secret' }).subscribe();

    const req = http.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(response(['BIDDER']));

    expect(store.isAuthenticated()).toBe(true);
    expect(store.isBidder()).toBe(true);
    expect(store.isStaff()).toBe(false);
    expect(store.token()).toBe('jwt-abc');
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();
    http.verify();
  });

  it('logout clears the session and the stored copy', () => {
    const store = TestBed.inject(AuthStore);
    const http = TestBed.inject(HttpTestingController);

    store.login({ email: 'ada@example.test', password: 'secret' }).subscribe();
    http.expectOne('/api/auth/login').flush(response(['ADMIN']));
    expect(store.isAdmin()).toBe(true);
    expect(store.isStaff()).toBe(true);

    store.logout();

    expect(store.isAuthenticated()).toBe(false);
    expect(store.user()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('ignores an expired stored session on startup', () => {
    const expired = { token: 'old', expiresAt: new Date(Date.now() - 60_000).toISOString(), user: user(['BIDDER']) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expired));

    const store = TestBed.inject(AuthStore);

    expect(store.isAuthenticated()).toBe(false);
    expect(store.token()).toBeNull();
  });

  it('restores a still-valid stored session on startup', () => {
    const valid = { token: 'fresh', expiresAt: new Date(Date.now() + 60_000).toISOString(), user: user(['COLLABORATEUR']) };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));

    const store = TestBed.inject(AuthStore);

    expect(store.isAuthenticated()).toBe(true);
    expect(store.isStaff()).toBe(true);
    expect(store.isAdmin()).toBe(false);
  });
});
