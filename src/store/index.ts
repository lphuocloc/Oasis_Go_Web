import { configureStore } from '@reduxjs/toolkit'
import appReducer from './slices/appSlice'
import locationsReducer from './slices/locationsSlice'
import podClustersReducer from './slices/podClustersSlice'

export const store = configureStore({
    reducer: {
        app: appReducer,
        locations: locationsReducer,
        podClusters: podClustersReducer
    }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
