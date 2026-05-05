import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Edit2,
  Eye,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Check,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
  Wrench,
} from "lucide-react";
import { toast } from "react-toastify";
import Modal from "../../components/common/Modal";
import {
  POD_STATUSES,
  podApi,
  type PodItem,
  type PodStatus,
  type UpdatePodStatusPayload,
} from "../../api/lib/podApi";
import { userApi, type UserListItem } from "../../api/lib/userApi";
import { cleaningTaskApi } from "../../api/lib/cleaningTaskApi";
import { useManagerScope } from "../../contexts/ManagerScopeContext";
import { initUserSocket } from "../../lib/socket";

const statusConfig: Record<
  PodStatus,
  { css: string; label: string; dot: string }
> = {
  AVAILABLE: {
    css: "bg-emerald-50 text-emerald-700",
    label: "Sẵn sàng",
    dot: "bg-emerald-500", // Màu đậm cho chấm tròn
  },
  OCCUPIED: {
    css: "bg-blue-50 text-blue-700",
    label: "Đang sử dụng",
    dot: "bg-blue-500",
  },
  NEEDS_CLEANING: {
    css: "bg-amber-50 text-amber-700",
    label: "Chờ dọn dẹp",
    dot: "bg-amber-500",
  },
  CLEANING: {
    css: "bg-violet-50 text-violet-700",
    label: "Đang dọn dẹp",
    dot: "bg-violet-500",
  },
  MAINTENANCE: {
    css: "bg-rose-50 text-rose-700",
    label: "Bảo trì",
    dot: "bg-rose-500",
  },
};
const getStatusData = (status: PodStatus) => {
  return (
    statusConfig[status] || { css: "bg-gray-100 text-gray-700", label: status }
  );
};

const podStatusBgColor = (status: PodStatus) => {
  switch (status) {
    case "AVAILABLE":
      return "bg-emerald-500";
    case "OCCUPIED":
      return "bg-blue-500";
    case "NEEDS_CLEANING":
      return "bg-amber-500";
    case "CLEANING":
      return "bg-violet-500";
    case "MAINTENANCE":
      return "bg-rose-500";
    default:
      return "bg-gray-500";
  }
};

