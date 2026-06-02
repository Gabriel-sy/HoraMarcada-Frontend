import { Component, input, output } from '@angular/core';
import { Appointment } from '../../../../../booking/models/appointment.model';
import { Service } from '../../../../../booking/models/service.model';
import { Professional } from '../../../../../booking/models/professional.model';

@Component({
  selector: 'app-cancel-appointment-drawer',
  standalone: true,
  imports: [],
  templateUrl: './cancel-appointment-drawer.html',
  host: {
    class: 'fixed inset-0 z-100 overflow-hidden transition-[visibility] duration-300 invisible pointer-events-none delay-300',
    '[class.invisible]': '!isOpen()',
    '[class.visible]': 'isOpen()',
    '[class.pointer-events-none]': '!isOpen()',
    '[class.pointer-events-auto]': 'isOpen()',
    '[class.delay-300]': '!isOpen()'
  }
})
export class CancelAppointmentDrawerComponent {
  appointment = input.required<Appointment | null>();
  services = input.required<Service[]>();
  professionals = input.required<Professional[]>();
  canceling = input.required<boolean>();
  isOpen = input.required<boolean>();
  cancelError = input<string | null>(null);

  confirm = output<void>();
  close = output<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onClose(): void {
    this.close.emit();
  }

  getServiceName(svcId: string): string {
    const svc = this.services().find(s => s.id === svcId);
    return svc ? svc.name : 'Serviço';
  }

  getProfessionalName(profId: string): string {
    const prof = this.professionals().find(p => p.id === profId);
    return prof ? prof.name : 'Profissional';
  }

  getService(svcId: string): Service | undefined {
    return this.services().find(s => s.id === svcId);
  }

  formatTime(isoString: string): string {
    const d = new Date(isoString);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  formatPrice(priceValue: any): string {
    if (priceValue === null || priceValue === undefined) return 'Sob consulta';
    const amount = typeof priceValue === 'object' ? priceValue.amount : priceValue;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  }
}
