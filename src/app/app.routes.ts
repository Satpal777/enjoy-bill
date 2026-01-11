import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Signup } from './auth/signup/signup';
import { authGuard } from './core/guards/auth-guard';
import { DashboardLayout } from './dashboard/layout/layout';
import { ExpenseLayout } from './expenses/layout/layout';

export const routes: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'login', component: Login },
    { path: 'signup', component: Signup },
    { path: 'dashboard', component: DashboardLayout, canActivate: [authGuard] },
    { path: 'expenses/:id', component: ExpenseLayout, canActivate: [authGuard] },
    {
        path: 'invite/:code',
        loadComponent: () => import('./invite-handler/invite-handler')
            .then(m => m.InviteHandler)
    },
];
