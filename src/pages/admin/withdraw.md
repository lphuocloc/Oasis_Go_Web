import React, { useState } from 'react';
import {
Search,
Filter,
CheckCircle2,
XCircle,
Info,
Download,
Wallet,
Clock,
ArrowUpRight,
ExternalLink,
ChevronDown,
Eye
} from 'lucide-react';
import { WithdrawalRequest, WithdrawalStatus } from '../types';
import StatusBadge from '../components/ui/StatusBadge';
import { motion, AnimatePresence } from 'motion/react';

// Mock data based on the structure provided
const MOCK_WITHDRAWALS: WithdrawalRequest[] = [
{
_id: "69e360fc4d081783f9397235",
user_id: "697b0c19fe090c38c8eebf25",
wallet_id: "76665ba8-cf23-4395-b288-c4d873f1befa",
amount: 100000,
status: "PENDING",
bank_name_snapshot: "MB Bank",
bank_account_number_snapshot: "0001478603300",
bank_account_holder_snapshot: "NGUYEN VAN A",
note: "Rút tiền về tài khoản ngân hàng",
processed_at: null,
processed_by: null,
id: "be4325d1-546a-48a0-ac4a-60c570ecb55b",
requested_at: "2026-04-18T10:46:20.434+00:00",
updated_at: "2026-04-18T10:46:20.434+00:00"
},
{
_id: "69e360fc4d081783f9397236",
user_id: "697b0c19fe090c38c8eebf26",
wallet_id: "76665ba8-cf23-4395-b288-c4d873f1befb",
amount: 500000,
status: "APPROVED",
bank_name_snapshot: "Vietcombank",
bank_account_number_snapshot: "1012345678",
bank_account_holder_snapshot: "TRAN THI B",
note: "Yêu cầu rút tiền hàng tháng",
processed_at: "2026-04-18T14:30:00.000+00:00",
processed_by: "Alex Morgan",
id: "be4325d1-546a-48a0-ac4a-60c570ecb55c",
requested_at: "2026-04-17T09:15:00.000+00:00",
updated_at: "2026-04-18T14:30:00.000+00:00"
},
{
_id: "69e360fc4d081783f9397237",
user_id: "697b0c19fe090c38c8eebf27",
wallet_id: "76665ba8-cf23-4395-b288-c4d873f1befc",
amount: 1500000,
status: "REJECTED",
bank_name_snapshot: "Techcombank",
bank_account_number_snapshot: "19034567891234",
bank_account_holder_snapshot: "LE VAN C",
note: "Rút tiền về Techcombank",
processed_at: "2026-04-19T08:00:00.000+00:00",
processed_by: "Alex Morgan",
id: "be4325d1-546a-48a0-ac4a-60c570ecb55d",
requested_at: "2026-04-19T07:30:00.000+00:00",
updated_at: "2026-04-19T08:00:00.000+00:00"
}
];

