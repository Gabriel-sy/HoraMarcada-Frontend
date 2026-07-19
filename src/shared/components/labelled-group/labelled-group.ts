import { Component, input } from '@angular/core';

@Component({
  selector: 'app-labelled-group',
  standalone: true,
  templateUrl: './labelled-group.html',
})
export class LabelledGroupComponent {
  label = input.required<string>();
  contentClass = input<string>('');
}
