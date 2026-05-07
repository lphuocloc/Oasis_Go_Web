import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  incidentApi,
  type IncidentItem,
  type IncidentListFilters,
  type IncidentStatusUpdatePayload,
  type DamageReportItem,
} from '../../api/lib/incidentApi'
import { bookingOrderApi, type OrderIncidentItem, type BookingOrderDetail } from '../../api/lib/bookingOrderApi'
import { bookingApi } from '../../api/lib/bookingApi'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response
    const message = response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export interface IncidentDamageReportsResult {
  data: DamageReportItem[]
}

export interface IncidentDetailResult {
  data: IncidentItem
}

export interface AffectedBookingsResult {
  data: any[]
}

export interface RoomChangeCandidatesResult {
  data: any[]
}

export interface OrderDetailResult {
  incidents: OrderIncidentItem[]
  order: BookingOrderDetail | null
  resolvedOrderId: string
}

export const incidentsApi = createApi({
  reducerPath: 'incidentsApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Incidents', 'IncidentDetail', 'OrderIncidents', 'AffectedBookings'],
  endpoints: (builder) => ({
    getDamageReports: builder.query<IncidentDamageReportsResult, IncidentListFilters | void>({
      queryFn: async (filters) => {
        try {
          const response = await incidentApi.getDamageReports(filters ?? undefined)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tải báo cáo hư hại') },
          }
        }
      },
      providesTags: ['Incidents'],
    }),

    getIncidentById: builder.query<IncidentDetailResult, string>({
      queryFn: async (id) => {
        try {
          const response = await incidentApi.getById(id)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tải chi tiết sự cố') },
          }
        }
      },
      providesTags: (result, error, id) => [{ type: 'IncidentDetail', id }],
    }),

    updateIncidentStatus: builder.mutation<
      IncidentDetailResult,
      { id: string; payload: IncidentStatusUpdatePayload }
    >({
      queryFn: async ({ id, payload }) => {
        try {
          const response = await incidentApi.updateStatus(id, payload)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể cập nhật trạng thái sự cố') },
          }
        }
      },
      invalidatesTags: (result, error, { id }) => ['Incidents', { type: 'IncidentDetail', id }, 'OrderIncidents'],
    }),

    getAffectedBookings: builder.query<AffectedBookingsResult, string>({
      queryFn: async (incidentId) => {
        try {
          const response = await incidentApi.getAffectedBookings(incidentId)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tải danh sách booking bị ảnh hưởng') },
          }
        }
      },
      providesTags: (result, error, id) => [{ type: 'AffectedBookings', id }],
    }),

    getRoomChangeCandidates: builder.query<RoomChangeCandidatesResult, string>({
      queryFn: async (bookingId) => {
        try {
          const response = await incidentApi.getRoomChangeCandidates(bookingId)
          return { data: { data: response.data } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tìm phòng thay thế') },
          }
        }
      },
    }),

    executeRoomChange: builder.mutation<{ data: any }, { bookingId: string; targetPodId: string }>({
      queryFn: async ({ bookingId, targetPodId }) => {
        try {
          const response = await incidentApi.executeRoomChange(bookingId, targetPodId)
          return { data: response }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Lỗi khi đổi phòng') },
          }
        }
      },
      invalidatesTags: ['AffectedBookings'],
    }),

    getOrderDetail: builder.query<OrderDetailResult, string>({
      queryFn: async (orderId) => {
        try {
          // Resolve order ID (might be booking_id)
          let actualOrderId = orderId
          let orderData: BookingOrderDetail | null = null

          try {
            orderData = await bookingOrderApi.getById(actualOrderId)
          } catch {
            try {
              const bookingData = await bookingApi.getById(actualOrderId)
              if (bookingData?.order_id) {
                actualOrderId = bookingData.order_id
                orderData = await bookingOrderApi.getById(actualOrderId).catch(() => null)
              }
            } catch {
              // ignore
            }
          }

          const incidents = await bookingOrderApi.getOrderIncidents(actualOrderId).catch(() => [])

          return { data: { incidents, order: orderData, resolvedOrderId: actualOrderId } }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tải chi tiết đơn hàng') },
          }
        }
      },
      providesTags: (result, error, id) => [{ type: 'OrderIncidents', id }],
    }),

    createOrderDamageBill: builder.mutation<void, string>({
      queryFn: async (orderId) => {
        try {
          await bookingOrderApi.createOrderDamageBill(orderId)
          return { data: undefined }
        } catch (error: unknown) {
          return {
            error: { status: 'CUSTOM_ERROR', error: getErrorMessage(error, 'Không thể tạo hóa đơn đền bù') },
          }
        }
      },
      invalidatesTags: (result, error, orderId) => [{ type: 'OrderIncidents', id: orderId }],
    }),
  }),
})

export const {
  useGetDamageReportsQuery,
  useGetIncidentByIdQuery,
  useLazyGetIncidentByIdQuery,
  useUpdateIncidentStatusMutation,
  useGetAffectedBookingsQuery,
  useLazyGetAffectedBookingsQuery,
  useGetRoomChangeCandidatesQuery,
  useLazyGetRoomChangeCandidatesQuery,
  useExecuteRoomChangeMutation,
  useGetOrderDetailQuery,
  useLazyGetOrderDetailQuery,
  useCreateOrderDamageBillMutation,
} = incidentsApi
