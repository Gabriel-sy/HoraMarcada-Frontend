import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, NgClass, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthMockService } from '../../../core/auth/auth-mock.service';
import { AdminApiService } from '../services/admin-api.service';
import { Service } from '../../booking/models/service.model';
import { Professional } from '../../booking/models/professional.model';

@Component({
  selector: 'app-services-mgmt',
  standalone: true,
  imports: [CommonModule, NgClass, NgIf, NgFor, FormsModule],
  templateUrl: './services-mgmt.html',
  styleUrl: './services-mgmt.css'
})
export class ServicesMgmtComponent implements OnInit {
  private readonly authService = inject(AuthMockService);
  private readonly adminApiService = inject(AdminApiService);

  readonly storeId = signal<string | null>(null);
  readonly services = signal<Service[]>([]);
  readonly professionals = signal<Professional[]>([]);
  readonly loading = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly isFormOpen = signal<boolean>(false);
  readonly selectedService = signal<Service | null>(null);

  readonly formName = signal<string>('');
  readonly formPrice = signal<number | null>(null);
  readonly formDuration = signal<number>(30);
  readonly formActive = signal<boolean>(true);
  readonly formProfessionalIds = signal<string[]>([]);

  ngOnInit(): void {
    this.loadStoreData();
  }

  private loadStoreData(): void {
    this.loading.set(true);
    const userId = this.authService.userId();
    this.adminApiService.getStoreByUserId(userId).subscribe({
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
    this.adminApiService.getStoreServices(storeId, false).subscribe({
      next: (services) => {
        this.services.set(services);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Erro ao carregar serviços.');
        this.loading.set(false);
      }
    });

    this.adminApiService.getStoreProfessionals(storeId).subscribe({
      next: (profs) => {
        this.professionals.set(profs);
      }
    });
  }

  openCreateForm(): void {
    this.selectedService.set(null);
    this.formName.set('');
    this.formPrice.set(null);
    this.formDuration.set(30);
    this.formActive.set(true);
    this.formProfessionalIds.set([]);
    this.isFormOpen.set(true);
  }

  openEditForm(service: Service): void {
    this.selectedService.set(service);
    this.formName.set(service.name);
    this.formPrice.set(service.price ? service.price.amount : null);
    this.formDuration.set(service.durationMinutes);
    this.formActive.set(service.active);
    this.formProfessionalIds.set(service.professionalIds || []);
    this.isFormOpen.set(true);
  }

  closeForm(): void {
    this.isFormOpen.set(false);
  }

  toggleProfessional(professionalId: string): void {
    const current = this.formProfessionalIds();
    if (current.includes(professionalId)) {
      this.formProfessionalIds.set(current.filter(id => id !== professionalId));
    } else {
      this.formProfessionalIds.set([...current, professionalId]);
    }
  }

  isProfessionalSelected(professionalId: string): boolean {
    return this.formProfessionalIds().includes(professionalId);
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

  submitForm(): void {
    const sId = this.storeId();
    if (!sId) return;

    if (!this.formName().trim()) {
      alert('O nome do serviço é obrigatório.');
      return;
    }

    if (this.formDuration() <= 0) {
      alert('A duração deve ser maior que zero.');
      return;
    }

    this.submitting.set(true);
    const serviceInput = {
      name: this.formName(),
      durationMinutes: this.formDuration(),
      price: this.formPrice(),
      active: this.formActive(),
      professionalIds: this.formProfessionalIds()
    };

    const selected = this.selectedService();
    if (selected) {
      this.adminApiService.updateService(sId, selected.id, serviceInput).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeForm();
          this.loadServicesAndProfessionals(sId);
        },
        error: () => {
          alert('Erro ao atualizar o serviço.');
          this.submitting.set(false);
        }
      });
    } else {
      this.adminApiService.addService(sId, serviceInput).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeForm();
          this.loadServicesAndProfessionals(sId);
        },
        error: () => {
          alert('Erro ao adicionar o serviço.');
          this.submitting.set(false);
        }
      });
    }
  }

  deleteService(): void {
    const sId = this.storeId();
    const service = this.selectedService();
    if (!sId || !service) return;

    if (confirm(`Tem certeza de que deseja EXCLUIR permanentemente o serviço "${service.name}"? Esta ação não pode ser desfeita.`)) {
      this.submitting.set(true);
      this.adminApiService.deleteService(sId, service.id).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeForm();
          this.loadServicesAndProfessionals(sId);
        },
        error: () => {
          alert('Erro ao excluir o serviço. Verifique se existem agendamentos ativos vinculados a ele.');
          this.submitting.set(false);
        }
      });
    }
  }
}
