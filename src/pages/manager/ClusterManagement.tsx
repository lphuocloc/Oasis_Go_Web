import { useEffect, useMemo, useState } from "react";
import {
  Boxes,
  Eye,
  ImagePlus,
  MapPin,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Check,
  X,
  Server,
  LayoutTemplate,
  ClipboardCheck,
  Image,
  FileText,
  Calendar,
  ShieldCheck,
  Clock,
  DollarSign,
  Star,
  Database,
  ArrowUpRight,
  ImageOff,
  Zap,
  Settings2,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  podClusterApi,
  type PodClusterItem,
} from "../../api/lib/podClusterApi";
import { useManagerScope } from "../../contexts/ManagerScopeContext";
import { ClusterPodItemBulkAssign } from "../../components/common/ClusterPodItemBulkAssign";
import { initUserSocket } from "../../lib/socket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";

const formatMoneyModifier = (value?: number | null) => {
  if (value == null) return "—";
  return `${value.toFixed(2)}x`;
};

export const ClusterManagement = () => {
  const {
    clusters: scopedClusters,
    locationOptions,
    isLoading: isScopeLoading,
    refreshScope,
  } = useManagerScope();

  const [search, setSearch] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");

  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<{ locationId: string }>({
    locationId: "all",
  });

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<PodClusterItem | null>(
    null,
  );

  const clusters = useMemo(() => {
    if (locationFilter === "all") return scopedClusters;
    return scopedClusters.filter(
      (cluster) => cluster.location_id === locationFilter,
    );
  }, [locationFilter, scopedClusters]);
  console.log("cluster", clusters);

  useEffect(() => {
    if (locationFilter === "all") return;
    if (locationOptions.some((item) => item.id === locationFilter)) return;
    setLocationFilter("all");
  }, [locationFilter, locationOptions]);

  useEffect(() => {
    const socket = initUserSocket();
    if (!socket) return;

    const handleNewData = () => {
      refreshScope();
    };

    socket.on("user:notification", handleNewData);
    socket.on("dashboard:refresh", handleNewData);

    return () => {
      socket.off("user:notification", handleNewData);
      socket.off("dashboard:refresh", handleNewData);
    };
  }, [refreshScope]);

  const filteredClusters = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return clusters;

    return clusters.filter((cluster) => {
      const locationName = cluster.location?.name ?? cluster.location_id;
      return [cluster.name, cluster.description ?? "", locationName]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [clusters, search]);

  const totalModifiers = useMemo(
    () =>
      clusters.reduce(
        (sum, cluster) => sum + (cluster.base_price_modifier ?? 0),
        0,
      ),
    [clusters],
  );

  const totalLocations = useMemo(
    () => new Set(clusters.map((cluster) => cluster.location_id)).size,
    [clusters],
  );

  const openFilterPanel = () => {
    setDraftFilters({ locationId: locationFilter });
    setIsFilterPanelOpen(true);
  };

  const applyFilters = () => {
    setLocationFilter(draftFilters.locationId);
    setIsFilterPanelOpen(false);
  };

  const resetDraftFilters = () => {
    setDraftFilters({ locationId: "all" });
  };

  const closeDetailModal = () => {
    setIsDetailOpen(false);
    // Small delay to allow transition before unmounting
    setTimeout(() => {
      setSelectedCluster(null);
      setIsDetailLoading(false);
      setDetailLoadingId(null);
    }, 300);
  };

  const openDetailModal = async (clusterId: string) => {
    setIsDetailOpen(true);
    setIsDetailLoading(true);
    setDetailLoadingId(clusterId);

    try {
      const response = await podClusterApi.getById(clusterId);
      setSelectedCluster(response.data);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load pod cluster detail",
      );
      closeDetailModal();
    } finally {
      setIsDetailLoading(false);
      setDetailLoadingId(null);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quản Lý Cụm Pod</h1>
          <p className="text-gray-500 mt-1">
            Xem và quản lý các cụm pod trong phạm vi quản lý của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={refreshScope}
            disabled={isScopeLoading}
            variant="outline"
          >
            <RefreshCw
              className={`w-4 h-4 ${isScopeLoading ? "animate-spin" : ""}`}
            />
            Làm mới
          </Button>

          <Button onClick={() => setIsAssignModalOpen(true)}>
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Gán vật tư hàng loạt
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">
              Tổng số Cụm Pod
            </span>
            <Boxes className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {clusters.length}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">
              Khu vực quản lý
            </span>
            <MapPin className="w-5 h-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {totalLocations}
          </div>
        </div>
        {/* <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-gray-500">
              Total Modifier
            </span>
            <ImagePlus className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-gray-900">
            {totalModifiers.toFixed(2)}
          </div>
        </div> */}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row justify-between gap-4">
        <div className="flex-1 w-full md:max-w-md">
          {/* We are removing the redundant inner filter container layout logic */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm với tên, vị trí"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            />
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={openFilterPanel}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-colors h-full"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Lọc
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header của Card */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2 flex-1  justify-between">
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight m-0">
              Danh sách cụm Pod
            </h2>
            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100 m-0">
              {filteredClusters.length} cụm
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  Thông tin cụm
                </th>
                <th className="px-4 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  Đánh giá
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  Vị trí vận hành
                </th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  Hệ số giá
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  Cập nhật
                </th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">
                  Thao tác
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {isScopeLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text--500" />
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Đang đồng bộ...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClusters.map((cluster) => {
                  const hasRule = cluster.pricing_summary?.has_location_rule;
                  const effectiveModifier = hasRule
                    ? cluster.pricing_summary?.effective_rule
                        ?.applied_modifier || cluster.base_price_modifier
                    : cluster.base_price_modifier;

                  return (
                    <tr
                      key={cluster.id}
                      className="hover:bg--50/30 transition-all group"
                    >
                      {/* THÔNG TIN CỤM */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="relative w-14 h-14 flex-shrink-0">
                            <div className="w-full h-full rounded-xl overflow-hidden border-2 border-white shadow-sm bg-gray-100 group-hover:border--200 transition-all">
                              {cluster.images?.[0]?.image_url ? (
                                <img
                                  src={cluster.images[0].image_url}
                                  alt={cluster.name}
                                  className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-500"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-300">
                                  <ImageOff className="w-5 h-5" />
                                </div>
                              )}
                            </div>
                            {hasRule && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg--600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                                <Zap className="w-2 h-2 text-white fill-current" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <h3 className="font-black text-gray-900 text-sm uppercase tracking-tight truncate group-hover:text--600 transition-colors">
                              {cluster.name}
                            </h3>
                            <span className="text-[10px] font-mono font-bold text-gray-400 mt-1">
                              {cluster.description?.slice(0, 50) + "..."}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/*  ĐÁNH GIÁ (Căn giữa cho cân đối) */}
                      <td className="px-4 py-5 text-center">
                        {cluster.rating ? (
                          <div className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[10px] font-black border border-amber-100">
                            <Star className="w-3 h-3 fill-current" />
                            {cluster.rating.avgRating}
                          </div>
                        ) : (
                          <span className="text-gray-300">--</span>
                        )}
                      </td>

                      {/* VỊ TRÍ */}
                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-gray-700 font-bold text-xs uppercase">
                            {cluster.location?.name ?? "N/A"}
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium  truncate max-w-[150px]">
                            {cluster.location?.address ?? "N/A"}
                          </span>
                        </div>
                      </td>

                      {/*  HỆ SỐ GIÁ */}
                      <td className="px-6 py-5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`px-3 py-1 rounded-lg border-2 text-xs font-black transition-all ${
                              hasRule
                                ? "bg--600 border--600 text-white shadow-md"
                                : "bg-white border-gray-100 text-gray-600"
                            }`}
                          >
                            x{Number(effectiveModifier).toFixed(1)}
                          </div>
                          {hasRule && (
                            <span className="text-[8px] text--600 font-black uppercase">
                              Peak Time
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 5. CẬP NHẬT */}
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end leading-none">
                          <span className="text-md font-bold text-gray-800 uppercase">
                            {cluster.updatedAt
                              ? new Date(cluster.updatedAt).toLocaleTimeString(
                                  "vi-VN",
                                  { hour: "2-digit", minute: "2-digit" },
                                )
                              : "—"}
                          </span>
                          <span className="text-xs text-gray-400 font-bold mt-1 uppercase">
                            {cluster.updatedAt
                              ? new Date(cluster.updatedAt).toLocaleDateString(
                                  "vi-VN",
                                )
                              : ""}
                          </span>
                        </div>
                      </td>

                      {/* 6. THAO TÁC */}
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => openDetailModal(cluster.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg--600 transition-all active:scale-95 shadow-sm"
                        >
                          <Settings2 className="w-3 h-3" />
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
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
              <h2 className="text-lg font-semibold text-gray-900">Lọc</h2>
              <p className="text-xs text-gray-500 mt-1">
                Lọc các cụm với vị trí
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsFilterPanelOpen(false)}
              className="text-gray-600 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-semibold text-gray-900">
                  Vị trí
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setDraftFilters((prev) => ({ ...prev, locationId: "all" }))
                  }
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${draftFilters.locationId === "all" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                >
                  {draftFilters.locationId === "all" && (
                    <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />
                  )}
                  Tất cả
                </button>
                {locationOptions.map((location) => {
                  const isSelected = draftFilters.locationId === location.id;
                  return (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() =>
                        setDraftFilters((prev) => ({
                          ...prev,
                          locationId: location.id,
                        }))
                      }
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${isSelected ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 inline-block mr-1.5 -ml-0.5" />
                      )}
                      {location.name}
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
              className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Xoá lọc
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsFilterPanelOpen(false)}
                className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Huỷ
              </button>
              <button
                type="button"
                onClick={applyFilters}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium"
              >
                Áp dụng
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
                Chi tiết cụm
              </h2>
            </div>
            <button
              type="button"
              onClick={closeDetailModal}
              className="text-gray-600 hover:text-gray-700 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-8 bg-white">
            {isDetailLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin mb-3"></div>
                <p className="text-sm text-gray-600 font-medium tracking-tight">
                  Đang tải dữ liệu...
                </p>
              </div>
            ) : !selectedCluster ? (
              <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <p className="text-gray-600 text-sm">
                  Không tìm thấy thông tin chi tiết.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-8 py-10 bg-white">
                {isDetailLoading ? (
                  <div className="flex flex-col items-center justify-center py-24">
                    <div className="w-6 h-6 border-2 border-gray-100 border-t-gray-900 rounded-full animate-spin"></div>
                  </div>
                ) : !selectedCluster ? (
                  <div className="py-20 text-center border border-dashed border-gray-200 rounded-xl">
                    <p className="text-gray-600 text-sm">
                      Dữ liệu cụm không tồn tại hoặc đã bị xóa.
                    </p>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto space-y-12">
                    <section className="space-y-6">
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg--600 text-black text-[10px] font-bold uppercase tracking-wider rounded">
                          {selectedCluster.location?.type}
                        </span>
                        <span className="text-gray-300 text-xs">/</span>
                        <span className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                          Hệ thống Oasis
                        </span>
                      </div>

                      <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                        {selectedCluster.name}
                      </h1>

                      <div className="flex flex-wrap items-center gap-x-10 gap-y-4 pt-2">
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">
                            Vị trí vận hành
                          </p>
                          <div className="flex items-center gap-2 text-gray-700">
                            <MapPin className="w-4 h-4 text--500" />
                            <span className="text-sm font-semibold">
                              {selectedCluster.location?.address}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5 border-l border-gray-100 pl-10">
                          <p className="text-[11px] font-bold text-gray-600 uppercase tracking-tight">
                            Xếp hạng dịch vụ
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-orange-50 px-2 py-0.5 rounded">
                              <Star className="w-3 h-3 text-orange-400 fill-orange-400" />
                              <span className="text-sm font-bold text-orange-700 ml-1.5">
                                {selectedCluster.rating?.avgRating || "0.0"}
                              </span>
                            </div>
                            <span className="text-xs text-gray-600">
                              ({selectedCluster.rating?.totalReviews || 0} lượt
                              đánh giá)
                            </span>
                          </div>
                        </div>
                      </div>
                    </section>

                    {/* PHẦN 2: THÔNG SỐ CƠ BẢN (Dạng Card ngang) */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                      <div className="p-8 border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/30">
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-4">
                          Hệ số giá cơ sở
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-light text-gray-900">
                            {selectedCluster.base_price_modifier}
                          </span>
                          <span className="text-xs font-bold text-gray-600 uppercase">
                            x định mức
                          </span>
                        </div>
                      </div>

                      <div className="p-8 bg-gray-50/30">
                        <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider mb-4">
                          Thời lượng tối thiểu
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-light text-gray-900">
                            {selectedCluster.slot_duration_minutes}
                          </span>
                          <span className="text-xs font-bold text-gray-600 uppercase">
                            Phút / Phiên
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* PHẦN 3: CHI TIẾT QUY TẮC GIÁ (Chỉ hiện khi có rule) */}
                    {selectedCluster.pricing_summary?.has_location_rule &&
                      selectedCluster.pricing_summary.effective_rule && (
                        <section className="p-8 bg--50/40 rounded-2xl border border--100 space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-1.5 h-5 bg--600 rounded-full" />
                              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                Chính sách phụ phí khu vực
                              </h3>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                            <div className="space-y-4">
                              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                Lịch áp dụng trong tuần
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {[
                                  "MON",
                                  "TUE",
                                  "WED",
                                  "THU",
                                  "FRI",
                                  "SAT",
                                  "SUN",
                                ].map((day) => {
                                  const isActive =
                                    selectedCluster?.pricing_summary?.effective_rule?.days_of_week?.includes(
                                      day,
                                    );
                                  const dayMap: any = {
                                    MON: "Th 2",
                                    TUE: "Th 3",
                                    WED: "Th 4",
                                    THU: "Th 5",
                                    FRI: "Th 6",
                                    SAT: "Th 7",
                                    SUN: "CN",
                                  };
                                  return (
                                    <div
                                      key={day}
                                      className="flex flex-col items-center"
                                    >
                                      <span
                                        className={`w-10 py-1.5 text-center text-[10px] font-bold rounded-md transition-all ${
                                          isActive
                                            ? "bg--600 text-white shadow-md"
                                            : "bg-white text-gray-300 border border-gray-100"
                                        }`}
                                      >
                                        {dayMap[day]}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 border-l border--100 pl-10">
                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                  Khung giờ
                                </p>
                                <div className="flex items-center gap-2 text-gray-900 font-bold">
                                  <Clock className="w-4 h-4 text--500" />
                                  <span className="text-sm">
                                    {selectedCluster.pricing_summary.effective_rule.start_time.slice(
                                      0,
                                      5,
                                    )}{" "}
                                    -{" "}
                                    {selectedCluster.pricing_summary.effective_rule.end_time.slice(
                                      0,
                                      5,
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                  Hệ số nhân
                                </p>
                                <div className="text-xl font-bold text--600">
                                  x
                                  {selectedCluster.pricing_summary
                                    .effective_rule.applied_modifier ||
                                    selectedCluster.pricing_summary
                                      .effective_rule.multiplier}
                                </div>
                              </div>
                            </div>
                          </div>
                        </section>
                      )}

                    {/* PHẦN 4: MÔ TẢ & THƯ VIỆN ẢNH */}
                    <section className="grid grid-cols-1 lg:grid-cols-12 gap-16 pt-6">
                      <div className="lg:col-span-5 space-y-8">
                        <div className="space-y-4">
                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-900 w-fit pb-1">
                            Giới thiệu
                          </h3>
                          <p className="text-[15px] text-gray-600 leading-relaxed font-light italic">
                            "
                            {selectedCluster.description ||
                              "Chưa có thông tin mô tả chi tiết cho cụm này."}
                            "
                          </p>
                        </div>

                        <div className="space-y-3 pt-6 border-t border-gray-50">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-600 font-bold uppercase tracking-widest">
                              Khởi tạo:
                            </span>
                            <span className="text-gray-900 font-semibold">
                              {new Date(
                                selectedCluster.createdAt,
                              ).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-600 font-bold uppercase tracking-widest">
                              Cập nhật:
                            </span>
                            <span className="text-gray-900 font-semibold">
                              {new Date(
                                selectedCluster.updatedAt,
                              ).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="lg:col-span-7 space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest border-b border-gray-900 w-fit pb-1">
                            Thư viện ảnh
                          </h3>
                          <span className="text-[10px] font-bold text-gray-600 uppercase tracking-tighter">
                            {selectedCluster.images?.length || 0} Tư liệu
                          </span>
                        </div>

                        {!selectedCluster.images ||
                        selectedCluster.images.length === 0 ? (
                          <div className="h-48 bg-gray-50 flex items-center justify-center border border-gray-100 rounded-xl">
                            <p className="text-[10px] text-gray-300 font-bold uppercase tracking-widest">
                              Trống
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3">
                            {selectedCluster.images.map((img, idx) => (
                              <div
                                key={idx}
                                className="aspect-[4/3] bg-gray-50 rounded-lg overflow-hidden group border border-gray-100 transition-all hover:shadow-md"
                              >
                                <img
                                  src={img.image_url}
                                  className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 transition-all duration-700"
                                  alt="Phòng chờ"
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </section>

                    {/* FOOTER: ID HỆ THỐNG */}
                    <footer className="pt-12 border-t border-gray-50 flex justify-between items-center">
                      <p className="text-[9px] text-gray-300 font-mono uppercase tracking-widest">
                        ID: {selectedCluster.id}
                      </p>
                      <p className="text-[9px] text-gray-300 font-mono uppercase">
                        Oasis v2.0
                      </p>
                    </footer>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={isAssignModalOpen}
        onOpenChange={(open: boolean) => {
          if (!open) setIsAssignModalOpen(false);
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Gán vật tư hàng loạt theo Cụm Pod</DialogTitle>
            <DialogDescription className="sr-only">
              Assign items in bulk by pod cluster.
            </DialogDescription>
          </DialogHeader>
          <div className="px-1 pb-1">
            <ClusterPodItemBulkAssign
              clusters={scopedClusters}
              isLoadingClusters={isScopeLoading}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
