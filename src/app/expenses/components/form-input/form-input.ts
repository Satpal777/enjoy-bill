import { Component, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-form-input',
  standalone: true,
  imports: [],
  templateUrl: './form-input.html',
  styleUrl: './form-input.css',
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
  onChange: any = () => { };
  onTouched: any = () => { };

  writeValue(value: any): void {
    this.value = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onInput(event: any): void {
    this.value = event.target.value;
    this.onChange(this.value);
  }
}
