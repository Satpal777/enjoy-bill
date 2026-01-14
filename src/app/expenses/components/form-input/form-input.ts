import { ChangeDetectionStrategy, Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  imports: [],
  templateUrl: './form-input.html',
  styleUrl: './form-input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => FormInput),
    multi: true
  }],
})
export class FormInput implements ControlValueAccessor {
  label = input('');
  type = input('text');
  placeholder = input('');
  optional = input(false);
  hasError = input(false);
  errorMessage = input('');
  rows = input(3);
  min = input<string>();
  step = input<string>();
  inputClass = input('');

  value = '';
  onChange: (value: string) => void = () => { };
  onTouched: () => void = () => { };

  writeValue(value: string): void {
    this.value = value || '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }
}
