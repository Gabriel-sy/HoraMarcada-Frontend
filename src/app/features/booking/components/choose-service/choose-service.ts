import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { BookingApiService } from '../../services/booking-api.service';
import { Service } from '../../models/service.model';
import { groupActiveServicesByCategory } from '../../group-services-by-category';
import { LabelledGroupComponent } from '../../../../../shared/components/labelled-group/labelled-group';
import { SelectionCardComponent } from '../../../../../shared/components/selection-card/selection-card';

@Component({
  selector: 'app-choose-service',
  standalone: true,
  imports: [LabelledGroupComponent, SelectionCardComponent],
  templateUrl: './choose-service.html',
  styleUrl: './choose-service.css'
})
export class ChooseServiceComponent implements OnInit {
  private readonly apiService = inject(BookingApiService);

  storeId = input.required<string>();
  selectedServiceId = input<string | null>(null);
  selected = output<Service>();

  services = signal<Service[]>([]);
  serviceGroups = computed(() => groupActiveServicesByCategory(this.services()));
  loading = signal<boolean>(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.storeId();
    if (id) {
      this.loadServices(id);
    }
  }

  retryLoad(): void {
    const id = this.storeId();
    if (id) {
      this.loadServices(id);
    }
  }

  selectService(service: Service): void {
    this.selected.emit(service);
  }

  formatPrice(price: number | null | undefined): string {
    if (price == null) return '';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
  }

  private loadServices(storeId: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.apiService.getStoreServices(storeId).subscribe({
      next: (res) => {
        this.services.set(res || []);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar os serviços. Tente novamente.');
        this.loading.set(false);
      }
    });
  }
}
