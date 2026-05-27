import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { BookingApiService } from '../../services/booking-api.service';
import { Service } from '../../models/service.model';
import { SelectionCardComponent } from '../../../../../shared/components/selection-card/selection-card';

@Component({
  selector: 'app-choose-service',
  standalone: true,
  imports: [SelectionCardComponent],
  templateUrl: './choose-service.html',
  styleUrl: './choose-service.css'
})
export class ChooseServiceComponent implements OnInit {
  private readonly apiService = inject(BookingApiService);

  storeId = input.required<string>();
  selectedServiceId = input<string | null>(null);
  selected = output<Service>();

  services = signal<Service[]>([]);
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
