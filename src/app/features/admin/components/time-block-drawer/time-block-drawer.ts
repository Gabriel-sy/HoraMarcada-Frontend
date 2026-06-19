import { Component, effect, inject, input, output, signal } from '@angular/core';
import { NgClass, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Professional } from '../../../booking/models/professional.model';
import { TimeBlock } from '../../../booking/models/time-block.model';
import { ToastService } from '../../../../../shared/services/toast.service';
import { SelectComponent } from '../../../../../shared/components/select/select';

@Component({
  selector: 'app-time-block-drawer',
  standalone: true,
  imports: [NgClass, FormsModule, DatePipe, SelectComponent],
  templateUrl: './time-block-drawer.html',
  host: {
    class: 'fixed inset-0 z-100 overflow-hidden transition-[visibility] duration-300 invisible pointer-events-none delay-300',
    '[class.invisible]': '!isOpen()',
    '[class.visible]': 'isOpen()',
    '[class.pointer-events-none]': '!isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.delay-300]': '!isOpen()'
  }
})
export class TimeBlockDrawerComponent {
  private readonly toastService = inject(ToastService);

  isOpen = input.required<boolean>();
  submitting = input.required<boolean>();
  professionals = input.required<Professional[]>();
  selectedProfessional = input<Professional | null>(null);
  selectedDate = input<Date | null>(null);
  timeBlocks = input.required<TimeBlock[]>();
  loadingBlocks = input.required<boolean>();
  showBlocksList = input<boolean>(false);
  showSubtitle = input<boolean>(true);

  close = output<void>();
  createBlock = output<{ professionalId: string; date: string; type: 'day' | 'range'; startTime: string; endTime: string }>();
  deleteBlock = output<{ blockId: string; professionalId: string }>();
  loadBlocks = output<string>();

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
        this.loadBlocks.emit(prof.id);
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

  onDeleteTimeBlock(blockId: string): void {
    const pId = this.blockProfessionalId();
    if (!pId) return;
    this.deleteBlock.emit({ blockId, professionalId: pId });
  }

  formatBlockDateTime(startTimeStr: string, endTimeStr: string): string {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };

    const dateFormatted = start.toLocaleDateString('pt-BR', options);
    const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

    const isFullDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;

    if (isFullDay) {
      return `${capitalizedDate} • Dia Inteiro`;
    }

    const startH = String(start.getHours()).padStart(2, '0');
    const startM = String(start.getMinutes()).padStart(2, '0');
    const endH = String(end.getHours()).padStart(2, '0');
    const endM = String(end.getMinutes()).padStart(2, '0');

    return `${capitalizedDate} • ${startH}:${startM} às ${endH}:${endM}`;
  }
}
