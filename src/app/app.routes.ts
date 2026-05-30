import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'admin',
    loadComponent: () => import('./features/admin/admin-layout').then(m => m.AdminLayoutComponent),
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
    path: ':slug',
    loadComponent: () => import('./features/booking/booking').then(m => m.BookingComponent)
  }
];
