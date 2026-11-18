import { Injectable } from '@angular/core';
import { gsap, prefersReducedMotion } from './motion';

interface CapturedImage {
  key: string;
  rect: DOMRect;
}

/**
 * Artwork-to-detail transition. Before navigating, a card records the on-screen rectangle of its
 * image; the detail page then plays a FLIP animation (First, Last, Invert, Play) so the painting
 * appears to grow from the card into its new place. Keys are stable artwork slugs.
 */
@Injectable({ providedIn: 'root' })
export class FlipTransition {
  private captured: CapturedImage | null = null;

  capture(key: string, image: HTMLElement): void {
    this.captured = { key, rect: image.getBoundingClientRect() };
  }

  /** Plays the transition if the last captured image matches `key`. Returns true when it ran. */
  play(key: string, target: HTMLElement): boolean {
    const source = this.captured;
    this.captured = null;
    if (!source || source.key !== key || prefersReducedMotion()) {
      return false;
    }
    const last = target.getBoundingClientRect();
    if (last.width === 0 || last.height === 0) {
      return false;
    }
    gsap.fromTo(
      target,
      {
        x: source.rect.left - last.left,
        y: source.rect.top - last.top,
        scaleX: source.rect.width / last.width,
        scaleY: source.rect.height / last.height,
        transformOrigin: 'top left',
      },
      {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: 0.9,
        ease: 'power3.inOut',
        clearProps: 'transform',
      },
    );
    return true;
  }
}
