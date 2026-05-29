import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthMockService } from '../../core/auth/auth-mock.service';
import { AdminApiService } from './services/admin-api.service';
import { Store } from '../booking/models/store.model';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, FormsModule],
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

  saveMockConfig(): void {
    this.authService.setUserId(this.mockUserId());
    this.authService.setToken(this.mockToken() || null);
    this.showMockConfig.set(false);
    this.loadStore(this.mockUserId());
  }
}
