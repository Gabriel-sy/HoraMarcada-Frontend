import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthMockService } from '../../../core/auth/auth-mock.service';
import { AdminApiService } from '../services/admin-api.service';
import { Professional } from '../../booking/models/professional.model';
import { TimeBlock } from '../../booking/models/time-block.model';
import { SpinnerComponent } from '../../../../shared/components/spinner/spinner';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state';
import { ProfessionalFormDrawerComponent } from './components/professional-form-drawer/professional-form-drawer';
import { TimeBlockDrawerComponent } from '../components/time-block-drawer/time-block-drawer';

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
  imports: [NgClass, FormsModule, SpinnerComponent, EmptyStateComponent, ProfessionalFormDrawerComponent, TimeBlockDrawerComponent],
  templateUrl: './professionals-mgmt.html',
  styleUrl: './professionals-mgmt.css'
})
export class ProfessionalsMgmtComponent implements OnInit {
  private readonly authService = inject(AuthMockService);
  private readonly adminApiService = inject(AdminApiService);

  readonly storeId = signal<string | null>(null);
  readonly professionals = signal<Professional[]>([]);
  readonly timeBlocks = signal<TimeBlock[]>([]);
  readonly loading = signal<boolean>(false);
  readonly loadingBlocks = signal<boolean>(false);
  readonly submitting = signal<boolean>(false);

  readonly isDrawerOpen = signal<boolean>(false);
  readonly isBlocksDrawerOpen = signal<boolean>(false);
  readonly selectedProfessional = signal<Professional | null>(null);

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
    this.adminApiService.getStoreProfessionals(storeId, false).subscribe({
      next: (profs) => {
        const sorted = [...profs].sort((a, b) => {
          if (a.active !== b.active) {
            return a.active ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        this.professionals.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  openCreateForm(): void {
    this.selectedProfessional.set(null);
    this.isDrawerOpen.set(true);
  }

  openEditForm(professional: Professional): void {
    this.selectedProfessional.set(professional);
    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
  }

  openBlocksForm(professional: Professional): void {
    this.selectedProfessional.set(professional);
    this.handleLoadBlocks(professional.id);
    this.isBlocksDrawerOpen.set(true);
  }

  closeBlocksDrawer(): void {
    this.isBlocksDrawerOpen.set(false);
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

  handleLoadBlocks(professionalId: string): void {
    const sId = this.storeId();
    if (!sId) return;

    this.loadingBlocks.set(true);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 90);

    this.adminApiService.listTimeBlocks(sId, professionalId, start.toISOString(), end.toISOString()).subscribe({
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

  handleCreateTimeBlock(payload: { professionalId: string; date: string; type: 'day' | 'range'; startTime: string; endTime: string }): void {
    const sId = this.storeId();
    if (!sId) return;

    const [year, month, day] = payload.date.split('-').map(Number);
    let startTimeISO: string;
    let endTimeISO: string;

    if (payload.type === 'day') {
      const dateStart = new Date(year, month - 1, day, 0, 0, 0, 0);
      const dateEnd = new Date(year, month - 1, day, 23, 59, 59, 999);
      startTimeISO = dateStart.toISOString();
      endTimeISO = dateEnd.toISOString();
    } else {
      const [startH, startM] = payload.startTime.split(':').map(Number);
      const [endH, endM] = payload.endTime.split(':').map(Number);

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
    this.adminApiService.createTimeBlock(sId, payload.professionalId, {
      startTime: startTimeISO,
      endTime: endTimeISO
    }).subscribe({
      next: () => {
        this.submitting.set(false);
        this.handleLoadBlocks(payload.professionalId);
      },
      error: () => {
        alert('Erro ao criar bloqueio de horário.');
        this.submitting.set(false);
      }
    });
  }

  handleDeleteTimeBlock(event: { blockId: string; professionalId: string }): void {
    const sId = this.storeId();
    if (!sId) return;

    if (confirm('Tem certeza de que deseja remover este bloqueio de horário?')) {
      this.adminApiService.deleteTimeBlock(sId, event.professionalId, event.blockId).subscribe({
        next: () => {
          this.handleLoadBlocks(event.professionalId);
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

  handleSaveProfessional(payload: any): void {
    const sId = this.storeId();
    if (!sId) return;

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
}
