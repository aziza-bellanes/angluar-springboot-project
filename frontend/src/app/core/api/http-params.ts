import { HttpParams } from '@angular/common/http';

type ParamValue = string | number | boolean | null | undefined | readonly (string | number)[];

/** Builds HttpParams while skipping empty values, so optional filters stay out of the URL. */
export function toParams(values: Record<string, ParamValue>): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => (params = params.append(key, String(item))));
    } else {
      params = params.set(key, String(value));
    }
  }
  return params;
}
