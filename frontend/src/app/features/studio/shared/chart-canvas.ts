import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, afterNextRender, effect, inject, input, viewChild } from '@angular/core';
import {
  BarController, BarElement, CategoryScale, Chart, ChartConfiguration, ChartType, Filler, LineController,
  LineElement, LinearScale, PointElement, Tooltip,
} from 'chart.js';

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, CategoryScale, LinearScale, Filler, Tooltip);

/** Responsive Chart.js wrapper: fixed-height box, redraws when `config` changes, destroyed with the view. */
@Component({
  selector: 'at-chart-canvas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <div class="relative w-full" [style.height.px]="height()">
      <canvas #canvas role="img" [attr.aria-label]="label()"></canvas>
    </div>
  `,
})
export class ChartCanvas<T extends ChartType = ChartType> {
  readonly config = input.required<ChartConfiguration<T>>();
  readonly label = input.required<string>();
  readonly height = input(300);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  private chart: Chart | null = null;

  constructor() {
    afterNextRender(() => {
      this.chart = new Chart(this.canvas().nativeElement, this.prepared());
    });
    effect(() => {
      const config = this.prepared();
      if (!this.chart) return;
      this.chart.data = config.data;
      this.chart.options = config.options ?? {};
      this.chart.update();
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }

  private prepared(): ChartConfiguration {
    const config = this.config() as unknown as ChartConfiguration;
    const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      ...config,
      options: { ...config.options, responsive: true, maintainAspectRatio: false, ...(reduced ? { animation: false as const } : {}) },
    };
  }
}
