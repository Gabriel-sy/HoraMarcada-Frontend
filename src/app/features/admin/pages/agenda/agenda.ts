import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { NgClass, CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../../../core/auth/auth.service';
import { AdminApiService } from '../../services/admin-api.service';
import { BookingApiService } from '../../../booking/services/booking-api.service';
import { AdminStateService } from '../../services/admin-state.service';
import { Professional } from '../../../booking/models/professional.model';
import { Service } from '../../../booking/models/service.model';
import { Appointment } from '../../../booking/models/appointment.model';
import { TimeBlock } from '../../../booking/models/time-block.model';
import { AppointmentStatus } from '../../../booking/models/appointment-status.enum';
import { SpinnerComponent } from '../../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../../shared/components/empty-state/empty-state';
import { DateCarouselComponent } from './components/date-carousel/date-carousel';
import { CancelAppointmentDrawerComponent } from './components/cancel-appointment-drawer/cancel-appointment-drawer';
import { TimeBlockDrawerComponent } from '../../components/time-block-drawer/time-block-drawer';
import { ProfessionalFilterDrawerComponent } from './components/professional-filter-drawer/professional-filter-drawer';
import { ToastService } from '../../../../../shared/services/toast.service';
import { CreateAppointmentDrawerComponent } from './components/create-appointment-drawer/create-appointment-drawer';

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
    TimeBlockDrawerComponent,
    ProfessionalFilterDrawerComponent,
    CreateAppointmentDrawerComponent
  ],
  templateUrl: './agenda.html',
  styleUrl: './agenda.css',
  providers: [DatePipe]
})
export class AgendaComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminApiService = inject(AdminApiService);
  private readonly bookingApiService = inject(BookingApiService);
  private readonly stateService = inject(AdminStateService);
  private readonly toastService = inject(ToastService);

  readonly storeId = signal<string | null>(null);
  readonly professionals = this.stateService.professionals;
  readonly services = this.stateService.services;
  readonly appointments = this.stateService.agendaAppointments;
  readonly dayBlocks = this.stateService.agendaTimeBlocks;
  readonly loading = this.stateService.loadingAgenda;
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
  readonly isProfessionalFilterDrawerOpen = signal<boolean>(false);
  readonly isCreateDrawerOpen = signal<boolean>(false);
  readonly submittingCreate = signal<boolean>(false);
  readonly createError = signal<string | null>(null);

  readonly selectedProfessionalName = computed(() => {
    const id = this.selectedProfessionalId();
    if (!id) return 'Todos';
    const prof = this.professionals().find(p => p.id === id);
    return prof ? prof.name : 'Todos';
  });

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
    const userId = this.authService.userId();
    if (!userId) {
      return;
    }
    this.stateService.loadStore(userId).subscribe({
      next: (store) => {
        this.storeId.set(store.id);
        this.loadCatalog(store.id);
      },
      error: () => {
        this.error.set('Erro ao carregar dados do estabelecimento.');
      }
    });
  }

  private loadCatalog(storeId: string): void {
    this.stateService.loadServices(storeId).subscribe();
    this.stateService.loadProfessionals(storeId).subscribe({
      next: () => {
        this.loadAppointments(storeId, this.selectedDate(), this.selectedProfessionalId());

        setTimeout(() => {
          const el = document.getElementById(`date-pill-${this.selectedDate().getTime()}`);
          if (el) {
            el.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' });
          }
        }, 100);
      }
    });
  }

  private loadAppointments(storeId: string, date: Date, professionalId: string | null, forceRefresh = false): void {
    this.error.set(null);
    this.stateService.loadAgenda(storeId, date, professionalId, this.professionals(), forceRefresh).subscribe({
      error: () => {
        this.error.set('Não foi possível carregar os agendamentos.');
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
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId(), true);
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

  openBlockDrawer(): void {
    this.isBlockDrawerOpen.set(true);
  }

  closeBlockDrawer(): void {
    this.isBlockDrawerOpen.set(false);
  }

  openProfessionalFilterDrawer(): void {
    this.isProfessionalFilterDrawerOpen.set(true);
  }

  closeProfessionalFilterDrawer(): void {
    this.isProfessionalFilterDrawerOpen.set(false);
  }

  openCreateDrawer(): void {
    this.isCreateDrawerOpen.set(true);
    this.createError.set(null);
  }

  closeCreateDrawer(): void {
    this.isCreateDrawerOpen.set(false);
    this.createError.set(null);
  }

  handleCreateAppointment(event: {
    customerName: string;
    customerWhatsApp: string;
    customerEmail: string;
    serviceId: string;
    professionalId: string;
    startTime: string;
  }): void {
    const sId = this.storeId();
    if (!sId) return;

    this.submittingCreate.set(true);
    this.createError.set(null);

    const input = {
      storeId: sId,
      professionalId: event.professionalId,
      serviceId: event.serviceId,
      customerName: event.customerName,
      customerWhatsApp: event.customerWhatsApp,
      customerEmail: event.customerEmail,
      startTime: event.startTime
    };

    this.bookingApiService.bookAppointment(input).subscribe({
      next: () => {
        this.submittingCreate.set(false);
        this.closeCreateDrawer();
        this.toastService.success('Agendamento criado com sucesso.');
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId(), true);
      },
      error: (err) => {
        const message = err.error?.detail || err.error?.title || 'Erro ao criar agendamento.';
        this.createError.set(message);
        this.submittingCreate.set(false);
      }
    });
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
        this.toastService.error('O horário de término deve ser posterior ao horário de início.');
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
        this.toastService.success('Bloqueio de horário criado com sucesso.');
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId(), true);
      },
      error: () => {
        this.toastService.error('Erro ao criar bloqueio de horário.');
        this.submittingBlock.set(false);
      }
    });
  }

  deleteTimeBlock(blockId: string, professionalId: string): void {
    const sId = this.storeId();
    if (!sId) return;

    this.adminApiService.deleteTimeBlock(sId, professionalId, blockId).subscribe({
      next: () => {
        this.toastService.success('Bloqueio de horário removido com sucesso.');
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId(), true);
      },
      error: () => {
        this.toastService.error('Erro ao remover o bloqueio.');
      }
    });
  }

  formatBlockRangeTime(startISO: string, endISO: string): string {
    const start = new Date(startISO);
    const end = new Date(endISO);
    const isFullDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
    if (isFullDay) return 'Dia Inteiro';
    return `${this.formatTime(startISO)} - ${this.formatTime(endISO)}`;
  }
}
