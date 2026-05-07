import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  supportRequestApi,
  type SupportRequestItem,
  type SupportRequestListFilters,
  type SupportRequestListResult,
  type UpdateSupportRequestStatusPayload,
  type RoomChangeCandidatePod,
  type ExecuteRoomChangePayload,
  type RoomChangeResultPayload
} from '../../api/lib/supportRequestApi'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const message = response?.data?.message

    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }

  return fallback
}

export const supportRequestsApi = createApi({
  reducerPath: 'supportRequestsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['SupportRequests', 'SupportRequestDetail', 'RoomChangeCandidates'],
  endpoints: (builder) => ({
    getSupportRequests: builder.query<SupportRequestListResult, SupportRequestListFilters | void>({
      queryFn: async (filters) => {
        try {
          const response = await supportRequestApi.getAll(filters ?? undefined)
          return { data: response }
        } catch (error: unknown) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: getErrorMessage(error, 'Không thể tải danh sách yêu cầu hỗ trợ'),
            },
          }
        }
      },
      providesTags: ['SupportRequests'],
    }),

    updateSupportRequestStatus: builder.mutation<
      SupportRequestItem,
      { id: string; payload: UpdateSupportRequestStatusPayload }
    >({
      queryFn: async ({ id, payload }) => {
        try {
          const response = await supportRequestApi.updateStatus(id, payload)
          return { data: response }
        } catch (error: unknown) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: getErrorMessage(error, 'Không thể cập nhật trạng thái yêu cầu'),
            },
          }
        }
      },
      invalidatesTags: ['SupportRequests', 'SupportRequestDetail'],
    }),

    getRoomChangeCandidates: builder.query<{ candidates: RoomChangeCandidatePod[] }, string>({
      queryFn: async (id) => {
        try {
          const response = await supportRequestApi.getRoomChangeCandidates(id)
          return { data: response }
        } catch (error: unknown) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: getErrorMessage(error, 'Không thể tải danh sách phòng thay thế'),
            },
          }
        }
      },
      providesTags: (result, error, id) => [{ type: 'RoomChangeCandidates', id }],
    }),

    executeRoomChange: builder.mutation<
      RoomChangeResultPayload,
      { id: string; payload: ExecuteRoomChangePayload }
    >({
      queryFn: async ({ id, payload }) => {
        try {
          const response = await supportRequestApi.executeRoomChange(id, payload)
          return { data: response }
        } catch (error: unknown) {
          return {
            error: {
              status: 'CUSTOM_ERROR',
              error: getErrorMessage(error, 'Không thể thực hiện đổi phòng'),
            },
          }
        }
      },
      invalidatesTags: ['SupportRequests', 'SupportRequestDetail', 'RoomChangeCandidates'],
    }),
  }),
})

export const {
  useGetSupportRequestsQuery,
  useUpdateSupportRequestStatusMutation,
  useGetRoomChangeCandidatesQuery,
  useExecuteRoomChangeMutation,
} = supportRequestsApi
