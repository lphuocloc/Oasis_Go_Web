import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ClipboardCheck, Layers, Search } from "lucide-react";
import { toast } from "react-toastify";
import { itemApi, type InventoryItem } from "../../api/lib/itemApi";
import {
  podItemApi,
  type ClusterBulkCreateResult,
  type ClusterBulkPodItemEntry,
} from "../../api/lib/podItemApi";
import type { PodClusterItem } from "../../api/lib/podClusterApi";

interface SelectedItemDraft {
  item_id: string;
  name: string;
  expected_quantity: string;
  current_quantity: string;
}

interface ClusterPodItemBulkAssignProps {
  clusters: PodClusterItem[];
  isLoadingClusters?: boolean;
}

const toNonNegativeInteger = (value: string) => {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
};

export const ClusterPodItemBulkAssign = ({
  clusters,
  isLoadingClusters = false,
}: ClusterPodItemBulkAssignProps) => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [clusterId, setClusterId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [selectedItems, setSelectedItems] = useState<SelectedItemDraft[]>([]);
  const [summary, setSummary] = useState<ClusterBulkCreateResult | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setIsItemsLoading(true);
        const response = await itemApi.getAll();
        setItems(response.data);
      } catch (error: any) {
        toast.error(error?.response?.data?.message || "Failed to load items");
      } finally {
        setIsItemsLoading(false);
      }
    };

    loadItems();
  }, []);

  const selectedItemIdSet = useMemo(
    () => new Set(selectedItems.map((entry) => entry.item_id)),
    [selectedItems],
  );

  const filteredItems = useMemo(() => {
    const normalized = itemSearch.trim().toLowerCase();
    if (!normalized) return items;

    return items.filter((item) => {
      const itemName = item.name ?? item.item_name ?? "";
      return [item.id, itemName].join(" ").toLowerCase().includes(normalized);
    });
  }, [itemSearch, items]);

  const sortedClusters = useMemo(() => {
    return [...clusters].sort((a, b) => a.name.localeCompare(b.name));
  }, [clusters]);

  const toggleItemSelection = (item: InventoryItem, checked: boolean) => {
    const itemName = item.name ?? item.item_name ?? item.id;
    if (!checked) {
      setSelectedItems((prev) =>
        prev.filter((entry) => entry.item_id !== item.id),
      );
      return;
    }

    setSelectedItems((prev) => {
      if (prev.some((entry) => entry.item_id === item.id)) return prev;
      return [
        ...prev,
        {
          item_id: item.id,
          name: itemName,
          expected_quantity: "0",
          current_quantity: "0",
        },
      ];
    });
  };

  const updateSelectedItem = (
    itemId: string,
    key: "expected_quantity" | "current_quantity",
    value: string,
  ) => {
    setSelectedItems((prev) =>
      prev.map((entry) =>
        entry.item_id === itemId ? { ...entry, [key]: value } : entry,
      ),
    );
  };

  const validateAndBuildItems = (): ClusterBulkPodItemEntry[] | null => {
    if (!clusterId) {
      toast.error("Pod cluster is required");
      return null;
    }

    if (selectedItems.length === 0) {
      toast.error("Please select at least one item");
      return null;
    }

    const payloadItems: ClusterBulkPodItemEntry[] = [];
    for (const entry of selectedItems) {
      const expected = toNonNegativeInteger(entry.expected_quantity);
      const current = toNonNegativeInteger(entry.current_quantity);

      if (expected == null || current == null) {
        toast.error(
          `Invalid quantity for item ${entry.name}. Use non-negative integers only.`,
        );
        return null;
      }

      payloadItems.push({
        item_id: entry.item_id,
        expected_quantity: expected,
        current_quantity: current,
      });
    }

    return payloadItems;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const payloadItems = validateAndBuildItems();
    if (!payloadItems) return;

    try {
      setIsSubmitting(true);
      const response = await podItemApi.createForClusterBulk({
        cluster_id: clusterId,
        items: payloadItems,
      });

      setSummary(response.data);
      toast.success(
        response.message || "Assigned pod items for cluster successfully",
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          "Failed to assign pod items for cluster",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-indigo-600" />
            Gán vật tư theo cụm
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Chọn một cụm pod, chọn nhiều mục, sau đó gán số lượng dự kiến/hiện
            tại cho tất cả các pod trong cụm đó.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cụm
            </label>
            <select
              value={clusterId}
              onChange={(e) => {
                setClusterId(e.target.value);
                setSummary(null);
              }}
              disabled={isLoadingClusters}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:opacity-60"
            >
              <option value="">Chọn một cụm</option>
              {sortedClusters.map((cluster) => (
                <option key={cluster.id} value={cluster.id}>
                  {cluster.name} (
                  {cluster.location?.name ?? cluster.location_id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chọn vật tư
            </label>
            <div className="h-[42px] px-3 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700 flex items-center gap-2">
              <Layers className="w-4 h-4 text-gray-500" />
              <span>{selectedItems.length} món(s)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  placeholder="Tìm kiếm bằng tên, id..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {isItemsLoading ? (
                <div className="px-4 py-6 text-sm text-gray-400">
                  Đang tải...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-400">
                  Không tìm thấy vật tư
                </div>
              ) : (
                filteredItems.map((item) => {
                  const itemName = item.name ?? item.item_name ?? item.id;
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedItemIdSet.has(item.id)}
                        onChange={(event) =>
                          toggleItemSelection(item, event.target.checked)
                        }
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {itemName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {item.id}
                        </p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800">
                Chọn số lượng
              </span>
              <span className="text-xs text-gray-500">
                Chỉ các số nguyên không âm
              </span>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
              {selectedItems.length === 0 ? (
                <div className="px-4 py-6 text-sm text-gray-400">
                  Chọn các mặt hàng để cấu hình số lượng
                </div>
              ) : (
                selectedItems.map((entry) => (
                  <div key={entry.item_id} className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      {entry.name}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={entry.expected_quantity}
                        onChange={(e) =>
                          updateSelectedItem(
                            entry.item_id,
                            "expected_quantity",
                            e.target.value,
                          )
                        }
                        placeholder="Dự kiến"
                        className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={entry.current_quantity}
                        onChange={(e) =>
                          updateSelectedItem(
                            entry.item_id,
                            "current_quantity",
                            e.target.value,
                          )
                        }
                        placeholder="Hiện tại"
                        className="px-3 py-2 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || isLoadingClusters || isItemsLoading}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Đang phân bổ..." : "Phân bổ mục vào Pod trong cụm"}
          </button>
        </div>
      </form>

      {summary && (
        <div className="mt-5 border border-gray-200 rounded-lg p-4 bg-slate-50">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Tóm tắt</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-gray-500">Pods</p>
              <p className="font-semibold text-gray-900">{summary.pod_count}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg px-3 py-2">
              <p className="text-gray-500">Tổng số cặp</p>
              <p className="font-semibold text-gray-900">
                {summary.total_target_pairs}
              </p>
            </div>
            <div className="bg-white border border-emerald-200 rounded-lg px-3 py-2">
              <p className="text-emerald-700">Đã tạo</p>
              <p className="font-semibold text-emerald-800">
                {summary.created_count}
              </p>
            </div>
            <div className="bg-white border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-amber-700">Đã bỏ qua mục hiện có</p>
              <p className="font-semibold text-amber-800">
                {summary.skipped_existing_count}
              </p>
            </div>
          </div>

          {summary.created_count === 0 && (
            <div className="mt-3 px-3 py-2 border border-amber-200 rounded-lg bg-amber-50 text-amber-800 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              Tất cả các cặp pod-mặt hàng đã chọn đều đã tồn tại. Không có bản
              ghi mới nào được tạo.
            </div>
          )}
        </div>
      )}
    </section>
  );
};
