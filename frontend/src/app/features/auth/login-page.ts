import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { problemOf } from '@app/core/api/problem';
import { AuthStore } from '@app/core/auth/auth.store';
import { AuthShell } from './auth-shell';

@Component({
  selector: 'at-login-page',
  imports: [ReactiveFormsModule, RouterLink, HlmButton, HlmInput, HlmLabel, AuthShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-auth-shell eyebrow="Welcome back" title="Sign in">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5" novalidate>
        <div class="space-y-2">
          <label hlmLabel for="email">Email</label>
          <input hlmInput id="email" type="email" autocomplete="email" formControlName="email" class="w-full" />
          @if (invalid('email')) {
            <p class="text-sm text-terracotta" role="alert">Enter a valid email address.</p>
          }
        </div>
        <div class="space-y-2">
          <label hlmLabel for="password">Password</label>
          <input hlmInput id="password" type="password" autocomplete="current-password" formControlName="password" class="w-full" />
          @if (invalid('password')) {
            <p class="text-sm text-terracotta" role="alert">Enter your password.</p>
          }
        </div>
        @if (error()) {
          <p class="text-sm text-terracotta" role="alert">{{ error() }}</p>
        }
        <button hlmBtn type="submit" class="w-full" [disabled]="pending()">{{ pending() ? 'Signing in…' : 'Sign in' }}</button>
      </form>
      <p class="mt-6 text-sm text-muted-foreground">
        New here?
        <a routerLink="/register" [queryParams]="returnUrl ? { returnUrl } : {}" class="font-semibold text-foreground underline underline-offset-4">Create an account</a>
      </p>
      <div class="mt-8 rounded-md border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
        <p class="font-semibold text-foreground">Demo account</p>
        <p class="mt-1">Demo collector: collector&#64;atelier.demo / Atelier2026!</p>
      </div>
    </at-auth-shell>
  `,
})
export default class LoginPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);
  protected readonly returnUrl = inject(ActivatedRoute).snapshot.queryParamMap.get('returnUrl');

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);

  protected invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.pending.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const target = this.returnUrl && this.returnUrl.startsWith('/') ? this.returnUrl : this.auth.isStaff() ? '/studio' : '/account';
        void this.router.navigateByUrl(target);
      },
      error: (err) => {
        this.pending.set(false);
        const problem = problemOf(err);
        this.error.set(problem.status === 401 ? 'Incorrect email or password.' : (problem.detail ?? 'Sign in failed.'));
      },
    });
  }
}
