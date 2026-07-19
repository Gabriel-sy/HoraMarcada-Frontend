import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectComponent } from '../../../../../../../shared/components/select/select';
import { ToggleComponent } from '../../../../../../../shared/components/toggle/toggle';

interface DayHoursConfig {
  active: boolean;
  startTime: string;
  endTime: string;
  hasLunch: boolean;
  lunchStart: string;
  lunchEnd: string;
  intervalMinutes: number;
}

@Component({
  selector: 'app-weekly-schedule-config',
  standalone: true,
  imports: [FormsModule, SelectComponent, ToggleComponent],
  styleUrl: './weekly-schedule-config.css',
  templateUrl: './weekly-schedule-config.html'
})
export class WeeklyScheduleConfigComponent {
  readonly intervalOptions = [
    { value: 15, label: '15 minutos' },
    { value: 30, label: '30 minutos' },
    { value: 45, label: '45 minutos' },
    { value: 60, label: '1 hora' }
  ];
  weeklyHours = input.required<DayHoursConfig[]>();

  weeklyHoursChange = output<DayHoursConfig[]>();

  readonly DAYS_OF_WEEK = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  expandedDayIndex = signal<number | null>(null);

  isExpanded(dayIndex: number): boolean {
    return this.expandedDayIndex() === dayIndex;
  }

  toggleExpand(dayIndex: number): void {
    this.expandedDayIndex.update(current => (current === dayIndex ? null : dayIndex));
  }

  collapse(): void {
    this.expandedDayIndex.set(null);
  }

  updateDayActive(dayIndex: number, active: boolean): void {
    const hours = [...this.weeklyHours()];
    hours[dayIndex] = { ...hours[dayIndex], active };
    this.weeklyHoursChange.emit(hours);
  }

  updateDayLunchActive(dayIndex: number, hasLunch: boolean): void {
    const hours = [...this.weeklyHours()];
    hours[dayIndex] = { ...hours[dayIndex], hasLunch };
    this.weeklyHoursChange.emit(hours);
  }

  onHoursChange(): void {
    this.weeklyHoursChange.emit([...this.weeklyHours()]);
  }
}
