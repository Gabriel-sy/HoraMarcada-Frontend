import { Component, input } from '@angular/core';

@Component({
  selector: 'app-labelled-group',
  standalone: true,
  templateUrl: './labelled-group.html',
})
export class LabelledGroupComponent {
  label = input.required<string>();
  labelClass = input('text-sm text-text-secondary mb-2');
  contentClass = input<string>('');
}
