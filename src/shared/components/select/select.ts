import { Component, ElementRef, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-select',
  standalone: true,
  templateUrl: './select.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true
    }
  ],
  host: {
    'class': 'relative block w-full',
    '(document:click)': 'onClickOutside($event)',
    '(keydown)': 'onKeyDown($event)'
  }
})
export class SelectComponent implements ControlValueAccessor {
  label = input.required<string>();
  id = input.required<string>();
  options = input.required<any[]>();
  bindLabel = input<string>('label');
  bindValue = input<string>('value');
  placeholder = input<string>('');
  maxHeight = input<string>('50');

  value = signal<any>(null);
  disabled = signal<boolean>(false);
  isOpen = signal<boolean>(false);
  dropdownAnimated = signal<boolean>(false);
  focusedOptionIndex = signal<number>(-1);

  dropdownMaxHeight = computed(() => `${Number(this.maxHeight()) * 0.25}rem`);

  onChange: any = () => {};
  onTouch: any = () => {};

  constructor(private elementRef: ElementRef) {}

  getOptionLabel(option: any): string {
    if (option === null || option === undefined) {
      return '';
    }
    if (typeof option === 'object') {
      const key = this.bindLabel();
      return option[key] !== undefined ? option[key] : String(option);
    }
    return String(option);
  }

  getOptionValue(option: any): any {
    if (option === null || option === undefined) {
      return null;
    }
    if (typeof option === 'object') {
      const key = this.bindValue();
      return option[key] !== undefined ? option[key] : option;
    }
    return option;
  }

  selectedOptionLabel = computed(() => {
    const val = this.value();
    if (val === null || val === undefined || val === '') {
      return '';
    }
    const found = this.options().find(opt => this.getOptionValue(opt) === val);
    return found ? this.getOptionLabel(found) : '';
  });

  toggleDropdown(event?: Event): void {
    event?.stopPropagation();
    if (this.disabled()) {
      return;
    }
    this.isOpen.update(open => !open);
    if (this.isOpen()) {
      this.dropdownAnimated.set(true);
      const currentVal = this.value();
      const index = this.options().findIndex(opt => this.getOptionValue(opt) === currentVal);
      this.focusedOptionIndex.set(index !== -1 ? index : 0);
    } else {
      this.onTouch();
    }
  }

  selectOption(option: any): void {
    const val = this.getOptionValue(option);
    this.value.set(val);
    this.onChange(val);
    this.isOpen.set(false);
    this.onTouch();
  }

  isOptionSelected(option: any): boolean {
    return this.getOptionValue(option) === this.value();
  }

  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      if (this.isOpen()) {
        this.isOpen.set(false);
        this.onTouch();
      }
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled()) {
      return;
    }

    const opts = this.options();
    if (!opts || opts.length === 0) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen()) {
          this.toggleDropdown();
        } else {
          this.focusedOptionIndex.update(idx => (idx + 1) % opts.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen()) {
          this.toggleDropdown();
        } else {
          this.focusedOptionIndex.update(idx => (idx - 1 + opts.length) % opts.length);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.isOpen()) {
          const idx = this.focusedOptionIndex();
          if (idx >= 0 && idx < opts.length) {
            this.selectOption(opts[idx]);
          }
        } else {
          this.toggleDropdown();
        }
        break;
      case 'Escape':
        event.preventDefault();
        if (this.isOpen()) {
          this.isOpen.set(false);
          this.onTouch();
        }
        break;
    }
  }

  writeValue(val: any): void {
    this.value.set(val);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouch = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
    if (isDisabled) {
      this.isOpen.set(false);
    }
  }
}
