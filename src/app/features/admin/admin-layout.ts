import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { AdminApiService } from './services/admin-api.service';
import { Store } from '../booking/models/store.model';
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
  private readonly apiService = inject(AdminApiService);
  private readonly router = inject(Router);

  readonly store = signal<Store | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const userId = this.authService.userId();
    if (userId) {
      this.loadStore(userId);
    } else {
      this.router.navigate(['/login']);
    }
  }

  private loadStore(userId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.apiService.getStoreByUserId(userId).subscribe({
      next: (res) => {
        this.store.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar as informações do estabelecimento.');
        this.loading.set(false);
      }
    });
  }

  retryLoad(): void {
    const userId = this.authService.userId();
    if (userId) {
      this.loadStore(userId);
    }
  }

  logout(): void {
    this.authService.signOut().then(() => {
      this.router.navigate(['/login']);
    }).catch(() => {
      this.router.navigate(['/login']);
    });
  }
}
