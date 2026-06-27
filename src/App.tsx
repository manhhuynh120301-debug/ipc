/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  BarChart3, 
  FileText, 
  Settings, 
  Plus, 
  Minus, 
  TrendingUp, 
  TrendingDown, 
  Download, 
  Briefcase,
  Search,
  Clock,
  AlertCircle,
  Menu,
  X,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Activity,
  User,
  Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for tailwind classes */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

interface MonthlyStats {
  month: string;
  samples: number | null;
  workDays: number | null;
  lateDays: number | null;
  forgotDays: number | null;
}

// --- Mock Data / Initial State ---

const INITIAL_STATS: MonthlyStats = {
  month: 'Tháng hiện tại',
  samples: null,
  workDays: null,
  lateDays: null,
  forgotDays: null,
};

const PREV_STATS_INITIAL: MonthlyStats = {
  month: 'Tháng trước',
  samples: null,
  workDays: null,
  lateDays: null,
  forgotDays: null,
};

// --- Components ---

const AnimatedNumber = ({ value, prefix = '', suffix = '' }: { value: number, prefix?: string, suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1000;
    const startValue = displayValue;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * easeOut;
      
      setDisplayValue(Math.floor(current));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <>{prefix}{displayValue.toLocaleString()}{suffix}</>;
};

const AnimatedCounter = ({ value, decimals = 1 }: { value: number, decimals?: number }) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1200;
    const startValue = 0;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (value - startValue) * easeOut;
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue.toFixed(decimals)}</>;
};

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  prevValue, 
  colorClass, 
  glowColor,
  unit = '',
  usePercentage = false,
  isInverse = false,
  rotation = "rotate-0",
  isExport = false
}: { 
  title: string; 
  value: number | null; 
  icon: any; 
  prevValue?: number | null;
  colorClass: string;
  glowColor: string;
  unit?: string;
  usePercentage?: boolean;
  isInverse?: boolean;
  rotation?: string;
  isExport?: boolean;
}) => {
  const hasComparison = prevValue !== undefined && prevValue !== null;
  const safeValue = value || 0;
  const safePrevValue = prevValue || 0;
  const diff = hasComparison ? (value || 0) - (prevValue || 0) : 0;
  const percentChange = hasComparison && (prevValue || 0) !== 0 ? (diff / (prevValue || 0)) * 100 : 0;
  
  const isImproved = isInverse ? diff < 0 : diff > 0;
  const isNeutral = diff === 0;
  const isUp = diff > 0;

  return (
    <motion.div 
      whileHover={isExport ? undefined : { y: -6, scale: 1.01, boxShadow: "0 30px 60px -12px rgba(0, 0, 0, 0.1)" }}
      initial={isExport ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: isExport ? 0 : 0.5 }}
      className={cn(
        isExport
          ? "group bg-white rounded-[1.5rem] p-4 sm:p-5 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.06),0_8px_20px_-10px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col relative overflow-hidden h-full ring-1 ring-slate-200/50"
          : "group bg-white dark:bg-slate-900 rounded-[1.5rem] p-4 sm:p-5 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.06),0_8px_20px_-10px_rgba(0,0,0,0.03)] dark:shadow-none border border-white dark:border-slate-800/60 flex flex-col transition-all duration-500 relative overflow-hidden h-full ring-1 ring-slate-200/50 dark:ring-white/5"
      )}
    >
      {/* Row 1: Icon + Title */}
      <div className="flex items-center gap-3 mb-4">
        <div className={cn(
          "w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm transform transition-all duration-500",
          rotation,
          "group-hover:rotate-0",
          colorClass,
          "relative shrink-0"
        )}>
          <div className={cn("absolute inset-0 rounded-2xl blur-md opacity-40 animate-pulse", glowColor)} />
          <Icon className="w-6 h-6 text-white relative z-10 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" />
        </div>
        <p className={cn(
          isExport 
            ? "text-slate-900 text-base font-bold tracking-tight leading-none"
            : "text-slate-900 dark:text-slate-100 text-base font-bold tracking-tight leading-none"
        )}>{title}</p>
      </div>

      {/* Row 2 (FLEX): Value + Comparison */}
      <div className="flex items-end justify-between gap-2 mt-auto">
        <h3 className={cn(
          "text-4xl font-black tracking-tighter flex items-end gap-1 leading-none",
          isExport ? "text-slate-900" : "text-slate-900 dark:text-white"
        )}>
          {isExport ? safeValue.toLocaleString() : <AnimatedNumber value={safeValue} />}
          <span className={cn(
            "text-xs font-bold uppercase tracking-tight mb-1",
            isExport ? "text-slate-400" : "text-slate-400 dark:text-slate-500"
          )}>{unit}</span>
        </h3>

        {hasComparison && (
          <div className="flex flex-col items-end text-right">
            <motion.div 
              initial={isExport ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: isExport ? 0 : 0.5, ease: "easeOut" }}
              whileHover={isExport ? undefined : { scale: 1.03 }}
              className={cn(
                "flex items-center gap-0.5 text-xs font-bold leading-none px-2 py-1 rounded-lg transition-colors cursor-default",
                isUp 
                  ? (isExport ? "text-emerald-600 bg-emerald-50" : "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10")
                  : isNeutral 
                    ? (isExport ? "text-amber-500 bg-amber-50" : "text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10")
                    : (isExport ? "text-rose-600 bg-rose-50" : "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10")
              )}
            >
              {isUp ? <TrendingUp className="w-3 h-3" /> : diff < 0 ? <TrendingDown className="w-3 h-3" /> : null}
              {isNeutral ? (
                <span className="text-[10px] uppercase">
                  {(title === "Số ngày đi trễ" && safeValue === 0) ? 'Không đi trễ' :
                  (title === "Số ngày quên chấm" && safeValue === 0) ? 'Chấm công đủ' :
                  'DUY TRÌ'}
                </span>
              ) : (
                <div className="flex items-center">
                  {usePercentage ? (
                    <>
                      {isExport ? Math.abs(percentChange).toFixed(1) : <AnimatedCounter value={Math.abs(percentChange)} />}
                      <span>%</span>
                    </>
                  ) : (
                    <>
                      {isExport ? Math.abs(diff).toFixed(0) : <AnimatedCounter value={Math.abs(diff)} decimals={0} />}
                      <span className="ml-1 text-[10px] uppercase opacity-80">{unit || 'ngày'}</span>
                    </>
                  )}
                </div>
              )}
            </motion.div>
            <p className={cn(
              "text-[11px] font-medium mt-1.5 leading-none",
              isExport ? "text-slate-400" : "text-slate-400 dark:text-slate-500"
            )}>
              tháng trước <span className="font-bold">{safePrevValue}</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const RankingSkeleton = () => (
  <div className="space-y-3">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-100/40 dark:bg-slate-900/40 border border-transparent animate-pulse animate-duration-1000">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        </div>
        <div className="w-16 h-6 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
    ))}
  </div>
);

