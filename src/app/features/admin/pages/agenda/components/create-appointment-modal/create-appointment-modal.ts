import { Component, input, output, signal, effect, inject, OnDestroy, computed, viewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SelectionCardComponent } from '../../../../../../../shared/components/selection-card/selection-card';
import { InputComponent } from '../../../../../../../shared/components/input/input';
import { ButtonComponent } from '../../../../../../../shared/components/button/button';
import { BookingApiService } from '../../../../../booking/services/booking-api.service';
import { Service } from '../../../../../booking/models/service.model';
import { Professional } from '../../../../../booking/models/professional.model';

@Component({
  selector: 'app-create-appointment-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectionCardComponent,
    InputComponent,
    ButtonComponent
  ],
  templateUrl: './create-appointment-modal.html',
  host: {
    class: 'fixed inset-0 z-100 overflow-hidden transition-[visibility] duration-0 invisible pointer-events-none',
    '[class.invisible]': '!isOpen()',
    '[class.visible]': 'isOpen()',
    '[class.pointer-events-none]': '!isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.delay-300]': '!isOpen()'
  }
})
export class CreateAppointmentModalComponent implements OnDestroy {
  private readonly fb = inject(FormBuilder);
  scrollContainer = viewChild<ElementRef<HTMLDivElement>>('scrollContainer');
  private readonly apiService = inject(BookingApiService);
  private currentSubscription?: Subscription;

  storeId = input.required<string | null>();
  services = input.required<Service[]>();
  professionals = input.required<Professional[]>();
  selectedDate = input.required<Date>();
  isOpen = input.required<boolean>();
  submitting = input<boolean>(false);
  error = input<string | null>(null);
  preselectedProfessionalId = input<string | null>(null);
  preselectedTime = input<string | null>(null);

  confirm = output<{
    customerName: string;
    customerWhatsApp: string;
    customerEmail: string;
    serviceId: string;
    professionalId: string;
    startTime: string;
  }>();
  close = output<void>();

  selectedServiceId = signal<string | null>(null);
  selectedProfessionalId = signal<string | null>(null);
  selectedDateString = signal<string>('');
  selectedTime = signal<string | null>(null);

  slots = signal<string[]>([]);
  loadingSlots = signal<boolean>(false);
  slotsError = signal<string | null>(null);

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    whatsapp: ['', [Validators.required, Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)]],
    email: ['', [Validators.required, Validators.email]]
  });

  filteredProfessionals = computed(() => {
    const svcId = this.selectedServiceId();
    if (!svcId) return [];
    const svc = this.services().find(s => s.id === svcId);
    if (!svc) return [];
    return this.professionals().filter(p => svc.professionalIds.includes(p.id));
  });

  constructor() {
    this.form.get('whatsapp')?.valueChanges.subscribe(value => {
      if (!value) return;
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
        cleaned = cleaned.substring(2);
      }
      let formatted = cleaned;
      if (cleaned.length > 0) {
        if (cleaned.length <= 2) {
          formatted = `(${cleaned}`;
        } else if (cleaned.length <= 6) {
          formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
        } else if (cleaned.length <= 10) {
          formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        } else {
          formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
        }
      }
      if (formatted !== value) {
        this.form.get('whatsapp')?.patchValue(formatted, { emitEvent: false });
      }
    });

    effect(() => {
      const date = this.selectedDate();
      if (date) {
        this.selectedDateString.set(this.formatDateToLocalYYYYMMDD(date));
        this.selectedTime.set(null);
      }
    });

    effect(() => {
      const sId = this.storeId();
      const svcId = this.selectedServiceId();
      const profId = this.selectedProfessionalId();
      const dateStr = this.selectedDateString();

      if (sId && svcId && profId && dateStr) {
        const localDateStr = this.getLocalDateTimeString(dateStr);
        this.loadSlots(sId, svcId, localDateStr, profId);
      } else {
        this.slots.set([]);
      }
    });

    effect(() => {
      const open = this.isOpen();
      if (open) {
        setTimeout(() => {
          const container = this.scrollContainer();
          if (container) {
            container.nativeElement.scrollTop = 0;
          }
        }, 0);
      } else {
        this.resetDrawer();
      }
    });
  }

  ngOnDestroy(): void {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  selectService(service: Service): void {
    this.selectedServiceId.set(service.id);
    this.selectedProfessionalId.set(null);
    this.selectedTime.set(null);
  }

  selectProfessional(professional: Professional): void {
    this.selectedProfessionalId.set(professional.id);
    this.selectedTime.set(null);
  }

  onDateChange(event: Event): void {
    const inputEl = event.target as HTMLInputElement;
    if (inputEl.value) {
      this.selectedDateString.set(inputEl.value);
      this.selectedTime.set(null);
    }
  }

  selectSlot(slot: string): void {
    this.selectedTime.set(slot);
  }

  onSubmit(): void {
    if (this.form.valid && this.selectedServiceId() && this.selectedProfessionalId() && this.selectedTime()) {
      const rawValue = this.form.value;
      const digits = rawValue.whatsapp.replace(/\D/g, '');
      this.confirm.emit({
        customerName: rawValue.name,
        customerWhatsApp: `+55${digits}`,
        customerEmail: rawValue.email,
        serviceId: this.selectedServiceId()!,
        professionalId: this.selectedProfessionalId()!,
        startTime: this.selectedTime()!
      });
    }
  }

  formatTime(dateTimeStr: string): string {
    const dateObj = new Date(dateTimeStr);
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  formatPrice(priceValue: any): string {
    if (priceValue === null || priceValue === undefined) return 'Sob consulta';
    const amount = typeof priceValue === 'object' ? priceValue.amount : priceValue;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  }

  private formatDateToLocalYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getLocalDateTimeString(dateStr: string): string {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day, 0, 0, 0);
    const tzo = -dateObj.getTimezoneOffset();
    const dif = tzo >= 0 ? '+' : '-';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${year}-${pad(month)}-${pad(day)}T00:00:00${dif}${pad(Math.floor(Math.abs(tzo) / 60))}:${pad(Math.abs(tzo) % 60)}`;
  }

  private loadSlots(storeId: string, serviceId: string, date: string, professionalId: string): void {
    if (this.currentSubscription) {
      this.currentSubscription.unsubscribe();
    }
    this.currentSubscription = new Subscription();

    this.loadingSlots.set(true);
    this.slotsError.set(null);
    this.slots.set([]);

    const s = this.apiService.getAvailableSlots(storeId, serviceId, date, professionalId).subscribe({
      next: (res) => {
        this.slots.set(res || []);
        this.loadingSlots.set(false);

        const preTime = this.preselectedTime();
        if (preTime && res) {
          const matchingSlot = res.find(slot => this.formatTime(slot) === preTime);
          if (matchingSlot) {
            this.selectedTime.set(matchingSlot);
          }
        }
      },
      error: () => {
        this.slotsError.set('Não foi possível carregar os horários. Tente novamente.');
        this.loadingSlots.set(false);
      }
    });
    this.currentSubscription.add(s);
  }

  private resetDrawer(): void {
    this.form.reset({
      name: '',
      whatsapp: '',
      email: ''
    });
    this.selectedServiceId.set(null);
    this.selectedProfessionalId.set(this.preselectedProfessionalId() || null);
    this.selectedTime.set(null);
    this.slots.set([]);
    this.slotsError.set(null);
  }
}

