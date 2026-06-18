import { Component, input, output } from '@angular/core';
import { CommonModule, NgClass, DatePipe } from '@angular/common';
import { Appointment } from '../../../../../booking/models/appointment.model';

@Component({
  selector: 'app-appointment-popover',
  standalone: true,
  imports: [CommonModule, NgClass, DatePipe],
  templateUrl: './appointment-popover.html',
  host: {
    class: 'fixed inset-0 z-100 flex items-center justify-center transition-opacity duration-200',
    '[class.opacity-100]': 'isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.opacity-0]': '!isOpen()',
    '[class.pointer-events-none]': '!isOpen()'
  }
})
export class AppointmentPopoverComponent {
  isOpen = input.required<boolean>();
  appointment = input.required<Appointment | null>();
  serviceName = input.required<string>();
  professionalName = input.required<string>();
  formattedPrice = input.required<string>();
  statusLabel = input.required<string>();
  statusClass = input.required<string>();

  close = output<void>();
  cancel = output<void>();

  onClose(): void {
    this.close.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
