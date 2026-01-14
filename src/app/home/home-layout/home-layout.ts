import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Supabase } from '../../core/services/supabase';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home-layout',
  imports: [RouterLink],
  templateUrl: './home-layout.html',
  styleUrl: './home-layout.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeLayout {
  private readonly supabase = inject(Supabase);
  readonly currentUser = toSignal(this.supabase.currentUser$);
}
