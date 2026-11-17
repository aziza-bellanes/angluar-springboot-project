import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ArtworkCard } from '@app/core/models/api.models';
import { FlipTransition } from './flip-transition.service';
import { gsap } from './motion';
import { NightSky } from './night-sky';
import { Formation, FormationName, formation, layoutMetrics } from './riffle-formations';

interface Scene {
  name: FormationName;
  eyebrow: string;
  title: string;
}

const SCENES: Scene[] = [
  { name: 'fan', eyebrow: 'The immersive experience', title: 'Art is not meant to stand still.' },
  { name: 'deck', eyebrow: 'From the studio', title: 'Every canvas carries a story.' },
  { name: 'grid', eyebrow: 'The gallery', title: 'Browse by artist, era and medium.' },
  { name: 'featured', eyebrow: 'Featured work', title: '' },
];

const MOTION_QUERY = '(min-width: 768px) and (prefers-reduced-motion: no-preference)';

/**
 * ATELIER's signature sequence. While the section is pinned, scrolling moves the artworks through
 * four formations: a curved fan, a cascading deck, an organised gallery and a featured painting.
 *
 * - Timeline scrubbed by ScrollTrigger and snapped to the four scenes.
 * - Only transforms and opacity are animated; positions are recomputed on resize.
 * - On phones or with reduced motion, a simple swipeable row is rendered instead.
 * - Everything is reverted on destroy so no ScrollTrigger survives a navigation.
 */
@Component({
  selector: 'at-riffle-gallery',
  imports: [RouterLink, NightSky],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './riffle-gallery.html',
  styles: `
    .plane {
      transform-style: preserve-3d;
    }
    .riffle-card {
      width: var(--card-w);
      height: var(--card-h);
      margin-left: calc(var(--card-w) / -2);
      margin-top: calc(var(--card-h) / -2);
      backface-visibility: hidden;
      will-change: transform, opacity;
    }
  `,
})
export class RiffleGallery {
  readonly artworks = input.required<ArtworkCard[]>();

  private readonly flip = inject(FlipTransition);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  protected readonly scenes = SCENES;
  protected readonly cards = computed(() => this.artworks().slice(0, 12));
  protected readonly featured = computed(() => this.cards()[Math.floor(this.cards().length / 2)]);
  protected readonly activeScene = signal(0);

  constructor() {
    const destroyRef = inject(DestroyRef);
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    afterNextRender(() => {
      const media = gsap.matchMedia(host);
      media.add(MOTION_QUERY, () => this.choreograph());
      destroyRef.onDestroy(() => media.revert());
    });
  }

  protected remember(slug: string, image: HTMLElement): void {
    this.flip.capture(slug, image);
  }

  private choreograph(): void {
    const stage = this.stage().nativeElement;
    const cards = gsap.utils.toArray<HTMLElement>('.riffle-card', stage);
    const captions = gsap.utils.toArray<HTMLElement>('.riffle-caption', stage);
    if (cards.length === 0) {
      return;
    }
    const count = cards.length;
    const featuredIndex = Math.floor(count / 2);
    const metrics = () => layoutMetrics(window.innerWidth, window.innerHeight);
    const at = (name: FormationName, index: number): Formation =>
      formation(name, index, count, featuredIndex, metrics());
    const pose = (name: FormationName): gsap.TweenVars => ({
      x: (i: number) => at(name, i).x,
      y: (i: number) => at(name, i).y,
      z: (i: number) => at(name, i).z,
      rotationX: (i: number) => at(name, i).rotationX,
      rotationY: (i: number) => at(name, i).rotationY,
      rotationZ: (i: number) => at(name, i).rotationZ,
      scale: (i: number) => at(name, i).scale,
      opacity: (i: number) => at(name, i).opacity,
    });

    const applyCardSize = () => {
      const { cardWidth, cardHeight } = metrics();
      stage.style.setProperty('--card-w', `${cardWidth}px`);
      stage.style.setProperty('--card-h', `${cardHeight}px`);
    };
    applyCardSize();

    gsap.set(cards, pose('fan'));
    gsap.set(captions, { autoAlpha: 0, y: 24 });
    gsap.set(captions[0], { autoAlpha: 1, y: 0 });

    // Entrance: the paintings rise into the fan once, independent of scrolling.
    gsap.from(gsap.utils.toArray('.riffle-card img', stage), {
      yPercent: 40,
      opacity: 0,
      duration: 1.2,
      ease: 'power3.out',
      stagger: { each: 0.06, from: 'center' },
    });

    const timeline = gsap.timeline({
      defaults: { duration: 1, ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: stage,
        pin: true,
        start: 'top top',
        end: () => `+=${window.innerHeight * 3}`,
        scrub: 0.8,
        invalidateOnRefresh: true,
        snap: { snapTo: 'labels', duration: { min: 0.25, max: 0.7 }, ease: 'power1.inOut' },
        onRefresh: applyCardSize,
        onUpdate: (self) => this.activeScene.set(Math.round(self.progress * (SCENES.length - 1))),
      },
    });

    timeline.addLabel('fan');
    SCENES.slice(1).forEach((scene, step) => {
      const position = `+=${step === 0 ? 0.2 : 0.3}`;
      timeline.to(cards, { ...pose(scene.name), stagger: { each: 0.015, from: 'center' } }, position);
      timeline.to(captions[step], { autoAlpha: 0, y: -24, duration: 0.4 }, '<');
      timeline.to(captions[step + 1], { autoAlpha: 1, y: 0, duration: 0.5 }, '<0.5');
      timeline.addLabel(scene.name);
    });
  }
}
