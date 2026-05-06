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
  Info
} from 'lucide-react';

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getDefaultDates = () => {
    const today = new Date();
    const currentMonth = today.getMonth(); 
    const currentYear = today.getFullYear();
    
    // Mặc định lấy kỳ lương tháng hiện tại (từ 29 tháng trước đến 28 tháng này)
    const from = new Date(currentYear, currentMonth - 2, 29);
    const to = new Date(currentYear, currentMonth - 1, 28);
    
    const formatDate = (date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    return {
      fromDate: formatDate(from),
      toDate: formatDate(to)
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDates());
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

  const dateError = useMemo(() => {
    const start = new Date(dateRange.fromDate);
    const end = new Date(dateRange.toDate);
    if (end < start) return "Lỗi: Ngày kết thúc < Ngày bắt đầu";
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 31) return `Lỗi: Khoảng cách quá dài (${diffDays} ngày)`;
    return null;
  }, [dateRange]);

  const scheduleData = useMemo(() => {
    if (dateError && dateError.includes("kết thúc < Ngày bắt đầu")) {
        return { totalStandardDays: 0, details: [], makeupCount: 0, paddingDays: 0 };
    }

    const start = new Date(dateRange.fromDate);
    const end = new Date(dateRange.toDate);
    const holidayDates = new Set(HOLIDAYS_2026);
    const details = [];
    let totalStandardDays = 0;
    
    // Tính số ô trống cần thiết ở đầu lịch dựa trên ngày bắt đầu
    const paddingDays = start.getDay(); // 0 là CN, 1 là T2...

    let curr = new Date(start);
    const dateArray = [];
    while (curr <= end) {
      dateArray.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    // Logic tìm ngày bù
    const makeupDays = new Set();
    dateArray.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.getDay();
        if (holidayDates.has(dateStr)) {
            const isFullOffDay = (dayOfWeek === 0) || (dayOfWeek === 6 && !includeSaturday);
            if (isFullOffDay) {
                let next = new Date(date);
                next.setDate(next.getDate() + 1);
                while (next <= end) {
                    const nStr = next.toISOString().split('T')[0];
                    const nDay = next.getDay();
                    const isWeekend = (nDay === 0) || (nDay === 6 && !includeSaturday);
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
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
            dayValue = 1;
        } else if (dayOfWeek === 6 && includeSaturday) {
            dayValue = 0.5;
        } else {
            dayValue = 0;
        }
      } else if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dayValue = 1;
        type = 'workday';
      } else if (dayOfWeek === 6) {
        if (includeSaturday) {
            dayValue = 0.5;
            type = 'saturday';
        } else {
            dayValue = 0;
            type = 'weekend';
        }
      } else if (dayOfWeek === 0) {
        dayValue = 0;
        type = 'weekend';
      }

      totalStandardDays += dayValue;
      details.push({ 
        dateLabel: date.getDate(), 
        fullDate: dateStr,
        dayOfWeek, 
        dayValue, 
        type, 
        isHoliday, 
        isMakeupDay 
      });
    });

    return { totalStandardDays, details, makeupCount: makeupDays.size, paddingDays };
  }, [dateRange, includeSaturday, dateError]);

  const calc = useMemo(() => {
    const { totalStandardDays } = scheduleData;
    const activeInsuranceRate = isFreelancer ? 0 : insuranceRate;
    const netAfterInsurance = grossSalary * (100 - activeInsuranceRate) / 100;
    const dailyRate = totalStandardDays > 0 ? netAfterInsurance / totalStandardDays : 0;
    const actualDays = Math.max(0, totalStandardDays - unpaidLeave);
    const salaryByDays = actualDays * dailyRate;

    let pit = 0;
    let totalDeduction = 0;

    if (isFreelancer) {
      pit = salaryByDays * 0.1;
      totalDeduction = 0;
    } else {
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

  const formatDateShort = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}`;
  };

  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const StepperInput = ({ value, onChange, step = 1, min = 0, max = 100, label, disabled = false }) => (
    <div className={`space-y-1 ${disabled ? "opacity-30 pointer-events-none" : ""}`}>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block">{label}</label>
      <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
        <button 
          onClick={() => onChange(Math.max(min, value - step))}
          className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input 
          type="number" 
          value={value} 
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full bg-transparent text-center text-xs font-bold focus:outline-none"
        />
        <button 
          onClick={() => onChange(Math.min(max, value + step))}
          className="p-1 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col antialiased">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/30 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 px-3 py-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-1 hover:bg-slate-100 rounded-lg">
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span className="text-base font-bold">Salary<span className="text-indigo-600">Lite</span></span>
          </div>
        </div>
        <div className="items-center gap-1.5">
          {isFreelancer && (
            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-amber-200">FREELANCER</span>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className={`
          fixed lg:relative inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-50 transform transition-transform duration-200
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          flex flex-col
        `}>
          <div className="p-3 flex-1 overflow-y-auto space-y-4 custom-scrollbar bg-indigo-50">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                  <CalendarRange className="w-2.5 h-2.5" /> Kỳ tính công
                </h3>
                <button 
                  onClick={() => setDateRange(getDefaultDates())}
                  className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded hover:bg-indigo-100 transition-colors"
                >
                  Mặc định
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1 p-1.5 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Từ</label>
                  <input 
                    type="date" 
                    value={dateRange.fromDate} 
                    onChange={(e) => setDateRange(prev => ({...prev, fromDate: e.target.value}))}
                    className="flex-1 px-1.5 py-1 bg-white border border-slate-200 rounded text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Đến</label>
                  <input 
                    type="date" 
                    value={dateRange.toDate} 
                    onChange={(e) => setDateRange(prev => ({...prev, toDate: e.target.value}))}
                    className="flex-1 px-1.5 py-1 bg-white border border-slate-200 rounded text-[11px] font-bold focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>
                {dateError && (
                    <div className="flex items-start gap-1.5 p-1.5 bg-red-50 rounded border border-red-100">
                        <AlertTriangle className="w-2.5 h-2.5 text-red-500 mt-0.5" />
                        <span className="text-[10px] text-red-600 leading-tight font-medium">{dateError}</span>
                    </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <UserCheck className="w-2.5 h-2.5" /> Loại nhân sự
              </h3>
              <div className="bg-slate-100 p-0.5 rounded flex">
                <button onClick={() => setIsFreelancer(false)} className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${!isFreelancer ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Chính thức</button>
                <button onClick={() => setIsFreelancer(true)} className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${isFreelancer ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500'}`}>Freelancer</button>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Settings className="w-2.5 h-2.5" /> Cấu hình lương
              </h3>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase mb-0.5 block">Lương Gross</label>
                  <input type="number" value={grossSalary} onChange={(e) => setGrossSalary(Number(e.target.value))} className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-bold focus:ring-1 focus:ring-indigo-500 outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <StepperInput 
                    label="% Bảo hiểm"
                    value={insuranceRate}
                    onChange={setInsuranceRate}
                    step={0.5}
                    disabled={isFreelancer}
                  />
                  <div className="flex flex-col">
                    <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Làm Thứ 7</label>
                    <button 
                      onClick={() => setIncludeSaturday(!includeSaturday)} 
                      className={`h-[30px] flex items-center justify-center rounded-lg border text-[10px] transition-all ${includeSaturday ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-bold' : 'bg-slate-50 border-slate-200 text-slate-400'}`}
                    >
                        {includeSaturday ? 'Sáng Thứ 7' : 'Nghỉ'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1.5">
                <Clock className="w-2.5 h-2.5" /> Chấm công
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <StepperInput 
                  label="Nghỉ ko lương"
                  value={unpaidLeave}
                  onChange={setUnpaidLeave}
                  step={0.5}
                  max={31}
                />
                <StepperInput 
                  label="Phụ thuộc"
                  value={dependents}
                  onChange={setDependents}
                  disabled={isFreelancer}
                  max={20}
                />
              </div>
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
            {[
              { label: 'Công chuẩn', val: scheduleData.totalStandardDays, color: 'bg-blue-50 text-blue-700 border-blue-100' },
              { label: 'Thực làm', val: calc.actualDays, color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
              { label: 'Lương/Ngày', val: formatCurrency(calc.dailyRate), color: 'bg-slate-100 text-slate-700 border-slate-200' },
              { label: 'Tổng số ngày', val: scheduleData.details.length, color: 'bg-white text-slate-600 border-slate-200 shadow-sm' }
            ].map((m, i) => (
              <div key={i} className={`${m.color} px-2.5 py-2 rounded-xl border flex flex-col justify-center`}>
                <span className="text-[8px] font-bold uppercase opacity-80 mb-0.5">{m.label}</span>
                <span className="text-[11px] md:text-xs font-black truncate">{m.val}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
            <div className="xl:col-span-7 space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-3 py-1.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold uppercase text-slate-500">Bảng tính lương chi tiết</h3>
                  <ShieldCheck className="w-3 h-3 text-indigo-500" />
                </div>
                
                <div className="p-3 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-600 uppercase"><ArrowUpRight className="w-2.5 h-2.5" /> Thu nhập</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="p-2 bg-blue-50/30 rounded-lg border border-blue-50 flex justify-between items-center">
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Gross Salary</p>
                        <p className="text-xs font-bold text-blue-900">{formatCurrency(grossSalary)}</p>
                      </div>
                      <div className="p-2 bg-blue-50/30 rounded-lg border border-blue-50 flex justify-between items-center">
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Lương theo công</p>
                        <p className="text-xs font-bold text-blue-900">{formatCurrency(calc.salaryByDays)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 uppercase"><MinusCircle className="w-2.5 h-2.5" /> Khấu trừ</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className={`p-2 bg-orange-50/30 rounded-lg border border-orange-50 flex justify-between items-center ${isFreelancer ? "opacity-30 grayscale" : ""}`}>
                        <p className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">Bảo hiểm</p>
                        <p className="text-[11px] font-bold text-orange-900">-{formatCurrency(isFreelancer ? 0 : calc.insuranceAmt)}</p>
                      </div>
                      <div className={`p-2 bg-indigo-50/30 rounded-lg border border-orange-50 flex justify-between items-center ${isFreelancer ? "opacity-30 grayscale" : ""}`}>
                        <p className="text-[9px] font-bold text-orange-500 uppercase tracking-tighter">Giảm trừ</p>
                        <p className="text-[11px] font-bold text-orange-900">-{formatCurrency(isFreelancer ? 0 : calc.totalDeduction)}</p>
                      </div>
                      <div className="p-2 bg-red-50/30 rounded-lg border border-red-50 flex justify-between items-center">
                        <p className="text-[9px] font-bold text-red-500 uppercase tracking-tighter">Thuế TNCN</p>
                        <p className="text-[11px] font-bold text-red-900">-{formatCurrency(calc.pit)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                    <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter block mb-0.5">Thực lĩnh kỳ này</span>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1 h-4 bg-indigo-600 rounded-full"></div>
                            <span className="text-base font-black text-slate-900 tracking-tight">
                                {formatCurrency(calc.takeHome).replace('₫', '').trim()} <span className="text-[10px] font-normal text-slate-400 uppercase">VND</span>
                            </span>
                        </div>
                    </div>
                    <div className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 rounded-lg flex items-center gap-1.5">
                         <Wallet className="w-3 h-3 text-indigo-600" />
                         <span className="text-[9px] font-black text-indigo-700 uppercase">Đã tính</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="xl:col-span-5 space-y-3">
              <div className="bg-white rounded-xl border border-slate-200 p-2.5 shadow-sm">
                <div className="flex items-center justify-between mb-2.5 px-1">
                  <div className="flex flex-col">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" /> Lịch làm việc
                    </h3>
                    <span className="text-[9px] text-slate-400 font-medium">Kỳ: {formatDateShort(dateRange.fromDate)} - {formatDateShort(dateRange.toDate)}</span>
                  </div>
                  {scheduleData.makeupCount > 0 && <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">+{scheduleData.makeupCount} NGHỈ BÙ</span>}
                </div>
                
                <div className="grid grid-cols-7 gap-1">
                  {dayNames.map(d => <div key={d} className="text-[8px] font-black text-slate-300 text-center uppercase py-0.5">{d}</div>)}
                  
                  {/* Padding Days for dynamic start day alignment */}
                  {Array.from({ length: scheduleData.paddingDays }).map((_, i) => (
                    <div key={`pad-${i}`} className="py-2 border border-transparent"></div>
                  ))}

                  {scheduleData.details.map((item, idx) => {
                    const isSaturday = item.dayOfWeek === 6;
                    const isSunday = item.dayOfWeek === 0;
                    
                    return (
                      <div key={idx} title={item.fullDate} className={`
                        py-2 flex items-center justify-center rounded text-[10px] font-bold transition-all relative border
                        ${item.type === 'workday' ? 'bg-slate-50 text-slate-500 border-slate-100' : 
                          item.type === 'saturday' ? 'bg-indigo-50 text-indigo-500 border-indigo-100' :
                          item.type === 'holiday' ? 'bg-red-50 text-red-600 border-red-100' :
                          item.type === 'makeup' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          isSunday ? 'bg-white text-slate-200 border-transparent opacity-60' :
                          'bg-white text-slate-200 border-transparent'}
                      `}>
                        {item.dateLabel}
                        {item.isMakeupDay && <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-amber-500 rounded-full"></div>}
                        {item.isHoliday && <div className="absolute bottom-0.5 right-0.5 w-1 h-1 bg-red-400 rounded-full"></div>}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-center gap-3 border-t border-slate-50 pt-2 text-[8px] font-bold text-slate-400 uppercase">
                   <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div> Làm</div>
                   <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> T7</div>
                   <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> Lễ</div>
                   <div className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div> Bù</div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 border-dashed flex gap-3">
                 <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                 <p className="text-[10px] text-indigo-700 leading-normal font-medium">
                    Hệ thống tự động nhận diện ngày nghỉ lễ theo lịch nhà nước 2026. <br/>
                    <strong>Lưu ý:</strong> Ngày công thực tế = Công chuẩn - Nghỉ không lương.
                 </p>
              </div>
              
              <button className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md shadow-slate-100">
                Xuất dữ liệu Excel <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </main>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 2px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; scale: 0.8; }
        input[type="number"] { -moz-appearance: textfield; }
        input[type="number"]::-webkit-inner-spin-button, 
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
      `}</style>
    </div>
  );
};

export default App;
