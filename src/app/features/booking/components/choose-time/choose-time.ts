import { Component, computed, inject, input, output, signal, effect, OnDestroy } from '@angular/core';
import { BookingApiService } from '../../services/booking-api.service';
import { LabelledGroupComponent } from '../../../../../shared/components/labelled-group/labelled-group';
import { forkJoin, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

interface DateOption {
  dateString: string;
  dayName: string;
  dayNumber: string;
  monthName: string;
  fullDate: Date;
}

interface PeriodGroup {
  key: string;
  label: string;
  slots: string[];
}

@Component({
  selector: 'app-choose-time',
  standalone: true,
  imports: [LabelledGroupComponent],
  templateUrl: './choose-time.html',
  styleUrl: './choose-time.css'
})
export class ChooseTimeComponent implements OnDestroy {
  private readonly apiService = inject(BookingApiService);
  private currentSubscription?: Subscription;

  storeId = input.required<string>();
  serviceId = input<string | null>(null);
  selectedProfessional = input<any>(null);
  selectedTime = input<string | null>(null);
  selected = output<{ date: string, time: string, professionalId: string, professionalName: string }>();

  dateOptions = signal<DateOption[]>([]);
  selectedDateString = signal<string>('');
  slots = signal<string[]>([]);
  slotsData = signal<{ slot: string, professionalId: string, professionalName: string }[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  showLeftArrow = signal<boolean>(false);

  periodGroups = computed<PeriodGroup[]>(() => {
    const groups: PeriodGroup[] = [
      { key: 'manha', label: 'Manhã', slots: [] },
      { key: 'tarde', label: 'Tarde', slots: [] },
      { key: 'noite', label: 'Noite', slots: [] },
    ];

    for (const slot of this.slots()) {
      const hour = new Date(slot).getHours();
      if (hour < 12) {
        groups[0].slots.push(slot);
      } else if (hour < 18) {
        groups[1].slots.push(slot);
      } else {
        groups[2].slots.push(slot);
      }
    }

    return groups.filter(group => group.slots.length > 0);
  });

  constructor() {
    const dates = this.generateDateOptions();
    this.dateOptions.set(dates);
    if (dates.length > 0) {
      this.selectedDateString.set(dates[0].dateString);
    }

    effect(() => {
      const sId = this.storeId();
      const svcId = this.serviceId();
      const prof = this.selectedProfessional();
      const dateStr = this.selectedDateString();

      if (sId && svcId && dateStr) {
        const localDateStr = this.getLocalDateTimeString(dateStr);
        this.loadSlots(sId, svcId, localDateStr, prof);
      }
    });
  }

  retryLoad(): void {
    const sId = this.storeId();
    const svcId = this.serviceId();
    const prof = this.selectedProfessional();
    const dateStr = this.selectedDateString();

    if (sId && svcId && dateStr) {
      const localDateStr = this.getLocalDateTimeString(dateStr);
      this.loadSlots(sId, svcId, localDateStr, prof);
    }
  }

  selectDate(option: DateOption, smooth = true): void {
    this.selectedDateString.set(option.dateString);
    setTimeout(() => {
      const el = document.getElementById(`date-pill-${option.dateString}`);
      if (el) {
        el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
      }
    }, 50);
  }

  selectTime(slot: string): void {
    const data = this.slotsData().find(s => s.slot === slot);
    if (data) {
      this.selected.emit({
        date: this.selectedDateString(),
        time: slot,
        professionalId: data.professionalId,
        professionalName: data.professionalName
      });
    }
  }

  scrollCarousel(container: HTMLDivElement, direction: number): void {
    const firstChild = container.firstElementChild as HTMLElement;
    if (firstChild) {
      const itemWidth = firstChild.offsetWidth;
      const gap = 12;
      const scrollAmount = (itemWidth + gap) * direction;
      container.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    } else {
      container.scrollBy({
        left: 84 * direction,
        behavior: 'smooth'
      });
    }
  }

  onScroll(container: HTMLDivElement): void {
    this.showLeftArrow.set(container.scrollLeft > 5);
  }

  formatTime(dateTimeStr: string): string {
    const dateObj = new Date(dateTimeStr);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  private getLocalDateTimeString(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, 0, 0, 0);
    const tzo = -dateObj.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T00:00:00${dif}${pad(Math.floor(Math.abs(tzo) / 60))}:${pad(Math.abs(tzo) % 60)}`;
  }

  private generateDateOptions(): DateOption[] {
    const options: DateOption[] = [];
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      let dayName = '';
      if (i === 0) {
        dayName = 'Hoje';
      } else if (i === 1) {
        dayName = 'Amanhã';
      } else {
        const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        dayName = weekdays[d.getDay()];
      }

      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthName = months[d.getMonth()];

      options.push({
        dateString,
        dayName,
        dayNumber: String(d.getDate()),
        monthName,
        fullDate: d
      });
    }
    return options;
  }

  ngOnDestroy(): void {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
  }

  private loadSlots(storeId: string, serviceId: string, date: string, professional: any): void {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
    this.currentSubscription = new Subscription();

    this.loading.set(true);
    this.error.set(null);
    this.slots.set([]);
    this.slotsData.set([]);

    if (professional && professional.id !== 'any') {
      const s = this.apiService.getAvailableSlots(storeId, serviceId, date, professional.id).subscribe({
        next: (res) => {
          const mapped = (res || []).map(slot => ({
            slot,
            professionalId: professional.id,
            professionalName: professional.name
          }));
          this.slotsData.set(mapped);
          this.slots.set(mapped.map(item => item.slot));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Não foi possível carregar os horários. Tente novamente.');
          this.loading.set(false);
        }
      });
      this.currentSubscription.add(s);
    } else {
      const s = this.apiService.getServiceProfessionals(storeId, serviceId).subscribe({
        next: (professionals) => {
          if (!professionals || professionals.length === 0) {
            this.loading.set(false);
            return;
          }

          const requests = professionals.map(p =>
            this.apiService.getAvailableSlots(storeId, serviceId, date, p.id).pipe(
              map(slots => (slots || []).map(slot => ({
                slot,
                professionalId: p.id,
                professionalName: p.name
              })))
            )
          );

          const s2 = forkJoin(requests).subscribe({
            next: (results) => {
              const mergedMap = new Map<string, { slot: string, professionalId: string, professionalName: string }>();
              for (const resList of results) {
                for (const item of resList) {
                  if (!mergedMap.has(item.slot)) {
                    mergedMap.set(item.slot, item);
                  }
                }
              }
              const sorted = Array.from(mergedMap.values()).sort((a, b) => a.slot.localeCompare(b.slot));
              this.slotsData.set(sorted);
              this.slots.set(sorted.map(item => item.slot));
              this.loading.set(false);
            },
            error: () => {
              this.error.set('Não foi possível carregar os horários. Tente novamente.');
              this.loading.set(false);
            }
          });
          this.currentSubscription?.add(s2);
        },
        error: () => {
          this.error.set('Não foi possível carregar os horários. Tente novamente.');
          this.loading.set(false);
        }
      });
      this.currentSubscription.add(s);
    }
  }
}
