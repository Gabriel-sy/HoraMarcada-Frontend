import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap, of, forkJoin, map } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Store } from '../../booking/models/store.model';
import { Professional } from '../../booking/models/professional.model';
import { Service } from '../../booking/models/service.model';
import { Appointment } from '../../booking/models/appointment.model';
import { TimeBlock } from '../../booking/models/time-block.model';
import { StoreStatisticsResponse } from '../models/statistics.model';
import { AdminApiService } from './admin-api.service';

@Injectable({
  providedIn: 'root'
})
export class AdminStateService {
  private readonly apiService = inject(AdminApiService);

  private readonly _store = signal<Store | null>(null);
  private readonly _services = signal<Service[]>([]);
  private readonly _professionals = signal<Professional[]>([]);
  private readonly _agendaAppointments = signal<Appointment[]>([]);
  private readonly _agendaTimeBlocks = signal<TimeBlock[]>([]);
  private readonly _statistics = signal<StoreStatisticsResponse | null>(null);

  private readonly _loadingStore = signal<boolean>(false);
  private readonly _loadingServices = signal<boolean>(false);
  private readonly _loadingProfessionals = signal<boolean>(false);
  private readonly _loadingAgenda = signal<boolean>(false);
  private readonly _loadingStatistics = signal<boolean>(false);

  private readonly _storeError = signal<string | null>(null);
  private readonly _agendaCacheKey = signal<string | null>(null);
  private readonly _statisticsCacheKey = signal<string | null>(null);

  readonly store = this._store.asReadonly();
  readonly services = this._services.asReadonly();
  readonly professionals = this._professionals.asReadonly();
  readonly agendaAppointments = this._agendaAppointments.asReadonly();
  readonly agendaTimeBlocks = this._agendaTimeBlocks.asReadonly();
  readonly statistics = this._statistics.asReadonly();

  readonly loadingStore = this._loadingStore.asReadonly();
  readonly loadingServices = this._loadingServices.asReadonly();
  readonly loadingProfessionals = this._loadingProfessionals.asReadonly();
  readonly loadingAgenda = this._loadingAgenda.asReadonly();
  readonly loadingStatistics = this._loadingStatistics.asReadonly();

  readonly storeError = this._storeError.asReadonly();

  loadStore(userId: string): Observable<Store> {
    const cached = this._store();
    if (cached) {
      return of(cached);
    }
    this._loadingStore.set(true);
    this._storeError.set(null);
    return this.apiService.getStoreByUserId(userId).pipe(
      tap({
        next: (store) => {
          this._store.set(store);
          this._loadingStore.set(false);
          this.loadServices(store.id).subscribe();
          this.loadProfessionals(store.id).subscribe();
        },
        error: () => {
          this._storeError.set('Não foi possível carregar as informações do estabelecimento.');
          this._loadingStore.set(false);
        }
      })
    );
  }

  loadServices(storeId: string, forceRefresh = false): Observable<Service[]> {
    if (this._services().length > 0 && !forceRefresh) {
      return of(this._services());
    }
    this._loadingServices.set(true);
    return this.apiService.getStoreServices(storeId, false).pipe(
      tap({
        next: (services) => {
          this._services.set(services);
          this._loadingServices.set(false);
        },
        error: () => this._loadingServices.set(false)
      })
    );
  }

  loadProfessionals(storeId: string, forceRefresh = false): Observable<Professional[]> {
    if (this._professionals().length > 0 && !forceRefresh) {
      return of(this._professionals());
    }
    this._loadingProfessionals.set(true);
    return this.apiService.getStoreProfessionals(storeId, false).pipe(
      tap({
        next: (profs) => {
          const sorted = [...profs].sort((a, b) => {
            if (a.active !== b.active) {
              return a.active ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });
          this._professionals.set(sorted);
          this._loadingProfessionals.set(false);
        },
        error: () => this._loadingProfessionals.set(false)
      })
    );
  }

  loadAgenda(
    storeId: string,
    date: Date,
    professionalId: string | null,
    professionalsList: Professional[],
    forceRefresh = false
  ): Observable<{ appointments: Appointment[]; timeBlocks: TimeBlock[] }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    const startISO = startOfDay.toISOString();
    const endISO = endOfDay.toISOString();

    const key = `${storeId}_${startISO}_${professionalId || 'all'}`;
    if (this._agendaCacheKey() === key && !forceRefresh) {
      return of({
        appointments: this._agendaAppointments(),
        timeBlocks: this._agendaTimeBlocks()
      });
    }

    this._loadingAgenda.set(true);

    const appointments$ = this.apiService.getAppointments(storeId, startISO, endISO, professionalId);

    const targetProfs = professionalId
      ? professionalsList.filter(p => p.id === professionalId)
      : professionalsList;

    const blocksRequests = targetProfs.map(p =>
      this.apiService.listTimeBlocks(storeId, p.id, startISO, endISO).pipe(
        catchError(() => of([] as TimeBlock[]))
      )
    );

    const timeBlocks$ = blocksRequests.length > 0
      ? forkJoin(blocksRequests)
      : of([] as TimeBlock[][]);

    return forkJoin({
      appointments: appointments$,
      timeBlocksGrouped: timeBlocks$
    }).pipe(
      map((res) => {
        const sortedAppointments = [...res.appointments].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        const flatBlocks = res.timeBlocksGrouped.reduce((acc, curr) => acc.concat(curr), []);
        const sortedBlocks = flatBlocks.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        return {
          appointments: sortedAppointments,
          timeBlocks: sortedBlocks
        };
      }),
      tap({
        next: (res) => {
          this._agendaAppointments.set(res.appointments);
          this._agendaTimeBlocks.set(res.timeBlocks);
          this._agendaCacheKey.set(key);
          this._loadingAgenda.set(false);
        },
        error: () => {
          this._loadingAgenda.set(false);
        }
      })
    );
  }

  loadStatistics(storeId: string, presetDays: number, forceRefresh = false): Observable<StoreStatisticsResponse> {
    const key = `${storeId}_${presetDays}`;
    if (this._statisticsCacheKey() === key && this._statistics() && !forceRefresh) {
      return of(this._statistics()!);
    }

    this._loadingStatistics.set(true);

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - presetDays + 1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return this.apiService.getStoreStatistics(storeId, start.toISOString(), end.toISOString()).pipe(
      tap({
        next: (stats) => {
          this._statistics.set(stats);
          this._statisticsCacheKey.set(key);
          this._loadingStatistics.set(false);
        },
        error: () => {
          this._loadingStatistics.set(false);
        }
      })
    );
  }

  refreshServices(storeId: string): Observable<Service[]> {
    return this.loadServices(storeId, true);
  }

  refreshProfessionals(storeId: string): Observable<Professional[]> {
    return this.loadProfessionals(storeId, true);
  }

  clearCache(): void {
    this._store.set(null);
    this._services.set([]);
    this._professionals.set([]);
    this._agendaAppointments.set([]);
    this._agendaTimeBlocks.set([]);
    this._statistics.set(null);
    this._agendaCacheKey.set(null);
    this._statisticsCacheKey.set(null);
  }
}
