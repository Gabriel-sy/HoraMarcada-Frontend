import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { AdminApiService } from './services/admin-api.service';
import { Store } from '../booking/models/store.model';
import { AdminSidebarComponent } from './components/admin-sidebar/admin-sidebar';
import { AdminMobileNavComponent } from './components/admin-mobile-nav/admin-mobile-nav';
import { MockConfigModalComponent } from './components/mock-config-modal/mock-config-modal';
import { SpinnerComponent } from '../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, AdminSidebarComponent, AdminMobileNavComponent, MockConfigModalComponent, SpinnerComponent],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.css'
})
export class AdminLayoutComponent implements OnInit {
  private readonly authService = inject(AuthMockService);
  private readonly apiService = inject(AdminApiService);

  readonly store = signal<Store | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<string | null>(null);

  readonly showMockConfig = signal<boolean>(false);
  mockUserId = signal<string>(this.authService.userId());
  mockToken = signal<string>(this.authService.token() || '');

  ngOnInit(): void {
    this.loadStore(this.authService.userId());
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

  toggleMockConfig(): void {
    this.showMockConfig.update(v => !v);
  }

  saveMockConfig(config?: { userId: string; token: string }): void {
    if (config) {
      this.mockUserId.set(config.userId);
      this.mockToken.set(config.token);
      this.authService.setUserId(config.userId);
      this.authService.setToken(config.token || null);
    }
    this.showMockConfig.set(false);
    this.loadStore(this.mockUserId());
  }
}
