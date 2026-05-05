export const getOrderStatusDetail = (status: string) => {
  switch (status) {
    case "PAID":
      return {
        label: "ĐÃ THANH TOÁN",
        classes: "bg-emerald-50 text-emerald-700 border-emerald-100",
      };
    case "PENDING":
      return {
        label: "CHỜ THANH TOÁN",
        classes: "bg-amber-50 text-amber-700 border-amber-100",
      };
    case "PARTIAL_CANCEL":
      return {
        label: "HỦY MỘT PHẦN",
        classes: "bg-orange-50 text-orange-700 border-orange-100",
      };
    case "FULLY_CANCELLED":
    case "CANCEL":
      return {
        label: "ĐÃ HỦY ĐƠN",
        classes: "bg-rose-50 text-rose-700 border-rose-100",
      };
    default:
      return {
        label: status || "KÈM TRẠNG THÁI",
        classes: "bg-slate-50 text-slate-700 border-slate-100",
      };
  }
};
export const getCheckInStateDetail = (state: string) => {
  const states: Record<string, any> = {
    PENDING: {
      label: "CHỜ NHẬN PHÒNG",
      classes: "bg-amber-50 text-amber-700 border-amber-200 dot-amber-500",
      description: "Chưa tới giờ check-in",
      dot: true,
    },
    MANUAL_CHECKED_IN: {
      label: "KHÁCH CHECK-IN",
      classes:
        "bg-emerald-50 text-emerald-700 border-emerald-200 dot-emerald-500",
      description: "Khách đang sử dụng",
      dot: true,
    },
    AUTO_ACTIVATED: {
      label: "HỆ THỐNG TỰ ĐỘNG",
      classes: "bg-sky-50 text-sky-700 border-sky-200 dot-sky-500",
      description: "Hệ thống tự kích hoạt",
      dot: true,
    },
    NO_SHOW: {
      label: "VẮNG MẶT",
      classes: "bg-rose-50 text-rose-700 border-rose-200 dot-rose-500",
      description: "Khách không đến",
      dot: false,
    },
  };

  return (
    states[state] || {
      label: "HẾT PHIÊN",
      classes: "bg-slate-50 text-slate-500 border-slate-200 dot-slate-400",
      description: "Phiên đã kết thúc",
      dot: false,
    }
  );
};
