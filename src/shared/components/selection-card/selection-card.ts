import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-selection-card',
  standalone: true,
  templateUrl: './selection-card.html'
})
export class SelectionCardComponent {
  selected = input<boolean>(false);
  compact = input<boolean>(false);
  select = output<void>();

  onSelect(): void {
    this.select.emit();
  }
}
