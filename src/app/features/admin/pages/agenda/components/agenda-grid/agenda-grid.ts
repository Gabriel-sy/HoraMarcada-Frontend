import { Component, input, output } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { Professional } from '../../../../../booking/models/professional.model';
import { Service } from '../../../../../booking/models/service.model';
import { Appointment } from '../../../../../booking/models/appointment.model';
import { AppointmentStatus } from '../../../../../booking/models/appointment-status.enum';

@Component({
  selector: 'app-agenda-grid',
  standalone: true,
  imports: [CommonModule, NgClass],
  templateUrl: './agenda-grid.html',
  styleUrl: './agenda-grid.css'
})
export class AgendaGridComponent {
  activeProfessionals = input.required<Professional[]>();
  timeSlots = input.required<string[]>();
  services = input.required<Service[]>();
  gridData = input.required<Map<string, { [time: string]: any }>>();

  addAppointment = output<{ professionalId: string; time: string }>();
  selectAppointment = output<Appointment>();
  removeTimeBlock = output<{ blockId: string; professionalId: string }>();

  getCell(profId: string, time: string): any {
    const data = this.gridData();
    const profCells = data.get(profId);
    return profCells ? profCells[time] : null;
  }

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

  onAddAppointment(professionalId: string, time: string): void {
    this.addAppointment.emit({ professionalId, time });
  }

  onSelectAppointment(appt: Appointment): void {
    this.selectAppointment.emit(appt);
  }

  onRemoveBlock(blockId: string, professionalId: string): void {
    this.removeTimeBlock.emit({ blockId, professionalId });
  }

  getOffHoursClass(label: string): string {
    switch (label) {
      case 'Folga':
        return 'off-hours-folga';
      case 'Almoço':
        return 'off-hours-almoco';
      case 'Fora de Expediente':
      default:
        return 'off-hours-fora';
    }
  }

  getAppointmentRange(appt: Appointment): string {
    const start = new Date(appt.startTime);
    const svc = this.services().find(s => s.id === appt.serviceId);
    const duration = svc ? svc.durationMinutes : 30;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const format = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${format(start)} - ${format(end)}`;
  }
}

