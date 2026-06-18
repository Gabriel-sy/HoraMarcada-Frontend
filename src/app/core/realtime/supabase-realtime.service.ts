import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { AuthService } from '../auth/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseRealtimeService {
  private readonly authService = inject(AuthService);

  watchAppointments(storeId: string): Observable<RealtimePostgresChangesPayload<{ [key: string]: unknown }>> {
    return new Observable(subscriber => {
      const channel = this.authService.client
        .channel(`appointments:store_id=eq.${storeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'appointments',
            filter: `store_id=eq.${storeId}`
          },
          payload => subscriber.next(payload)
        )
        .subscribe();

      return () => {
        this.authService.client.removeChannel(channel);
      };
    });
  }
}
