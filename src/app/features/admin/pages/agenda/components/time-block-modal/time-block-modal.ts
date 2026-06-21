import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Professional } from '../../../../../booking/models/professional.model';
import { ToastService } from '../../../../../../../shared/services/toast.service';
import { SelectComponent } from '../../../../../../../shared/components/select/select';

@Component({
  selector: 'app-time-block-modal',
  standalone: true,
  imports: [NgClass, FormsModule, DatePipe, SelectComponent],
  templateUrl: './time-block-modal.html',
  host: {
    class: 'fixed inset-0 z-100 overflow-hidden transition-[visibility] duration-300 invisible pointer-events-none delay-300',
    '[class.invisible]': '!isOpen()',
    '[class.visible]': 'isOpen()',
    '[class.pointer-events-none]': '!isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.delay-300]': '!isOpen()'
  }
})
export class TimeBlockModalComponent {
  private readonly toastService = inject(ToastService);

  isOpen = input.required<boolean>();
  submitting = input.required<boolean>();
  professionals = input.required<Professional[]>();
  selectedProfessional = input<Professional | null>(null);
  selectedDate = input<Date | null>(null);

  close = output<void>();
  createBlock = output<{ professionalId: string; date: string; type: 'day' | 'range'; startTime: string; endTime: string }>();

  blockProfessionalId = signal<string>('');
  blockType = signal<'day' | 'range'>('range');
  blockDate = signal<string>('');
  blockStartTime = signal<string>('08:00');
  blockEndTime = signal<string>('18:00');

  constructor() {
    effect(() => {
      const prof = this.selectedProfessional();
      if (prof) {
        this.blockProfessionalId.set(prof.id);
      } else {
        const profs = this.professionals();
        if (profs.length > 0 && !this.blockProfessionalId()) {
          this.blockProfessionalId.set(profs[0].id);
        }
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const dateVal = this.selectedDate();
      if (dateVal) {
        const year = dateVal.getFullYear();
        const month = String(dateVal.getMonth() + 1).padStart(2, '0');
        const day = String(dateVal.getDate()).padStart(2, '0');
        this.blockDate.set(`${year}-${month}-${day}`);
      } else {
        this.blockDate.set('');
      }
    }, { allowSignalWrites: true });
  }

  onClose(): void {
    this.close.emit();
  }

  addTimeBlock(): void {
    const pId = this.blockProfessionalId();
    if (!pId) {
      this.toastService.error('Selecione um profissional.');
      return;
    }
    if (!this.blockDate()) {
      this.toastService.error('Selecione uma data para o bloqueio.');
      return;
    }
    this.createBlock.emit({
      professionalId: pId,
      date: this.blockDate(),
      type: this.blockType(),
      startTime: this.blockStartTime(),
      endTime: this.blockEndTime()
    });
  }
}
