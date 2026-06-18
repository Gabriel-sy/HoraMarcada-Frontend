import { Component, input, output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Professional } from '../../../../../booking/models/professional.model';
import { Service } from '../../../../../booking/models/service.model';
import { Appointment } from '../../../../../booking/models/appointment.model';
import { AppointmentStatus } from '../../../../../booking/models/appointment-status.enum';

@Component({
  selector: 'app-agenda-mobile-feed',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './agenda-mobile-feed.html',
  styleUrl: './agenda-mobile-feed.css'
})
export class AgendaMobileFeedComponent {
  items = input.required<any[]>();
  services = input.required<Service[]>();
  professionals = input.required<Professional[]>();

  selectAppointment = output<Appointment>();
  removeTimeBlock = output<{ blockId: string; professionalId: string }>();

  formatTime(isoString: string): string {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  getServiceName(svcId: string): string {
    const svc = this.services().find(s => s.id === svcId);
    return svc ? svc.name : 'Serviço';
  }

  getProfessionalName(profId: string): string {
    const prof = this.professionals().find(p => p.id === profId);
    return prof ? prof.name : 'Profissional';
  }

  formatBlockRangeTime(startISO: string, endISO: string): string {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const isFullDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
    if (isFullDay) return 'Dia Inteiro';
    return `${this.formatTime(startISO)} - ${this.formatTime(endISO)}`;
  }

  getEffectiveStatus(appt: Appointment): AppointmentStatus {
    if (appt.status === AppointmentStatus.Confirmed || appt.status === AppointmentStatus.ConfirmedByUser) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDate = new Date(appt.startTime);
      if (apptDate < today) {
        return AppointmentStatus.Completed;
      }
    }
    return appt.status;
  }

  getAppointmentStatusLabel(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.Confirmed: return 'Agendado';
      case AppointmentStatus.Canceled: return 'Cancelado';
      case AppointmentStatus.Completed: return 'Concluído';
      case AppointmentStatus.ConfirmedByUser: return 'Confirmado pelo Cliente';
      default: return 'Desconhecido';
    }
  }

  getAppointmentStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.Confirmed: return 'status-confirmed';
      case AppointmentStatus.Canceled: return 'status-canceled';
      case AppointmentStatus.Completed: return 'status-completed';
      case AppointmentStatus.ConfirmedByUser: return 'status-user-confirmed';
      default: return '';
    }
  }

  onSelectAppointment(appt: Appointment): void {
    this.selectAppointment.emit(appt);
  }

  onRemoveBlock(blockId: string, professionalId: string): void {
    this.removeTimeBlock.emit({ blockId, professionalId });
  }
}
