import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  isLeaving?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3000): void {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = { id, message, type };
    this.toasts.update(current => [...current, newToast]);

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  warning(message: string, duration?: number): void {
    this.show(message, 'warning', duration);
  }

  remove(id: string): void {
    const toast = this.toasts().find(t => t.id === id);
    if (!toast || toast.isLeaving) return;

    this.toasts.update(current =>
      current.map(t => t.id === id ? { ...t, isLeaving: true } : t)
    );
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t.id !== id));
    }, 350);
  }
}
