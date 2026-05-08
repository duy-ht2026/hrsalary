import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar, 
  Calculator, 
  Wallet,
  Clock,
  Settings,
  ShieldCheck,
  Menu,
  ArrowRight,
  ArrowUpRight,
  MinusCircle,
  PlusCircle,
  UserCheck,
  Zap,
  AlertTriangle,
  CalendarRange,
  Minus,
  Plus,
  Info,
  Users,
  Briefcase,
  ExternalLink
} from 'lucide-react';

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getDefaultDates = () => {
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const currentYear = today.getFullYear();
    const from = new Date(currentYear, currentMonth - 2, 29);
    const to = new Date(currentYear, currentMonth - 1, 28);
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    return { fromDate: formatDate(from), toDate: formatDate(to) };
  };

  const [dateRange, setDateRange] = useState(getDefaultDates());
  const [saturdayMode, setSaturdayMode] = useState(0.5); 
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [grossSalary, setGrossSalary] = useState(20000000); 
  const [insuranceRate, setInsuranceRate] = useState(10.5);
  const [unpaidLeave, setUnpaidLeave] = useState(0); 
  const [dependents, setDependents] = useState(0);

  const HOLIDAYS_2026 = [
    "2026-01-01", "2026-02-13", "2026-02-14", "2026-02-15", "2026-02-16", 
    "2026-02-17", "2026-02-18", "2026-02-19", "2026-04-26", "2026-04-30", 
    "2026-05-01", "2026-09-02", "2026-09-03"
  ];

  const dateError = useMemo(() => {
    const start = new Date(dateRange.fromDate);
    const end = new Date(dateRange.toDate);
    if (end < start) return "Lỗi: Ngày kết thúc < Ngày bắt đầu";
    const diffDays = Math.ceil(Math.abs(end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 31) return `Lỗi: Khoảng cách quá dài (${diffDays} ngày)`;
    return null;
  }, [dateRange]);

  const scheduleData = useMemo(() => {
    if (dateError) return { totalStandardDays: 0, details: [], makeupCount: 0, paddingDays: 0 };
    const start = new Date(dateRange.fromDate);
    const end = new Date(dateRange.toDate);
    const holidayDates = new Set(HOLIDAYS_2026);
    const details = [];
    let totalStandardDays = 0;
    const paddingDays = start.getDay(); 

    let curr = new Date(start);
    const dateArray = [];
    while (curr <= end) {
      dateArray.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const makeupDays = new Set();
    dateArray.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        if (holidayDates.has(dateStr)) {
            const isFullOffDay = (dayOfWeek === 0) || (dayOfWeek === 6 && saturdayMode === 0);
            if (isFullOffDay) {
                let next = new Date(date);
                next.setDate(next.getDate() + 1);
                while (next <= end) {
                    const nStr = next.toISOString().split('T')[0];
                    const nDay = next.getDay();
                    const isWeekend = (nDay === 0) || (nDay === 6 && saturdayMode === 0);
                    if (!isWeekend && !holidayDates.has(nStr) && !makeupDays.has(nStr)) {
                        makeupDays.add(nStr);
                        break;
                    }
                    next.setDate(next.getDate() + 1);
                }
            }
        }
    });

    dateArray.forEach(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();
      let dayValue = 0;
      let type = 'weekend'; 
      const isHoliday = holidayDates.has(dateStr);
      const isMakeupDay = makeupDays.has(dateStr);

      if (isMakeupDay) {
        type = 'makeup';
        dayValue = 1;
      } else if (isHoliday) {
        type = 'holiday';
        if (dayOfWeek >= 1 && dayOfWeek <= 5) dayValue = 1;
        else if (dayOfWeek === 6) dayValue = saturdayMode;
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dayValue = 1;
        type = 'workday';
      } else if (dayOfWeek === 6) {
        if (saturdayMode > 0) {
            dayValue = saturdayMode;
            type = 'saturday';
        }
      }
      totalStandardDays += dayValue;
      details.push({ dateLabel: date.getDate(), fullDate: dateStr, dayOfWeek, dayValue, type, isHoliday, isMakeupDay });
    });

    return { totalStandardDays, details, makeupCount: makeupDays.size, paddingDays };
  }, [dateRange, saturdayMode, dateError]);

  const calc = useMemo(() => {
    const { totalStandardDays } = scheduleData;
    const activeInsuranceRate = isFreelancer ? 0 : insuranceRate;
    const insuranceAmt = grossSalary * (activeInsuranceRate / 100);
    const dailyRate = totalStandardDays > 0 ? grossSalary / totalStandardDays : 0;
    const actualDays = Math.max(0, totalStandardDays - unpaidLeave);
    const salaryByDays = actualDays * dailyRate;

    let personalDeduction = 15500000; 
    let dependentDeduction = dependents * 6200000; 
    let totalDeduction = personalDeduction + dependentDeduction;

    let pit = 0;
    if (isFreelancer) {
      pit = salaryByDays * 0.1;
      totalDeduction = 0;
    } else {
      const taxableIncome = Math.max(0, salaryByDays - insuranceAmt - totalDeduction);
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

    const takeHome = salaryByDays - (isFreelancer ? 0 : insuranceAmt) - pit;

    return {
      dailyRate, actualDays, salaryByDays,
      pit, takeHome,
      totalStandardDays, totalDeduction, insuranceAmt,
      personalDeduction, dependentDeduction
    };
  }, [grossSalary, insuranceRate, scheduleData, unpaidLeave, dependents, isFreelancer]);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('vi-VN', { style: 'decimal', minimumFractionDigits: 0 }).format(Math.round(val)) + ' ₫';
  };

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const StepperInput = ({ value, onChange, step = 1, min = 0, max = 100, label, disabled = false }) => (
    <div className={`space-y-0.5 ${disabled ? "opacity-30 pointer-events-none" : ""}`}>
      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight block">{label}</label>
      <div className="flex items-center bg-white rounded-md p-0.5 border border-slate-200 shadow-sm h-7">
        <button onClick={() => onChange(Math.max(min, value - step))} className="p-0.5 hover:bg-slate-100 rounded transition-all text-slate-500">
          <Minus className="w-3 h-3" />
        </button>
        <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full bg-transparent text-center text-[11px] font-bold focus:outline-none" />
        <button onClick={() => onChange(Math.min(max, value + step))} className="p-0.5 hover:bg-slate-100 rounded transition-all text-slate-500">
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased overflow-hidden">
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />}

      <header className="flex-none bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1 hover:bg-slate-100 rounded-lg">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-black tracking-tighter">SALARY<span className="text-indigo-600">LITE</span></span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
           <span className="hidden sm:block text-[9px] font-bold text-slate-400 uppercase tracking-widest">v2026.05</span>
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar tối ưu padding */}
        <aside className={`fixed lg:relative inset-y-0 left-0 w-60 bg-indigo-50 border-r border-indigo-100 z-50 transform transition-transform duration-200 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col shadow-inner`}>
          <div className="p-3 flex-1 overflow-y-auto space-y-4 custom-scrollbar">
            {/* Kỳ tính công */}
            <div className="space-y-1.5">
              <h3 className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-1"><CalendarRange className="w-2.5 h-2.5" /> Kỳ tính công</h3>
              <div className="grid grid-cols-1 gap-1.5 p-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Từ</span>
                  <input type="date" value={dateRange.fromDate} onChange={(e) => setDateRange(prev => ({...prev, fromDate: e.target.value}))} className="bg-transparent text-[10px] font-bold outline-none" />
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Đến</span>
                  <input type="date" value={dateRange.toDate} onChange={(e) => setDateRange(prev => ({...prev, toDate: e.target.value}))} className="bg-transparent text-[10px] font-bold outline-none" />
                </div>
              </div>
            </div>

            {/* Loại nhân sự */}
            <div className="space-y-1.5">
              <h3 className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-1"><Users className="w-2.5 h-2.5" /> Nhân sự</h3>
              <div className="flex p-0.5 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <button onClick={() => setIsFreelancer(false)} className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${!isFreelancer ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>Chính thức</button>
                <button onClick={() => setIsFreelancer(true)} className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${isFreelancer ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}>Freelancer</button>
              </div>
            </div>

            {/* Cấu hình lương */}
            <div className="space-y-1.5">
              <h3 className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-1"><Settings className="w-2.5 h-2.5" /> Cấu hình</h3>
              <div className="p-2 bg-white rounded-lg border border-indigo-100 shadow-sm space-y-2">
                <div>
                  <label className="text-[9px] font-bold text-slate-400 uppercase block mb-0.5">Lương Gross</label>
                  <input type="number" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-bold outline-none focus:border-indigo-300" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StepperInput label="% Bảo hiểm" value={insuranceRate} onChange={setInsuranceRate} step={0.5} disabled={isFreelancer} />
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 uppercase mb-0.5 block">Lịch T7</label>
                    <select value={saturdayMode} onChange={(e) => setSaturdayMode(Number(e.target.value))} className="w-full h-7 px-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold outline-none">
                      <option value={0}>Nghỉ</option>
                      <option value={0.5}>Sáng</option>
                      <option value={1}>Full</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Chấm công */}
            <div className="space-y-1.5">
              <h3 className="text-[9px] font-bold text-indigo-400 uppercase flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> Chấm công</h3>
              <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
                <StepperInput label="Nghỉ KL" value={unpaidLeave} onChange={setUnpaidLeave} step={0.5} max={31} />
                <StepperInput label="Phụ thuộc" value={dependents} onChange={setDependents} disabled={isFreelancer} max={20} />
              </div>
            </div>
          </div>
        </aside>

        {/* Nội dung chính tối ưu margin */}
        <main className="flex-1 overflow-y-auto p-2.5 space-y-2.5 custom-scrollbar bg-slate-50/50">
          {/* Dashboard nhanh gọn */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: 'Công chuẩn', val: scheduleData.totalStandardDays, color: 'text-blue-600', bg: 'bg-blue-50/50 border-blue-100' },
              { label: 'Thực làm', val: calc.actualDays, color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100' },
              { label: 'Lương/Ngày', val: formatCurrency(calc.dailyRate), color: 'text-slate-600', bg: 'bg-white border-slate-200' },
              { label: 'Tổng số ngày', val: scheduleData.details.length, color: 'text-slate-400', bg: 'bg-white border-slate-200' }
            ].map((m, i) => (
              <div key={i} className={`${m.bg} px-3 py-1.5 rounded-xl border shadow-sm flex flex-col justify-center`}>
                <span className="text-[8px] font-black uppercase opacity-60 tracking-wider leading-none mb-0.5">{m.label}</span>
                <span className={`text-[11px] font-black ${m.color}`}>{m.val}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-2.5">
            <div className="xl:col-span-2 space-y-2.5">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-3 py-1.5 border-b border-slate-100 bg-white flex justify-between items-center">
                  <h3 className="text-[9px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5">Chi tiết bảng lương</h3>
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                </div>
                
                <div className="p-3 space-y-4">
                  {/* THU NHẬP */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest">
                        <ArrowUpRight className="w-3 h-3" /> Thu nhập
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="p-2 bg-blue-50/30 border border-blue-100/50 rounded-lg flex justify-between items-center">
                          <span className="text-[9px] font-bold text-blue-800 uppercase">Gross Salary (Gốc)</span>
                          <span className="text-xs font-black text-blue-900">{formatCurrency(grossSalary)}</span>
                      </div>
                      <div className="p-2 bg-blue-50 border border-blue-100 rounded-lg flex justify-between items-center">
                          <span className="text-[9px] font-bold text-blue-800 uppercase">Lương công thực</span>
                          <span className="text-xs font-black text-blue-900">{formatCurrency(calc.salaryByDays)}</span>
                      </div>
                    </div>
                  </div>

                  {/* KHẤU TRỪ */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-orange-600 uppercase tracking-widest">
                        <MinusCircle className="w-3 h-3" /> Khấu trừ & Thuế
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div className="p-2 bg-orange-50/50 border border-orange-100 rounded-lg flex justify-between items-center">
                          <span className="text-[9px] font-bold text-orange-700 uppercase">Bảo hiểm</span>
                          <span className="text-[10px] font-black text-orange-800">-{formatCurrency(calc.insuranceAmt)}</span>
                      </div>
                      <div className="p-2 bg-indigo-50/50 border border-indigo-100 rounded-lg flex justify-between items-center">
                          <span className="text-[9px] font-bold text-indigo-700 uppercase">Giảm trừ GC</span>
                          <span className="text-[10px] font-black text-indigo-800">-{formatCurrency(isFreelancer ? 0 : (calc.personalDeduction + calc.dependentDeduction))}</span>
                      </div>
                      <div className="p-2 bg-red-50/50 border border-red-100 rounded-lg flex justify-between items-center">
                          <span className="text-[9px] font-bold text-red-700 uppercase">Thuế TNCN</span>
                          <span className="text-[10px] font-black text-red-800">-{formatCurrency(calc.pit)}</span>
                      </div>
                    </div>
                  </div>

                  {/* THỰC LĨNH */}
                  <div className="pt-3 border-t border-dashed border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-8 bg-indigo-600 rounded-full"></div>
                        <div>
                          <span className="text-[9px] font-black text-slate-400 uppercase block tracking-tighter leading-none mb-0.5">Thực lĩnh</span>
                          <span className="text-xl font-black text-slate-900 tracking-tighter">
                              {formatCurrency(calc.takeHome)}
                          </span>
                        </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-[10px] shadow-md shadow-indigo-100">
                      <ShieldCheck className="w-3 h-3" /> CHỐT LƯƠNG
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Lịch làm việc tối ưu kích thước */}
            <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1.5"><Calendar className="w-3 h-3" /> Lịch làm việc</h3>
                  {scheduleData.makeupCount > 0 && <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black">+{scheduleData.makeupCount} NGHỈ BÙ</span>}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map(d => <div key={d} className="text-[8px] font-black text-slate-300 text-center uppercase">{d}</div>)}
                  {Array.from({ length: scheduleData.paddingDays }).map((_, i) => <div key={`pad-${i}`} className="h-6"></div>)}
                  {scheduleData.details.map((item, idx) => (
                    <div key={idx} className={`h-7 flex items-center justify-center rounded-md text-[9px] font-black border transition-all relative ${item.type === 'workday' ? 'bg-slate-50 text-slate-500 border-slate-100' : item.type === 'saturday' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' : item.type === 'holiday' ? 'bg-red-50 text-red-600 border-red-100' : item.type === 'makeup' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-white text-slate-200 border-transparent opacity-30'}`}>
                      {item.dateLabel}
                    </div>
                  ))}
                </div>
                
                <div className="grid grid-cols-2 gap-1 pt-2 border-t border-slate-50">
                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><div className="w-1.5 h-1.5 rounded bg-slate-100"></div> Làm việc</div>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><div className="w-1.5 h-1.5 rounded bg-indigo-50"></div> Thứ 7</div>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><div className="w-1.5 h-1.5 rounded bg-red-50"></div> Lễ/Nghỉ</div>
                    <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400"><div className="w-1.5 h-1.5 rounded bg-amber-50"></div> Nghỉ bù</div>
                </div>
            </div>
          </div>
        </main>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type="date"] { color-scheme: light; }
      `}</style>
    </div>
  );
};

export default App;
