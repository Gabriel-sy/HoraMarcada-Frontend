import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass, CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthMockService } from '../../../core/auth/auth-mock.service';
import { AdminApiService } from '../services/admin-api.service';
import { BookingApiService } from '../../booking/services/booking-api.service';
import { Professional } from '../../booking/models/professional.model';
import { Service } from '../../booking/models/service.model';
import { Appointment } from '../../booking/models/appointment.model';
import { TimeBlock } from '../../booking/models/time-block.model';
import { AppointmentStatus } from '../../booking/models/appointment-status.enum';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { DateCarouselComponent } from './components/date-carousel/date-carousel';
import { CancelAppointmentDrawerComponent } from './components/cancel-appointment-drawer/cancel-appointment-drawer';
import { TimeBlockDrawerComponent } from '../components/time-block-drawer/time-block-drawer';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    NgClass,
    FormsModule,
    SpinnerComponent,
    EmptyStateComponent,
    DateCarouselComponent,
    CancelAppointmentDrawerComponent,
    TimeBlockDrawerComponent
  ],
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
  readonly dayBlocks = signal<TimeBlock[]>([]);
  readonly loading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly isCancelModalOpen = signal<boolean>(false);
  readonly appointmentToCancel = signal<Appointment | null>(null);
  readonly cancelError = signal<string | null>(null);
  readonly canceling = signal<boolean>(false);

  readonly selectedDate = signal<Date>(this.normalizeDate(new Date()));
  readonly selectedProfessionalId = signal<string | null>(null);

  readonly dateRange = signal<Date[]>(this.generateInitialDateRange());

  readonly isBlockDrawerOpen = signal<boolean>(false);
  readonly submittingBlock = signal<boolean>(false);

  readonly selectedProfessionalForBlock = computed(() => {
    const id = this.selectedProfessionalId();
    return this.professionals().find(p => p.id === id) || null;
  });

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
        this.loadAppointments(storeId, this.selectedDate(), this.selectedProfessionalId());

        setTimeout(() => {
          const el = document.getElementById(`date-pill-${this.selectedDate().getTime()}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
          }
        }, 100);
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

    const appointments$ = this.adminApiService.getAppointments(storeId, startISO, endISO, professionalId);

    const targetProfs = professionalId 
      ? this.professionals().filter(p => p.id === professionalId) 
      : this.professionals();

    const blocksRequests = targetProfs.map(p => 
      this.adminApiService.listTimeBlocks(storeId, p.id, startISO, endISO).pipe(
        catchError(() => of([] as TimeBlock[]))
      )
    );

    const timeBlocks$ = blocksRequests.length > 0 
      ? forkJoin(blocksRequests) 
      : of([] as TimeBlock[][]);

    forkJoin({
      appointments: appointments$,
      timeBlocksGrouped: timeBlocks$
    }).subscribe({
      next: (res) => {
        const sortedAppointments = [...res.appointments].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        this.appointments.set(sortedAppointments);

        const flatBlocks = res.timeBlocksGrouped.reduce((acc, curr) => acc.concat(curr), []);
        const sortedBlocks = flatBlocks.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        this.dayBlocks.set(sortedBlocks);

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

  cancelAppointment(appt: Appointment): void {
    this.appointmentToCancel.set(appt);
    this.cancelError.set(null);
    this.isCancelModalOpen.set(true);
  }

  closeCancelModal(): void {
    this.isCancelModalOpen.set(false);
    this.appointmentToCancel.set(null);
    this.cancelError.set(null);
  }

  confirmCancel(): void {
    const appt = this.appointmentToCancel();
    const sId = this.storeId();
    if (!appt || !sId) return;

    this.canceling.set(true);
    this.cancelError.set(null);

    this.adminApiService.cancelAppointment(appt.id, sId).subscribe({
      next: () => {
        this.canceling.set(false);
        this.closeCancelModal();
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId());
      },
      error: () => {
        this.cancelError.set('Erro ao cancelar agendamento. Por favor, tente novamente.');
        this.canceling.set(false);
      }
    });
  }

  getService(svcId: string): Service | undefined {
    return this.services().find(s => s.id === svcId);
  }

  formatPrice(priceValue: any): string {
    if (priceValue === null || priceValue === undefined) return 'Sob consulta';
    const amount = typeof priceValue === 'object' ? priceValue.amount : priceValue;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
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

  openBlockDrawer(): void {
    this.isBlockDrawerOpen.set(true);
  }

  closeBlockDrawer(): void {
    this.isBlockDrawerOpen.set(false);
  }

  handleCreateTimeBlock(event: { professionalId: string; date: string; type: 'day' | 'range'; startTime: string; endTime: string }): void {
    const sId = this.storeId();
    if (!sId) return;

    const [year, month, day] = event.date.split('-').map(Number);
    let startTimeISO: string;
    let endTimeISO: string;

    if (event.type === 'day') {
      const dateStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dateEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      startTimeISO = dateStart.toISOString();
      endTimeISO = dateEnd.toISOString();
    } else {
      const [startH, startM] = event.startTime.split(':').map(Number);
      const [endH, endM] = event.endTime.split(':').map(Number);

      const dateStart = new Date(year, month - 1, day, startH, startM, 0, 0);
      const dateEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

      if (dateEnd <= dateStart) {
        alert('O horário de término deve ser posterior ao horário de início.');
        return;
      }

      startTimeISO = dateStart.toISOString();
      endTimeISO = dateEnd.toISOString();
    }

    this.submittingBlock.set(true);
    this.adminApiService.createTimeBlock(sId, event.professionalId, {
      startTime: startTimeISO,
      endTime: endTimeISO
    }).subscribe({
      next: () => {
        this.submittingBlock.set(false);
        this.closeBlockDrawer();
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId());
      },
      error: () => {
        alert('Erro ao criar bloqueio de horário.');
        this.submittingBlock.set(false);
      }
    });
  }

  deleteTimeBlock(blockId: string, professionalId: string): void {
    const sId = this.storeId();
    if (!sId) return;

    if (confirm('Tem certeza de que deseja remover este bloqueio de horário?')) {
      this.loading.set(true);
      this.adminApiService.deleteTimeBlock(sId, professionalId, blockId).subscribe({
        next: () => {
          this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId());
        },
        error: () => {
          alert('Erro ao remover o bloqueio.');
          this.loading.set(false);
        }
      });
    }
  }

  formatBlockRangeTime(startISO: string, endISO: string): string {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const isFullDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
    if (isFullDay) return 'Dia Inteiro';
    return `${this.formatTime(startISO)} - ${this.formatTime(endISO)}`;
  }
}
