import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

interface AppState {
    sidebarCollapsed: boolean
}

const initialState: AppState = {
    sidebarCollapsed: false
}

const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
            state.sidebarCollapsed = action.payload
        },
        toggleSidebar: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed
        }
    }
})

export const { setSidebarCollapsed, toggleSidebar } = appSlice.actions
export default appSlice.reducer
