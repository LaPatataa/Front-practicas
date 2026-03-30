import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.Login)
  },
  {
    path: 'home',
    canActivate: [authGuard],
    loadComponent: () => import('./features/home/home').then(m => m.Home)
  },

  {
    path: 'clients',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR', 'ODONTOLOGO'] },
    loadComponent: () => import('./features/clients/clients').then(m => m.Clients)
  },

  {
    path: 'catalog/supplies',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/catalog/supplies/supplies').then(m => m.Supplies)
  },
  {
    path: 'catalog/units',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/catalog/units/units').then(m => m.Units)
  },
  {
    path: 'catalog/procedures',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'ODONTOLOGO'] },
    loadComponent: () => import('./features/catalog/procedures/procedures').then(m => m.Procedures)
  },

  {
    path: 'inventory/entries',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR'] },
    loadComponent: () => import('./features/inventory/entries/entries').then(m => m.Entries)
  },
  {
    path: 'inventory/exits',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR'] },
    loadComponent: () => import('./features/inventory/exits/exits').then(m => m.Exits)
  },
  {
    path: 'inventory/movements',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR'] },
    loadComponent: () => import('./features/inventory/movements/movements').then(m => m.Movements)
  },
  {
    path: 'inventory/alerts',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR'] },
    loadComponent: () => import('./features/inventory/alerts/alerts').then(m => m.Alerts)
  },

  {
    path: 'visits/create',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR', 'ODONTOLOGO'] },
    loadComponent: () => import('./features/visits/create-visit/create-visit').then(m => m.CreateVisit)
  },
  {
    path: 'visits/:id/consume',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR', 'ODONTOLOGO'] },
    loadComponent: () => import('./features/visits/consume/consume').then(m => m.Consume)
  },
  {
    path: 'visits/:id',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'AUXILIAR', 'ODONTOLOGO'] },
    loadComponent: () => import('./features/visits/visit-detail/visit-detail').then(m => m.VisitDetail)
  },

  {
    path: 'reports/clinical-detail',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN', 'ODONTOLOGO'] },
    loadComponent: () => import('./features/reports/clinical-detail/clinical-detail').then(m => m.ClinicalDetail)
  },
  {
    path: 'reports/consumption',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['ADMIN'] },
    loadComponent: () => import('./features/reports/consumption/consumption').then(m => m.Consumption)
  },

  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];