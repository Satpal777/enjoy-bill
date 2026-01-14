import { Routes } from '@angular/router';
import { Login } from './auth/login/login';
import { Signup } from './auth/signup/signup';
import { authGuard } from './core/guards/auth-guard';
import { DashboardLayout } from './dashboard/layout/layout';
import { ExpenseLayout } from './expenses/layout/layout';
import { HomeLayout } from './home/home-layout/home-layout';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeLayout },
    { path: 'login', component: Login },
    { path: 'signup', component: Signup },
    { path: 'dashboard', component: DashboardLayout, canActivate: [authGuard] },
    { path: 'expenses/:id', component: ExpenseLayout, canActivate: [authGuard] },
    {
        path: 'invite/:code',
        loadComponent: () => import('./invite-handler/invite-handler')
            .then(m => m.InviteHandler),
        canActivate: [authGuard]
    },
];