export const PodManagement = () => {
  const {
    clusters,
    isLoading: isScopeLoading,
    refreshScope,
  } = useManagerScope();
  const [pods, setPods] = useState<PodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [clusterFilter, setClusterFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<PodStatus[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<{
    cluster_id: string[];
    status: PodStatus[];
  }>({
    cluster_id: [],
    status: [],
  });

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailPod, setDetailPod] = useState<PodItem | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [statusPod, setStatusPod] = useState<PodItem | null>(null);
  const [nextStatus, setNextStatus] = useState<PodStatus>("AVAILABLE");
  const [maintenanceReason, setMaintenanceReason] = useState("");

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignPod, setAssignPod] = useState<PodItem | null>(null);
  const [cleaners, setCleaners] = useState<UserListItem[]>([]);
  const [selectedCleaner, setSelectedCleaner] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const fetchPods = async () => {
    try {
      setIsLoading(true);
      const response = await podApi.getAll({
        cluster_id:
          clusterFilter.length > 0 ? clusterFilter.join(",") : undefined,
        status:
          statusFilter.length > 0
            ? (statusFilter.join(",") as PodStatus)
            : undefined,
      });
      setPods(response.data);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to load pods");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPods();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterFilter, statusFilter, refreshTrigger]);

  console.log(pods);

  useEffect(() => {
    const socket = initUserSocket();
    if (!socket) return;

    const handleNewData = () => {
      setRefreshTrigger((prev) => prev + 1);
    };

    socket.on("user:notification", handleNewData);
    socket.on("dashboard:refresh", handleNewData);

    return () => {
      socket.off("user:notification", handleNewData);
      socket.off("dashboard:refresh", handleNewData);
    };
  }, []);

  useEffect(() => {
    if (clusterFilter.length === 0) return;
    const validClusterIds = new Set(clusters.map((c) => c.id));
    const currentValidFilters = clusterFilter.filter((id) =>
      validClusterIds.has(id),
    );
    if (currentValidFilters.length !== clusterFilter.length) {
      setClusterFilter(currentValidFilters);
    }
  }, [clusterFilter, clusters]);

  const clusterMap = useMemo(
    () => new Map(clusters.map((cluster) => [cluster.id, cluster])),
    [clusters],
  );

  const isTableLoading = isLoading || isScopeLoading;

  const handleRefresh = async () => {
    try {
      await Promise.all([refreshScope(), fetchPods()]);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to refresh pod data",
      );
    }
  };

  const filteredPods = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return pods;

    return pods.filter((pod) => {
      const clusterName =
        clusterMap.get(pod.cluster_id)?.name ?? pod.cluster?.name ?? "";
      return [
        pod.code,
        pod.name,
        pod.id,
        clusterName,
        pod.status,
        pod.description ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [clusterMap, pods, search]);

  const podStats = useMemo(
    () =>
      pods.reduce<Record<string, number>>((acc, pod) => {
        acc[pod.status] = (acc[pod.status] ?? 0) + 1;
        return acc;
      }, {}),
    [pods],
  );

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    setIsDetailLoading(false);
    setDetailPod(null);
    setDetailLoadingId(null);
  };

  const openDetailModal = async (podId: string) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailLoadingId(podId);

    try {
      const response = await podApi.getById(podId);
      setDetailPod(response.data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load pod detail",
      );
      closeDetailModal();
    } finally {
      setIsDetailLoading(false);
      setDetailLoadingId(null);
    }
  };

  const closeStatusModal = () => {
    if (isStatusSaving) return;
    setIsStatusModalOpen(false);
    setStatusPod(null);
    setNextStatus("AVAILABLE");
    setMaintenanceReason("");
  };

  const openStatusModal = (pod: PodItem) => {
    setStatusPod(pod);
    setNextStatus(pod.status);
    setMaintenanceReason(pod.maintenance_status ?? "");
    setIsStatusModalOpen(true);
  };

  const handleUpdateStatus = async () => {
    if (!statusPod) return;

    if (nextStatus === "MAINTENANCE" && !maintenanceReason.trim()) {
      toast.error("Maintenance reason is required");
      return;
    }

    const payload: UpdatePodStatusPayload = {
      status: nextStatus,
      ...(nextStatus === "MAINTENANCE"
        ? { maintenance_status: maintenanceReason.trim() }
        : {}),
    };

    try {
      setIsStatusSaving(true);
      const response = await podApi.updateStatus(statusPod.id, payload);
      toast.success(`Updated status of ${response.data.code}`);

      if (detailPod?.id === statusPod.id) {
        setDetailPod(response.data);
      }

      closeStatusModal();
      await fetchPods();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to update pod status",
      );
    } finally {
      setIsStatusSaving(false);
    }
  };

  const openAssignModal = async (pod: PodItem) => {
    setAssignPod(pod);
    setIsAssignModalOpen(true);
    if (cleaners.length === 0) {
      try {
        const res = await userApi.getActiveUsers("cleaner");
        setCleaners(res.data);
      } catch (error: any) {
        toast.error(
          error?.response?.data?.message || "Failed to load cleaners",
        );
      }
    }
  };

  const closeAssignModal = () => {
    if (isAssigning) return;
    setIsAssignModalOpen(false);
    setAssignPod(null);
    setSelectedCleaner("");
  };

  const handleAssignCleaner = async () => {
    if (!assignPod || !selectedCleaner) {
      toast.error("Please select a cleaner");
      return;
    }
    try {
      setIsAssigning(true);
      await cleaningTaskApi.create({
        pod_id: assignPod.id,
        cleaner_id: selectedCleaner,
        request_source: "USER_REQUEST",
      });
      toast.success("Cleaner assigned successfully");
      closeAssignModal();
      fetchPods();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to assign cleaner");
    } finally {
      setIsAssigning(false);
    }
  };

  const applyFilters = () => {
    setClusterFilter(draftFilters.cluster_id);
    setStatusFilter(draftFilters.status);
    setIsFilterPanelOpen(false);
  };

  const openFilterPanel = () => {
    setDraftFilters({ cluster_id: clusterFilter, status: statusFilter });
    setIsFilterPanelOpen(true);
  };

  const resetDraftFilters = () => {
    setDraftFilters({ cluster_id: [], status: [] });
  };

  const toggleArrayFilter = <T extends string>(
    current: T[],
    value: T | "all",
    fullLength: number,
  ): T[] => {
    if (value === "all") return [];
    if (current.includes(value as T)) return current.filter((v) => v !== value);
    const nextArr = [...current, value as T];
    if (nextArr.length === fullLength) return [];
    return nextArr;
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Quản lý Pod
          </h1>
          <p className="text-gray-500 mt-1">
            Xem và quản lý các pod trong cụm được phân công.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isTableLoading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
        >
          <RefreshCw
            className={`w-4 h-4 ${isTableLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-5 py-5 mb-6">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-[220px] pr-4 xl:border-r xl:border-gray-200">
              <p className="text-xs uppercase font-semibold tracking-wide text-gray-500">
                Số lượng pod
              </p>
              <p className="text-[34px] leading-tight font-bold text-gray-900 mt-1">
                {pods.length}
              </p>
            </div>

            <div className="min-w-[500px] flex-1 py-1">
              <p className="text-sm font-semibold text-gray-900 mb-1.5">
                {pods.length} pods
              </p>
              <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 mb-1.5">
                {POD_STATUSES.map((status) => {
                  const count = podStats[status] || 0;
                  const percent =
                    pods.length > 0 ? (count / pods.length) * 100 : 0;
                  return percent > 0 ? (
                    <div
                      key={status}
                      className={podStatusBgColor(status)}
                      style={{ width: `${percent}%` }}
                    />
                  ) : null;
                })}
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                {POD_STATUSES.filter((s) => podStats[s]).map((status) => {
                  const data = getStatusData(status); // Dùng lại hàm của bạn
                  return (
                    <span
                      key={status}
                      className="inline-flex items-center gap-1.5 text-xs text-gray-600"
                    >
                      {/* Chấm tròn lấy màu từ dot */}
                      <span
                        className={`w-2 h-2 rounded-full ${data.dot || "bg-gray-400"}`}
                      />

                      {/* Nhãn tiếng Việt lấy từ label */}
                      <span className="font-medium">{data.label}:</span>
                      <span className="text-gray-900 font-bold">
                        {podStats[status]}
                      </span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm mã, tên pod,..."
                className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            <button
              type="button"
              onClick={openFilterPanel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Lọc
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Pods</h2>
          <span className="text-sm text-gray-500">
            {filteredPods.length} item(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pod
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cụm
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cụ thể
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Lần dọn cuối
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isTableLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    Đang tải pods...
                  </td>
                </tr>
              ) : filteredPods.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-12 text-center text-gray-400"
                  >
                    Không tìm thấy pod nào...
                  </td>
                </tr>
              ) : (
                filteredPods.map((pod) => (
                  <tr
                    key={pod.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 align-top">
                      <div className="font-semibold text-gray-900">
                        {pod.code} - {pod.name}
                      </div>
                      {pod.description && (
                        <p className="text-xs text-gray-500 mt-2 max-w-sm">
                          {pod.description}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">
                      {clusterMap.get(pod.cluster_id)?.name ??
                        pod.cluster?.name ??
                        pod.cluster_id}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusData(pod.status).css}`}
                      >
                        {getStatusData(pod.status).label}
                      </span>
                      {pod.status === "MAINTENANCE" &&
                        pod.maintenance_status && (
                          <p className="text-xs text-rose-700 mt-2">
                            {pod.maintenance_status}
                          </p>
                        )}
                    </td>
                    <td className="px-6 py-4 align-top text-xs text-gray-600">
                      <p>Soundproof: {pod.soundproof_level}/5</p>
                      <p>Ventilation: {pod.ventilation_level}/5</p>
                      <p>Outlets: {pod.power_outlets}</p>
                      <p>Wi-Fi: {pod.wifi_available ? "Yes" : "No"}</p>
                      <p>Max session: {pod.max_session_duration} mins</p>
                    </td>
                    <td className="px-6 py-4 align-top text-gray-600">
                      {pod.last_cleaned_at
                        ? new Date(pod.last_cleaned_at).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 align-top">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        {pod.status === "NEEDS_CLEANING" && (
                          <button
                            type="button"
                            onClick={() => openAssignModal(pod)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors"
                          >
                            Assign Cleaner
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openDetailModal(pod.id)}
                          disabled={detailLoadingId === pod.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-60"
                        >
                          <Eye className="w-4 h-4" />
                          {detailLoadingId === pod.id
                            ? "Loading..."
                            : "Details"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openStatusModal(pod)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Update Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter panel */}
      <div
        className={`fixed inset-0 z-50 ${isFilterPanelOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isFilterPanelOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isFilterPanelOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsFilterPanelOpen(false)}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-hidden bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isFilterPanelOpen ? "translate-x-0" : "translate-x-[110%]"}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
              <p className="text-xs text-gray-500 mt-1">
                Filter pods by status and cluster.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Status
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      status: toggleArrayFilter(
                        prev.status,
                        "all",
                        POD_STATUSES.length,
                      ),
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.status.length === 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  {draftFilters.status.length === 0 && (
                    <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />
                  )}
                  All
                </button>
                {POD_STATUSES.map((status) => {
                  const isSelected = draftFilters.status.includes(status);
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          status: toggleArrayFilter(
                            prev.status,
                            status,
                            POD_STATUSES.length,
                          ),
                        }))
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />
                      )}
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Cluster
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraftFilters((prev) => ({
                      ...prev,
                      cluster_id: toggleArrayFilter(
                        prev.cluster_id,
                        "all",
                        clusters.length,
                      ),
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.cluster_id.length === 0 ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  {draftFilters.cluster_id.length === 0 && (
                    <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />
                  )}
                  All Clusters
                </button>
                {clusters.map((cluster) => {
                  const isSelected = draftFilters.cluster_id.includes(
                    cluster.id,
                  );
                  return (
                    <button
                      key={cluster.id}
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          cluster_id: toggleArrayFilter(
                            prev.cluster_id,
                            cluster.id,
                            clusters.length,
                          ),
                        }))
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />
                      )}
                      {cluster.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-6 py-5 border-t border-gray-100 bg-white flex items-center justify-between gap-3 lg:rounded-b-xl">
            <button
              type="button"
              onClick={resetDraftFilters}
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Reset
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail panel */}
      <div
        className={`fixed inset-0 z-50 ${isDetailOpen ? "" : "pointer-events-none"}`}
        aria-hidden={!isDetailOpen}
      >
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity duration-300 ${isDetailOpen ? "opacity-100" : "opacity-0"}`}
          onClick={closeDetailModal}
        />
        <div
          className={`absolute right-0 top-0 h-full w-full max-w-[960px] bg-white shadow-2xl border-l border-gray-200 transform transition-transform duration-300 lg:right-4 lg:top-4 lg:bottom-4 lg:h-auto lg:w-[calc(100%-2rem)] lg:border lg:rounded-xl flex flex-col ${isDetailOpen ? "translate-x-0" : "translate-x-[110%]"}`}
          role="dialog"
          aria-modal="true"
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Pod Details
              </h2>
            </div>
            <button
              type="button"
              onClick={closeDetailModal}
              className="text-gray-400 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {isDetailLoading ? (
              <div className="py-8 text-center text-gray-500">
                Loading pod details...
              </div>
            ) : !detailPod ? (
              <div className="py-8 text-center text-gray-500">
                No details found for this pod.
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  let bg = "",
                    iconBg = "",
                    title = "",
                    desc = "",
                    Icon = null;
                  if (detailPod.status === "AVAILABLE") {
                    bg = "from-emerald-50/80 to-white border-emerald-100";
                    iconBg =
                      "bg-white text-emerald-500 shadow-sm border border-emerald-50";
                    title = "Pod Available";
                    desc = "Pod is ready for customers.";
                    Icon = <CheckCircle className="w-6 h-6" />;
                  } else if (detailPod.status === "OCCUPIED") {
                    bg = "from-blue-50/80 to-white border-blue-100";
                    iconBg =
                      "bg-white text-blue-500 shadow-sm border border-blue-50";
                    title = "Pod Occupied";
                    desc = "Pod is currently in use.";
                    Icon = <Clock className="w-6 h-6" />;
                  } else if (detailPod.status === "MAINTENANCE") {
                    bg = "from-rose-50/80 to-white border-rose-100";
                    iconBg =
                      "bg-white text-rose-500 shadow-sm border border-rose-50";
                    title = "Under Maintenance";
                    desc =
                      detailPod.maintenance_status ||
                      "Pod is undergoing maintenance.";
                    Icon = <Wrench className="w-6 h-6" />;
                  } else if (detailPod.status === "NEEDS_CLEANING") {
                    bg = "from-amber-50/80 to-white border-amber-100";
                    iconBg =
                      "bg-white text-amber-500 shadow-sm border border-amber-50";
                    title = "Needs Cleaning";
                    desc = "Pod requires cleaning.";
                    Icon = <AlertCircle className="w-6 h-6" />;
                  } else if (detailPod.status === "CLEANING") {
                    bg = "from-violet-50/80 to-white border-violet-100";
                    iconBg =
                      "bg-white text-violet-500 shadow-sm border border-violet-50";
                    title = "Cleaning in Progress";
                    desc = "Pod is currently being cleaned.";
                    Icon = <RefreshCw className="w-6 h-6 animate-spin" />;
                  } else {
                    bg = "from-gray-50/80 to-white border-gray-100";
                    iconBg =
                      "bg-white text-gray-500 shadow-sm border border-gray-50";
                    title = detailPod.status;
                    desc = "Current pod state pending assessment.";
                    Icon = <Boxes className="w-6 h-6" />;
                  }

                  return (
                    <div
                      className={`rounded-2xl p-8 flex flex-col items-center text-center bg-gradient-to-b border shadow-sm ${bg}`}
                    >
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${iconBg}`}
                      >
                        {Icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {title}
                      </h3>
                      <p className="text-sm text-gray-600 max-w-sm">{desc}</p>
                    </div>
                  );
                })()}

                <div className="flex flex-col text-sm">
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Pod Code</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.code}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Pod Name</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Cluster</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.cluster?.name ??
                        clusterMap.get(detailPod.cluster_id)?.name ??
                        detailPod.cluster_id}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Soundproof</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.soundproof_level}/5
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Ventilation</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.ventilation_level}/5
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Power Outlets</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.power_outlets}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Wi-Fi</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.wifi_available ? "Available" : "Unavailable"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Max Session Duration</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.max_session_duration} minutes
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <span className="text-gray-500">Last Cleaned</span>
                    <span className="font-medium text-gray-900">
                      {detailPod.last_cleaned_at
                        ? new Date(detailPod.last_cleaned_at).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">
                    Description
                  </p>
                  <p className="text-sm text-gray-700 bg-gray-50 border border-gray-100 rounded-lg p-3 whitespace-pre-wrap">
                    {detailPod.description || "No description"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isStatusModalOpen}
        onClose={closeStatusModal}
        title={
          statusPod ? `Update Status - ${statusPod.code}` : "Update Pod Status"
        }
        size="md"
        footer={
          <>
            <button
              onClick={closeStatusModal}
              disabled={isStatusSaving}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={isStatusSaving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {isStatusSaving ? "Updating..." : "Update Status"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value as PodStatus)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              {POD_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {nextStatus === "MAINTENANCE" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maintenance Reason
              </label>
              <textarea
                rows={3}
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                placeholder="Describe maintenance issue"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isAssignModalOpen}
        onClose={closeAssignModal}
        title={
          assignPod ? `Assign Cleaner - ${assignPod.code}` : "Assign Cleaner"
        }
        size="md"
        footer={
          <>
            <button
              onClick={closeAssignModal}
              disabled={isAssigning}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              onClick={handleAssignCleaner}
              disabled={isAssigning || !selectedCleaner}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isAssigning ? "Assigning..." : "Assign Task"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select a cleaner to create a cleaning task for pod{" "}
            <strong>{assignPod?.name}</strong>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cleaner
            </label>
            <select
              value={selectedCleaner}
              onChange={(e) => setSelectedCleaner(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white"
            >
              <option value="" disabled>
                -- Select a cleaner --
              </option>
              {cleaners.map((c) => (
                <option key={c.id || c._id} value={c.id || c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
};
