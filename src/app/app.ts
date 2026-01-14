import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LoadingSpinner } from './shared/components/loading-spinner/loading-spinner';
import { AuthLoadingService } from './core/services/auth-loading.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoadingSpinner],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {
  private authLoadingService = inject(AuthLoadingService);

  protected readonly title = signal('enjoy-bill');
  protected readonly isLoading = toSignal(this.authLoadingService.isLoading$, { initialValue: false });
}
