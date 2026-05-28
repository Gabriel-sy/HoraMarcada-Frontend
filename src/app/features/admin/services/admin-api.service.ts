import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Store } from '../../booking/models/store.model';
import { Professional } from '../../booking/models/professional.model';
import { Appointment } from '../../booking/models/appointment.model';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl + '/api';

  getStoreByUserId(userId: string): Observable<Store> {
    return this.http.get<Store>(`${this.apiUrl}/stores/user/${userId}`);
  }

  getStoreProfessionals(storeId: string): Observable<Professional[]> {
    return this.http.get<Professional[]>(`${this.apiUrl}/stores/${storeId}/professionals`);
  }

  getAppointments(
    storeId: string,
    start: string,
    end: string,
    professionalId?: string | null
  ): Observable<Appointment[]> {
    let params = new HttpParams()
      .set('StoreId', storeId)
      .set('Start', start)
      .set('End', end);

    if (professionalId) {
      params = params.set('ProfessionalId', professionalId);
    }

    return this.http.get<Appointment[]>(`${this.apiUrl}/appointments`, { params });
  }

  cancelAppointment(appointmentId: string, storeId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/appointments/${appointmentId}/cancel`, { storeId });
  }
}
