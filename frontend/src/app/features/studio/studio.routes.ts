import { Routes } from '@angular/router';
import { roleGuard } from '@app/core/auth/guards';
import { StudioLayout } from './studio-layout';

/**
 * Management studio (ADMIN and COLLABORATEUR). Specification menu: Clients → Artists,
 * Projets → Exhibitions, Users. Auctions, Users and Roles are ADMIN only.
 */
export default [
  {
    path: '',
    component: StudioLayout,
    children: [
      {
        path: '',
        title: 'Studio · ATELIER',
        data: { heading: 'Overview' },
        loadComponent: () => import('./overview/studio-overview-page'),
      },
      {
        path: 'artists',
        title: 'Artists · Studio',
        data: { heading: 'Artists' },
        loadComponent: () => import('./artists/studio-artists-page'),
      },
      {
        path: 'exhibitions',
        title: 'Exhibitions · Studio',
        data: { heading: 'Exhibitions' },
        loadComponent: () => import('./exhibitions/studio-exhibitions-page'),
      },
      {
        path: 'artworks',
        title: 'Artworks · Studio',
        data: { heading: 'Artworks' },
        loadComponent: () => import('./artworks/studio-artworks-page'),
      },
      {
        path: 'auctions',
        title: 'Auctions · Studio',
        data: { heading: 'Auctions' },
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./auctions/studio-auctions-page'),
      },
      {
        path: 'profile',
        title: 'My profile · Studio',
        data: { heading: 'My profile' },
        loadComponent: () => import('./profile/studio-profile-page'),
      },
      {
        path: 'roles',
        title: 'Roles · Studio',
        data: { heading: 'Roles' },
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./roles/studio-roles-page'),
      },
      {
        path: 'users',
        title: 'Users · Studio',
        data: { heading: 'Users' },
        canActivate: [roleGuard('ADMIN')],
        loadComponent: () => import('./users/studio-users-page'),
      },
    ],
  },
] satisfies Routes;
