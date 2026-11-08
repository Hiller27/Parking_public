
import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () =>
            import('./layouts/dashboard-layout/dashboard-layout/dashboard-layout')
                .then(m => m.DashboardLayout),
        children: [
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/dashboard/pages/dashboard-home/dashboard-home')
                        .then(m => m.DashboardHome)
            },
            {
                path: 'cajas',
                loadComponent: () =>
                    import('./features/key-boxes/pages/key-box-list/key-box-list/key-box-list')
                        .then(m => m.KeyBoxList)
            },
            {
                path: 'estacionamientos',
                loadComponent: () =>
                    import('./features/parking-spaces/pages/parking-space-list/parking-space-list/parking-space-list')
                        .then(m => m.ParkingSpaceList)
            },
            {
                path: 'ingresos/activos',
                loadComponent: () =>
                    import('./features/stays/pages/active-stays/active-stays')
                        .then(m => m.ActiveStays)
            },


            {
                path: 'historial',
                loadComponent: () =>
                    import('./features/history/pages/stay-history/stay-history')
                        .then(m => m.StayHistory)
            },

            {
                path: 'residentes',
                loadComponent: () =>
                    import('./features/residents/pages/resident-list/resident-list')
                        .then(m => m.ResidentList)
            },

            {
                path: 'asignaciones',
                loadComponent: () =>
                    import('./features/assignments/pages/assignment-list/assignment-list')
                        .then(m => m.AssignmentList)
            },

            {
                path: 'configuracion',
                loadComponent: () =>
                    import('./features/settings/settings-page/settings-page')
                        .then(m => m.SettingsPage)
            },

            {
                path: 'tarifas',
                loadComponent: () =>
                    import('./features/tariff/pages/tariff-settings/tariff-settings')
                        .then(m => m.TariffSettingsPage)
            },

            {
                path: '',
                pathMatch: 'full',
                redirectTo: 'dashboard'
            }
        ]
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
