import { Component, effect, input, output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Professional } from '../../../../booking/models/professional.model';
import { WeeklyScheduleConfigComponent } from '../weekly-schedule-config/weekly-schedule-config';

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
  selector: 'app-professional-form-drawer',
  standalone: true,
  imports: [NgClass, FormsModule, WeeklyScheduleConfigComponent],
  templateUrl: './professional-form-drawer.html',
  host: {
    class: 'fixed inset-0 z-100 overflow-hidden transition-[visibility] duration-300 invisible pointer-events-none delay-300',
    '[class.invisible]': '!isOpen()',
    '[class.visible]': 'isOpen()',
    '[class.pointer-events-none]': '!isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.delay-300]': '!isOpen()'
  }
})
export class ProfessionalFormDrawerComponent {
  isOpen = input.required<boolean>();
  submitting = input.required<boolean>();
  professional = input<Professional | null>(null);

  close = output<void>();
  save = output<any>();
  deactivate = output<void>();

  formName = signal<string>('');
  formEmail = signal<string>('');
  formWhatsApp = signal<string>('');
  formPhotoUrl = signal<string>('');
  formWeeklyHours = signal<DayHoursConfig[]>([]);
  activeTab = signal<'basic' | 'weekly'>('basic');

  constructor() {
    effect(() => {
      const p = this.professional();
      if (p) {
        this.formName.set(p.name);
        this.formEmail.set(p.email ? p.email.value : '');
        this.formWhatsApp.set(p.whatsApp ? p.whatsApp.value : '');
        this.formPhotoUrl.set(p.photoUrl || '');
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

        if (p.weeklySchedules) {
          p.weeklySchedules.forEach(schedule => {
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
      } else {
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
      }
    }, { allowSignalWrites: true });
  }

  setTab(tab: 'basic' | 'weekly'): void {
    this.activeTab.set(tab);
  }

  onWeeklyHoursChange(hours: DayHoursConfig[]): void {
    this.formWeeklyHours.set(hours);
  }

  onDeactivate(): void {
    this.deactivate.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  submitForm(): void {
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

    this.save.emit(payload);
  }
}
