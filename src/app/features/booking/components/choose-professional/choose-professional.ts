import { Component, inject, input, output, signal, effect } from '@angular/core';
import { BookingApiService } from '../../services/booking-api.service';
import { Professional } from '../../models/professional.model';
import { SelectionCardComponent } from '../../../../../shared/components/selection-card/selection-card';

@Component({
  selector: 'app-choose-professional',
  standalone: true,
  imports: [SelectionCardComponent],
  templateUrl: './choose-professional.html',
  styleUrl: './choose-professional.css'
})
export class ChooseProfessionalComponent {
  private readonly apiService = inject(BookingApiService);

  storeId = input.required<string>();
  serviceId = input<string | null>(null);
  selectedProfessionalId = input<string | null>(null);
  selected = output<Professional | { id: 'any', name: string }>();

  professionals = signal<Professional[]>([]);
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  constructor() {
    effect(() => {
      const sId = this.storeId();
      const svcId = this.serviceId();
      if (sId && svcId) {
        this.loadProfessionals(sId, svcId);
      } else {
        this.professionals.set([]);
        this.loading.set(false);
      }
    });
  }

  retryLoad(): void {
    const sId = this.storeId();
    const svcId = this.serviceId();
    if (sId && svcId) {
      this.loadProfessionals(sId, svcId);
    }
  }

  selectProfessional(professional: Professional | { id: 'any', name: string }): void {
    this.selected.emit(professional);
  }

  private loadProfessionals(storeId: string, serviceId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.apiService.getServiceProfessionals(storeId, serviceId).subscribe({
      next: (res) => {
        this.professionals.set(res || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os profissionais. Tente novamente.');
        this.loading.set(false);
      }
    });
  }
}
