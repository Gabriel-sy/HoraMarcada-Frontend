import { Component, OnInit, inject, signal, computed, effect, DestroyRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SupabaseRealtimeService } from '../../../../core/realtime/supabase-realtime.service';
import { NotificationSoundService } from '../../../../core/notification-sound/notification-sound.service';
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
import { ViewAppointmentModalComponent } from './components/view-appointment-modal/view-appointment-modal';
import { TimeBlockModalComponent } from './components/time-block-modal/time-block-modal';
import { ProfessionalFilterDrawerComponent } from './components/professional-filter-drawer/professional-filter-drawer';
import { ToastService } from '../../../../../shared/services/toast.service';
import { CreateAppointmentModalComponent } from './components/create-appointment-modal/create-appointment-modal';
import { AgendaSidebarComponent } from './components/agenda-sidebar/agenda-sidebar';
import { AgendaGridComponent } from './components/agenda-grid/agenda-grid';
import { AgendaMobileFeedComponent } from './components/agenda-mobile-feed/agenda-mobile-feed';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-agenda',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    SpinnerComponent,
    EmptyStateComponent,
    DateCarouselComponent,
    ViewAppointmentModalComponent,
    TimeBlockModalComponent,
    ProfessionalFilterDrawerComponent,
    CreateAppointmentModalComponent,
    AgendaSidebarComponent,
    AgendaGridComponent,
    AgendaMobileFeedComponent
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
  private readonly realtimeService = inject(SupabaseRealtimeService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly soundService = inject(NotificationSoundService);
  private readonly datePipe = inject(DatePipe);

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

  readonly selectedSidebarProfessionalIds = signal<string[]>([]);
  readonly preselectedProfessionalId = signal<string | null>(null);
  readonly preselectedTime = signal<string | null>(null);
  private hasInitializedProfessionals = false;
  private readonly pendingLocalCreations = new Set<string>();
  private readonly pendingLocalCancellations = new Set<string>();

  readonly activeProfessionalsList = computed(() => {
    const selectedIds = this.selectedSidebarProfessionalIds();
    return this.professionals().filter(p => selectedIds.includes(p.id));
  });

  readonly timeSlots = computed(() => {
    const date = this.selectedDate();
    const dayOfWeek = date.getDay();
    const profs = this.professionals();
    const selectedIds = this.selectedSidebarProfessionalIds();

    let minHour = 8;
    let maxHour = 20;
    let hasCustomHours = false;

    const schedulesForDay = profs
      .filter(p => selectedIds.includes(p.id))
      .flatMap(p => p.weeklySchedules || [])
      .filter(s => s.dayOfWeek === dayOfWeek);

    if (schedulesForDay.length > 0) {
      let earliest = 24 * 60;
      let latest = 0;
      for (const sched of schedulesForDay) {
        const [startH, startM] = sched.startTime.split(':').map(Number);
        const [endH, endM] = sched.endTime.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;
        if (startMin < earliest) earliest = startMin;
        if (endMin > latest) latest = endMin;
      }
      minHour = Math.floor(earliest / 60);
      maxHour = Math.ceil(latest / 60);
      hasCustomHours = true;
    }

    if (!hasCustomHours) {
      minHour = 8;
      maxHour = 20;
    }

    const list: string[] = [];
    for (let h = minHour; h < maxHour; h++) {
      list.push(`${String(h).padStart(2, '0')}:00`);
      list.push(`${String(h).padStart(2, '0')}:30`);
    }
    list.push(`${String(maxHour).padStart(2, '0')}:00`);
    return list;
  });

  readonly gridData = computed(() => {
    const slots = this.timeSlots();
    const selectedIds = this.selectedSidebarProfessionalIds();
    const profs = this.professionals().filter(p => selectedIds.includes(p.id));
    const appts = this.appointments();
    const blocks = this.dayBlocks();
    const date = this.selectedDate();
    const dayOfWeek = date.getDay();

    const result = new Map<string, { [time: string]: any }>();

    for (const prof of profs) {
      const profCells: { [time: string]: any } = {};
      const sched = prof.weeklySchedules?.find(s => s.dayOfWeek === dayOfWeek);

      const pAppts = appts.filter(a => a.professionalId === prof.id);
      const pBlocks = blocks.filter(b => b.professionalId === prof.id);

      const busyTimes = new Set<string>();

      for (const appt of pAppts) {
        const start = new Date(appt.startTime);
        const startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        
        const svc = this.services().find(s => s.id === appt.serviceId);
        const durationMin = svc ? svc.durationMinutes : 30;
        const slotsCount = Math.max(1, Math.ceil(durationMin / 30));

        profCells[startStr] = {
          type: 'appointment',
          data: appt,
          durationSlots: slotsCount
        };

        const currentMin = start.getHours() * 60 + start.getMinutes();
        for (let i = 1; i < slotsCount; i++) {
          const m = currentMin + i * 30;
          const hStr = String(Math.floor(m / 60)).padStart(2, '0');
          const mStr = String(m % 60).padStart(2, '0');
          busyTimes.add(`${hStr}:${mStr}`);
        }
      }

      for (const block of pBlocks) {
        const start = new Date(block.startTime);
        const end = new Date(block.endTime);
        const startStr = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
        
        const durationMs = end.getTime() - start.getTime();
        const durationMin = Math.round(durationMs / 60000);
        const slotsCount = Math.max(1, Math.ceil(durationMin / 30));

        profCells[startStr] = {
          type: 'block',
          data: block,
          durationSlots: slotsCount
        };

        const currentMin = start.getHours() * 60 + start.getMinutes();
        for (let i = 1; i < slotsCount; i++) {
          const m = currentMin + i * 30;
          const hStr = String(Math.floor(m / 60)).padStart(2, '0');
          const mStr = String(m % 60).padStart(2, '0');
          busyTimes.add(`${hStr}:${mStr}`);
        }
      }

      for (const slot of slots) {
        if (profCells[slot]) {
          continue;
        }

        if (busyTimes.has(slot)) {
          profCells[slot] = { type: 'span' };
          continue;
        }

        if (!sched) {
          profCells[slot] = { type: 'off-hours', label: 'Folga' };
          continue;
        }

        const [slotH, slotM] = slot.split(':').map(Number);
        const slotMin = slotH * 60 + slotM;

        const [startH, startM] = sched.startTime.split(':').map(Number);
        const [endH, endM] = sched.endTime.split(':').map(Number);
        const startMin = startH * 60 + startM;
        const endMin = endH * 60 + endM;

        const lunchStartMin = sched.lunchStart ? sched.lunchStart.split(':').map(Number)[0] * 60 + sched.lunchStart.split(':').map(Number)[1] : null;
        const lunchEndMin = sched.lunchEnd ? sched.lunchEnd.split(':').map(Number)[0] * 60 + sched.lunchEnd.split(':').map(Number)[1] : null;

        if (slotMin < startMin || slotMin >= endMin) {
          profCells[slot] = { type: 'off-hours', label: 'Fora de Expediente' };
        } else if (lunchStartMin !== null && lunchEndMin !== null && slotMin >= lunchStartMin && slotMin < lunchEndMin) {
          profCells[slot] = { type: 'off-hours', label: 'Almoço' };
        } else {
          profCells[slot] = { type: 'empty', time: slot };
        }
      }

      result.set(prof.id, profCells);
    }

    return result;
  });

  readonly mobileAgendaItems = computed(() => {
    const appts = this.appointments().map(appt => ({
      type: 'appointment' as const,
      time: new Date(appt.startTime).getTime(),
      data: appt
    }));
    const blocks = this.dayBlocks().map(block => ({
      type: 'block' as const,
      time: new Date(block.startTime).getTime(),
      data: block
    }));
    return [...appts, ...blocks].sort((a, b) => a.time - b.time);
  });

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

  constructor() {
    effect(() => {
      const profs = this.professionals();
      if (profs.length > 0 && !this.hasInitializedProfessionals) {
        this.selectedSidebarProfessionalIds.set(profs.map(p => p.id));
        this.hasInitializedProfessionals = true;
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const selectedIds = this.selectedSidebarProfessionalIds();
      const currentSingleId = this.selectedProfessionalId();
      if (selectedIds.length === 1) {
        if (currentSingleId !== selectedIds[0]) {
          this.selectedProfessionalId.set(selectedIds[0]);
        }
      } else {
        if (currentSingleId !== null) {
          this.selectedProfessionalId.set(null);
        }
      }
    }, { allowSignalWrites: true });

    effect(() => {
      const singleId = this.selectedProfessionalId();
      const sidebarIds = this.selectedSidebarProfessionalIds();
      const profs = this.professionals();
      if (profs.length > 0) {
        if (singleId) {
          if (sidebarIds.length !== 1 || sidebarIds[0] !== singleId) {
            this.selectedSidebarProfessionalIds.set([singleId]);
          }
        } else {
          if (sidebarIds.length === 1) {
            this.selectedSidebarProfessionalIds.set(profs.map(p => p.id));
          }
        }
      }
    }, { allowSignalWrites: true });
  }

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
        this.subscribeToRealtimeAppointments(store.id);
      },
      error: () => {
        this.error.set('Erro ao carregar dados do estabelecimento.');
      }
    });
  }

  private checkAndClearLocalAction(
    record: { start_time?: string; professional_id?: string } | null,
    appointment: Appointment | null
  ): boolean {
    const recordKey = record?.professional_id && record?.start_time
      ? `${record.professional_id}_${new Date(record.start_time).getTime()}`
      : null;

    if (recordKey && this.pendingLocalCreations.has(recordKey)) {
      this.pendingLocalCreations.delete(recordKey);
      return true;
    }

    if (appointment && this.pendingLocalCancellations.has(appointment.id)) {
      this.pendingLocalCancellations.delete(appointment.id);
      return true;
    }

    return false;
  }

  private showRealtimeNotification(eventType: string, appointment: Appointment | null): void {
    this.soundService.play();
    const msg = this.buildRealtimeToastMessage(appointment);
    if (eventType === 'INSERT') {
      this.toastService.success("Novo agendamento para " + msg, 10000);
    } else if (eventType === 'UPDATE') {
      this.toastService.info("Agendamento atualizado para " + msg, 10000);
    } else if (eventType === 'CANCEL') {
      this.toastService.error("Agendamento cancelado para " + msg, 10000);
    }
  }

  private subscribeToRealtimeAppointments(storeId: string): void {
    this.realtimeService.watchAppointments(storeId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(async payload => {
        const record = (payload.new ?? payload.old) as { id?: string; start_time?: string; professional_id?: string } | null;
        if (!record?.start_time) {
          return;
        }
        const { appointment, eventType } = await this.stateService.applyRealtimeEvent(payload, storeId, this.selectedDate());
        if (this.checkAndClearLocalAction(record, appointment)) {
          return;
        }
        this.showRealtimeNotification(eventType, appointment);
      });
  }

  private buildRealtimeToastMessage(appt: Appointment | null): string {
    if (!appt) return 'Agendamento atualizado.';

    const apptDate = new Date(appt.startTime);
    const selected = this.selectedDate();
    const isSameDay =
      apptDate.getFullYear() === selected.getFullYear() &&
      apptDate.getMonth() === selected.getMonth() &&
      apptDate.getDate() === selected.getDate();

    const time = this.datePipe.transform(appt.startTime, 'HH:mm') ?? '';
    const prof = this.professionals().find(p => p.id === appt.professionalId);
    const parts = [appt.customerName];

    if (!isSameDay) {
      const dateStr = this.datePipe.transform(appt.startTime, 'dd/MM') ?? '';
      if (dateStr) {
        parts.push(`no dia ${dateStr}`);
      }
    }

    if (time) parts.push(`às ${time}`);
    if (prof) parts.push(`com ${prof.name}`);
    return parts.join(' ');
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

    this.pendingLocalCancellations.add(appt.id);
    const timeoutId = setTimeout(() => this.pendingLocalCancellations.delete(appt.id), 15000);

    this.adminApiService.cancelAppointment(appt.id, sId).subscribe({
      next: () => {
        this.canceling.set(false);
        this.closeCancelModal();
        this.toastService.success('Agendamento cancelado com sucesso.');
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId(), true);
      },
      error: () => {
        clearTimeout(timeoutId);
        this.pendingLocalCancellations.delete(appt.id);
        this.cancelError.set('Erro ao cancelar agendamento. Por favor, tente novamente.');
        this.canceling.set(false);
      }
    });
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
    this.preselectedProfessionalId.set(null);
    this.preselectedTime.set(null);
  }

  openCreateDrawerWithPreselection(professionalId: string, time: string): void {
    this.preselectedProfessionalId.set(professionalId);
    this.preselectedTime.set(time);
    this.isCreateDrawerOpen.set(true);
    this.createError.set(null);
  }

  handleCreateAppointment(event: {
    customerName: string;
    customerWhatsApp: string;
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
      startTime: event.startTime
    };

    const creationKey = `${event.professionalId}_${new Date(event.startTime).getTime()}`;
    this.pendingLocalCreations.add(creationKey);
    const timeoutId = setTimeout(() => this.pendingLocalCreations.delete(creationKey), 15000);

    this.bookingApiService.bookAppointment(input).subscribe({
      next: () => {
        this.submittingCreate.set(false);
        this.closeCreateDrawer();
        this.toastService.success('Agendamento criado com sucesso.');
        this.loadAppointments(sId, this.selectedDate(), this.selectedProfessionalId(), true);
      },
      error: (err) => {
        clearTimeout(timeoutId);
        this.pendingLocalCreations.delete(creationKey);
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

}
