import { Component, input, output } from '@angular/core';
import { ɵEmptyOutletComponent } from "@angular/router";

@Component({
  selector: 'app-navigation',
  imports: [ɵEmptyOutletComponent],
  templateUrl: './navigation.html',
  styleUrl: './navigation.css',
})
export class Navigation {
  title = input('');
  subtitle = input('');
  showBackButton = input(false);
  badge = input('');
  notificationCount = input(0);

  toggleNotifications = output<void>();
  toggleProfile = output<void>();
  backClick = output<void>();

  onBackClick() {
    this.backClick.emit();
  }
}
