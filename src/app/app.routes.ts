import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: ':slug',
    loadComponent: () => import('./features/booking/booking').then(m => m.BookingComponent)
  }
];
