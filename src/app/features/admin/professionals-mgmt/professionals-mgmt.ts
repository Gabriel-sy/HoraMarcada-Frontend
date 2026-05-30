import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthMockService } from '../../../core/auth/auth-mock.service';
import { AdminApiService } from '../services/admin-api.service';
import { Professional } from '../../booking/models/professional.model';
import { TimeBlock } from '../../booking/models/time-block.model';

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
  selector: 'app-professionals-mgmt',
  standalone: true,
  imports: [NgClass, FormsModule],
  templateUrl: './professionals-mgmt.html',
  styleUrl: './professionals-mgmt.css'
})
export class ProfessionalsMgmtComponent implements OnInit {
  private readonly authService = inject(AuthMockService);
  private readonly adminApiService = inject(AdminApiService);

  readonly DAYS_OF_WEEK = [
    'Domingo',
    'Segunda-feira',
    'Terça-feira',
    'Quarta-feira',
    'Quinta-feira',
    'Sexta-feira',
    'Sábado'
  ];

  readonly storeId = signal<string | null>(null);
  readonly professionals = signal<Professional[]>([]);
  readonly timeBlocks = signal<TimeBlock[]>([]);
  readonly loading = signal<boolean>(false);
  readonly loadingBlocks = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);

  readonly isDrawerOpen = signal<boolean>(false);
  readonly isBlocksDrawerOpen = signal<boolean>(false);
  readonly selectedProfessional = signal<Professional | null>(null);
  readonly activeTab = signal<'basic' | 'weekly'>('basic');

  readonly formName = signal<string>('');
  readonly formEmail = signal<string>('');
  readonly formWhatsApp = signal<string>('');
  readonly formPhotoUrl = signal<string>('');

  readonly formWeeklyHours = signal<DayHoursConfig[]>([
    { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
    { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
    { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
    { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
    { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
    { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
    { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 }
  ]);

  readonly blockType = signal<'day' | 'range'>('range');
  readonly blockDate = signal<string>('');
  readonly blockStartTime = signal<string>('08:00');
  readonly blockEndTime = signal<string>('18:00');

  ngOnInit(): void {
    this.loadStoreData();
  }

  private loadStoreData(): void {
    this.loading.set(true);
    const userId = this.authService.userId();
    this.adminApiService.getStoreByUserId(userId).subscribe({
      next: (store) => {
        this.storeId.set(store.id);
        this.loadProfessionals(store.id);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  private loadProfessionals(storeId: string): void {
    this.adminApiService.getStoreProfessionals(storeId).subscribe({
      next: (profs) => {
        this.professionals.set(profs);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  openCreateForm(): void {
    this.selectedProfessional.set(null);
    this.formName.set('');
    this.formEmail.set('');
    this.formWhatsApp.set('');
    this.formPhotoUrl.set('');
    this.activeTab.set('basic');

    this.formWeeklyHours.set([
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: true, startTime: '09:00', endTime: '18:00', hasLunch: true, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 }
    ]);

    this.isDrawerOpen.set(true);
  }

  openEditForm(professional: Professional): void {
    this.selectedProfessional.set(professional);
    this.formName.set(professional.name);
    this.formEmail.set(professional.email ? professional.email.value : '');
    this.formWhatsApp.set(professional.whatsApp ? professional.whatsApp.value : '');
    this.formPhotoUrl.set(professional.photoUrl || '');
    this.activeTab.set('basic');

    const defaultHours = [
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 },
      { active: false, startTime: '09:00', endTime: '18:00', hasLunch: false, lunchStart: '12:00', lunchEnd: '13:00', intervalMinutes: 30 }
    ];

    if (professional.weeklySchedules) {
      professional.weeklySchedules.forEach(schedule => {
        const day = schedule.dayOfWeek;
        if (day >= 0 && day <= 6) {
          defaultHours[day] = {
            active: true,
            startTime: schedule.startTime ? schedule.startTime.slice(0, 5) : '09:00',
            endTime: schedule.endTime ? schedule.endTime.slice(0, 5) : '18:00',
            hasLunch: !!(schedule.lunchStart && schedule.lunchEnd),
            lunchStart: schedule.lunchStart ? schedule.lunchStart.slice(0, 5) : '12:00',
            lunchEnd: schedule.lunchEnd ? schedule.lunchEnd.slice(0, 5) : '13:00',
            intervalMinutes: schedule.intervalMinutes || 30
          };
        }
      });
    }
    this.formWeeklyHours.set(defaultHours);

    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  openBlocksForm(professional: Professional): void {
    this.selectedProfessional.set(professional);
    this.blockType.set('range');
    this.blockDate.set('');
    this.blockStartTime.set('08:00');
    this.blockEndTime.set('18:00');
    this.loadTimeBlocks();
    this.isBlocksDrawerOpen.set(true);
  }

  closeBlocksDrawer(): void {
    this.isBlocksDrawerOpen.set(false);
  }

  setTab(tab: 'basic' | 'weekly'): void {
    this.activeTab.set(tab);
  }

  updateDayActive(dayIndex: number, active: boolean): void {
    const hours = [...this.formWeeklyHours()];
    hours[dayIndex] = { ...hours[dayIndex], active };
    this.formWeeklyHours.set(hours);
  }

  updateDayLunchActive(dayIndex: number, hasLunch: boolean): void {
    const hours = [...this.formWeeklyHours()];
    hours[dayIndex] = { ...hours[dayIndex], hasLunch };
    this.formWeeklyHours.set(hours);
  }

  formatWeeklyHoursPreview(prof: Professional): string {
    if (!prof.weeklySchedules || prof.weeklySchedules.length === 0) {
      return 'Nenhum dia de atendimento cadastrado';
    }

    const days = prof.weeklySchedules.map(h => h.dayOfWeek);
    const minDay = Math.min(...days);
    const maxDay = Math.max(...days);

    const formatDayName = (day: number) => {
      const names = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return names[day];
    };

    const firstSchedule = prof.weeklySchedules.find(h => h.dayOfWeek === minDay);
    if (!firstSchedule) return 'Sem jornada';

    const start = firstSchedule.startTime.slice(0, 5);
    const end = firstSchedule.endTime.slice(0, 5);

    if (days.length === 7) {
      return `Seg a Dom • ${start} - ${end}`;
    }

    if (days.length === 5 && !days.includes(0) && !days.includes(6)) {
      return `Seg a Sex • ${start} - ${end}`;
    }

    return `${days.map(formatDayName).join(', ')} • ${start} - ${end}`;
  }

  loadTimeBlocks(): void {
    const sId = this.storeId();
    const p = this.selectedProfessional();
    if (!sId || !p) return;

    this.loadingBlocks.set(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 90);

    this.adminApiService.listTimeBlocks(sId, p.id, start.toISOString(), end.toISOString()).subscribe({
      next: (blocks) => {
        const sorted = [...blocks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        this.timeBlocks.set(sorted);
        this.loadingBlocks.set(false);
      },
      error: () => {
        this.loadingBlocks.set(false);
      }
    });
  }

  addTimeBlock(): void {
    const sId = this.storeId();
    const p = this.selectedProfessional();
    if (!sId || !p) return;

    if (!this.blockDate()) {
      alert('Selecione uma data para o bloqueio.');
      return;
    }

    const [year, month, day] = this.blockDate().split('-').map(Number);
    let startTimeISO: string;
    let endTimeISO: string;

    if (this.blockType() === 'day') {
      const dateStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dateEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      startTimeISO = dateStart.toISOString();
      endTimeISO = dateEnd.toISOString();
    } else {
      const [startH, startM] = this.blockStartTime().split(':').map(Number);
      const [endH, endM] = this.blockEndTime().split(':').map(Number);

      const dateStart = new Date(year, month - 1, day, startH, startM, 0, 0);
      const dateEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

      if (dateEnd <= dateStart) {
        alert('O horário de término deve ser posterior ao horário de início.');
        return;
      }

      startTimeISO = dateStart.toISOString();
      endTimeISO = dateEnd.toISOString();
    }

    this.submitting.set(true);
    this.adminApiService.createTimeBlock(sId, p.id, {
      startTime: startTimeISO,
      endTime: endTimeISO
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.loadTimeBlocks();
      },
      error: () => {
        alert('Erro ao criar bloqueio de horário.');
        this.submitting.set(false);
      }
    });
  }

  deleteTimeBlock(blockId: string): void {
    const sId = this.storeId();
    const p = this.selectedProfessional();
    if (!sId || !p) return;

    if (confirm('Tem certeza de que deseja remover este bloqueio de horário?')) {
      this.adminApiService.deleteTimeBlock(sId, p.id, blockId).subscribe({
        next: () => {
          this.loadTimeBlocks();
        },
        error: () => {
          alert('Erro ao remover o bloqueio.');
        }
      });
    }
  }

  deactivateProfessional(): void {
    const sId = this.storeId();
    const p = this.selectedProfessional();
    if (!sId || !p) return;

    if (confirm(`Tem certeza de que deseja desativar o profissional "${p.name}"? Ele não receberá novos agendamentos.`)) {
      this.submitting.set(true);
      this.adminApiService.deactivateProfessional(sId, p.id).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeDrawer();
          this.loadProfessionals(sId);
        },
        error: () => {
          alert('Erro ao desativar o profissional.');
          this.submitting.set(false);
        }
      });
    }
  }

  submitForm(): void {
    const sId = this.storeId();
    if (!sId) return;

    if (!this.formName().trim()) {
      alert('O nome do profissional é obrigatório.');
      return;
    }

    const weeklyHoursPayload: any[] = [];
    this.formWeeklyHours().forEach((day, index) => {
      if (day.active) {
        const startTimeStr = day.startTime + ':00';
        const endTimeStr = day.endTime + ':00';
        let lunchStartStr: string | null = null;
        let lunchEndStr: string | null = null;

        if (day.hasLunch) {
          lunchStartStr = day.lunchStart + ':00';
          lunchEndStr = day.lunchEnd + ':00';
        }

        weeklyHoursPayload.push({
          dayOfWeek: index,
          startTime: startTimeStr,
          endTime: endTimeStr,
          lunchStart: lunchStartStr,
          lunchEnd: lunchEndStr,
          intervalMinutes: day.intervalMinutes
        });
      }
    });

    const payload = {
      name: this.formName().trim(),
      photoUrl: this.formPhotoUrl().trim() || null,
      whatsApp: this.formWhatsApp().trim() || null,
      email: this.formEmail().trim() || null,
      weeklyHours: weeklyHoursPayload
    };

    this.submitting.set(true);
    const p = this.selectedProfessional();
    if (p) {
      this.adminApiService.updateProfessional(sId, p.id, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeDrawer();
          this.loadProfessionals(sId);
        },
        error: () => {
          alert('Erro ao atualizar profissional.');
          this.submitting.set(false);
        }
      });
    } else {
      this.adminApiService.addProfessional(sId, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          this.closeDrawer();
          this.loadProfessionals(sId);
        },
        error: () => {
          alert('Erro ao adicionar profissional.');
          this.submitting.set(false);
        }
      });
    }
  }

  formatBlockDateTime(startTimeStr: string, endTimeStr: string): string {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    };

    const dateFormatted = start.toLocaleDateString('pt-BR', options);
    const capitalizedDate = dateFormatted.charAt(0).toUpperCase() + dateFormatted.slice(1);

    const isFullDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;

    if (isFullDay) {
      return `${capitalizedDate} • Dia Inteiro`;
    }

    const startH = String(start.getHours()).padStart(2, '0');
    const startM = String(start.getMinutes()).padStart(2, '0');
    const endH = String(end.getHours()).padStart(2, '0');
    const endM = String(end.getMinutes()).padStart(2, '0');

    return `${capitalizedDate} • ${startH}:${startM} às ${endH}:${endM}`;
  }
}
