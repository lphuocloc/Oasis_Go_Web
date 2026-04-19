import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'
import locationsReducer from './slices/locationsSlice'
import podClustersReducer from './slices/podClustersSlice'
import notificationsReducer from './slices/notificationsSlice'
import walletWithdrawalsReducer from './slices/walletWithdrawalsSlice'

export const store = configureStore({
    reducer: {
        app: appReducer,
        locations: locationsReducer,
        podClusters: podClustersReducer,
        notifications: notificationsReducer,
        walletWithdrawals: walletWithdrawalsReducer,
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
