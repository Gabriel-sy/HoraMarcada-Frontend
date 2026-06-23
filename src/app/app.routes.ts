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
        loadComponent: () => import('./features/admin/pages/agenda/agenda').then(m => m.AgendaComponent)
      },
      {
        path: 'clientes',
        loadComponent: () => import('./features/admin/pages/clientes/clientes').then(m => m.ClientesComponent)
      },
      {
        path: 'servicos',
        loadComponent: () => import('./features/admin/pages/services-mgmt/services-mgmt').then(m => m.ServicesMgmtComponent)
      },
      {
        path: 'profissionais',
        loadComponent: () => import('./features/admin/pages/professionals-mgmt/professionals-mgmt').then(m => m.ProfessionalsMgmtComponent)
      },
      {
        path: 'estatisticas',
        loadComponent: () => import('./features/admin/pages/statistics/statistics').then(m => m.StatisticsComponent)
      }
    ]
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent)
  },
  {
    path: 'confirm/:token',
    loadComponent: () => import('./features/booking/confirm-presence/confirm-presence').then(m => m.ConfirmPresenceComponent)
  },
  {
    path: 'cancel/:token',
    loadComponent: () => import('./features/booking/cancel-appointment/cancel-appointment').then(m => m.CancelAppointmentComponent)
  },
  {
    path: ':slug',
    loadComponent: () => import('./features/booking/booking').then(m => m.BookingComponent)
  }
];
