import { Component, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-mobile-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './admin-mobile-nav.html',
  host: {
    class: 'flex md:hidden fixed bottom-0 left-0 w-full h-16 bg-white border-t border-border-light z-50'
  }
})
export class AdminMobileNavComponent {
  logout = output<void>();

  onLogout(): void {
    this.logout.emit();
  }
}
