import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BookingApiService } from '../services/booking-api.service';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-confirm-presence',
  standalone: true,
  imports: [NgIf],
  templateUrl: './confirm-presence.html',
  styleUrl: './confirm-presence.css'
})
export class ConfirmPresenceComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(BookingApiService);

  confirmState = signal<'loading' | 'success' | 'error'>('loading');
  errorMessage = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (token) {
      this.confirmPresence(token);
    } else {
      this.confirmState.set('error');
      this.errorMessage.set('Token de confirmação inválido ou ausente.');
    }
  }

  private confirmPresence(token: string): void {
    this.confirmState.set('loading');
    this.apiService.confirmAppointmentByToken(token).subscribe({
      next: () => {
        this.confirmState.set('success');
      },
      error: (err) => {
        this.confirmState.set('error');
        this.errorMessage.set(
          err.error?.detail || err.error?.title || 'Ocorreu um erro ao confirmar sua presença. Verifique se o agendamento ainda está ativo.'
        );
      }
    });
  }
}
