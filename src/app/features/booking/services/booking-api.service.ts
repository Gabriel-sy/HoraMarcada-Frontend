import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Service } from '../models/service.model';
import { Professional } from '../models/professional.model';
import { Appointment } from '../models/appointment.model';
import { Store } from '../models/store.model';
import { BookAppointmentInput } from '../models/dtos/book-appointment.input';
import { CancelAppointmentByTokenInput } from '../models/dtos/cancel-appointment-by-token.input';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl +'/api';

  getStoreByUserId(userId: string): Observable<Store> {
    return this.http.get<Store>(`${this.apiUrl}/stores/user/${userId}`);
  }

  getStoreBySlug(slug: string): Observable<Store> {
    return this.http.get<Store>(`${this.apiUrl}/stores/slug/${slug}`);
  }

  getStoreServices(storeId: string): Observable<Service[]> {
    const params = new HttpParams().set('activeOnly', 'true');
    return this.http.get<Service[]>(`${this.apiUrl}/stores/${storeId}/services`, { params });
  }

  getServiceProfessionals(storeId: string, serviceId: string): Observable<Professional[]> {
    return this.http.get<Professional[]>(`${this.apiUrl}/stores/${storeId}/services/${serviceId}/professionals`);
  }

  getAvailableSlots(
    storeId: string, 
    serviceId: string, 
    date: string, 
    professionalId?: string
  ): Observable<string[]> {
    let params = new HttpParams()
      .set('ServiceId', serviceId)
      .set('Date', date);
    
    if (professionalId) {
      params = params.set('ProfessionalId', professionalId);
    }

    return this.http.get<string[]>(`${this.apiUrl}/stores/${storeId}/availability`, { params });
  }

  bookAppointment(input: BookAppointmentInput): Observable<Appointment> {
    return this.http.post<Appointment>(`${this.apiUrl}/appointments`, input);
  }

  cancelAppointmentByToken(input: CancelAppointmentByTokenInput): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/appointments/cancel-by-token`, input);
  }

  confirmAppointmentByToken(cancelToken: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/appointments/confirm-by-token`, { cancelToken });
  }
}
