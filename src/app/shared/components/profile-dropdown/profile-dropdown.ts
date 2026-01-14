import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Supabase } from '../../../core/services/supabase';

export interface UserProfile {
  id?: string;
  username: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
  last_sign_in_at?: string;
}

@Component({
  selector: 'app-profile-dropdown',
  imports: [DatePipe],
  templateUrl: './profile-dropdown.html',
  styleUrl: './profile-dropdown.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfileDropdown {
  private supabase = inject(Supabase);

  user = input<UserProfile | null>(null);
  close = output<void>();
  logout = output<void>();
  avatarUpdated = output<string>(); // Emit new avatar URL

  uploadingAvatar = signal(false);

  getInitials(name: string): string {
    return name?.charAt(0).toUpperCase() || '?';
  }

  onAvatarClick() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadAvatar(file);
      }
    };
    input.click();
  }

  async uploadAvatar(file: File) {
    try {
      this.uploadingAvatar.set(true);
      const userId = this.user()?.id || this.supabase.getCurrentUserId();
      if (!userId) throw new Error('No user ID');

      // Upload to Supabase storage
      const fileName = `avatar`;
      const filePath = `${userId}/${fileName}`;
      const { data, error: uploadError } = await this.supabase.getSupabaseClient()
        .storage
        .from('Profile Images')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = this.supabase.getSupabaseClient()
        .storage
        .from('Profile Images')
        .getPublicUrl(filePath);
      console.log(publicUrl);

      // Update profile
      await this.supabase.updateProfile(userId, { avatar_url: publicUrl });

      // Emit new avatar URL
      this.avatarUpdated.emit(publicUrl);

    } catch (error) {
      console.error('Error uploading avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      this.uploadingAvatar.set(false);
    }
  }
}
