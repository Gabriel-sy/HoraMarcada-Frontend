import { Component, input } from '@angular/core';

@Component({
  selector: 'app-spinner',
  standalone: true,
  templateUrl: './spinner.html'
})
export class SpinnerComponent {
  containerClass = input<string>('flex justify-center items-center py-12');
}
