import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  lostFoundApi,
  type LostFoundItem,
  type LostFoundListFilters,
  type LostItemRequest,
  type LostItemRequestListFilters,
  type PaginationMeta,
} from '../../api/lib/lostFoundApi'
import { warehouseApi, type WarehouseItem } from '../../api/lib/warehouseApi'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const message = response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export interface LostFoundItemsResult {
  data: LostFoundItem[]
  pagination?: PaginationMeta
}

export interface LostFoundRequestsResult {
  data: LostItemRequest[]
  pagination?: PaginationMeta
}

export interface WarehousesResult {
  data: WarehouseItem[]
}

export interface GenerateOtpResult {
  otp: string
  otp_expires_at: string
  message: string
}

export const lostFoundRtkApi = createApi({
  reducerPath: 'lostFoundApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['LostFoundItems', 'LostFoundRequests', 'Warehouses'],
  endpoints: (builder) => ({
    getLostFoundItems: builder.query<LostFoundItemsResult, LostFoundListFilters | void>({
      queryFn: async (filters) => {
        try {
          const response = await lostFoundApi.getAll(filters ?? undefined)
          return { data: { data: response.data, pagination: response.pagination } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tải danh sách đồ thất lạc') },
          }
        }
      },
      providesTags: ['LostFoundItems'],
    }),

    getLostFoundRequests: builder.query<LostFoundRequestsResult, LostItemRequestListFilters | void>({
      queryFn: async (filters) => {
        try {
          const response = await lostFoundApi.getRequests(filters ?? undefined)
          return { data: { data: response.data, pagination: response.pagination } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tải danh sách yêu cầu') },
          }
        }
      },
      providesTags: ['LostFoundRequests'],
    }),

    getWarehouses: builder.query<WarehousesResult, { location_ids?: string[] } | void>({
      queryFn: async (filters) => {
        try {
          const response = await warehouseApi.getAll(filters ?? undefined)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tải danh sách kho') },
          }
        }
      },
      providesTags: ['Warehouses'],
    }),

    storeToWarehouse: builder.mutation<{ data: LostFoundItem }, { id: string; warehouse_id: string }>({
      queryFn: async ({ id, warehouse_id }) => {
        try {
          const response = await lostFoundApi.storeToWarehouse(id, warehouse_id)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Lỗi khi cất kho') },
          }
        }
      },
      invalidatesTags: ['LostFoundItems'],
    }),

    generateHandoverOtp: builder.mutation<GenerateOtpResult, string>({
      queryFn: async (id) => {
        try {
          const response = await lostFoundApi.generateHandoverOTP(id)
          return { data: { otp: response.otp, otp_expires_at: response.otp_expires_at, message: response.message } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Lỗi khi tạo OTP') },
          }
        }
      },
    }),

    confirmHandover: builder.mutation<{ data: LostFoundItem }, { id: string; otp: string }>({
      queryFn: async ({ id, otp }) => {
        try {
          const response = await lostFoundApi.confirmHandover(id, otp)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'OTP không hợp lệ hoặc hết hạn') },
          }
        }
      },
      invalidatesTags: ['LostFoundItems', 'LostFoundRequests'],
    }),

    matchRequest: builder.mutation<
      { data: { request: LostItemRequest; matched_count: number } },
      { id: string; payload: { found_item_id: string[]; manager_note?: string; close_others?: boolean } }
    >({
      queryFn: async ({ id, payload }) => {
        try {
          const response = await lostFoundApi.matchRequest(id, payload)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Thao tác thất bại') },
          }
        }
      },
      invalidatesTags: ['LostFoundItems', 'LostFoundRequests'],
    }),

    rejectRequest: builder.mutation<{ data: LostItemRequest }, { id: string; manager_note?: string }>({
      queryFn: async ({ id, manager_note }) => {
        try {
          const response = await lostFoundApi.rejectRequest(id, { manager_note })
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Thao tác thất bại') },
          }
        }
      },
      invalidatesTags: ['LostFoundRequests'],
    }),
  }),
})

export const {
  useGetLostFoundItemsQuery,
  useGetLostFoundRequestsQuery,
  useGetWarehousesQuery,
  useStoreToWarehouseMutation,
  useGenerateHandoverOtpMutation,
  useConfirmHandoverMutation,
  useMatchRequestMutation,
  useRejectRequestMutation,
} = lostFoundRtkApi