export default function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  
  const [reportingMonth, setReportingMonth] = useState('2026-07');
  const [comparisonMonth, setComparisonMonth] = useState('2026-06');

  const [currentStats, setCurrentStats] = useState<MonthlyStats>({
    month: 'Tháng hiện tại',
    samples: null,
    workDays: null,
    lateDays: null,
    forgotDays: null,
  });

  const [prevStats, setPrevStats] = useState<MonthlyStats | null>(null);

  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const mobileExportRef = useRef<HTMLDivElement>(null);
  const desktopExportRef = useRef<HTMLDivElement>(null);

  // Helper date conversions
  const toMonthYear = (yyyyMm: string): string => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    return `${month}/${year}`;
  };

  interface RankingItem {
    msnv: string;
    name: string;
    samples: number;
    workDays: number;
    lateDays: number;
    forgotDays: number;
  }

  const [rankingMonth, setRankingMonth] = useState('2026-06');
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);

  // Direct Apps Script integration helpers
  const APPS_SCRIPT_URL = (import.meta as any).env.VITE_APPS_SCRIPT_URL || '';

  const apiGetEmployee = async (msnv: string) => {
    if (!APPS_SCRIPT_URL) {
      console.warn("VITE_APPS_SCRIPT_URL is not set.");
      return { found: false, error: "Vui lòng cấu hình VITE_APPS_SCRIPT_URL" };
    }
    const res = await fetch(`${APPS_SCRIPT_URL}?action=employee&msnv=${encodeURIComponent(msnv)}`);
    return await res.json();
  };

  const apiGetReport = async (msnv: string, month: string) => {
    if (!APPS_SCRIPT_URL) {
      console.warn("VITE_APPS_SCRIPT_URL is not set.");
      return { found: false, error: "Vui lòng cấu hình VITE_APPS_SCRIPT_URL" };
    }
    const res = await fetch(`${APPS_SCRIPT_URL}?action=report&msnv=${encodeURIComponent(msnv)}&month=${encodeURIComponent(month)}`);
    return await res.json();
  };

  const apiGetRankings = async (month: string) => {
    if (!APPS_SCRIPT_URL) {
      console.warn("VITE_APPS_SCRIPT_URL is not set.");
      return [];
    }
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=ranking&month=${encodeURIComponent(month)}`);
      const data = await res.json();
      return data.rankings || [];
    } catch (err) {
      console.error("Error loading rankings:", err);
      return [];
    }
  };

  const apiSaveReport = async (payload: {
    msnv: string;
    month: string;
    samples: number | null;
    workDays: number | null;
    lateDays: number | null;
    forgotDays: number | null;
  }) => {
    if (!APPS_SCRIPT_URL) {
      console.warn("VITE_APPS_SCRIPT_URL is not set.");
      return { success: false, error: "Vui lòng cấu hình VITE_APPS_SCRIPT_URL" };
    }
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: JSON.stringify({
        action: 'saveReport',
        ...payload
      }),
    });
    return await res.json();
  };

  const fetchRankings = async () => {
    if (!rankingMonth) return;
    setIsLoadingRankings(true);
    try {
      const formattedMonth = toMonthYear(rankingMonth);
      const data = await apiGetRankings(formattedMonth);
      setRankings(data);
    } catch (err) {
      console.error("Error fetching rankings:", err);
    } finally {
      setIsLoadingRankings(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [rankingMonth]);

  // Load current stats automatically from Sheet
  useEffect(() => {
    const mY = toMonthYear(reportingMonth);
    if (!employeeId.trim() || !employeeName) {
      setCurrentStats({
        month: mY || 'Tháng hiện tại',
        samples: null,
        workDays: null,
        lateDays: null,
        forgotDays: null,
      });
      return;
    }

    const fetchCurrentReport = async () => {
      try {
        const data = await apiGetReport(employeeId.trim(), mY);
        if (data.found) {
          setCurrentStats({
            month: mY,
            samples: data.samples,
            workDays: data.workDays,
            lateDays: data.lateDays,
            forgotDays: data.forgotDays,
          });
        } else {
          setCurrentStats({
            month: mY,
            samples: null,
            workDays: null,
            lateDays: null,
            forgotDays: null,
          });
        }
      } catch (err) {
        console.error('Error loading current report:', err);
      }
    };

    fetchCurrentReport();
  }, [employeeId, employeeName, reportingMonth]);

  // Check backend configuration
  useEffect(() => {
    setGoogleSheetsConnected(!!APPS_SCRIPT_URL);
  }, [APPS_SCRIPT_URL]);

  // Employee MSNV lookup debounced
  useEffect(() => {
    if (!employeeId.trim()) {
      setEmployeeName('');
      setEmployeeError('');
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const data = await apiGetEmployee(employeeId.trim());
        if (data.found) {
          setEmployeeName(data.name);
          setEmployeeError('');
        } else {
          setEmployeeName('');
          setEmployeeError('Không tìm thấy mã nhân viên.');
        }
      } catch (err) {
        console.error('Error fetching employee:', err);
        setEmployeeName('');
        setEmployeeError('Lỗi kết nối máy chủ.');
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [employeeId]);

  // Load previous stats automatically from Sheet
  useEffect(() => {
    if (!employeeId.trim() || !employeeName) {
      setPrevStats(null);
      return;
    }

    const fetchPrevReport = async () => {
      try {
        const mY = toMonthYear(comparisonMonth);
        const data = await apiGetReport(employeeId.trim(), mY);
        if (data.found) {
          setPrevStats({
            month: mY,
            samples: data.samples,
            workDays: data.workDays,
            lateDays: data.lateDays,
            forgotDays: data.forgotDays,
          });
        } else {
          setPrevStats(null);
        }
      } catch (err) {
        console.error('Error loading report:', err);
        setPrevStats(null);
      }
    };

    fetchPrevReport();
  }, [employeeId, employeeName, comparisonMonth]);

  // Handle data submission to backend
  const handleUpdateData = async () => {
    if (!employeeId.trim() || !employeeName) {
      setNotification({ type: 'error', message: 'Vui lòng nhập đúng mã nhân viên.' });
      return;
    }

    setIsUpdating(true);
    try {
      const data = await apiSaveReport({
        msnv: employeeId.trim(),
        month: toMonthYear(reportingMonth),
        samples: currentStats.samples,
        workDays: currentStats.workDays,
        lateDays: currentStats.lateDays,
        forgotDays: currentStats.forgotDays,
      });

      if (data && (data.success || data.local)) {
        setNotification({ 
          type: 'success', 
          message: data.local 
            ? 'Cập nhật thành công (Chế độ Offline).' 
            : 'Đã lưu và cập nhật dữ liệu Google Sheets thành công!' 
        });
        fetchRankings();
      } else {
        setNotification({ type: 'error', message: 'Không thể cập nhật dữ liệu.' });
      }
    } catch (err) {
      console.error('Error saving report:', err);
      setNotification({ type: 'error', message: 'Lỗi kết nối khi lưu dữ liệu.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Notification automatic dismissal
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const captureWithLightTheme = async (targetEl: HTMLElement) => {
    const docEl = document.documentElement;
    const bodyEl = document.body;
    const hasDarkDoc = docEl.classList.contains('dark');
    const hasDarkBody = bodyEl.classList.contains('dark');
    
    if (hasDarkDoc) docEl.classList.remove('dark');
    if (hasDarkBody) bodyEl.classList.remove('dark');
    
    try {
      const canvas = await domToCanvas(targetEl, {
        backgroundColor: '#ffffff',
        scale: 3,
      });
      return canvas;
    } finally {
      if (hasDarkDoc) docEl.classList.add('dark');
      if (hasDarkBody) bodyEl.classList.add('dark');
    }
  };

  const handleExportPNG = async () => {
    const isMobile = window.innerWidth < 768;
    const targetEl = isMobile ? mobileExportRef.current : desktopExportRef.current;
    if (targetEl) {
      try {
        const canvas = await captureWithLightTheme(targetEl);
        const link = document.createElement('a');
        link.download = `dashboard-${currentStats.month}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('Error exporting PNG:', err);
      }
    }
  };

  const handleExportPDF = async () => {
    const isMobile = window.innerWidth < 768;
    const targetEl = isMobile ? mobileExportRef.current : desktopExportRef.current;
    if (targetEl) {
      try {
        const canvas = await captureWithLightTheme(targetEl);
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgProps = pdf.getImageProperties(imgData);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()));
        pdf.save(`dashboard-${currentStats.month}.pdf`);
      } catch (err) {
        console.error('Error exporting PDF:', err);
      }
    }
  };

  const handleExportReport = async () => {
    const isMobile = window.innerWidth < 768;
    const targetEl = isMobile ? mobileExportRef.current : desktopExportRef.current;
    if (!targetEl) return;
    setIsExporting(true);
    try {
      const canvas = await captureWithLightTheme(targetEl);
      
      const formattedMonth = currentStats.month && currentStats.month !== 'Tháng hiện tại'
        ? currentStats.month.replace(/\//g, '-')
        : (reportingMonth ? reportingMonth.split('-').reverse().join('-') : 'month');
      const filename = `bao-cao-ipc-${employeeId || 'unknown'}-${formattedMonth}.png`;
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setIsExporting(false);
          return;
        }

        const file = new File(
          [blob],
          filename,
          { type: 'image/png' }
        );

        // Try Web Share API first
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              title: 'Báo cáo IPC',
              text: 'Báo cáo tháng IPC',
              files: [file]
            });
            setNotification({ type: 'success', message: 'Chia sẻ báo cáo thành công!' });
          } catch (shareErr) {
            const errName = (shareErr as any)?.name;
            if (errName === 'AbortError' || errName === 'NotAllowedError') {
              console.log('Share was cancelled by user:', shareErr);
            } else {
              console.error('Web Share failed, falling back to download:', shareErr);
              triggerDownload(canvas, filename);
            }
          }
        } else {
          triggerDownload(canvas, filename);
        }
        setIsExporting(false);
      }, 'image/png');

    } catch (err) {
      console.error('Error exporting report:', err);
      setNotification({ type: 'error', message: 'Có lỗi xảy ra khi xuất báo cáo.' });
      setIsExporting(false);
    }
  };

  const triggerDownload = (canvas: HTMLCanvasElement, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setNotification({ 
      type: 'success', 
      message: 'Thiết bị không hỗ trợ chia sẻ trực tiếp. Ảnh đã được tải xuống.' 
    });
  };

  const renderRankItem = (item: RankingItem, index: number, valueKey: 'samples' | 'workDays', unit: string) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
    const isTop3 = index < 3;
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.05 }}
        key={item.msnv}
        className={cn(
          "flex items-center justify-between px-2.5 py-3 sm:p-3.5 rounded-2xl transition-all duration-300",
          isTop3 
            ? "bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-500/10 hover:border-indigo-500/20" 
            : "bg-white/40 dark:bg-slate-900/10 border border-transparent hover:border-slate-200/50 dark:hover:border-slate-800/50"
        )}
      >
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
          <span className={cn(
            "w-5 sm:w-6 text-center font-black flex items-center justify-center flex-shrink-0 text-[16px] sm:text-[18px]",
            isTop3 ? "text-indigo-500" : "text-slate-400"
          )}>
            {medal ? medal : `${index + 1}`}
          </span>
          <div className="flex items-center min-w-0 flex-1 py-0.5 pr-1">
            <span className="text-[15px] sm:text-base font-black text-slate-800 dark:text-slate-100 break-words sm:truncate leading-tight">
              {item.name}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-1.5 sm:ml-2">
          <div className={cn(
            "rounded-xl sm:rounded-full font-black transition-all",
            "px-2 py-1 sm:py-1 sm:px-3 text-center flex items-center justify-center border",
            isTop3 
              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20" 
              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/50 dark:border-slate-700/50"
          )}>
            {valueKey === 'samples' ? (
              <span className="text-[13px] sm:text-sm whitespace-nowrap flex items-center gap-0.5">
                <span>{item.samples}</span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">mẫu</span>
                <span className="text-slate-300 dark:text-slate-700 mx-0.5">/</span>
                <span>{item.workDays}</span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">ngày</span>
              </span>
            ) : (
              <span className="text-[13px] sm:text-sm whitespace-nowrap flex items-center gap-0.5">
                <span>{item[valueKey]}</span>
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">{unit}</span>
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const navItems = [
    { id: 'Overview', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'Analytics', icon: BarChart3, label: 'Phân tích' },
    { id: 'Reports', icon: FileText, label: 'Báo cáo' },
    { id: 'Settings', icon: Settings, label: 'Cài đặt' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 font-sans transition-colors duration-300">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={cn(
              "fixed top-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border backdrop-blur-md max-w-sm",
              notification.type === 'success' 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
            )}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
            )}
            <p className="text-xs font-bold">{notification.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="w-full max-w-full overflow-hidden flex flex-col">
        <div className="px-6 pt-4 pb-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
          <motion.section 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-6xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-[2rem] border border-white dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl">
                  <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Cài đặt báo cáo</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Cấu hình thông tin</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {googleSheetsConnected && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-[8px] font-semibold uppercase tracking-normal">
                    <div className="w-1 h-1 rounded-full bg-emerald-500" />
                    Connected
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">MSNV</label>
                <input 
                  type="text" 
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="Nhập MSNV"
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm"
                />
                {isSearching && <p className="text-[10px] text-indigo-500 font-bold ml-1">Đang tra cứu...</p>}
                {!isSearching && employeeError && <p className="text-[10px] text-rose-500 font-bold ml-1">{employeeError}</p>}
                {!isSearching && employeeName && (
                  <p className="text-[10px] text-emerald-500 font-bold ml-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {employeeName}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Tháng báo cáo</label>
                <input 
                  type="month" 
                  value={reportingMonth}
                  onChange={e => setReportingMonth(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm cursor-pointer"
                />
              </div>
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1 flex justify-between">
                  Tháng đối chiếu
                </label>
                <div className="relative">
                  <input 
                    type="month" 
                    value={comparisonMonth}
                    onChange={e => setComparisonMonth(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </motion.section>

          {/* Input Panel Section - Data Detail */}
          <div className="max-w-6xl mx-auto grid grid-cols-2 gap-4">
            {/* Current Month Panel */}
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                  <Plus className="w-4 h-4 text-indigo-600" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">DL HIỆN TẠI</h3>
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Số mẫu</label>
                    <input 
                      type="number" 
                      value={currentStats.samples ?? ''}
                      onChange={e => setCurrentStats({...currentStats, samples: e.target.value === '' ? null : parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Ngày làm</label>
                    <input 
                      type="number" 
                      value={currentStats.workDays ?? ''}
                      onChange={e => setCurrentStats({...currentStats, workDays: e.target.value === '' ? null : parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Đi trễ</label>
                    <input 
                      type="number" 
                      value={currentStats.lateDays ?? ''}
                      onChange={e => setCurrentStats({...currentStats, lateDays: e.target.value === '' ? null : parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Quên CC</label>
                    <input 
                      type="number" 
                      value={currentStats.forgotDays ?? ''}
                      onChange={e => setCurrentStats({...currentStats, forgotDays: e.target.value === '' ? null : parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Previous Month Panel - Read Only */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-slate-500" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">DL TRƯỚC</h3>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Số mẫu</label>
                    <input 
                      type="number" 
                      readOnly
                      disabled
                      value={prevStats?.samples ?? 0}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Ngày làm</label>
                    <input 
                      type="number" 
                      readOnly
                      disabled
                      value={prevStats?.workDays ?? 0}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Đi trễ</label>
                    <input 
                      type="number" 
                      readOnly
                      disabled
                      value={prevStats?.lateDays ?? 0}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Quên CC</label>
                    <input 
                      type="number" 
                      readOnly
                      disabled
                      value={prevStats?.forgotDays ?? 0}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Primary Action Button */}
          <div className="max-w-6xl mx-auto flex justify-center mt-2 pb-2">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleUpdateData}
              disabled={isUpdating || !employeeId.trim() || !employeeName}
              className="px-8 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isUpdating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Activity className="w-4 h-4" />
              )}
              CẬP NHẬT DỮ LIỆU
            </motion.button>
          </div>

          {/* This container will be exported as the actual Report PNG */}
          <div ref={dashboardRef} className="max-w-4xl mx-auto space-y-4 bg-slate-50/40 dark:bg-slate-950 p-6 sm:p-10 rounded-3xl shadow-sm ring-1 ring-slate-100 dark:ring-slate-800">
            {/* REPORT HEADER */}
            <header className="px-2 pt-0 pb-6 border-b border-slate-200/60 dark:border-slate-800/60">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">BÁO CÁO THÁNG - IPC</h1>
              <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-2 uppercase tracking-wide">
                {employeeName || 'Người dùng'}
              </p>
            </header>

            {/* KPI Section */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard 
              title="Số mẫu phân tích"
              value={currentStats.samples}
              prevValue={prevStats?.samples}
              icon={CheckCircle2}
              colorClass="bg-gradient-to-br from-blue-500 to-blue-700"
              glowColor="bg-blue-500"
              unit="mẫu"
              usePercentage
              rotation="rotate-[-8deg]"
            />
            <StatCard 
              title="Số ngày làm"
              value={currentStats.workDays}
              prevValue={prevStats?.workDays}
              icon={Briefcase}
              colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600"
              glowColor="bg-emerald-500"
              unit="ngày"
              rotation="rotate-[8deg]"
            />
            <StatCard 
              title="Số ngày đi trễ"
              value={currentStats.lateDays}
              prevValue={prevStats?.lateDays}
              icon={Clock}
              colorClass="bg-gradient-to-br from-orange-400 to-orange-600"
              glowColor="bg-orange-500"
              unit="ngày"
              isInverse
              rotation="rotate-[-8deg]"
            />
            <StatCard 
              title="Số ngày quên chấm"
              value={currentStats.forgotDays}
              prevValue={prevStats?.forgotDays}
              icon={AlertCircle}
              colorClass="bg-gradient-to-br from-rose-500 to-rose-700"
              glowColor="bg-rose-500"
              unit="ngày"
              isInverse
              rotation="rotate-[8deg]"
            />
          </section>
          </div>

          {/* Export Report Button */}
          <div className="max-w-4xl mx-auto flex justify-center py-4">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px -5px rgba(99, 102, 241, 0.4)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExportReport}
              disabled={isExporting}
              className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              {isExporting ? 'ĐANG XUẤT...' : 'XUẤT BÁO CÁO'}
            </motion.button>
          </div>

          {/* THỐNG KÊ IPC */}
          <div className="max-w-4xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-3 py-5 sm:p-8 rounded-[2rem] border border-white dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl">
                  <BarChart3 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight uppercase">THỐNG KÊ IPC</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-wider">Bảng xếp hạng tháng</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2">Chọn tháng</span>
                <input 
                  type="month" 
                  value={rankingMonth}
                  onChange={e => setRankingMonth(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Panel 1: Xếp hạng số mẫu */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 px-2 py-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-4">
                <h4 
                  className="text-[1.1rem] font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2"
                  style={{ textShadow: "0 0 10px rgba(99,102,241,0.35), 0 0 20px rgba(99,102,241,0.20)" }}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                  </span>
                  Xếp hạng số mẫu
                </h4>

                {isLoadingRankings ? (
                  <RankingSkeleton />
                ) : rankings.length === 0 ? (
                  <div className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Chưa có dữ liệu tháng được chọn
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(() => {
                      const sorted = [...rankings].sort((a, b) => b.samples - a.samples);
                      return sorted.map((item, index) => renderRankItem(item, index, 'samples', 'mẫu'));
                    })()}
                  </div>
                )}
              </div>

              {/* Panel 2: Xếp hạng ngày làm */}
              <div className="bg-slate-50/50 dark:bg-slate-950/40 px-2 py-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-4">
                <h4 
                  className="text-[1.1rem] font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2"
                  style={{ textShadow: "0 0 10px rgba(16,185,129,0.35), 0 0 20px rgba(16,185,129,0.20)" }}
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
                  </span>
                  Xếp hạng ngày làm
                </h4>

                {isLoadingRankings ? (
                  <RankingSkeleton />
                ) : rankings.length === 0 ? (
                  <div className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                    Chưa có dữ liệu tháng được chọn
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {(() => {
                      const sorted = [...rankings].sort((a, b) => b.workDays - a.workDays);
                      return sorted.map((item, index) => renderRankItem(item, index, 'workDays', 'ngày'));
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <footer className="px-8 py-6 text-center text-slate-400 dark:text-slate-600 text-xs">
          <p className="font-medium tracking-wide">© 2026 WORKTRACK PLATFORM. FUTURISTIC PERFORMANCE ANALYTICS.</p>
        </footer>
      </main>

      {/* Off-screen Export Containers */}
      <div 
        style={{ position: 'absolute', left: '-9999px', top: '-9999px' }} 
        className="pointer-events-none" 
        aria-hidden="true"
      >
        {/* Mobile Export Layout */}
        <div 
          ref={mobileExportRef} 
          style={{ width: '450px' }} 
          className="bg-[#f8fafc] p-8 rounded-3xl space-y-6"
        >
          <header className="px-2 pt-0 pb-6 border-b border-slate-200/60">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase">BÁO CÁO THÁNG - IPC</h1>
            <p className="text-sm font-semibold text-slate-400 mt-2 uppercase tracking-wide">
              {employeeName || 'Người dùng'}
            </p>
          </header>
          
          <div className="flex flex-col gap-4">
            <StatCard 
              title="Số mẫu phân tích"
              value={currentStats.samples}
              prevValue={prevStats?.samples}
              icon={CheckCircle2}
              colorClass="bg-gradient-to-br from-blue-500 to-blue-700"
              glowColor="bg-blue-500"
              unit="mẫu"
              usePercentage
              rotation="rotate-[-8deg]"
              isExport
            />
            <StatCard 
              title="Số ngày làm"
              value={currentStats.workDays}
              prevValue={prevStats?.workDays}
              icon={Briefcase}
              colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600"
              glowColor="bg-emerald-500"
              unit="ngày"
              rotation="rotate-[8deg]"
              isExport
            />
            <StatCard 
              title="Số ngày đi trễ"
              value={currentStats.lateDays}
              prevValue={prevStats?.lateDays}
              icon={Clock}
              colorClass="bg-gradient-to-br from-orange-400 to-orange-600"
              glowColor="bg-orange-500"
              unit="ngày"
              isInverse
              rotation="rotate-[-8deg]"
              isExport
            />
            <StatCard 
              title="Số ngày quên chấm"
              value={currentStats.forgotDays}
              prevValue={prevStats?.forgotDays}
              icon={AlertCircle}
              colorClass="bg-gradient-to-br from-rose-500 to-rose-700"
              glowColor="bg-rose-500"
              unit="ngày"
              isInverse
              rotation="rotate-[8deg]"
              isExport
            />
          </div>
        </div>

        {/* Desktop Export Layout */}
        <div 
          ref={desktopExportRef} 
          style={{ width: '1100px' }} 
          className="bg-[#f8fafc] p-10 rounded-[2rem] space-y-6"
        >
          <header className="px-2 pt-0 pb-6 border-b border-slate-200/60">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-tight uppercase">BÁO CÁO THÁNG - IPC</h1>
            <p className="text-sm font-semibold text-slate-400 mt-2 uppercase tracking-wide">
              {employeeName || 'Người dùng'}
            </p>
          </header>
          
          <div className="grid grid-cols-4 gap-4">
            <StatCard 
              title="Số mẫu phân tích"
              value={currentStats.samples}
              prevValue={prevStats?.samples}
              icon={CheckCircle2}
              colorClass="bg-gradient-to-br from-blue-500 to-blue-700"
              glowColor="bg-blue-500"
              unit="mẫu"
              usePercentage
              rotation="rotate-[-8deg]"
              isExport
            />
            <StatCard 
              title="Số ngày làm"
              value={currentStats.workDays}
              prevValue={prevStats?.workDays}
              icon={Briefcase}
              colorClass="bg-gradient-to-br from-emerald-400 to-emerald-600"
              glowColor="bg-emerald-500"
              unit="ngày"
              rotation="rotate-[8deg]"
              isExport
            />
            <StatCard 
              title="Số ngày đi trễ"
              value={currentStats.lateDays}
              prevValue={prevStats?.lateDays}
              icon={Clock}
              colorClass="bg-gradient-to-br from-orange-400 to-orange-600"
              glowColor="bg-orange-500"
              unit="ngày"
              isInverse
              rotation="rotate-[-8deg]"
              isExport
            />
            <StatCard 
              title="Số ngày quên chấm"
              value={currentStats.forgotDays}
              prevValue={prevStats?.forgotDays}
              icon={AlertCircle}
              colorClass="bg-gradient-to-br from-rose-500 to-rose-700"
              glowColor="bg-rose-500"
              unit="ngày"
              isInverse
              rotation="rotate-[8deg]"
              isExport
            />
          </div>
        </div>
      </div>
    </div>
  );
}

