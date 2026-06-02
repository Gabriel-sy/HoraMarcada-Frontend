import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

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
  imports: [FormsModule],
  styleUrl: './weekly-schedule-config.css',
  templateUrl: './weekly-schedule-config.html'
})
export class WeeklyScheduleConfigComponent {
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
