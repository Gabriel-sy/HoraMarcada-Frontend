import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { filter, map, take } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.initialized).pipe(
    filter(initialized => initialized),
    take(1),
    map(() => {
      if (authService.userId()) {
        return true;
      }
      return router.createUrlTree(['/login']);
    })
  );
};
