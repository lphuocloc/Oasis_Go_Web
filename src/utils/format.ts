export const formatBookingPeriod = (start: string, end: string) => {
  const startDate = new Date(start);
  const endDate = new Date(end);

  // Định dạng giờ: 00:00
  const startTime = startDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const endTime = endDate.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Định dạng ngày: dd/mm/yyyy
  const dateStr = startDate.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return { timeRange: `${startTime} - ${endTime}`, date: dateStr };
};