const Withdrawals = () => {
const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>(MOCK_WITHDRAWALS);
const [filterStatus, setFilterStatus] = useState<WithdrawalStatus | 'ALL'>('ALL');
const [searchTerm, setSearchTerm] = useState('');
const [selectedRequest, setSelectedRequest] = useState<WithdrawalRequest | null>(null);

const filteredRequests = withdrawals.filter(req => {
const matchesStatus = filterStatus === 'ALL' || req.status === filterStatus;
const matchesSearch =
req.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
req.bank_account_number_snapshot.includes(searchTerm) ||
req.bank_name_snapshot.toLowerCase().includes(searchTerm.toLowerCase());
return matchesStatus && matchesSearch;
});

const handleAction = (id: string, newStatus: WithdrawalStatus) => {
setWithdrawals(prev => prev.map(req =>
req.id === id ? {
...req,
status: newStatus,
processed_at: new Date().toISOString(),
processed_by: "Alex Morgan"
} : req
));
if (selectedRequest?.id === id) {
setSelectedRequest(null);
}
};

const getStatusColor = (status: WithdrawalStatus) => {
switch (status) {
case 'PENDING': return 'amber';
case 'APPROVED': return 'emerald';
case 'REJECTED': return 'rose';
default: return 'slate';
}
};

const formatCurrency = (amount: number) => {
return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};

const formatDate = (dateStr: string) => {
return new Date(dateStr).toLocaleString('vi-VN');
};

return (
<div className="space-y-6">
{/_ Page Header _/}
<div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
<div>
<h1 className="text-3xl font-bold text-slate-900">Quản lý Rút tiền</h1>
<p className="text-slate-500 mt-1">Phê duyệt và theo dõi các yêu cầu rút tiền từ ví của người dùng.</p>
</div>
<div className="flex items-center gap-3">
<button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
<Download size={18} />
Xuất báo cáo
</button>
</div>
</div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Chờ xử lý', value: withdrawals.filter(r => r.status === 'PENDING').length, icon: Clock, color: 'amber' },
          { title: 'Đã phê duyệt', value: withdrawals.filter(r => r.status === 'APPROVED').length, icon: CheckCircle2, color: 'emerald' },
          { title: 'Tổng yêu cầu', value: withdrawals.length, icon: Wallet, color: 'blue' },
          { title: 'Tổng tiền đã rút', value: formatCurrency(withdrawals.filter(r => r.status === 'APPROVED').reduce((acc, curr) => acc + curr.amount, 0)), icon: ArrowUpRight, color: 'indigo' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 bg-${stat.color}-50 text-${stat.color}-600`}>
              <stat.icon size={22} />
            </div>
            <p className="text-sm font-medium text-slate-500">{stat.title}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm theo Mã ID, số tài khoản hoặc ngân hàng..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0">
          <div className="flex items-center bg-slate-100 p-1 rounded-lg">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  filterStatus === status
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {status === 'ALL' ? 'Tất cả' : status === 'PENDING' ? 'Chờ duyệt' : status === 'APPROVED' ? 'Đã duyệt' : 'Từ chối'}
              </button>
            ))}
          </div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium transition-colors">
            <Filter size={16} />
            Bộ lọc nâng cao
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500 tracking-wider">Mã Giao Dịch</th>
                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500 tracking-wider">Người dùng</th>
                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500 tracking-wider">Số tiền</th>
                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500 tracking-wider">Ngân hàng</th>
                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500 tracking-wider">Trạng thái</th>
                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500 tracking-wider">Ngày yêu cầu</th>
                <th className="px-6 py-4 text-xs uppercase font-bold text-slate-500 tracking-wider text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((request) => (
                <tr key={request._id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">
                      {request.id.split('-')[0]}...
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                        {request.user_id.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-700">ID: {request.user_id.substring(0, 8)}...</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(request.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">{request.bank_name_snapshot}</span>
                      <span className="text-xs text-slate-500">{request.bank_account_number_snapshot}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={request.status === 'PENDING' ? 'AVAILABLE' : request.status === 'APPROVED' ? 'OCCUPIED' : 'OFFLINE'} label={request.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500">{formatDate(request.requested_at)}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <button
                        onClick={() => setSelectedRequest(request)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="Xem chi tiết"
                       >
                        <Eye size={18} />
                       </button>
                       {request.status === 'PENDING' && (
                         <>
                           <button
                             onClick={() => handleAction(request.id, 'APPROVED')}
                             className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                             title="Phê duyệt"
                           >
                            <CheckCircle2 size={18} />
                           </button>
                           <button
                             onClick={() => handleAction(request.id, 'REJECTED')}
                             className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                             title="Từ chối"
                           >
                            <XCircle size={18} />
                           </button>
                         </>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Wallet size={48} className="mb-4 opacity-20" />
                      <p className="text-sm font-medium">Không tìm thấy yêu cầu rút tiền nào</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      <AnimatePresence>
        {selectedRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRequest(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <h3 className="text-xl font-bold text-slate-900">Chi tiết yêu cầu rút tiền</h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Mã Giao Dịch</p>
                    <p className="text-sm font-mono text-slate-900">{selectedRequest.id}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Trạng thái hiện tại</p>
                    <StatusBadge status={selectedRequest.status === 'PENDING' ? 'AVAILABLE' : selectedRequest.status === 'APPROVED' ? 'OCCUPIED' : 'OFFLINE'} label={selectedRequest.status} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Wallet size={16} className="text-indigo-500" />
                    Thông tin tài chính
                  </h4>
                  <div className="grid grid-cols-2 gap-6 bg-indigo-50/30 p-4 rounded-xl border border-indigo-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Số tiền rút</p>
                      <p className="text-2xl font-bold text-indigo-700">{formatCurrency(selectedRequest.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Mã ví (Wallet ID)</p>
                      <p className="text-sm font-medium text-slate-700 truncate">{selectedRequest.wallet_id}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <ExternalLink size={16} className="text-indigo-500" />
                    Thông tin ngân hàng
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Ngân hàng</p>
                      <p className="text-sm font-bold text-slate-900">{selectedRequest.bank_name_snapshot}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Số tài khoản</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">{selectedRequest.bank_account_number_snapshot}</p>
                        <button className="text-indigo-600 hover:text-indigo-700"><Eye size={14} /></button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Chủ tài khoản</p>
                      <p className="text-sm font-bold text-slate-900 underline decoration-indigo-200 underline-offset-4">
                        {selectedRequest.bank_account_holder_snapshot || 'NGUYEN VAN A'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Ghi chú người dùng</p>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg italic border-l-4 border-indigo-400">
                    "{selectedRequest.note}"
                  </p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Yêu cầu lúc: {formatDate(selectedRequest.requested_at)}
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      Đóng
                    </button>
                    {selectedRequest.status === 'PENDING' && (
                      <>
                        <button
                          onClick={() => handleAction(selectedRequest.id, 'REJECTED')}
                          className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm font-bold rounded-lg transition-all"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleAction(selectedRequest.id, 'APPROVED')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-200 transition-all"
                        >
                          Phê duyệt rút tiền
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>

);
};

export default Withdrawals;
