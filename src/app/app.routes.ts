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
      }
    ]
  },
  {
    path: ':slug',
    loadComponent: () => import('./features/booking/booking').then(m => m.BookingComponent)
  }
];
