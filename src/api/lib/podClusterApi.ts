import { api } from "../api";

export interface PodClusterImage {
  id: string;
  image_url: string;
  is_primary?: boolean;
}

export interface PodClusterPricingSummary {
  queried_at_utc: string;
  has_location_rule: boolean;
}

export interface PodClusterRating {
  avgRating: number;
  totalReviews: number;
  ratingCounts?: Record<string, number>;
}

export interface PodLocation {
  _id: string;
  id?: string;
  name: string;
  type: string;
  address?: string;
  city?: string | null;
  lat?: number | null;
  lng?: number | null;
  parent_id?: string | null;
}

export interface PodClusterItem {
  _id: string;
  id: string;
  __v: number;

  name: string;
  description: string | null;
  location_id: string;
  location?: PodLocation;

  base_price_modifier: number;
  slot_duration_minutes: number;

  rating?: PodClusterRating;
  pricing_summary?: PodClusterPricingSummary;
  images?: PodClusterImage[];

  createdAt: string;
  updatedAt: string;
}

export interface PodClusterPricingRule {
  id: string;
  scope: string;
  multiplier: number;
  applied_modifier: number;
  start_time: string;
  end_time: string;
  days_of_week: string[];
}

export interface PodClusterPricingSummary {
  queried_at_utc: string;
  has_location_rule: boolean;
  effective_rule: PodClusterPricingRule | null;
}

export interface PodClusterImage {
  id: string;
  cluster_id: string;
  image_url: string;
  createdAt?: string;
}

export interface PodClusterPayload {
  location_id: string;
  name: string;
  description?: string | null;
  base_price_modifier?: number | null;
  slot_duration_minutes?: number | null;
  images?: File[];
}

interface PodClustersListResponse {
  success: boolean;
  count: number;
  data: PodClusterItem[];
}

interface PodClusterSingleResponse {
  success: boolean;
  message?: string;
  data: PodClusterItem;
}

interface PodClusterImagesResponse {
  success: boolean;
  count: number;
  data: PodClusterImage[];
}

interface PodClusterDeleteResponse {
  success: boolean;
  message: string;
}

const toFormData = (payload: PodClusterPayload): FormData => {
  const formData = new FormData();
  formData.append("location_id", payload.location_id);
  formData.append("name", payload.name);

  if (payload.description != null && payload.description !== "") {
    formData.append("description", payload.description);
  }

  if (payload.base_price_modifier != null) {
    formData.append("base_price_modifier", String(payload.base_price_modifier));
  }

  if (payload.slot_duration_minutes != null) {
    formData.append(
      "slot_duration_minutes",
      String(payload.slot_duration_minutes),
    );
  }

  payload.images?.forEach((file) => {
    formData.append("images", file);
  });

  return formData;
};

export const podClusterApi = {
  getAll: (location_id?: string) => {
    const params = new URLSearchParams();
    if (location_id) params.append("location_id", location_id);
    return api
      .get<PodClustersListResponse>("/pod-clusters", { params })
      .then((r) => r.data);
  },

  getById: (id: string) =>
    api
      .get<PodClusterSingleResponse>(`/pod-clusters/${id}`)
      .then((r) => r.data),

  getByLocation: (locationId: string) =>
    api
      .get<PodClustersListResponse>(`/pod-clusters/location/${locationId}`)
      .then((r) => r.data),

  getImages: (id: string) =>
    api
      .get<PodClusterImagesResponse>(`/pod-clusters/${id}/images`)
      .then((r) => r.data),

  create: (payload: PodClusterPayload) => {
    return api
      .post<PodClusterSingleResponse>("/pod-clusters", toFormData(payload), {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },

  update: (id: string, payload: PodClusterPayload) => {
    return api
      .put<PodClusterSingleResponse>(
        `/pod-clusters/${id}`,
        toFormData(payload),
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      )
      .then((r) => r.data);
  },

  delete: (id: string) =>
    api
      .delete<PodClusterDeleteResponse>(`/pod-clusters/${id}`)
      .then((r) => r.data),

  deleteImage: (id: string, imageId: string) => {
    return api
      .delete<PodClusterDeleteResponse>(`/pod-clusters/${id}/images/${imageId}`)
      .then((r) => r.data);
  },
};
