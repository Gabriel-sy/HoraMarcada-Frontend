import { Component, input, output } from '@angular/core';
import { NgClass, DatePipe, SlicePipe } from '@angular/common';

@Component({
  selector: 'app-date-carousel',
  standalone: true,
  imports: [NgClass, DatePipe, SlicePipe],
  templateUrl: './date-carousel.html',
  host: {
    class: 'w-full flex items-center gap-3 relative'
  }
})
export class DateCarouselComponent {
  selectedDate = input.required<Date>();
  dateRange = input.required<Date[]>();

  dateChange = output<Date>();
  navigate = output<number>();

  selectDate(date: Date): void {
    this.dateChange.emit(date);
  }

  navigateDays(offset: number): void {
    this.navigate.emit(offset);
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }
}
