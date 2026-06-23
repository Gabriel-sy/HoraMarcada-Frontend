import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BookingApiService } from '../services/booking-api.service';

@Component({
  selector: 'app-reschedule-appointment',
  standalone: true,
  templateUrl: './reschedule-appointment.html',
  styleUrl: './reschedule-appointment.css'
})
export class RescheduleAppointmentComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(BookingApiService);

  state = signal<'loading' | 'error'>('loading');
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.state.set('error');
      this.errorMessage.set('Token de reagendamento inválido ou ausente.');
      return;
    }

    this.apiService.cancelAppointmentByToken({ cancelToken: token }).subscribe({
      next: (res) => {
        this.router.navigate(['/', res.storeSlug], {
          state: { rescheduleSuccess: true }
        });
      },
      error: (err) => {
        let message = 'Não foi possível cancelar o agendamento anterior ou ele já foi cancelado.';
        if (err.error) {
          message = err.error.detail || err.error.title || message;
        }
        this.errorMessage.set(message);
        this.state.set('error');
      }
    });
  }
}
