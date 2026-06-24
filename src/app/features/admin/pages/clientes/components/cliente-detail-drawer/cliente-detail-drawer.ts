import { Component, input, output, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdminApiService } from '../../../../services/admin-api.service';
import { ToastService } from '../../../../../../../shared/services/toast.service';
import { CustomerDetailDto, UpdateCustomerInput } from '../../../../../booking/models/customer.model';
import { SpinnerComponent } from '../../../../../../../shared/components/spinner/spinner';

@Component({
  selector: 'app-cliente-detail-drawer',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SpinnerComponent],
  templateUrl: './cliente-detail-drawer.html',
  styleUrl: './cliente-detail-drawer.css'
})
export class ClienteDetailDrawerComponent {
  private readonly apiService = inject(AdminApiService);
  private readonly toastService = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  isOpen = input.required<boolean>();
  customerId = input<string | null>(null);
  storeId = input<string | null>(null);

  close = output<void>();
  updated = output<void>();

  customer = signal<CustomerDetailDto | null>(null);
  loading = signal<boolean>(false);
  submitting = signal<boolean>(false);
  isEditing = signal<boolean>(false);

  editForm!: FormGroup;

  constructor() {
    this.editForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      whatsApp: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{7,14}$/)]]
    });

    effect(() => {
      const cId = this.customerId();
      const sId = this.storeId();
      if (cId && sId) {
        this.loadDetails(sId, cId);
      } else {
        this.customer.set(null);
        this.isEditing.set(false);
      }
    });
  }

  private loadDetails(storeId: string, customerId: string): void {
    this.loading.set(true);
    this.isEditing.set(false);
    this.apiService.getCustomerDetails(storeId, customerId).subscribe({
      next: (details) => {
        this.customer.set(details);
        this.editForm.patchValue({
          name: details.name,
          whatsApp: details.whatsApp
        });
        this.loading.set(false);
      },
      error: () => {
        this.toastService.error('Erro ao carregar detalhes do cliente.');
        this.loading.set(false);
      }
    });
  }

  startEditing(): void {
    this.isEditing.set(true);
  }

  cancelEditing(): void {
    this.isEditing.set(false);
    const details = this.customer();
    if (details) {
      this.editForm.patchValue({
        name: details.name,
        whatsApp: details.whatsApp
      });
    }
  }

  saveCustomer(): void {
    if (this.editForm.invalid) {
      this.toastService.error('Por favor, corrija os erros no formulário.');
      return;
    }

    const sId = this.storeId();
    const cId = this.customerId();
    if (!sId || !cId) return;

    this.submitting.set(true);
    const formValue = this.editForm.value;
    const payload: UpdateCustomerInput = {
      name: formValue.name,
      whatsApp: formValue.whatsApp
    };

    this.apiService.updateCustomer(sId, cId, payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.isEditing.set(false);
        this.toastService.success('Cadastro de cliente atualizado.');
        this.loadDetails(sId, cId);
        this.updated.emit();
      },
      error: (err) => {
        if (err.status === 409) {
          this.toastService.error('Este número de WhatsApp já pertence a outro cliente.');
        } else {
          this.toastService.error('Erro ao salvar dados do cliente.');
        }
        this.submitting.set(false);
      }
    });
  }



  onClose(): void {
    this.close.emit();
  }

  formatPrice(price: number | null): string {
    if (price === null || price === undefined) return 'Sob consulta';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  isFuture(dateStr: string): boolean {
    return new Date(dateStr) > new Date();
  }
}
