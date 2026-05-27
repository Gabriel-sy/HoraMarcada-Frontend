import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-button',
  standalone: true,
  templateUrl: './button.html'
})
export class ButtonComponent {
  variant = input<'primary' | 'accent' | 'outline' | 'text'>('primary');
  disabled = input<boolean>(false);
  type = input<'button' | 'submit' | 'reset'>('button');

  buttonClass = computed(() => {
    const base = 'w-full py-4 px-6 font-semibold rounded-md text-sm tracking-tight transition-all duration-200 cursor-pointer flex items-center justify-center';
    
    if (this.disabled()) {
      return `${base} bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none`;
    }

    switch (this.variant()) {
      case 'accent':
        return `${base} bg-accent text-text-primary hover:bg-accent-hover active:scale-[0.98]`;
      case 'outline':
        return `${base} bg-transparent border border-border-light text-text-primary hover:border-text-primary active:scale-[0.98]`;
      case 'text':
        return `${base} bg-transparent text-text-secondary hover:text-text-primary active:scale-[0.98]`;
      case 'primary':
      default:
        return `${base} bg-text-primary text-white hover:bg-[#1a1a1a] active:scale-[0.98]`;
    }
  });
}
