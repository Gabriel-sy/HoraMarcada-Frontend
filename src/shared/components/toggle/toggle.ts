import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-toggle',
  standalone: true,
  templateUrl: './toggle.html'
})
export class ToggleComponent {
  checked = model(false);
  disabled = input(false);

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.checked.update(value => !value);
  }
}
