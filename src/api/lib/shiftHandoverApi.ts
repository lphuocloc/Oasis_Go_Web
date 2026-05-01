import { api } from '../api'

export interface ShiftHandoverItem {
  id: string
  manager_id: string
  shift_id: string
  note_text: string
  created_at: string
}

export const shiftHandoverApi = {
  create: (data: { note_text: string }) =>
    api.post<{ success: boolean; data: ShiftHandoverItem }>('/shift-handovers', data).then(r => r.data),

  getRecent: () =>
    api.get<{ success: boolean; data: ShiftHandoverItem[] }>('/shift-handovers/recent').then(r => r.data),
}
