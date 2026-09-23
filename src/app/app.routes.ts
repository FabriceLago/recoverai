import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';
import { orgGuard } from './core/org.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [guestGuard],
    loadComponent: () => import('./landing/landing-page').then((m) => m.LandingPage),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/signup-page').then((m) => m.SignupPage),
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () => import('./auth/forgot-password-page').then((m) => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    canActivate: [authGuard],
    loadComponent: () => import('./auth/reset-password-page').then((m) => m.ResetPasswordPage),
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./onboarding/onboarding-page').then((m) => m.OnboardingPage),
  },
  {
    path: '',
    canActivate: [authGuard, orgGuard],
    loadComponent: () => import('./core/app-shell').then((m) => m.AppShell),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'opportunities',
        loadComponent: () =>
          import('./opportunities/opportunities-page').then((m) => m.OpportunitiesPage),
      },
      {
        path: 'opportunities/new',
        loadComponent: () =>
          import('./opportunities/opportunity-new-page').then((m) => m.OpportunityNewPage),
      },
      {
        path: 'opportunities/:id',
        loadComponent: () =>
          import('./opportunities/opportunity-detail-page').then((m) => m.OpportunityDetailPage),
      },
      {
        path: 'actions',
        loadComponent: () => import('./actions/actions-page').then((m) => m.ActionsPage),
      },
      {
        path: 'import',
        loadComponent: () => import('./import/import-page').then((m) => m.ImportPage),
      },
      {
        path: 'settings',
        loadComponent: () => import('./settings/settings-page').then((m) => m.SettingsPage),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
