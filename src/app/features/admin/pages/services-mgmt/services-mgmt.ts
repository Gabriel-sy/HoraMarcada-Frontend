import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminStateService } from '../../services/admin-state.service';
import { Service } from '../../../booking/models/service.model';
import { Category } from '../../../booking/models/category.model';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state';
import { ServiceFormDrawerComponent } from './components/service-form-drawer/service-form-drawer';
import { ToastService } from '../../../../../shared/services/toast.service';

@Component({
  selector: 'app-services-mgmt',
  standalone: true,
  imports: [CommonModule, NgClass, FormsModule, SpinnerComponent, EmptyStateComponent, ServiceFormDrawerComponent],
  templateUrl: './services-mgmt.html',
  styleUrl: './services-mgmt.css'
})
export class ServicesMgmtComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminApiService = inject(AdminApiService);
  private readonly stateService = inject(AdminStateService);
  private readonly toastService = inject(ToastService);

  readonly storeId = signal<string | null>(null);
  readonly services = this.stateService.services;
  readonly professionals = this.stateService.professionals;
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly isFormOpen = signal<boolean>(false);
  readonly selectedService = signal<Service | null>(null);
  readonly categories = signal<Category[]>([]);

  ngOnInit(): void {
    this.loadStoreData();
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
        this.loadServicesAndProfessionals(store.id);
      },
      error: () => {
        this.error.set('Erro ao carregar dados do estabelecimento.');
        this.loading.set(false);
      }
    });
  }

  private loadServicesAndProfessionals(storeId: string): void {
    this.stateService.loadServices(storeId).subscribe({
      next: () => {
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar serviços.');
        this.loading.set(false);
      }
    });

    this.stateService.loadProfessionals(storeId).subscribe();
  }

  openCreateForm(): void {
    const sId = this.storeId();
    if (!sId) return;

    this.selectedService.set(null);
    this.loadCategories(sId, () => this.isFormOpen.set(true));
  }

  openEditForm(service: Service): void {
    const sId = this.storeId();
    if (!sId) return;

    this.selectedService.set(service);
    this.loadCategories(sId, () => this.isFormOpen.set(true));
  }

  private loadCategories(storeId: string, onLoaded?: () => void): void {
    this.adminApiService.getStoreCategories(storeId).subscribe({
      next: (categories) => {
        this.categories.set(categories);
        onLoaded?.();
      },
      error: () => {
        this.toastService.error('Erro ao carregar categorias.');
      }
    });
  }

  onCategoriesChanged(categories: Category[]): void {
    this.categories.set(categories);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  formatPrice(priceValue: any): string {
    if (priceValue === null || priceValue === undefined) return 'Sob consulta';
    const amount = typeof priceValue === 'object' ? priceValue.amount : priceValue;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  }

  getProfessionalNames(professionalIds: string[]): string {
    if (!professionalIds || professionalIds.length === 0) return 'Nenhum profissional associado';
    return this.professionals()
      .filter(p => professionalIds.includes(p.id))
      .map(p => p.name)
      .join(', ');
  }

  handleSaveService(payload: any): void {
    const sId = this.storeId();
    if (!sId) return;

    this.submitting.set(true);
    const selected = this.selectedService();
    if (selected) {
      this.adminApiService.updateService(sId, selected.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeForm();
          this.toastService.success('Serviço atualizado com sucesso.');
          this.stateService.refreshServices(sId).subscribe();
        },
        error: () => {
          this.toastService.error('Erro ao atualizar o serviço.');
          this.submitting.set(false);
        }
      });
    } else {
      this.adminApiService.addService(sId, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeForm();
          this.toastService.success('Serviço adicionado com sucesso.');
          this.stateService.refreshServices(sId).subscribe();
        },
        error: () => {
          this.toastService.error('Erro ao adicionar o serviço.');
          this.submitting.set(false);
        }
      });
    }
  }

  deleteService(): void {
    const sId = this.storeId();
    const service = this.selectedService();
    if (!sId || !service) return;

    this.submitting.set(true);
    this.adminApiService.deleteService(sId, service.id).subscribe({
      next: () => {
        this.submitting.set(false);
        this.closeForm();
        this.toastService.success('Serviço excluído com sucesso.');
        this.stateService.refreshServices(sId).subscribe();
      },
      error: () => {
        this.toastService.error('Erro ao excluir o serviço. Verifique se existem agendamentos ativos vinculados a ele.');
        this.submitting.set(false);
      }
    });
  }
}
