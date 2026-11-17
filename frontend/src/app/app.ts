import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HlmToaster } from '@spartan-ng/helm/sonner';

@Component({
  selector: 'at-root',
  imports: [RouterOutlet, HlmToaster],
  template: `
    <router-outlet />
    <hlm-toaster position="bottom-right" richColors />
  `,
})
export class App {}
