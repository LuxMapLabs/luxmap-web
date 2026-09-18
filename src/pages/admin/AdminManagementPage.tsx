import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Users,
  MapPin,
  ArrowLeft,
  Server,
  KeyRound,
  CheckCircle2,
} from 'lucide-react'

export const AdminManagementPage: React.FC = () => {
  const navigate = useNavigate()

  const systemUsers = [
    {
      id: 'USR-001',
      username: 'admin',
      fullName: 'System Administrator',
      role: 'Quản trị viên (Administrator)',
      scope: 'Toàn hệ thống (*)',
      status: 'Đang hoạt động',
      badgeColor: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    },
    {
      id: 'USR-002',
      username: 'agency',
      fullName: 'Managing Authority Officer',
      role: 'Cơ quan Quản lý (Management Agency)',
      scope: 'Liên xã / Đơn vị quản lý',
      status: 'Đang hoạt động',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
    {
      id: 'USR-003',
      username: 'engineer',
      fullName: 'Maintenance Engineer',
      role: 'Kỹ sư Bảo trì (Maintenance Engineer)',
      scope: 'Xã được phân công',
      status: 'Đang hoạt động',
      badgeColor: 'bg-amber-100 text-amber-700 border-amber-200',
    },
    {
      id: 'USR-004',
      username: 'crew',
      fullName: 'Survey and Repair Crew',
      role: 'Đội Khảo sát & Sửa chữa (Field Crew)',
      scope: 'Hiện trường tuyến cột',
      status: 'Đang hoạt động',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200',
    },
  ]

  return (
    <div className="h-full w-full bg-slate-50 overflow-y-auto p-6 md:p-10 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-xs border border-indigo-200 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                ADMIN ONLY
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Phân Hệ Quản Trị Hệ Thống
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý tài khoản, phân quyền tác nghiệp và kiểm soát phạm vi địa bàn hành chính (BE-08 / Contract mục 7).
            </p>
          </div>

          <button
            onClick={() => navigate('/gis-map')}
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 shadow-2xs transition-all flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về Bản đồ GIS</span>
          </button>
        </div>

        {/* System Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Tài khoản Tác nghiệp</p>
              <p className="text-xl font-black text-slate-900">4 Vai trò RBAC</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Phạm vi Quản trị</p>
              <p className="text-xl font-black text-slate-900">Toàn quyền (*)</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Trạng thái Xác thực</p>
              <p className="text-xl font-black text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Cookie Secure Active
              </p>
            </div>
          </div>
        </div>

        {/* User Roles Table */}
        <div className="rounded-2xl bg-white border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-500" />
              Danh Sách Tài Khoản & Quyền Hạn Đã Khởi Tạo
            </h2>
            <span className="text-[11px] text-slate-400">Database Seeded Data</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Mã ID</th>
                  <th className="p-3.5">Tài khoản</th>
                  <th className="p-3.5">Tên hiển thị</th>
                  <th className="p-3.5">Vai trò (RBAC)</th>
                  <th className="p-3.5">Phạm vi địa bàn (Claim)</th>
                  <th className="p-3.5 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {systemUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-700">{u.id}</td>
                    <td className="p-3.5 font-bold text-slate-900">{u.username}</td>
                    <td className="p-3.5 text-slate-600">{u.fullName}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[11px] border ${u.badgeColor}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-600">{u.scope}</td>
                    <td className="p-3.5 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminManagementPage
