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
import { FORMATIONS, FormationName, RENDER_SCALE, formation, layoutMetrics } from './riffle-formations';

const MOTION_QUERY = '(prefers-reduced-motion: no-preference)';
const MAX_CARDS = 20;
/** Keys that scroll the page; ignored while the opening shuffle plays. */
const SCROLL_KEYS = new Set([' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End']);

interface Scene {
  name: FormationName;
  label: string;
}

const SCENES: Scene[] = [
  { name: 'ring', label: 'Collection' },
  { name: 'pile', label: 'Shuffle' },
  { name: 'corridor', label: 'Corridor' },
  { name: 'featured', label: 'Featured' },
];

/**
 * ATELIER's opening, after the Riffle motion study. The paintings arrive as a pile and riffle open
 * into a ring floating in front of a gallery wall; while the section is pinned, scrolling gathers
 * them into a shuffled pile, stretches them into a deep corridor and finally brings one painting
 * forward.
 *
 * - The scroll timeline is created once the opening shuffle has finished, so both never animate the
 *   same properties; scrolling is held for that second and a half only.
 * - Poses are functions of the viewport and recomputed on refresh.
 * - The plane leans toward a mouse pointer; touch and keyboard are unaffected.
 * - With reduced motion a calm, swipeable row is shown instead.
 */
@Component({
  selector: 'at-riffle-deck',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './riffle-deck.html',
  styleUrl: './riffle-deck.css',
})
export class RiffleDeck {
  readonly artworks = input.required<ArtworkCard[]>();

  private readonly flip = inject(FlipTransition);
  private readonly stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  protected readonly scenes = SCENES;
  protected readonly cards = computed(() => this.artworks().slice(0, MAX_CARDS));
  protected readonly lead = computed(() => this.cards()[0]);
  protected readonly scene = signal(0);

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

  protected pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  private choreograph(): () => void {
    const stage = this.stage().nativeElement;
    const plane = stage.querySelector<HTMLElement>('.plane')!;
    const cards = gsap.utils.toArray<HTMLElement>('.riffle-card', stage);
    const count = cards.length;
    if (count === 0) {
      return () => undefined;
    }

    const metrics = () => layoutMetrics(window.innerWidth, window.innerHeight);
    const pose = (name: FormationName): gsap.TweenVars => {
      const at = (i: number) => formation(name, i, count, metrics());
      return {
        x: (i: number) => at(i).x,
        y: (i: number) => at(i).y,
        z: (i: number) => at(i).z,
        rotationX: (i: number) => at(i).rotationX,
        rotationY: (i: number) => at(i).rotationY,
        rotationZ: (i: number) => at(i).rotationZ,
        scale: (i: number) => at(i).scale / RENDER_SCALE,
        opacity: (i: number) => at(i).opacity,
      };
    };
    const applyCardSize = () => {
      const { cardWidth, cardHeight } = metrics();
      stage.style.setProperty('--card-w', `${cardWidth * RENDER_SCALE}px`);
      stage.style.setProperty('--card-h', `${cardHeight * RENDER_SCALE}px`);
    };
    applyCardSize();

    let scroll: gsap.core.Timeline | null = null;
    const buildScroll = () => {
      scroll = gsap.timeline({
        defaults: { duration: 1, ease: 'power2.inOut' },
        scrollTrigger: {
          trigger: stage,
          pin: true,
          start: 'top top',
          end: () => `+=${window.innerHeight * 2.6}`,
          scrub: 0.7,
          invalidateOnRefresh: true,
          snap: {
            snapTo: 'labels',
            duration: { min: 0.3, max: 0.8 },
            delay: 0.06,
            ease: 'power1.inOut',
          },
          onRefresh: applyCardSize,
          onUpdate: (self) => this.scene.set(Math.round(self.progress * (SCENES.length - 1))),
        },
      });
      scroll.addLabel(SCENES[0].name);
      FORMATIONS.slice(1).forEach((name, step) => {
        scroll!.to(
          cards,
          { ...pose(name), stagger: { each: 0.012, from: step === 0 ? 'end' : 'start' } },
          `+=${step === 0 ? 0 : 0.15}`,
        );
        scroll!.addLabel(name);
      });
    };

    // Opening: the collection lands as a pile, then riffles open into the ring.
    const releaseInput = this.holdScrolling();
    gsap.set(cards, {
      ...pose('pile'),
      opacity: 0,
      y: (i: number) => formation('pile', i, count, metrics()).y + 120,
    });
    const opening = gsap.timeline({
      delay: 0.1,
      onComplete: () => {
        releaseInput();
        buildScroll();
      },
    });
    opening
      .to(cards, {
        y: pose('pile').y,
        opacity: 1,
        duration: 0.8,
        ease: 'power3.out',
        stagger: { each: 0.02, from: 'end' },
      })
      .to(
        cards,
        {
          ...pose('ring'),
          duration: 1.4,
          ease: 'expo.inOut',
          stagger: { each: 0.022, from: 'start' },
        },
        '+=0.05',
      )
      .fromTo(
        stage.querySelectorAll('.deck-chrome'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', stagger: 0.08 },
        '-=0.6',
      );

    // The whole plane leans gently toward a mouse pointer.
    const tiltX = gsap.quickTo(plane, 'rotationX', { duration: 1, ease: 'power3.out' });
    const tiltY = gsap.quickTo(plane, 'rotationY', { duration: 1, ease: 'power3.out' });
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        tiltY((event.clientX / window.innerWidth - 0.5) * 10);
        tiltX((0.5 - event.clientY / window.innerHeight) * 7);
      }
    };
    stage.addEventListener('pointermove', onPointer);

    return () => {
      releaseInput();
      opening.kill();
      scroll?.scrollTrigger?.kill();
      scroll?.kill();
      stage.removeEventListener('pointermove', onPointer);
    };
  }

  /** Holds wheel, touch and keyboard scrolling while the opening plays, unless the page is already scrolled. */
  private holdScrolling(): () => void {
    if (window.scrollY > 4) {
      return () => undefined;
    }
    const block = (event: Event) => event.preventDefault();
    const blockKeys = (event: KeyboardEvent) =>
      SCROLL_KEYS.has(event.key) && event.preventDefault();
    const options: AddEventListenerOptions = { passive: false };
    window.addEventListener('wheel', block, options);
    window.addEventListener('touchmove', block, options);
    window.addEventListener('keydown', blockKeys);
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      window.removeEventListener('wheel', block);
      window.removeEventListener('touchmove', block);
      window.removeEventListener('keydown', blockKeys);
    };
  }
}
