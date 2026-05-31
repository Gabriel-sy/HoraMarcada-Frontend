import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  templateUrl: './empty-state.html'
})
export class EmptyStateComponent {
  message = input.required<string>();
  iconType = input<'services' | 'professionals' | 'agenda'>('services');
  actionLabel = input<string | null>(null);
  card = input<boolean>(true);

  action = output<void>();

  onAction(): void {
    this.action.emit();
  }
}
