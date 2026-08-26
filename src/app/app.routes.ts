import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { PartnerRoleGuard } from './guards/partner-role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./pages/auth/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'pro-login',
        loadComponent: () =>
          import('./pages/auth/pro-login/pro-login.page').then((m) => m.ProLoginPage),
      },
      {
        path: 'verify-login',
        loadComponent: () =>
          import('./pages/auth/verify-login/verify-login.page').then((m) => m.VerifyLoginPage),
      },
      {
        path: 'complete-profile',
        loadComponent: () =>
          import('./pages/auth/complete-profile/complete-profile.page').then((m) => m.CompleteProfilePage),
      },
      {
        path: 'forgot',
        loadComponent: () => import('./pages/auth/forgot/forgot.page').then((m) => m.ForgotPage),
      },
      {
        path: 'verify',
        loadComponent: () => import('./pages/auth/verify/verify.page').then((m) => m.VerifyPage),
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
    ],
  },

  // ========== TAB MENU ROUTES ==========
  {
    path: '',
    canActivate: [AuthGuard],
    loadChildren: () => import('./tabs/tabs.routes').then((m) => m.routes),
  },

  // ========== CLIENT SECONDARY ROUTES ==========
  {
    path: 'agency-profil/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/agency-profile/agency-profile.page').then(
        (m) => m.AgencyProfilePage,
      ),
  },
  {
    path: 'booking-form/:tripId',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/booking-form/booking-form.page').then(
        (m) => m.BookingFormPage,
      ),
  },
  {
    path: 'search-results',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/search-results/search-results.page').then(
        (m) => m.SearchResultsPage,
      ),
  },
  {
    path: 'ticket/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/ticket-detail/ticket-detail.page').then(
        (m) => m.TicketDetailPage,
      ),
  },
  {
    path: 'trip-detail/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/trip-detail/trip-detail.page').then(
        (m) => m.TripDetailPage,
      ),
  },
  {
    path: 'notifications',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/notifications/notifications.page').then(
        (m) => m.NotificationsPage,
      ),
  },
  {
    path: 'settings',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/settings/settings.page').then(
        (m) => m.SettingsPage,
      ),
  },
  {
    path: 'support-new',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/support/support.page').then(
        (m) => m.SupportPage,
      ),
  },
  {
    path: 'edit-profile-photo',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/edit-profile-photo/edit-profile-photo.page').then(
        (m) => m.EditProfilePhotoPage,
      ),
  },
  {
    path: 'edit-user-info',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/edit-user-info/edit-user-info.page').then(
        (m) => m.EditUserInfoPage,
      ),
  },
  {
    path: 'seat-selection/:tripId',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/seat-selection/seat-selection.page').then(
        (m) => m.SeatSelectionPage,
      ),
  },
  {
    path: 'payment-history',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/payment-history/payment-history.page').then(
        (m) => m.PaymentHistoryPage,
      ),
  },
  {
    path: 'support',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/support-tickets/support-tickets.page').then(
        (m) => m.SupportTicketsPage,
      ),
  },
  {
    path: 'support-ticket-detail/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/support-ticket-detail/support-ticket-detail.page').then(
        (m) => m.SupportTicketDetailPage,
      ),
  },
  {
    path: 'payment-detail/:id',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/payment-history/payment-history.page').then(
        (m) => m.PaymentHistoryPage,
      ),
  },
  {
    path: 'change-password',
    canActivate: [AuthGuard],
    loadComponent: () =>
      import('./pages/client-side/change-password/change-password.page').then(
        (m) => m.ChangePasswordPage,
      ),
  },

  // ========== PARTNER SECONDARY ROUTES ==========
  {
    path: 'partner-manifest/:tripId',
    canActivate: [AuthGuard, PartnerRoleGuard],
    data: { permission: 'canViewManifest' },
    loadComponent: () =>
      import('./pages/partner-side/trip-manifest/trip-manifest.page').then(
        (m) => m.TripManifestPage,
      ),
  },
  {
    path: 'partner-validate-ticket',
    canActivate: [AuthGuard, PartnerRoleGuard],
    data: { permission: 'canValidateTickets' },
    loadComponent: () =>
      import('./pages/partner-side/ticket-validation/ticket-validation.page').then(
        (m) => m.TicketValidationPage,
      ),
  },
  {
    path: 'partner-notifications',
    canActivate: [AuthGuard, PartnerRoleGuard],
    data: { permission: 'canViewNotifications' },
    loadComponent: () =>
      import('./pages/partner-side/partner-notifications/partner-notifications.page').then(
        (m) => m.PartnerNotificationsPage,
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];