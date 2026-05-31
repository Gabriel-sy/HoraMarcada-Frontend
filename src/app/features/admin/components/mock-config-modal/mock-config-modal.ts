import { Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-mock-config-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mock-config-modal.html'
})
export class MockConfigModalComponent {
  userId = input.required<string>();
  token = input.required<string>();

  save = output<{ userId: string; token: string }>();
  close = output<void>();

  localUserId = signal<string>('');
  localToken = signal<string>('');

  constructor() {
    effect(() => {
      this.localUserId.set(this.userId());
    }, { allowSignalWrites: true });
    effect(() => {
      this.localToken.set(this.token());
    }, { allowSignalWrites: true });
  }

  onSave(): void {
    this.save.emit({
      userId: this.localUserId(),
      token: this.localToken()
    });
  }

  onClose(): void {
    this.close.emit();
  }
}
