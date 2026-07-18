import { Component, DestroyRef, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { InputComponent } from '../../../../../shared/components/input/input';
import { ConfirmButtonFillController, ConfirmFillPhase } from './confirm-button-fill';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputComponent],
  templateUrl: './customer-form.html',
  styleUrl: './customer-form.css'
})
export class CustomerFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly fillController = new ConfirmButtonFillController();
  private wasLoading = false;

  summary = input.required<{
    serviceName: string;
    servicePrice?: string;
    professionalName: string;
    date: string;
    time: string;
  }>();

  loading = input<boolean>(false);
  succeeded = input<boolean>(false);
  submitted = output<{ name: string; whatsapp: string }>();
  confirmationReady = output<void>();

  fillPercent = signal(0);
  phase = signal<ConfirmFillPhase>('idle');

  form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    whatsapp: ['', [Validators.required, Validators.pattern(/^\(\d{2}\) \d{4,5}-\d{4}$/)]]
  });

  constructor() {
    this.fillController.onProgress = (percent) => this.fillPercent.set(percent);
    this.fillController.onPhaseChange = (phase) => this.phase.set(phase);
    this.fillController.onReady = () => this.confirmationReady.emit();

    inject(DestroyRef).onDestroy(() => this.fillController.destroy());

    effect(() => {
      const loading = this.loading();
      const succeeded = this.succeeded();

      untracked(() => {
        if (loading && !this.wasLoading) {
          this.fillController.start();
        }

        if (succeeded) {
          this.fillController.markSucceeded();
        }

        if (!loading && this.wasLoading && !succeeded) {
          this.fillController.fail();
        }

        this.wasLoading = loading;
      });
    });

    this.form.get('whatsapp')?.valueChanges.subscribe(value => {
      if (!value) return;
      let cleaned = value.replace(/\D/g, '');
      if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
        cleaned = cleaned.substring(2);
      }
      let formatted = cleaned;
      if (cleaned.length > 0) {
        if (cleaned.length <= 2) {
          formatted = `(${cleaned}`;
        } else if (cleaned.length <= 6) {
          formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2)}`;
        } else if (cleaned.length <= 10) {
          formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
        } else {
          formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
        }
      }
      if (formatted !== value) {
        this.form.get('whatsapp')?.patchValue(formatted, { emitEvent: false });
      }
    });
  }

  isBusy(): boolean {
    return this.phase() === 'filling' || this.phase() === 'success';
  }

  onSubmit(): void {
    if (this.form.valid && !this.isBusy()) {
      const rawValue = this.form.value;
      const digits = rawValue.whatsapp.replace(/\D/g, '');
      this.submitted.emit({
        ...rawValue,
        whatsapp: `+55${digits}`
      });
    }
  }
}
