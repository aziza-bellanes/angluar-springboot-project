import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger, Flip);

/** GSAP with ScrollTrigger and Flip registered once for the whole application. */
export { gsap, Flip, ScrollTrigger };

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  return typeof matchMedia !== 'undefined' && matchMedia(REDUCED_MOTION).matches;
}
