import { Component, OnInit, OnDestroy, inject, signal, ElementRef, viewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminStateService } from '../../services/admin-state.service';
import { CustomerListDto } from '../../../booking/models/customer.model';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state';
import { ClienteDetailDrawerComponent } from './components/cliente-detail-drawer/cliente-detail-drawer';
import { ToastService } from '../../../../../shared/services/toast.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SpinnerComponent,
    EmptyStateComponent,
    ClienteDetailDrawerComponent
  ],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class ClientesComponent implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly stateService = inject(AdminStateService);
  private readonly toastService = inject(ToastService);

  readonly storeId = signal<string | null>(null);
  readonly customers = this.stateService.customers;
  readonly loading = signal<boolean>(false);
  readonly searchLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly searchInputValue = signal<string>('');

  readonly selectedCustomerId = this.stateService.selectedCustomerId;
  readonly isDrawerOpen = this.stateService.isCustomersDrawerOpen;

  readonly anchor = viewChild<ElementRef>('infiniteScrollAnchor');
  private observer?: IntersectionObserver;
  private readonly searchSubject = new Subject<string>();

  constructor() {
    this.searchInputValue.set(this.stateService.customersSearchQuery());

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      if (query !== this.stateService.customersSearchQuery()) {
        this.stateService.setCustomersSearchQuery(query);
        this.stateService.setCustomersPage(1);
        this.loadCustomers(false);
      }
    });

    effect(() => {
      const element = this.anchor()?.nativeElement;
      if (element) {
        this.setupIntersectionObserver(element);
      }
    });
  }

  ngOnInit(): void {
    this.loadStoreData();
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private loadStoreData(): void {
    this.loading.set(true);
    const userId = this.authService.userId();
    if (!userId) {
      this.loading.set(false);
      return;
    }
    this.stateService.loadStore(userId).subscribe({
      next: (store) => {
        this.storeId.set(store.id);
        this.loadCustomers();
      },
      error: () => {
        this.error.set('Erro ao carregar dados do estabelecimento.');
        this.loading.set(false);
      }
    });
  }

  loadCustomers(append = false, forceRefresh = false): void {
    const sId = this.storeId();
    if (!sId) return;

    this.loading.set(true);
    if (!append) {
      this.searchLoading.set(true);
    }
    this.stateService.loadCustomers(sId, append, forceRefresh).subscribe({
      next: () => {
        this.loading.set(false);
        this.searchLoading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar lista de clientes.');
        this.loading.set(false);
        this.searchLoading.set(false);
      }
    });
  }

  onSearchChange(value: string): void {
    this.searchInputValue.set(value);
    this.searchSubject.next(value);
  }

  onSearch(): void {
    const value = this.searchInputValue();
    if (value !== this.stateService.customersSearchQuery()) {
      this.stateService.setCustomersSearchQuery(value);
      this.stateService.setCustomersPage(1);
      this.loadCustomers(false);
    }
  }

  clearSearch(): void {
    this.searchInputValue.set('');
    this.searchSubject.next('');
    if (this.stateService.customersSearchQuery() !== '') {
      this.stateService.setCustomersSearchQuery('');
      this.stateService.setCustomersPage(1);
      this.loadCustomers(false);
    }
  }

  private setupIntersectionObserver(element: HTMLElement): void {
    if (this.observer) {
      this.observer.disconnect();
    }

    this.observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !this.loading() && this.stateService.customersPage() < this.totalPages()) {
        this.loadNextPage();
      }
    }, {
      rootMargin: '100px'
    });

    this.observer.observe(element);
  }

  private loadNextPage(): void {
    this.stateService.setCustomersPage(this.stateService.customersPage() + 1);
    this.loadCustomers(true);
  }

  openDetails(customerId: string): void {
    this.stateService.setSelectedCustomerId(customerId);
    this.stateService.setIsCustomersDrawerOpen(true);
  }

  closeDetails(): void {
    this.stateService.setSelectedCustomerId(null);
    this.stateService.setIsCustomersDrawerOpen(false);
  }

  handleCustomerUpdated(): void {
    this.stateService.setCustomersPage(1);
    this.loadCustomers(false, true);
  }


  totalPages(): number {
    return Math.ceil(this.stateService.totalCustomers() / this.stateService.customersPageSize());
  }


  formatLastVisit(lastVisitStr: string | null): string {
    if (!lastVisitStr) return 'Nunca compareceu';
    
    const lastVisit = new Date(lastVisitStr);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - lastVisit.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) return 'Hoje/Ontem';
    if (diffDays <= 7) return `há ${diffDays} dias`;
    if (diffDays <= 30) return `há ${Math.floor(diffDays / 7)} semanas`;
    
    return lastVisit.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
