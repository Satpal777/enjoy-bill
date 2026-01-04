import { Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  imports: [],
  templateUrl: './loading-spinner.html',
  standalone:true,
  styleUrl: './loading-spinner.css',
})
export class LoadingSpinner {
  fullHeight = input<boolean>(false);
}
