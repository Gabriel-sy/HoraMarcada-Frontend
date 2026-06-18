import { Component, input, output, signal, computed, effect } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-mini-calendar',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './mini-calendar.html',
  styleUrl: './mini-calendar.css'
})
export class MiniCalendarComponent {
  selectedDate = input.required<Date>();
  dateChange = output<Date>();

  readonly currentViewDate = signal<Date>(new Date());

  readonly weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  readonly days = computed(() => {
    const viewDate = this.currentViewDate();
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOfWeek = firstDayOfMonth.getDay();
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const totalDays = lastDayOfMonth.getDate();

    const gridDays: { date: Date; isCurrentMonth: boolean }[] = [];

    const prevMonthLast = new Date(year, month, 0);
    const prevMonthTotal = prevMonthLast.getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      gridDays.push({
        date: new Date(year, month - 1, prevMonthTotal - i, 12, 0, 0),
        isCurrentMonth: false
      });
    }

    for (let i = 1; i <= totalDays; i++) {
      gridDays.push({
        date: new Date(year, month, i, 12, 0, 0),
        isCurrentMonth: true
      });
    }

    const remaining = 42 - gridDays.length;
    for (let i = 1; i <= remaining; i++) {
      gridDays.push({
        date: new Date(year, month + 1, i, 12, 0, 0),
        isCurrentMonth: false
      });
    }

    return gridDays;
  });

  constructor() {
    effect(() => {
      this.currentViewDate.set(new Date(this.selectedDate()));
    }, { allowSignalWrites: true });
  }

  prevMonth(): void {
    const current = this.currentViewDate();
    this.currentViewDate.set(new Date(current.getFullYear(), current.getMonth() - 1, 1, 12, 0, 0));
  }

  nextMonth(): void {
    const current = this.currentViewDate();
    this.currentViewDate.set(new Date(current.getFullYear(), current.getMonth() + 1, 1, 12, 0, 0));
  }

  selectDate(date: Date): void {
    this.dateChange.emit(date);
  }

  isSelected(date: Date): boolean {
    const sel = this.selectedDate();
    return date.getDate() === sel.getDate() &&
      date.getMonth() === sel.getMonth() &&
      date.getFullYear() === sel.getFullYear();
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }
}
