import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Professional } from '../../../../../booking/models/professional.model';
import { MiniCalendarComponent } from '../mini-calendar/mini-calendar';

@Component({
  selector: 'app-agenda-sidebar',
  standalone: true,
  imports: [CommonModule, MiniCalendarComponent],
  templateUrl: './agenda-sidebar.html',
  styleUrl: './agenda-sidebar.css'
})
export class AgendaSidebarComponent {
  professionals = input.required<Professional[]>();
  selectedProfessionalIds = input.required<string[]>();
  selectedDate = input.required<Date>();

  dateChange = output<Date>();
  professionalsChange = output<string[]>();

  isAllSelected = computed(() => {
    return this.selectedProfessionalIds().length === this.professionals().length;
  });

  selectDate(date: Date): void {
    this.dateChange.emit(date);
  }

  toggleProfessional(profId: string): void {
    const current = [...this.selectedProfessionalIds()];
    const index = current.indexOf(profId);
    if (index > -1) {
      current.splice(index, 1);
    } else {
      current.push(profId);
    }
    this.professionalsChange.emit(current);
  }

  toggleAll(): void {
    if (this.isAllSelected()) {
      this.professionalsChange.emit([]);
    } else {
      this.professionalsChange.emit(this.professionals().map(p => p.id));
    }
  }

  isSelected(profId: string): boolean {
    return this.selectedProfessionalIds().includes(profId);
  }
}
