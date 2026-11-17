import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { toast } from '@spartan-ng/brain/sonner';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { problemOf } from '@app/core/api/problem';
import { AuthStore } from '@app/core/auth/auth.store';
import { AuthShell } from './auth-shell';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  return group.get('password')?.value === group.get('confirm')?.value ? null : { mismatch: true };
}

type Field = 'firstName' | 'lastName' | 'email' | 'phone' | 'password' | 'confirm';

@Component({
  selector: 'at-register-page',
  imports: [ReactiveFormsModule, RouterLink, HlmButton, HlmInput, HlmLabel, AuthShell],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <at-auth-shell eyebrow="Become a collector" title="Create your account">
      <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-5" novalidate>
        <div class="grid gap-5 sm:grid-cols-2">
          <div class="space-y-2">
            <label hlmLabel for="firstName">First name</label>
            <input hlmInput id="firstName" autocomplete="given-name" formControlName="firstName" class="w-full" />
            @if (message('firstName'); as m) { <p class="text-sm text-terracotta" role="alert">{{ m }}</p> }
          </div>
          <div class="space-y-2">
            <label hlmLabel for="lastName">Last name</label>
            <input hlmInput id="lastName" autocomplete="family-name" formControlName="lastName" class="w-full" />
            @if (message('lastName'); as m) { <p class="text-sm text-terracotta" role="alert">{{ m }}</p> }
          </div>
        </div>
        <div class="space-y-2">
          <label hlmLabel for="email">Email</label>
          <input hlmInput id="email" type="email" autocomplete="email" formControlName="email" class="w-full" />
          @if (message('email'); as m) { <p class="text-sm text-terracotta" role="alert">{{ m }}</p> }
        </div>
        <div class="space-y-2">
          <label hlmLabel for="phone">Phone <span class="text-muted-foreground">(optional)</span></label>
          <input hlmInput id="phone" type="tel" autocomplete="tel" formControlName="phone" class="w-full" />
          @if (message('phone'); as m) { <p class="text-sm text-terracotta" role="alert">{{ m }}</p> }
        </div>
        <div class="space-y-2">
          <label hlmLabel for="password">Password</label>
          <input hlmInput id="password" type="password" autocomplete="new-password" formControlName="password" class="w-full" />
          @if (message('password'); as m) { <p class="text-sm text-terracotta" role="alert">{{ m }}</p> }
        </div>
        <div class="space-y-2">
          <label hlmLabel for="confirm">Confirm password</label>
          <input hlmInput id="confirm" type="password" autocomplete="new-password" formControlName="confirm" class="w-full" />
          @if (message('confirm'); as m) { <p class="text-sm text-terracotta" role="alert">{{ m }}</p> }
        </div>
        @if (error()) {
          <p class="text-sm text-terracotta" role="alert">{{ error() }}</p>
        }
        <button hlmBtn type="submit" class="w-full" [disabled]="pending()">{{ pending() ? 'Creating…' : 'Create account' }}</button>
      </form>
      <p class="mt-6 text-sm text-muted-foreground">
        Already a member?
        <a routerLink="/login" class="font-semibold text-foreground underline underline-offset-4">Sign in</a>
      </p>
    </at-auth-shell>
  `,
})
export default class RegisterPage {
  private readonly auth = inject(AuthStore);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.maxLength(80)]],
      lastName: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
  protected readonly pending = signal(false);
  protected readonly error = signal<string | null>(null);
  private readonly serverErrors = signal<Partial<Record<Field, string>>>({});

  protected message(name: Field): string | null {
    const c = this.form.controls[name];
    const shown = c.touched || c.dirty;
    const server = this.serverErrors()[name];
    if (server && c.valid) {
      return server;
    }
    if (!shown) {
      return null;
    }
    if (c.hasError('required')) {
      return name === 'confirm' ? 'Confirm your password.' : 'This field is required.';
    }
    if (c.hasError('email')) {
      return 'Enter a valid email address.';
    }
    if (c.hasError('minlength')) {
      return 'Use at least 8 characters.';
    }
    if (name === 'confirm' && this.form.hasError('mismatch')) {
      return 'Passwords do not match.';
    }
    return null;
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { confirm: _confirm, phone, ...rest } = this.form.getRawValue();
    this.pending.set(true);
    this.error.set(null);
    this.serverErrors.set({});
    this.auth.register({ ...rest, ...(phone.trim() ? { phone: phone.trim() } : {}) }).subscribe({
      next: () => {
        toast.success('Welcome to ATELIER');
        void this.router.navigateByUrl('/account');
      },
      error: (err) => {
        this.pending.set(false);
        const problem = problemOf(err);
        const errors: Partial<Record<Field, string>> = {};
        if (problem.code === 'email_taken') {
          errors.email = 'An account already exists with this email.';
        }
        for (const [field, text] of Object.entries(problem.fields ?? {})) {
          if (field in this.form.controls) {
            errors[field as Field] = text;
          }
        }
        this.serverErrors.set(errors);
        if (Object.keys(errors).length === 0) {
          this.error.set(problem.detail ?? 'Registration failed.');
        }
      },
    });
  }
}
