import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Calculator, 
  Wallet,
  Info,
  Clock,
  Settings,
  TrendingDown,
  ShieldCheck,
  Menu,
  X,
  ArrowRight,
  ArrowUpRight,
  MinusCircle,
  UserCheck,
  Zap
} from 'lucide-react';

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 1. Khởi tạo tháng mặc định là tháng trước
  const getDefaultMonth = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}`;
  };

  const [monthStr, setMonthStr] = useState(getDefaultMonth());
  const [includeSaturday, setIncludeSaturday] = useState(true);
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [grossSalary, setGrossSalary] = useState(20000000);
  const [insuranceRate, setInsuranceRate] = useState(10.5);
  const [unpaidLeave, setUnpaidLeave] = useState(0);
  const [dependents, setDependents] = useState(0);

  const REF_PARAMS = {
    personalDeduction: 15500000,
    dependentDeduction: 6200000,
  };

  const HOLIDAYS_2026 = [
    "2026-01-01", "2026-02-13", "2026-02-14", "2026-02-15", "2026-02-16", 
    "2026-02-17", "2026-02-18", "2026-02-19", "2026-04-26", "2026-04-30", 
    "2026-05-01", "2026-09-02", "2026-09-03"
  ];

  const scheduleData = useMemo(() => {
    const [year, month] = monthStr.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    let totalStandardDays = 0;
    const details = [];
    const holidayDates = new Set(HOLIDAYS_2026);
    const makeupDays = new Set();

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const date = new Date(year, month - 1, i);
      const dayOfWeek = date.getDay();
      if (holidayDates.has(dateStr)) {
        const isFullOffDay = (dayOfWeek === 0) || (dayOfWeek === 6 && !includeSaturday);
        const isHalfOffDay = (dayOfWeek === 6 && includeSaturday);
        if (isFullOffDay || isHalfOffDay) {
          let nextDay = i + 1;
          while (nextDay <= daysInMonth) {
            const nextDate = new Date(year, month - 1, nextDay);
            const nextDayOfWeek = nextDate.getDay();
            const nextDateStr = `${year}-${String(month).padStart(2, '0')}-${String(nextDay).padStart(2, '0')}`;
            const isWeekend = (nextDayOfWeek === 0) || (nextDayOfWeek === 6 && !includeSaturday);
            if (!isWeekend && !holidayDates.has(nextDateStr) && !makeupDays.has(nextDateStr)) {
              makeupDays.add(nextDateStr);
              break;
            }
            nextDay++;
          }
        }
      }
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const date = new Date(year, month - 1, i);
      const dayOfWeek = date.getDay();
      let dayValue = 0;
      let type = 'weekend';
      const isHoliday = holidayDates.has(dateStr);
      const isMakeupDay = makeupDays.has(dateStr);

      if (isHoliday || isMakeupDay) {
        type = isHoliday ? 'holiday' : 'makeup';
        dayValue = 0;
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dayValue = 1;
        type = 'workday';
      } else if (dayOfWeek === 6 && includeSaturday) {
        dayValue = 0.5;
        type = 'saturday';
      }
      totalStandardDays += dayValue;
      details.push({ day: i, dayOfWeek, dayValue, type, isHoliday, isMakeupDay });
    }
    return { totalStandardDays, details, makeupCount: makeupDays.size };
  }, [monthStr, includeSaturday]);

  const calc = useMemo(() => {
    const { totalStandardDays } = scheduleData;
    
    // Nếu là freelancer, không trừ bảo hiểm ban đầu (vì tính 10% trên gross thực nhận)
    const activeInsuranceRate = isFreelancer ? 0 : insuranceRate;
    const netAfterInsurance = grossSalary * (100 - activeInsuranceRate) / 100;
    
    const dailyRate = totalStandardDays > 0 ? netAfterInsurance / totalStandardDays : 0;
    const actualDays = Math.max(0, totalStandardDays - unpaidLeave);
    const salaryByDays = actualDays * dailyRate;

    let pit = 0;
    let totalDeduction = 0;

    if (isFreelancer) {
      // Freelancer: Khấu trừ cố định 10% trên tổng thu nhập tính theo ngày công
      pit = salaryByDays * 0.1;
      totalDeduction = 0; // Không áp dụng giảm trừ gia cảnh
    } else {
      // Nhân viên chính thức: Tính theo biểu thuế lũy tiến
      totalDeduction = REF_PARAMS.personalDeduction + (dependents * REF_PARAMS.dependentDeduction);
      const taxableIncome = Math.max(0, salaryByDays - totalDeduction);
      
      if (taxableIncome > 0) {
        if (taxableIncome <= 5000000) pit = taxableIncome * 0.05;
        else if (taxableIncome <= 10000000) pit = taxableIncome * 0.1 - 250000;
        else if (taxableIncome <= 18000000) pit = taxableIncome * 0.15 - 750000;
        else if (taxableIncome <= 32000000) pit = taxableIncome * 0.2 - 1650000;
        else if (taxableIncome <= 52000000) pit = taxableIncome * 0.25 - 3250000;
        else if (taxableIncome <= 80000000) pit = taxableIncome * 0.3 - 5850000;
        else pit = taxableIncome * 0.35 - 9850000;
      }
    }

    return {
      netAfterInsurance, dailyRate, actualDays, salaryByDays,
      pit, takeHome: salaryByDays - pit,
      totalStandardDays, totalDeduction, insuranceAmt: grossSalary - netAfterInsurance
    };
  }, [grossSalary, insuranceRate, scheduleData, unpaidLeave, dependents, isFreelancer]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Math.round(val));
  };

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Header Compact */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            <span className="text-lg font-bold">Salary<span className="text-indigo-600">Lite</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isFreelancer && (
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 uppercase">Freelancer</span>
          )}
          <div className="bg-slate-100 px-3 py-1 rounded-full text-[11px] font-bold text-slate-500 uppercase tracking-tighter">
            Kỳ: {monthStr.split('-')[1]}/{monthStr.split('-')[0]}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Tối giản */}
        <aside className={`
          fixed lg:relative inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-200
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}>
          <div className="p-4 flex-1 overflow-y-auto space-y-5 custom-scrollbar">
            {/* Loại hình nhân sự */}
            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                <UserCheck className="w-3 h-3" /> Loại nhân sự
              </h3>
              <div className="bg-slate-100 p-1 rounded-lg flex">
                <button 
                  onClick={() => setIsFreelancer(false)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${!isFreelancer ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}
                >
                  Chính thức
                </button>
                <button 
                  onClick={() => setIsFreelancer(true)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all ${isFreelancer ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500'}`}
                >
                  Freelancer
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                <Settings className="w-3 h-3" /> Cấu hình lương
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Lương Gross</label>
                  <input type="number" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold focus:ring-1 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className={isFreelancer ? "opacity-30 pointer-events-none" : ""}>
                    <label className="text-[10px] text-slate-500 mb-1 block">% BH</label>
                    <input type="number" step="0.5" disabled={isFreelancer} value={insuranceRate} onChange={(e) => setInsuranceRate(Number(e.target.value))} className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 mb-1 block">Tháng</label>
                    <input type="month" value={monthStr} onChange={(e) => setMonthStr(e.target.value)} className="w-full px-1 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold" />
                  </div>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-indigo-50 rounded-lg border border-indigo-100">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Làm sáng T7</span>
                  <button onClick={() => setIncludeSaturday(!includeSaturday)} className={`relative h-5 w-9 rounded-full transition-colors ${includeSaturday ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                    <span className={`absolute top-1 left-1 h-3 w-3 rounded-full bg-white transition-transform ${includeSaturday ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                <Clock className="w-3 h-3" /> Chấm công
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 mb-1 block">Nghỉ ko lương</label>
                  <input type="number" step="0.5" value={unpaidLeave} onChange={(e) => setUnpaidLeave(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
                </div>
                <div className={isFreelancer ? "opacity-30 pointer-events-none" : ""}>
                  <label className="text-[10px] text-slate-500 mb-1 block">Phụ thuộc</label>
                  <input type="number" disabled={isFreelancer} value={dependents} onChange={(e) => setDependents(Number(e.target.value))} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold" />
                </div>
              </div>
            </div>
            
            <div className={`p-3 bg-slate-50 rounded-xl border border-slate-100 ${isFreelancer ? "opacity-30 grayscale" : ""}`}>
               <p className="text-[9px] text-slate-400 font-bold uppercase mb-2 tracking-tight">Mức giảm trừ</p>
               <div className="space-y-1 text-[10px]">
                 <div className="flex justify-between"><span>Bản thân:</span><span className="font-bold">15.5M</span></div>
                 <div className="flex justify-between"><span>Phụ thuộc:</span><span className="font-bold">6.2M</span></div>
               </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-4 custom-scrollbar">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Công chuẩn', val: calc.totalStandardDays, color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { label: 'Thực làm', val: calc.actualDays, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              { label: 'Lương/Ngày', val: formatCurrency(calc.dailyRate), color: 'bg-slate-100 text-slate-700 border-slate-200' },
              { label: 'Trạng thái', val: isFreelancer ? 'Freelance (10%)' : 'Full-time', color: 'bg-white text-slate-600 border-slate-200 shadow-sm' }
            ].map((m, i) => (
              <div key={i} className={`${m.color} px-3 py-2 rounded-xl border flex flex-col justify-center`}>
                <span className={`text-[8px] font-bold uppercase mb-0.5 opacity-80`}>{m.label}</span>
                <span className="text-[11px] md:text-xs font-black truncate">{m.val}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
            <div className="xl:col-span-8 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Chi tiết bảng lương</h3>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                
                <div className="p-3 md:p-4 space-y-4">
                  {/* Nhóm Thu nhập */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-blue-600 uppercase">
                      <ArrowUpRight className="w-3 h-3" /> Thu nhập gộp
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-50">
                        <p className="text-[9px] text-blue-500 mb-1">Lương Gross</p>
                        <p className="text-sm font-bold text-blue-900">{formatCurrency(grossSalary)}</p>
                      </div>
                      <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-50">
                        <p className="text-[9px] text-blue-500 mb-1">Thu nhập tính theo công</p>
                        <p className="text-sm font-bold text-blue-900">{formatCurrency(calc.salaryByDays)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Nhóm Khấu trừ */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase">
                      <MinusCircle className="w-3 h-3" /> Các khoản khấu trừ
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className={`p-2 bg-orange-50/50 rounded-xl border border-orange-50 ${isFreelancer ? "opacity-30 grayscale" : ""}`}>
                        <p className="text-[9px] text-orange-500 mb-0.5">Bảo hiểm {!isFreelancer && `(${insuranceRate}%)`}</p>
                        <p className="text-xs font-bold text-orange-900">-{formatCurrency(isFreelancer ? 0 : calc.insuranceAmt)}</p>
                      </div>
                      <div className={`p-2 bg-orange-50/50 rounded-xl border border-orange-50 ${isFreelancer ? "opacity-30 grayscale" : ""}`}>
                        <p className="text-[9px] text-orange-500 mb-0.5">Giảm trừ gia cảnh</p>
                        <p className="text-xs font-bold text-orange-900">-{formatCurrency(isFreelancer ? 0 : calc.totalDeduction)}</p>
                      </div>
                      <div className="p-2 bg-red-50/50 rounded-xl border border-red-50 relative overflow-hidden">
                        {isFreelancer && <div className="absolute top-0 right-0 p-1"><Zap className="w-2 h-2 text-red-400" /></div>}
                        <p className="text-[9px] text-red-500 mb-0.5">Thuế TNCN {isFreelancer && '(10%)'}</p>
                        <p className="text-xs font-bold text-red-900">-{formatCurrency(calc.pit)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Bảo mật Thực lĩnh - Tinh gọn & Điểm nhấn */}
                  <div className="mt-2 pt-4 border-t border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Kết toán cuối kỳ</span>
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                                <span className="text-base font-bold text-slate-900 tracking-tight">
                                    {formatCurrency(calc.takeHome).replace('₫', '').trim()} <span className="text-[10px] font-normal text-slate-400 italic">VND</span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
                         <Wallet className="w-3 h-3 text-indigo-600" />
                         <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Confirmed</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cột Phải: Lịch */}
            <div className="xl:col-span-4 flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" /> Lịch công
                  </h3>
                  {scheduleData.makeupCount > 0 && <span className="text-[10px] bg-amber-100 text-amber-700 px-2.5 py-1.5 rounded-md font-bold">+{scheduleData.makeupCount} NGÀY</span>}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map(d => <div key={d} className="text-[10px] font-black text-slate-300 text-center uppercase">{d}</div>)}
                  {Array.from({ length: scheduleData.details[0].dayOfWeek }).map((_, i) => <div key={i}></div>)}
                  {scheduleData.details.map(item => (
                    <div key={item.day} className={`
                      py-2 flex items-center justify-center rounded-md text-[9px] font-bold transition-all relative
                      ${item.type === 'workday' ? 'bg-slate-50 text-slate-500 border border-slate-100' : 
                        item.type === 'saturday' ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' :
                        item.type === 'holiday' ? 'bg-red-50 text-red-600 border border-red-100' :
                        item.type === 'makeup' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'text-slate-200 border border-transparent'}
                    `}>
                      {item.day}
                      {item.isMakeupDay && <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-amber-500 rounded-full"></div>}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-center gap-4 border-t border-slate-50 pt-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                   <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Lễ</div>
                   <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Nghỉ bù</div>
                   <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> T7</div>
                </div>
              </div>

              <button className="w-full bg-slate-900 text-white py-3 rounded-2xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all active:scale-[0.98] shadow-sm">
                Xuất phiếu lương <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        @media (max-width: 640px) {
          .aspect-square { min-height: 24px; }
        }
      `}</style>
    </div>
  );
};

export default App;
