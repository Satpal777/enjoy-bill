import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AuthLoadingService {
    private loadingSubject = new BehaviorSubject<boolean>(false);
    public isLoading$: Observable<boolean> = this.loadingSubject.asObservable();

    startLoading(): void {
        this.loadingSubject.next(true);
    }

    stopLoading(): void {
        this.loadingSubject.next(false);
    }

    isLoading(): boolean {
        return this.loadingSubject.value;
    }
}
