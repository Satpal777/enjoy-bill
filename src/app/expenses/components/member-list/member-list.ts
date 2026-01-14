import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MemberStatData {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
  balanceAmount: number;
}

@Component({
  selector: 'app-member-list',
  imports: [CommonModule],
  templateUrl: './member-list.html',
  styleUrl: './member-list.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MemberList {
  member = input.required<MemberStatData>();
}
