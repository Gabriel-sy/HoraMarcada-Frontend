import { Component, input, output } from '@angular/core';
import { Professional } from '../../../../../booking/models/professional.model';
import { SelectionCardComponent } from '../../../../../../../shared/components/selection-card/selection-card';

@Component({
  selector: 'app-professional-filter-drawer',
  standalone: true,
  imports: [SelectionCardComponent],
  templateUrl: './professional-filter-drawer.html',
  host: {
    class: 'fixed inset-0 z-100 overflow-hidden transition-[visibility] duration-300 invisible pointer-events-none delay-300',
    '[class.invisible]': '!isOpen()',
    '[class.visible]': 'isOpen()',
    '[class.pointer-events-none]': '!isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.delay-300]': '!isOpen()'
  }
})
export class ProfessionalFilterDrawerComponent {
  professionals = input.required<Professional[]>();
  selectedProfessionalId = input<string | null>(null);
  isOpen = input.required<boolean>();

  select = output<string | null>();
  close = output<void>();

  onSelect(id: string | null): void {
    this.select.emit(id);
  }

  onClose(): void {
    this.close.emit();
  }
}
