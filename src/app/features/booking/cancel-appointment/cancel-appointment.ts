import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BookingApiService } from '../services/booking-api.service';

@Component({
  selector: 'app-cancel-appointment',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cancel-appointment.html',
  styleUrl: './cancel-appointment.css'
})
export class CancelAppointmentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(BookingApiService);

  cancelState = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal<string | null>(null);
  storeSlug = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.cancelAppointment(token);
    } else {
      this.cancelState.set('error');
      this.errorMessage.set('Token de cancelamento inválido ou ausente.');
    }
  }

  private cancelAppointment(token: string): void {
    this.cancelState.set('loading');
    this.apiService.cancelAppointmentByToken({ cancelToken: token }).subscribe({
      next: (res) => {
        this.storeSlug.set(res.storeSlug);
        this.cancelState.set('success');
      },
      error: (err) => {
        let message = 'Ocorreu um erro ao cancelar o agendamento.';
        if (err.error) {
          if (typeof err.error === 'object' && !err.error.detail && !err.error.title) {
            const messages: string[] = [];
            for (const key of Object.keys(err.error)) {
              const val = err.error[key];
              if (Array.isArray(val)) {
                messages.push(...val);
              } else if (typeof val === 'string') {
                messages.push(val);
              }
            }
            if (messages.length > 0) {
              message = messages.join(' ');
            }
          } else {
            message = err.error.detail || err.error.title || message;
          }
        }
        this.errorMessage.set(message);
        this.cancelState.set('error');
      }
    });
  }
}
