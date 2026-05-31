import { Component, effect, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Service } from '../../../../booking/models/service.model';
import { Professional } from '../../../../booking/models/professional.model';

@Component({
  selector: 'app-service-form-drawer',
  standalone: true,
  imports: [NgClass, FormsModule],
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
  isOpen = input.required<boolean>();
  submitting = input.required<boolean>();
  service = input<Service | null>(null);
  professionals = input.required<Professional[]>();

  close = output<void>();
  save = output<any>();
  delete = output<void>();

  formName = signal<string>('');
  formPrice = signal<number | null>(null);
  formDuration = signal<number>(30);
  formActive = signal<boolean>(true);
  formProfessionalIds = signal<string[]>([]);

  constructor() {
    effect(() => {
      const s = this.service();
      if (s) {
        this.formName.set(s.name);
        this.formPrice.set(s.price ? s.price.amount : null);
        this.formDuration.set(s.durationMinutes);
        this.formActive.set(s.active);
        this.formProfessionalIds.set(s.professionalIds || []);
      } else {
        this.formName.set('');
        this.formPrice.set(null);
        this.formDuration.set(30);
        this.formActive.set(true);
        this.formProfessionalIds.set([]);
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

  submitForm(): void {
    if (!this.formName().trim()) {
      alert('O nome do serviço é obrigatório.');
      return;
    }
    if (this.formDuration() <= 0) {
      alert('A duração deve ser maior que zero.');
      return;
    }

    const payload = {
      name: this.formName().trim(),
      durationMinutes: this.formDuration(),
      price: this.formPrice(),
      active: this.formActive(),
      professionalIds: this.formProfessionalIds()
    };

    this.save.emit(payload);
  }
}
