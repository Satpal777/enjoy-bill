import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'app-profile-dropdown',
  imports: [],
  templateUrl: './profile-dropdown.html',
  styleUrl: './profile-dropdown.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileDropdown {
  close = output<void>();
  logout = output<void>();
}
