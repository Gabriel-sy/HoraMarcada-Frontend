import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, Event } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';
import { AdminStateService } from './services/admin-state.service';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar';
import { AdminMobileNavComponent } from './components/admin-mobile-nav/admin-mobile-nav';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminMobileNavComponent, SpinnerComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly stateService = inject(AdminStateService);
  private readonly router = inject(Router);

  readonly store = this.stateService.store;
  readonly loading = this.stateService.loadingStore;
  readonly error = this.stateService.storeError;

  readonly isFullWidth = signal<boolean>(false);

  ngOnInit(): void {
    const userId = this.authService.userId();
    if (userId) {
      this.loadStore(userId);
    } else {
      this.router.navigate(['/login']);
    }

    this.router.events.pipe(
      filter((e: Event): e is NavigationEnd => e instanceof NavigationEnd)
    ).subscribe((e: NavigationEnd) => {
      this.isFullWidth.set(e.urlAfterRedirects.includes('/admin/agenda'));
    });
    this.isFullWidth.set(this.router.url.includes('/admin/agenda'));
  }

  private loadStore(userId: string): void {
    this.stateService.loadStore(userId).subscribe();
  }

  retryLoad(): void {
    const userId = this.authService.userId();
    if (userId) {
      this.loadStore(userId);
    }
  }

  logout(): void {
    this.stateService.clearCache();
    this.authService.signOut().then(() => {
      this.router.navigate(['/login']);
    }).catch(() => {
      this.router.navigate(['/login']);
    });
  }
}
