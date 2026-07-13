import { Routes } from '@angular/router';
import { TabsPage } from './tabs.page';
import { AuthGuard } from '../guards/auth.guard';
import { PartnerRoleGuard } from '../guards/partner-role.guard';

export const routes: Routes = [
  {
    path: 'tabs',
    component: TabsPage,
    canActivate: [AuthGuard],
    children: [
      // ========== CLIENT TAB MENU ROUTES ==========
      {
        path: 'home',
        loadComponent: () =>
          import('../pages/client-side/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'reservation',
        loadComponent: () =>
          import('../pages/client-side/my-bookings/my-bookings.page').then(
            (m) => m.MyBookingsPage,
          ),
      },
      {
        path: 'agences',
        loadComponent: () =>
          import('../pages/client-side/agencies-list/agencies-list.page').then(
            (m) => m.AgenciesListPage,
          ),
      },
      {
        path: 'profil',
        loadComponent: () =>
          import('../pages/client-side/user-profile/user-profile.page').then(
            (m) => m.UserProfilePage,
          ),
      },

      // ========== PARTNER TAB MENU ROUTES ==========
      {
        // Pas de "permission" requise ici volontairement : c'est la page
        // d'atterrissage commune à TOUS les rôles partenaires (cf.
        // TabsRedirectComponent). Si on y ajoutait canViewDashboard, un
        // WHARF_AGENT (qui ne l'a pas) serait bloqué en boucle sur sa
        // propre page de destination par défaut.
        path: 'partner-dashboard',
        canActivate: [PartnerRoleGuard],
        loadComponent: () =>
          import('../pages/partner-side/dashboard/dashboard.page').then(
            (m) => m.DashboardPage,
          ),
      },
      {
        path: 'partner-trips',
        canActivate: [PartnerRoleGuard],
        data: { permission: 'canViewTrips' },
        loadComponent: () =>
          import('../pages/partner-side/scheduled-trips/scheduled-trips.page').then(
            (m) => m.ScheduledTripsPage,
          ),
      },
      {
        path: 'partner-control',
        canActivate: [PartnerRoleGuard],
        data: { permission: 'canBoardingControl' },
        loadComponent: () =>
          import('../pages/partner-side/boarding-control/boarding-control.page').then(
            (m) => m.BoardingControlPage,
          ),
      },

      {
        path: 'partner-profil',
        canActivate: [PartnerRoleGuard],
        data: { permission: 'canViewProfile' },
        loadComponent: () =>
          import('../pages/partner-side/partner-profile/partner-profile.page').then(
            (m) => m.PartnerProfilePage,
          ),
      },

      // Default redirect
      {
        path: '',
        loadComponent: () =>
          import('./tabs-redirect.component').then(
            (m) => m.TabsRedirectComponent,
          ),
      },
    ],
  },
  {
    path: '',
    redirectTo: '/tabs',
    pathMatch: 'full',
  },
];
