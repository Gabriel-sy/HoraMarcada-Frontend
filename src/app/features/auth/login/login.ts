import { Component, inject, signal, effect } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html'
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    effect(() => {
      if (this.authService.initialized() && this.authService.userId()) {
        this.router.navigate(['/admin']);
      }
    });
  }

  async onSubmit(): Promise<void> {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor, preencha todos os campos.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      await this.authService.signIn(this.email, this.password);
      this.router.navigate(['/admin']);
    } catch (err: any) {
      this.errorMessage.set(
        err.status === 400 
          ? 'Credenciais inválidas. Verifique seu e-mail e senha.' 
          : err.message || 'Erro ao realizar login. Tente novamente.'
      );
    } finally {
      this.loading.set(false);
    }
  }
}
