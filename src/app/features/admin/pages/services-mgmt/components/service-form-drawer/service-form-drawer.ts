import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Service } from '../../../../../booking/models/service.model';
import { Category } from '../../../../../booking/models/category.model';
import { Professional } from '../../../../../booking/models/professional.model';
import { ToastService } from '../../../../../../../shared/services/toast.service';
import { ToggleComponent } from '../../../../../../../shared/components/toggle/toggle';
import { SelectComponent } from '../../../../../../../shared/components/select/select';
import { AdminApiService } from '../../../../services/admin-api.service';
import { compareByNamePtBr } from '../../../../../../../shared/utils/compare-by-name-pt-br';

@Component({
  selector: 'app-service-form-drawer',
  standalone: true,
  imports: [NgClass, FormsModule, ToggleComponent, SelectComponent],
  templateUrl: './service-form-drawer.html',
  host: {
    class: 'fixed inset-0 z-100 overflow-hidden transition-[visibility] duration-300 invisible pointer-events-none delay-300',
    '[class.invisible]': '!isOpen()',
    '[class.visible]': 'isOpen()',
    '[class.pointer-events-none]': '!isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.delay-300]': '!isOpen()'
  }
})
export class ServiceFormDrawerComponent {
  private readonly toastService = inject(ToastService);
  private readonly adminApiService = inject(AdminApiService);

  isOpen = input.required<boolean>();
  submitting = input.required<boolean>();
  service = input<Service | null>(null);
  professionals = input.required<Professional[]>();
  storeId = input.required<string | null>();
  categories = input.required<Category[]>();

  close = output<void>();
  save = output<any>();
  delete = output<void>();
  categoriesChanged = output<Category[]>();

  formName = signal<string>('');
  formPrice = signal<number | null>(null);
  formDuration = signal<number>(30);
  formActive = signal<boolean>(true);
  formProfessionalIds = signal<string[]>([]);
  formCategoryId = signal<string>('');
  showCreateCategory = signal<boolean>(false);
  formNewCategoryName = signal<string>('');
  creatingCategory = signal<boolean>(false);

  constructor() {
    effect(() => {
      const s = this.service();
      if (s) {
        this.formName.set(s.name);
        this.formPrice.set(s.price ?? null);
        this.formDuration.set(s.durationMinutes);
        this.formActive.set(s.active);
        this.formProfessionalIds.set(s.professionalIds || []);
        this.formCategoryId.set(s.categoryId);
        this.showCreateCategory.set(false);
        this.formNewCategoryName.set('');
      } else {
        this.formName.set('');
        this.formPrice.set(null);
        this.formDuration.set(30);
        this.formActive.set(true);
        this.formProfessionalIds.set([]);
        this.formCategoryId.set('');
        this.showCreateCategory.set(false);
        this.formNewCategoryName.set('');
      }
    }, { allowSignalWrites: true });
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

  onClose(): void {
    this.close.emit();
  }

  onDelete(): void {
    this.delete.emit();
  }

  toggleCreateCategory(): void {
    this.showCreateCategory.update(v => !v);
    this.formNewCategoryName.set('');
  }

  createCategory(): void {
    const storeId = this.storeId();
    const name = this.formNewCategoryName().trim();
    if (!storeId) return;

    if (!name) {
      this.toastService.error('O nome da categoria é obrigatório.');
      return;
    }

    this.creatingCategory.set(true);
    this.adminApiService.createCategory(storeId, name).subscribe({
      next: (category) => {
        const updated = [...this.categories(), category].sort((a, b) => compareByNamePtBr(a.name, b.name));
        this.categoriesChanged.emit(updated);
        this.formCategoryId.set(category.id);
        this.showCreateCategory.set(false);
        this.formNewCategoryName.set('');
        this.creatingCategory.set(false);
      },
      error: () => {
        this.toastService.error('Erro ao criar categoria. Verifique se o nome já existe.');
        this.creatingCategory.set(false);
      }
    });
  }

  submitForm(): void {
    if (!this.formName().trim()) {
      this.toastService.error('O nome do serviço é obrigatório.');
      return;
    }
    if (this.formDuration() <= 0) {
      this.toastService.error('A duração deve ser maior que zero.');
      return;
    }
    if (!this.formCategoryId()) {
      this.toastService.error('Selecione uma categoria.');
      return;
    }

    const payload: Record<string, unknown> = {
      name: this.formName().trim(),
      durationMinutes: this.formDuration(),
      price: this.formPrice(),
      active: this.formActive(),
      professionalIds: this.formProfessionalIds(),
      categoryId: this.formCategoryId()
    };

    this.save.emit(payload);
  }
}
