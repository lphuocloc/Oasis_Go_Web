import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'
import adminUsersReducer from './slices/adminUsersSlice'
import locationsReducer from './slices/locationsSlice'
import podClustersReducer from './slices/podClustersSlice'
import notificationsReducer from './slices/notificationsSlice'
import walletWithdrawalsReducer from './slices/walletWithdrawalsSlice'
import vouchersReducer from './slices/vouchersSlice'
import bookingsReducer from './slices/bookingsSlice'
import managerCleaningTasksReducer from './slices/managerCleaningTasksSlice'
import { withdrawalsApi } from './apis/withdrawalsApi'
import { ledgerApiSlice } from './apis/ledgerApi'

export const store = configureStore({
    reducer: {
        app: appReducer,
        adminUsers: adminUsersReducer,
        locations: locationsReducer,
        podClusters: podClustersReducer,
        notifications: notificationsReducer,
        walletWithdrawals: walletWithdrawalsReducer,
        vouchers: vouchersReducer,
        bookings: bookingsReducer,
        managerCleaningTasks: managerCleaningTasksReducer,
        [withdrawalsApi.reducerPath]: withdrawalsApi.reducer,
        [ledgerApiSlice.reducerPath]: ledgerApiSlice.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(withdrawalsApi.middleware, ledgerApiSlice.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
