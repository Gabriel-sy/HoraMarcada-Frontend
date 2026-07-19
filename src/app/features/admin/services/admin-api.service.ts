import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Store } from '../../booking/models/store.model';
import { Professional } from '../../booking/models/professional.model';
import { Appointment } from '../../booking/models/appointment.model';
import { Service } from '../../booking/models/service.model';
import { Category } from '../../booking/models/category.model';
import { TimeBlock } from '../../booking/models/time-block.model';
import { StoreStatisticsResponse } from '../models/statistics.model';
import { CustomerListDto, CustomerDetailDto, UpdateCustomerInput, PagedResult } from '../../booking/models/customer.model';
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

  getStoreProfessionals(storeId: string, activeOnly = true): Observable<Professional[]> {
    return this.http.get<Professional[]>(`${this.apiUrl}/stores/${storeId}/professionals`, {
      params: new HttpParams().set('activeOnly', activeOnly.toString())
    });
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

  getAppointmentById(appointmentId: string, storeId: string): Observable<Appointment> {
    return this.http.get<Appointment>(`${this.apiUrl}/appointments/${appointmentId}`, {
      params: new HttpParams().set('storeId', storeId)
    });
  }

  getStoreServices(storeId: string, activeOnly = false): Observable<Service[]> {
    return this.http.get<Service[]>(`${this.apiUrl}/stores/${storeId}/services`, {
      params: new HttpParams().set('activeOnly', activeOnly.toString())
    });
  }

  getStoreCategories(storeId: string): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.apiUrl}/stores/${storeId}/categories`);
  }

  createCategory(storeId: string, name: string): Observable<Category> {
    return this.http.post<Category>(`${this.apiUrl}/stores/${storeId}/categories`, { name });
  }

  addService(storeId: string, input: { name: string; durationMinutes: number; categoryId: string; price?: number | null; professionalIds: string[] }): Observable<Service> {
    return this.http.post<Service>(`${this.apiUrl}/stores/${storeId}/services`, input);
  }

  updateService(storeId: string, serviceId: string, input: { name: string; durationMinutes: number; price?: number | null; active: boolean; professionalIds: string[] }): Observable<Service> {
    return this.http.put<Service>(`${this.apiUrl}/stores/${storeId}/services/${serviceId}`, input);
  }

  deleteService(storeId: string, serviceId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stores/${storeId}/services/${serviceId}`);
  }

  addProfessional(storeId: string, input: any): Observable<Professional> {
    return this.http.post<Professional>(`${this.apiUrl}/stores/${storeId}/professionals`, input);
  }

  updateProfessional(storeId: string, professionalId: string, input: any): Observable<Professional> {
    return this.http.put<Professional>(`${this.apiUrl}/stores/${storeId}/professionals/${professionalId}`, input);
  }

  deactivateProfessional(storeId: string, professionalId: string): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/stores/${storeId}/professionals/${professionalId}/deactivate`, {});
  }

  listTimeBlocks(storeId: string, professionalId: string, start: string, end: string): Observable<TimeBlock[]> {
    const params = new HttpParams()
      .set('start', start)
      .set('end', end);
    return this.http.get<TimeBlock[]>(`${this.apiUrl}/stores/${storeId}/professionals/${professionalId}/blocks`, { params });
  }

  createTimeBlock(storeId: string, professionalId: string, input: { startTime: string; endTime: string }): Observable<TimeBlock> {
    return this.http.post<TimeBlock>(`${this.apiUrl}/stores/${storeId}/professionals/${professionalId}/blocks`, input);
  }

  deleteTimeBlock(storeId: string, professionalId: string, blockId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/stores/${storeId}/professionals/${professionalId}/blocks/${blockId}`);
  }

  getStoreStatistics(storeId: string, startDate?: string, endDate?: string): Observable<StoreStatisticsResponse> {
    let params = new HttpParams();
    if (startDate) {
      params = params.set('startDate', startDate);
    }
    if (endDate) {
      params = params.set('endDate', endDate);
    }
    return this.http.get<StoreStatisticsResponse>(`${this.apiUrl}/stores/${storeId}/statistics`, { params });
  }

  getCustomers(
    storeId: string,
    search?: string | null,
    page = 1,
    pageSize = 10
  ): Observable<PagedResult<CustomerListDto>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (search) {
      params = params.set('search', search);
    }

    return this.http.get<PagedResult<CustomerListDto>>(`${this.apiUrl}/stores/${storeId}/customers`, { params });
  }

  getCustomerDetails(storeId: string, customerId: string): Observable<CustomerDetailDto> {
    return this.http.get<CustomerDetailDto>(`${this.apiUrl}/stores/${storeId}/customers/${customerId}`);
  }

  updateCustomer(storeId: string, customerId: string, input: UpdateCustomerInput): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/stores/${storeId}/customers/${customerId}`, input);
  }
}
