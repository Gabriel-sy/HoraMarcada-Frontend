import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass, NgIf, NgFor, DatePipe, CommonModule } from '@angular/common';
import { AuthMockService } from '../../../core/auth/auth-mock.service';
import { AdminApiService } from '../services/admin-api.service';
import { BookingApiService } from '../../booking/services/booking-api.service';
import { Professional } from '../../booking/models/professional.model';
import { Service } from '../../booking/models/service.model';
import { Appointment } from '../../booking/models/appointment.model';
import { AppointmentStatus } from '../../booking/models/appointment-status.enum';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [CommonModule, NgClass, NgIf, NgFor],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
  providers: [DatePipe]
})
export class AgendaComponent implements OnInit {
  private readonly authService = inject(AuthMockService);
  private readonly adminApiService = inject(AdminApiService);
  private readonly bookingApiService = inject(BookingApiService);

  readonly storeId = signal<string | null>(null);
  readonly professionals = signal<Professional[]>([]);
  readonly services = signal<Service[]>([]);
  readonly appointments = signal<Appointment[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  readonly selectedDate = signal<Date>(this.normalizeDate(new Date()));
  readonly selectedProfessionalId = signal<string | null>(null);

  readonly dateRange = signal<Date[]>(this.generateInitialDateRange());

  private generateInitialDateRange(): Date[] {
    const range: Date[] = [];
    const base = new Date();
    base.setHours(12, 0, 0, 0);
    for (let i = -90; i <= 90; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      range.push(d);
    }
    return range;
  }

  private normalizeDate(date: Date): Date {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0);
    return d;
  }

  ngOnInit(): void {
    this.loadStoreData();
  }

  private loadStoreData(): void {
    this.loading.set(true);
    const userId = this.authService.userId();
    this.adminApiService.getStoreByUserId(userId).subscribe({
      next: (store) => {
        this.storeId.set(store.id);
        this.loadCatalog(store.id);
        this.loadAppointments(store.id, this.selectedDate(), this.selectedProfessionalId());

        setTimeout(() => {
          const el = document.getElementById(`date-pill-${this.selectedDate().getTime()}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
          }
        }, 100);
      },
      error: () => {
        this.error.set('Erro ao carregar dados do estabelecimento.');
        this.loading.set(false);
      }
    });
  }

  private loadCatalog(storeId: string): void {
    this.adminApiService.getStoreProfessionals(storeId).subscribe({
      next: (profs) => {
        this.professionals.set(profs);
      }
    });

    this.bookingApiService.getStoreServices(storeId).subscribe({
      next: (svcs) => {
        this.services.set(svcs);
      }
    });
  }

  private loadAppointments(storeId: string, date: Date, professionalId: string | null): void {
    this.loading.set(true);
    this.error.set(null);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    this.adminApiService.getAppointments(storeId, startISO, endISO, professionalId).subscribe({
      next: (res) => {
        const sorted = [...res].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        this.appointments.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os agendamentos.');
        this.loading.set(false);
      }
    });
  }

  selectDate(date: Date, smooth = true): void {
    const normalized = this.normalizeDate(date);
    this.selectedDate.set(normalized);

    setTimeout(() => {
      const el = document.getElementById(`date-pill-${normalized.getTime()}`);
      if (el) {
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
      }
    }, 50);

    const sId = this.storeId();
    if (sId) {
      this.loadAppointments(sId, normalized, this.selectedProfessionalId());
    }
  }

  selectProfessional(profId: string | null): void {
    this.selectedProfessionalId.set(profId);
    const sId = this.storeId();
    if (sId) {
      this.loadAppointments(sId, this.selectedDate(), profId);
    }
  }

  navigateDays(offset: number): void {
    const current = this.selectedDate();
    const next = new Date(current);
    next.setDate(current.getDate() + offset);
    this.selectDate(next);
  }

  getProfessionalName(profId: string): string {
    const prof = this.professionals().find(p => p.id === profId);
    return prof ? prof.name : 'Profissional';
  }

  getServiceName(svcId: string): string {
    const svc = this.services().find(s => s.id === svcId);
    return svc ? svc.name : 'Serviço';
  }

  formatTime(isoString: string): string {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  }

  cancelAppointment(id: string): void {
    const sId = this.storeId();
    if (!sId) return;

    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      this.loading.set(true);
      this.adminApiService.cancelAppointment(id, sId).subscribe({
        next: () => {
          this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId());
        },
        error: () => {
          alert('Erro ao cancelar agendamento.');
          this.loading.set(false);
        }
      });
    }
  }

  getEffectiveStatus(appt: Appointment): AppointmentStatus {
    if (appt.status === AppointmentStatus.Confirmed) {
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
      case AppointmentStatus.Confirmed: return 'Confirmado';
      case AppointmentStatus.Canceled: return 'Cancelado';
      case AppointmentStatus.Completed: return 'Concluído';
      default: return 'Desconhecido';
    }
  }

  getAppointmentStatusClass(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.Confirmed: return 'status-confirmed';
      case AppointmentStatus.Canceled: return 'status-canceled';
      case AppointmentStatus.Completed: return 'status-completed';
      default: return '';
    }
  }
}
