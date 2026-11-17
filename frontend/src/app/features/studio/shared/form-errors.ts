import { AbstractControl, FormGroup } from '@angular/forms';
import { problemOf } from '@app/core/api/problem';
import { toast } from '@spartan-ng/brain/sonner';

/**
 * Applies a 400 response to a form: field errors go to matching controls, anything else becomes a toast.
 * Returns the message that was displayed as a toast, if any.
 */
export function applyServerError(form: FormGroup, error: unknown): void {
  const problem = problemOf(error);
  let mapped = 0;
  for (const [field, message] of Object.entries(problem.fields ?? {})) {
    const control: AbstractControl | null = form.get(field);
    if (control) {
      control.setErrors({ server: message });
      control.markAsTouched();
      mapped++;
    }
  }
  if (mapped === 0) {
    toast.error(problem.detail ?? 'Unexpected error');
  }
}

/** Empty strings become null so optional columns are cleared rather than stored blank. */
export const blankToNull = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};
