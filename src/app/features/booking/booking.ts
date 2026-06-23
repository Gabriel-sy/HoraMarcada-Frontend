import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookingApiService } from './services/booking-api.service';
import { Store } from './models/store.model';
import { NgClass } from '@angular/common';
import { ChooseServiceComponent } from './components/choose-service/choose-service';
import { ChooseProfessionalComponent } from './components/choose-professional/choose-professional';
import { ChooseTimeComponent } from './components/choose-time/choose-time';
import { CustomerFormComponent } from './components/customer-form/customer-form';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [NgClass, ChooseServiceComponent, ChooseProfessionalComponent, ChooseTimeComponent, CustomerFormComponent],
  templateUrl: './booking.html',
  styleUrl: './booking.css'
})
export class BookingComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(BookingApiService);
  private readonly sanitizer = inject(DomSanitizer);

  slug = signal<string>('');
  store = signal<Store | null>(null);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);
  rescheduleMessage = signal<string | null>(null);

  mapUrl = computed(() => {
    const s = this.store();
    if (s?.addressLat && s?.addressLng) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(
        `https://www.google.com/maps?q=${s.addressLat},${s.addressLng}&z=15&output=embed`
      );
    }
    return null;
  });

  currentStep = signal<number>(1);
  isTransitioningOut = signal<boolean>(false);
  transitionClass = signal<string>('[animation:var(--animate-slide-in-right)]');

  selectedService = signal<any>(null);
  selectedProfessional = signal<any>(null);
  selectedDate = signal<string | null>(null);
  selectedTime = signal<string | null>(null);
  assignedProfessional = signal<any>(null);
  bookingSuccess = signal<boolean>(false);
  createdAppointment = signal<any>(null);
  submitting = signal<boolean>(false);
  formError = signal<string | null>(null);

  ngOnInit(): void {
    const navigationState = history.state as { rescheduleSuccess?: boolean };
    if (navigationState?.rescheduleSuccess) {
      this.rescheduleMessage.set('Agendamento anterior cancelado. Escolha um novo horário abaixo!');
    }

    this.route.paramMap.subscribe(params => {
      const slugVal = params.get('slug');
      if (slugVal) {
        this.slug.set(slugVal);
        this.loadStoreBySlug(slugVal);
      }
    });
  }

  private loadStoreBySlug(slug: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.apiService.getStoreBySlug(slug).subscribe({
      next: (res) => {
        this.store.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Estabelecimento não encontrado.');
        this.loading.set(false);
      }
    });
  }

  goBack(): void {
    if (this.currentStep() > 1) {
      this.isTransitioningOut.set(true);
      this.transitionClass.set('[animation:var(--animate-slide-out-right)]');
      setTimeout(() => {
        this.currentStep.update(s => s - 1);
        this.transitionClass.set('[animation:var(--animate-slide-in-left)]');
        this.isTransitioningOut.set(false);
      }, 350);
    }
  }

  goForward(): void {
    if (this.currentStep() < 4) {
      this.isTransitioningOut.set(true);
      this.transitionClass.set('[animation:var(--animate-slide-out-left)]');
      setTimeout(() => {
        this.currentStep.update(s => s + 1);
        this.transitionClass.set('[animation:var(--animate-slide-in-right)]');
        this.isTransitioningOut.set(false);
      }, 350);
    }
  }

  onServiceSelected(service: any): void {
    this.selectedService.set(service);
    this.goForward();
  }

  onProfessionalSelected(professional: any): void {
    this.selectedProfessional.set(professional);
    this.goForward();
  }

  onTimeSelected(timeData: { date: string, time: string, professionalId: string, professionalName: string }): void {
    this.selectedDate.set(timeData.date);
    this.selectedTime.set(timeData.time);
    this.assignedProfessional.set({ id: timeData.professionalId, name: timeData.professionalName });
    this.goForward();
  }

  onFormSubmitted(customerData: { name: string, whatsapp: string }): void {
    this.submitting.set(true);
    this.formError.set(null);

    const profId = this.selectedProfessional()?.id === 'any'
      ? this.assignedProfessional()?.id
      : this.selectedProfessional()?.id;

    const input = {
      storeId: this.store()!.id,
      professionalId: profId,
      serviceId: this.selectedService()!.id,
      customerName: customerData.name,
      customerWhatsApp: customerData.whatsapp,
      startTime: this.selectedTime()!
    };

    this.apiService.bookAppointment(input).subscribe({
      next: (res) => {
        this.createdAppointment.set(res);
        this.bookingSuccess.set(true);
        this.submitting.set(false);
      },
      error: (err) => {
        const message = err.error?.detail || err.error?.title || 'Ocorreu um erro ao realizar o agendamento. Verifique se o horário ainda está disponível.';
        this.formError.set(message);
        this.submitting.set(false);
      }
    });
  }

  getBookingSummary() {
    const svc = this.selectedService();
    const prof = this.selectedProfessional();
    const dateVal = this.selectedDate();
    const timeVal = this.selectedTime();

    if (!svc || !dateVal || !timeVal) {
      return { serviceName: '', professionalName: '', date: '', time: '' };
    }

    const profName = prof?.id === 'any'
      ? 'Qualquer profissional'
      : (prof?.name || '');

    const [year, month, day] = dateVal.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = dateObj.toLocaleDateString('pt-BR', options);
    const capitalizedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

    const formattedTime = timeVal.split('T')[1]?.substring(0, 5) || '';

    return {
      serviceName: svc.name,
      servicePrice: svc.price?.amount?.toFixed(2),
      professionalName: profName,
      date: capitalizedDate,
      time: formattedTime
    };
  }

  resetFlow(): void {
    this.currentStep.set(1);
    this.selectedService.set(null);
    this.selectedProfessional.set(null);
    this.selectedDate.set(null);
    this.selectedTime.set(null);
    this.assignedProfessional.set(null);
    this.createdAppointment.set(null);
    this.bookingSuccess.set(false);
    this.formError.set(null);
  }
}
