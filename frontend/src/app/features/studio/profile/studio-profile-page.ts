import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmBadge } from '@spartan-ng/helm/badge';
import { HlmInput } from '@spartan-ng/helm/input';
import { toast } from '@spartan-ng/brain/sonner';
import { problemOf } from '@app/core/api/problem';
import { StudioApi } from '@app/core/api/studio.api';
import { AuthStore } from '@app/core/auth/auth.store';
import { LongDatePipe } from '@app/core/util/format.pipes';
import { applyServerError, blankToNull } from '../shared/form-errors';
import { FormField } from '../shared/form-field';

@Component({
  selector: 'at-studio-profile-page',
  imports: [ReactiveFormsModule, HlmBadge, HlmInput, LongDatePipe, FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './studio-profile-page.html',
})
export default class StudioProfilePage {
  private readonly api = inject(StudioApi);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly auth = inject(AuthStore);

  protected readonly coverUrl = '/artworks/barges-at-pontoise-437302.jpg';
  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);

  protected readonly initials = computed(() => {
    const user = this.auth.user();
    return user ? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`.toUpperCase() : '';
  });

  protected readonly profileForm = this.fb.group({
    firstName: [this.auth.user()?.firstName ?? '', [Validators.required, Validators.maxLength(80)]],
    lastName: [this.auth.user()?.lastName ?? '', [Validators.required, Validators.maxLength(80)]],
    phone: [this.auth.user()?.phone ?? '', Validators.maxLength(30)],
  });

  protected readonly passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
  });

  protected saveProfile(): void {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }
    const v = this.profileForm.getRawValue();
    this.savingProfile.set(true);
    this.api
      .updateProfile({
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        phone: blankToNull(v.phone),
      })
      .subscribe({
        next: (user) => {
          this.auth.updateUser(user);
          this.savingProfile.set(false);
          toast.success('Profile updated');
        },
        error: (err) => {
          this.savingProfile.set(false);
          applyServerError(this.profileForm, err);
        },
      });
  }

  protected savePassword(): void {
    const form = this.passwordForm;
    const v = form.getRawValue();
    if (v.newPassword !== v.confirm) {
      form.controls.confirm.setErrors({ server: 'Passwords do not match.' });
      form.controls.confirm.markAsTouched();
    }
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.savingPassword.set(true);
    this.api
      .changePassword({ currentPassword: v.currentPassword, newPassword: v.newPassword })
      .subscribe({
        next: () => {
          this.savingPassword.set(false);
          form.reset();
          toast.success('Password changed');
        },
        error: (err) => {
          this.savingPassword.set(false);
          if (problemOf(err).code === 'wrong_password') {
            form.controls.currentPassword.setErrors({ server: 'Current password is incorrect.' });
            form.controls.currentPassword.markAsTouched();
          } else {
            applyServerError(form, err);
          }
        },
      });
  }
}
