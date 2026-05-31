import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Store } from '../../../booking/models/store.model';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.html',
  host: {
    class: 'hidden md:flex md:w-60 md:flex-col md:shrink-0 md:border-r md:border-border-light bg-white'
  }
})
export class AdminSidebarComponent {
  store = input<Store | null>(null);

  logout = output<void>();

  onLogout(): void {
    this.logout.emit();
  }
}
