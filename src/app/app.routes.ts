import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'agenda',
        pathMatch: 'full'
      },
      {
        path: 'agenda',
        loadComponent: () => import('./features/admin/agenda/agenda').then(m => m.AgendaComponent)
      },
      {
        path: 'servicos',
        loadComponent: () => import('./features/admin/services-mgmt/services-mgmt').then(m => m.ServicesMgmtComponent)
      },
      {
        path: 'profissionais',
        loadComponent: () => import('./features/admin/professionals-mgmt/professionals-mgmt').then(m => m.ProfessionalsMgmtComponent)
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: ':slug',
    loadComponent: () => import('./features/booking/booking').then(m => m.BookingComponent)
  }
];
