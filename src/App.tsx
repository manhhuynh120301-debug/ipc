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
  Share2,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
// @ts-ignore
import topBanner from './assets/banner-top.png';
// @ts-ignore
import topBanner2 from './assets/images/banner-top2.png';
// @ts-ignore
import topBanner3 from './assets/images/banner-top3.png';
// @ts-ignore
import bottomBanner from './assets/banner-bottom.webp';

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

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const isIosExport = isExport && isIOS;

  if (isIosExport) {
    return (
      <div className="group bg-white rounded-[1.5rem] p-4 sm:p-5 border border-slate-200 flex flex-col relative h-full">
        {/* Row 1: Icon + Title */}
        <div className="flex items-center gap-3 mb-4">
          <div className={cn(
            "w-11 h-11 rounded-2xl flex items-center justify-center relative shrink-0",
            colorClass
          )}>
            <Icon className="w-6 h-6 text-white relative z-10" />
          </div>
          <p className="text-slate-900 text-base font-bold tracking-tight leading-none">{title}</p>
        </div>

        {/* Row 2 (FLEX): Value + Comparison */}
        <div className="flex items-end justify-between gap-2 mt-auto">
          <h3 className="text-4xl font-black tracking-tighter flex items-end gap-1 leading-none text-slate-900">
            {safeValue.toLocaleString()}
            <span className="text-xs font-bold uppercase tracking-tight mb-1 text-slate-400">{unit}</span>
          </h3>

          {hasComparison && (
            <div className="flex flex-col items-end text-right">
              <div 
                className={cn(
                  "flex items-center gap-0.5 font-bold leading-none rounded-lg transition-colors cursor-default whitespace-nowrap text-nowrap flex-shrink-0 text-[11px] px-1.5 py-0.5",
                  isUp 
                    ? "text-emerald-600 bg-emerald-50"
                    : isNeutral 
                      ? "text-amber-500 bg-amber-50"
                      : "text-rose-600 bg-rose-50"
                )}
                style={{ minWidth: '95px', justifyContent: 'center' }}
              >
                {isUp ? <TrendingUp className="w-3 h-3 flex-shrink-0" /> : diff < 0 ? <TrendingDown className="w-3 h-3 flex-shrink-0" /> : null}
                {isNeutral ? (
                  <span className="text-[10px] uppercase whitespace-nowrap text-nowrap flex-shrink-0">
                    {(title === "Số ngày đi trễ" && safeValue === 0) ? 'Không đi trễ' :
                    (title === "Số ngày quên chấm" && safeValue === 0) ? 'Chấm công đủ' :
                    'DUY TRÌ'}
                  </span>
                ) : (
                  <div className="flex items-center whitespace-nowrap text-nowrap flex-shrink-0">
                    {usePercentage ? (
                      <>
                        {Math.abs(percentChange).toFixed(1)}
                        <span>%</span>
                      </>
                    ) : (
                      <>
                        {Math.abs(diff).toFixed(0)}
                        <span className="ml-1 text-[10px] uppercase opacity-80">{unit || 'ngày'}</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-[11px] font-medium mt-1.5 leading-none whitespace-nowrap text-nowrap text-slate-400">
                tháng trước <span className="font-bold">{safePrevValue}</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          "w-11 h-11 rounded-2xl flex items-center justify-center relative shrink-0",
          cn("shadow-sm transform transition-all duration-500 group-hover:rotate-0", rotation),
          colorClass
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
                "flex items-center gap-0.5 font-bold leading-none rounded-lg transition-colors cursor-default whitespace-nowrap text-nowrap flex-shrink-0",
                isExport ? "text-[11px] px-1.5 py-0.5" : "text-xs px-2 py-1",
                isUp 
                  ? (isExport ? "text-emerald-600 bg-emerald-50" : "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10")
                  : isNeutral 
                    ? (isExport ? "text-amber-500 bg-amber-50" : "text-amber-500 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10")
                    : (isExport ? "text-rose-600 bg-rose-50" : "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10")
              )}
              style={isExport ? { minWidth: '95px', justifyContent: 'center' } : undefined}
            >
              {isUp ? <TrendingUp className="w-3 h-3 flex-shrink-0" /> : diff < 0 ? <TrendingDown className="w-3 h-3 flex-shrink-0" /> : null}
              {isNeutral ? (
                <span className="text-[10px] uppercase whitespace-nowrap text-nowrap flex-shrink-0">
                  {(title === "Số ngày đi trễ" && safeValue === 0) ? 'Không đi trễ' :
                  (title === "Số ngày quên chấm" && safeValue === 0) ? 'Chấm công đủ' :
                  'DUY TRÌ'}
                </span>
              ) : (
                <div className="flex items-center whitespace-nowrap text-nowrap flex-shrink-0">
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
              "text-[11px] font-medium mt-1.5 leading-none whitespace-nowrap text-nowrap",
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
  
  // Realtime clock state for the header banner
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scrollY, setScrollY] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Top banner carousel states
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const banners = [
    '/assets/banner-top.png',
    '/assets/banner-top2.png',
    '/assets/banner-top3.png'
  ];
  const bannerImages = [topBanner, topBanner2, topBanner3];

  const [bannerHeight, setBannerHeight] = useState(260);

  useEffect(() => {
    const updateHeight = () => {
      const w = window.innerWidth;
      if (w >= 1920) {
        setBannerHeight(300);
      } else if (w >= 1024) {
        setBannerHeight(260);
      } else if (w >= 768) {
        setBannerHeight(220);
      } else if (w >= 480) {
        setBannerHeight(180);
      } else {
        setBannerHeight(160);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  useEffect(() => {
    const bannerTimer = setInterval(() => {
      setCurrentBannerIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(bannerTimer);
  }, [banners.length]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockTimer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run initially to capture current position
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
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

  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);

  const [googleSheetsConnected, setGoogleSheetsConnected] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const mobileExportRef = useRef<HTMLDivElement>(null);
  const desktopExportRef = useRef<HTMLDivElement>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPwaPrompt, setShowPwaPrompt] = useState<boolean>(false);
  const [pwaPlatform, setPwaPlatform] = useState<'ios' | 'android_chrome' | null>(null);

  // Helper date conversions
  const toMonthYear = (yyyyMm: string): string => {
    if (!yyyyMm) return '';
    const [year, month] = yyyyMm.split('-');
    return `${month}/${year}`;
  };

  // Cross-platform bulletproof custom date parsing (dd/mm/yyyy hh:mm:ss or raw JS date)
  const parseCustomDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    try {
      const cleanStr = dateStr.replace(/,/g, '').trim();
      if (cleanStr.includes('GMT') || (isNaN(Number(cleanStr)) && !cleanStr.includes('/'))) {
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) return d;
      }

      const parts = cleanStr.split(/\s+/);
      if (parts.length < 1) return null;

      const datePart = parts[0];
      const timePart = parts[1] || "00:00:00";

      const dParts = datePart.split('/');
      if (dParts.length !== 3) {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? null : d;
      }

      const day = parseInt(dParts[0]);
      const month = parseInt(dParts[1]) - 1; // 0-indexed
      const year = parseInt(dParts[2]);

      const tParts = timePart.split(':');
      const hours = tParts[0] ? parseInt(tParts[0]) : 0;
      const minutes = tParts[1] ? parseInt(tParts[1]) : 0;
      const seconds = tParts[2] ? parseInt(tParts[2]) : 0;

      const d = new Date(year, month, day, hours, minutes, seconds);
      return isNaN(d.getTime()) ? null : d;
    } catch (err) {
      console.error("Error parsing date:", dateStr, err);
      return null;
    }
  };

  // Helper to format any date string cleanly as "dd/mm/yyyy • hh:mm:ss"
  const formatNotificationDate = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const cleanStr = dateStr.replace(/,/g, '').trim();
      if (cleanStr.includes('GMT') || (isNaN(Number(cleanStr)) && !cleanStr.includes('/'))) {
        const d = new Date(cleanStr);
        if (!isNaN(d.getTime())) {
          const pad = (num: number) => String(num).padStart(2, '0');
          const day = pad(d.getDate());
          const month = pad(d.getMonth() + 1);
          const year = d.getFullYear();
          const hours = pad(d.getHours());
          const minutes = pad(d.getMinutes());
          const seconds = pad(d.getSeconds());
          return `${day}/${month}/${year} • ${hours}:${minutes}:${seconds}`;
        }
      }

      const parts = cleanStr.split(/\s+/);
      if (parts.length >= 2) {
        const datePart = parts[0]; // e.g. "30/06/2026"
        const timePart = parts[1]; // e.g. "14:21:16"
        if (datePart.includes('/') && timePart.includes(':')) {
          return `${datePart} • ${timePart}`;
        }
      }
      return dateStr;
    } catch (e) {
      console.error("Error formatting notification date:", dateStr, e);
      return dateStr;
    }
  };

  // Calculate Start and End Date for a given report month
  const getCycleBounds = (reportingMonthStr: string) => {
    let year = 2026;
    let month = 6;
    
    if (reportingMonthStr.includes('-')) {
      const parts = reportingMonthStr.split('-');
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
    } else if (reportingMonthStr.includes('/')) {
      const parts = reportingMonthStr.split('/');
      month = parseInt(parts[0]);
      year = parseInt(parts[1]);
    }

    // Start date: 1st of reportingMonthStr month at 00:00:00
    const startDate = new Date(year, month - 1, 1, 0, 0, 0);

    // End date: 15th of next month at 23:59:59
    let nextMonth = month + 1;
    let nextYear = year;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear = year + 1;
    }
    const endDate = new Date(nextYear, nextMonth - 1, 15, 23, 59, 59);

    return { startDate, endDate };
  };

  // Calculate Start and End Date for current cycle (REAL current date only)
  // Each cycle starts day 1 of current month, ends day 15 of next month.
  // If today is <= 15, cycle starts day 1 of previous month and ends day 15 of current month.
  // If today is >= 16, cycle starts day 1 of current month and ends day 15 of next month.
  const getCurrentCycleBounds = () => {
    const now = new Date();
    const date = now.getDate();
    const month = now.getMonth(); // 0-indexed
    const year = now.getFullYear();

    let startYear = year;
    let startMonth = month;

    if (date <= 15) {
      startMonth = month - 1;
      if (startMonth < 0) {
        startMonth = 11;
        startYear = year - 1;
      }
    } else {
      startMonth = month;
    }

    const startDate = new Date(startYear, startMonth, 1, 0, 0, 0);

    let endMonth = startMonth + 1;
    let endYear = startYear;
    if (endMonth > 11) {
      endMonth = 0;
      endYear = startYear + 1;
    }
    const endDate = new Date(endYear, endMonth, 15, 23, 59, 59);

    return { startDate, endDate };
  };

  // Notification States
  const [notifications, setNotifications] = useState<Array<{ date: string; name: string; month: string }>>([]);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [lastReadTime, setLastReadTime] = useState<number>(() => {
    const val = localStorage.getItem('notification_last_read_time') || localStorage.getItem('lastReadTime');
    return val ? parseInt(val) : 0;
  });

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
  const APPS_SCRIPT_URL_RAW = (import.meta as any).env.VITE_APPS_SCRIPT_URL || '';
  const APPS_SCRIPT_URL = typeof APPS_SCRIPT_URL_RAW === 'string' &&
    (APPS_SCRIPT_URL_RAW.startsWith('http://') || APPS_SCRIPT_URL_RAW.startsWith('https://'))
    ? APPS_SCRIPT_URL_RAW
    : '';

  const [showInstructions, setShowInstructions] = useState(false);

  const initLocalDB = () => {
    if (!localStorage.getItem('local_employees')) {
      localStorage.setItem('local_employees', JSON.stringify([
        { msnv: 'IPC001', name: 'Nguyễn Văn An' },
        { msnv: 'IPC002', name: 'Trần Thị Bình' },
        { msnv: 'IPC003', name: 'Lê Hoàng Giang' },
        { msnv: 'IPC004', name: 'Phạm Minh Đức' },
        { msnv: 'IPC005', name: 'Vũ Hồng Hạnh' }
      ]));
    }
    if (!localStorage.getItem('local_reports')) {
      localStorage.setItem('local_reports', JSON.stringify([
        { msnv: 'IPC001', month: '06/2026', samples: 45, workDays: 22, lateDays: 1, forgotDays: 0 },
        { msnv: 'IPC001', month: '07/2026', samples: 48, workDays: 24, lateDays: 0, forgotDays: 1 },
        { msnv: 'IPC002', month: '06/2026', samples: 50, workDays: 21, lateDays: 2, forgotDays: 0 },
        { msnv: 'IPC003', month: '06/2026', samples: 40, workDays: 23, lateDays: 0, forgotDays: 2 },
        { msnv: 'IPC004', month: '06/2026', samples: 38, workDays: 20, lateDays: 3, forgotDays: 1 },
        { msnv: 'IPC005', month: '06/2026', samples: 42, workDays: 22, lateDays: 1, forgotDays: 0 }
      ]));
    }
    if (!localStorage.getItem('local_notifications')) {
      localStorage.setItem('local_notifications', JSON.stringify([
        { date: '28/06/2026 19:15:00', name: 'Trần Thị Bình', month: '06/2026' },
        { date: '28/06/2026 17:30:00', name: 'Nguyễn Văn An', month: '06/2026' },
        { date: '27/06/2026 11:20:00', name: 'Vũ Hồng Hạnh', month: '06/2026' }
      ]));
    }
  };

  useEffect(() => {
    initLocalDB();
  }, []);

  const apiGetEmployee = async (msnv: string) => {
    const cleanMsnv = msnv.trim().toUpperCase();
    if (!APPS_SCRIPT_URL) {
      initLocalDB();
      const emps = JSON.parse(localStorage.getItem('local_employees') || '[]');
      const found = emps.find((e: any) => e.msnv === cleanMsnv);
      if (found) {
        return { found: true, name: found.name };
      }
      const autoName = `Nhân viên ${cleanMsnv}`;
      const updated = [...emps, { msnv: cleanMsnv, name: autoName }];
      localStorage.setItem('local_employees', JSON.stringify(updated));
      return { found: true, name: autoName };
    }
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=employee&msnv=${encodeURIComponent(msnv)}`);
      return await res.json();
    } catch (err) {
      console.error("Remote lookup failed, fallback to local:", err);
      initLocalDB();
      const emps = JSON.parse(localStorage.getItem('local_employees') || '[]');
      const found = emps.find((e: any) => e.msnv === cleanMsnv);
      return { found: true, name: found ? found.name : `Nhân viên ${cleanMsnv}` };
    }
  };

  const apiGetReport = async (msnv: string, month: string) => {
    const cleanMsnv = msnv.trim().toUpperCase();
    if (!APPS_SCRIPT_URL) {
      initLocalDB();
      const reports = JSON.parse(localStorage.getItem('local_reports') || '[]');
      const found = reports.find((r: any) => r.msnv === cleanMsnv && r.month === month);
      if (found) {
        return { found: true, ...found };
      }
      return { found: false };
    }
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=report&msnv=${encodeURIComponent(msnv)}&month=${encodeURIComponent(month)}`);
      return await res.json();
    } catch (err) {
      console.error("Remote report failed, fallback to local:", err);
      initLocalDB();
      const reports = JSON.parse(localStorage.getItem('local_reports') || '[]');
      const found = reports.find((r: any) => r.msnv === cleanMsnv && r.month === month);
      return found ? { found: true, ...found } : { found: false };
    }
  };

  const apiGetRankings = async (month: string) => {
    if (!APPS_SCRIPT_URL) {
      initLocalDB();
      const emps = JSON.parse(localStorage.getItem('local_employees') || '[]');
      const empsMap = emps.reduce((acc: any, cur: any) => {
        acc[cur.msnv] = cur.name;
        return acc;
      }, {});
      const reports = JSON.parse(localStorage.getItem('local_reports') || '[]');
      const filtered = reports.filter((r: any) => r.month === month);
      return filtered.map((r: any) => ({
        msnv: r.msnv,
        name: empsMap[r.msnv] || `Nhân viên ${r.msnv}`,
        samples: r.samples || 0,
        workDays: r.workDays || 0,
        lateDays: r.lateDays || 0,
        forgotDays: r.forgotDays || 0
      }));
    }
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=ranking&month=${encodeURIComponent(month)}`);
      const data = await res.json();
      return data.rankings || [];
    } catch (err) {
      console.error("Remote ranking failed, fallback to local:", err);
      initLocalDB();
      const emps = JSON.parse(localStorage.getItem('local_employees') || '[]');
      const empsMap = emps.reduce((acc: any, cur: any) => {
        acc[cur.msnv] = cur.name;
        return acc;
      }, {});
      const reports = JSON.parse(localStorage.getItem('local_reports') || '[]');
      const filtered = reports.filter((r: any) => r.month === month);
      return filtered.map((r: any) => ({
        msnv: r.msnv,
        name: empsMap[r.msnv] || `Nhân viên ${r.msnv}`,
        samples: r.samples || 0,
        workDays: r.workDays || 0,
        lateDays: r.lateDays || 0,
        forgotDays: r.forgotDays || 0
      }));
    }
  };

  const apiSaveReport = async (payload: {
    msnv: string;
    month: string;
    samples: number | null;
    workDays: number | null;
    lateDays: number | null;
    forgotDays: number | null;
    name?: string;
  }) => {
    if (!APPS_SCRIPT_URL) {
      initLocalDB();
      const cleanMsnv = payload.msnv.trim().toUpperCase();
      const reports = JSON.parse(localStorage.getItem('local_reports') || '[]');
      const existingIdx = reports.findIndex((r: any) => r.msnv === cleanMsnv && r.month === payload.month);
      const reportData = {
        msnv: cleanMsnv,
        month: payload.month,
        samples: payload.samples,
        workDays: payload.workDays,
        lateDays: payload.lateDays,
        forgotDays: payload.forgotDays
      };
      if (existingIdx !== -1) {
        reports[existingIdx] = reportData;
      } else {
        reports.push(reportData);
      }
      localStorage.setItem('local_reports', JSON.stringify(reports));

      const notifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
      const pad = (num: number) => String(num).padStart(2, '0');
      const now = new Date();
      const dateString = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      notifs.push({
        date: dateString,
        name: payload.name || `Nhân viên ${cleanMsnv}`,
        month: payload.month
      });
      localStorage.setItem('local_notifications', JSON.stringify(notifs));

      return { success: true, local: true };
    }
    try {
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
    } catch (err) {
      console.error("Remote save failed, fallback to local:", err);
      initLocalDB();
      const cleanMsnv = payload.msnv.trim().toUpperCase();
      const reports = JSON.parse(localStorage.getItem('local_reports') || '[]');
      const existingIdx = reports.findIndex((r: any) => r.msnv === cleanMsnv && r.month === payload.month);
      const reportData = {
        msnv: cleanMsnv,
        month: payload.month,
        samples: payload.samples,
        workDays: payload.workDays,
        lateDays: payload.lateDays,
        forgotDays: payload.forgotDays
      };
      if (existingIdx !== -1) {
        reports[existingIdx] = reportData;
      } else {
        reports.push(reportData);
      }
      localStorage.setItem('local_reports', JSON.stringify(reports));

      const notifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
      const pad = (num: number) => String(num).padStart(2, '0');
      const now = new Date();
      const dateString = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      notifs.push({
        date: dateString,
        name: payload.name || `Nhân viên ${cleanMsnv}`,
        month: payload.month
      });
      localStorage.setItem('local_notifications', JSON.stringify(notifs));

      return { success: true, local: true };
    }
  };

  const fetchNotifications = async () => {
    if (!APPS_SCRIPT_URL) {
      initLocalDB();
      const notifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
      setNotifications(notifs);
      return;
    }
    setIsLoadingNotifs(true);
    try {
      const res = await fetch(`${APPS_SCRIPT_URL}?action=notifications`);
      const data = await res.json();
      if (data && data.notifications) {
        setNotifications(data.notifications);
      } else {
        initLocalDB();
        const notifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
        setNotifications(notifs);
      }
    } catch (err) {
      console.error("Error fetching notifications, fallback to local:", err);
      initLocalDB();
      const notifs = JSON.parse(localStorage.getItem('local_notifications') || '[]');
      setNotifications(notifs);
    } finally {
      setIsLoadingNotifs(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 20000);
    return () => clearInterval(timer);
  }, [APPS_SCRIPT_URL]);

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

  // Filter and sort notifications based on the current month's cycle (REAL current date only)
  const filteredNotifications = useMemo(() => {
    const { startDate, endDate } = getCurrentCycleBounds();

    const filtered = notifications.filter(notif => {
      const notifDate = parseCustomDate(notif.date);
      if (!notifDate) return false;
      return notifDate >= startDate && notifDate <= endDate;
    });

    // Sort newest first
    return filtered.sort((a, b) => {
      const dateA = parseCustomDate(a.date)?.getTime() || 0;
      const dateB = parseCustomDate(b.date)?.getTime() || 0;
      return dateB - dateA;
    });
  }, [notifications]);

  const unreadCount = useMemo(() => {
    return filteredNotifications.filter(notif => {
      const notifTime = parseCustomDate(notif.date)?.getTime() || 0;
      return notifTime > lastReadTime;
    }).length;
  }, [filteredNotifications, lastReadTime]);

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
    }, 150);

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
        name: employeeName,
      });

      if (data && (data.success || data.local)) {
        setNotification({ 
          type: 'success', 
          message: data.local 
            ? 'Cập nhật thành công (Chế độ Offline).' 
            : 'Đã lưu và cập nhật dữ liệu Google Sheets thành công!' 
        });
        fetchRankings();
        fetchNotifications();
        setHasGeneratedReport(true);
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
    const forceLightMode = () => {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
    };
    
    forceLightMode();
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', forceLightMode);
    } else {
      mediaQuery.addListener(forceLightMode);
    }
    
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', forceLightMode);
      } else {
        mediaQuery.removeListener(forceLightMode);
      }
    };
  }, []);

  useEffect(() => {
    const checkPwaStatus = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
      const dismissedTime = localStorage.getItem('pwa-install-dismissed');
      const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
      const isDismissedRecently = dismissedTime && (Date.now() - parseInt(dismissedTime) < sevenDaysInMs);

      return !isStandalone && !isDismissedRecently;
    };

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    if (checkPwaStatus() && isIOS) {
      setShowPwaPrompt(true);
      setPwaPlatform('ios');
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (checkPwaStatus()) {
        setShowPwaPrompt(true);
        setPwaPlatform('android_chrome');
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    setDeferredPrompt(null);
    setShowPwaPrompt(false);
  };

  const handleDismissPwa = () => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setShowPwaPrompt(false);
  };

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
            <span className="text-[12px] sm:text-base font-black text-slate-800 dark:text-slate-100 break-words sm:truncate leading-tight">
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

  const padNum = (num: number) => String(num).padStart(2, '0');
  const formattedTime = `${padNum(currentTime.getHours())}:${padNum(currentTime.getMinutes())}:${padNum(currentTime.getSeconds())}`;
  const getVietnameseWeekdayAndDate = (date: Date) => {
    const weekdays = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
    const weekday = weekdays[date.getDay()];
    return `${weekday}, ${padNum(date.getDate())}/${padNum(date.getMonth() + 1)}/${date.getFullYear()}`;
  };
  const formattedDate = getVietnameseWeekdayAndDate(currentTime);

  const navItems = [
    { id: 'Overview', icon: LayoutDashboard, label: 'Tổng quan' },
    { id: 'Analytics', icon: BarChart3, label: 'Phân tích' },
    { id: 'Reports', icon: FileText, label: 'Báo cáo' },
    { id: 'Settings', icon: Settings, label: 'Cài đặt' },
  ];

  // Layered scroll calculations (iOS-like parallax and overlap)
  let cardMarginTop = 24;
  if (scrollY <= 80) {
    cardMarginTop = 24 + 0.4 * scrollY;
  } else if (scrollY <= 180) {
    const progress = (scrollY - 80) / 100;
    const gap = 24 - progress * 64;
    cardMarginTop = gap + 0.4 * scrollY;
  } else {
    cardMarginTop = 32;
  }

  return (
    <div className="min-h-[100dvh] bg-[#f8fafc] dark:bg-slate-950 font-sans transition-colors duration-300">
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

      {/* Top Header Banner Section */}
      <div 
        className="w-full fixed top-0 left-0 right-0 z-1 flex items-center px-6 sm:px-10 border-b border-slate-200/40 overflow-hidden shrink-0"
        style={{
          transform: `translateY(-${Math.min(scrollY * 0.6, bannerHeight)}px)`,
          height: `${bannerHeight}px`,
        }}
      >
        {/* Carousel Sliding Track */}
        <div 
          className="absolute inset-0 flex z-0"
          style={{
            width: '300%',
            transform: `translateX(-${(currentBannerIndex * 100) / 3}%)`,
            transition: 'transform 0.9s ease-in-out',
          }}
        >
          {bannerImages.map((src, idx) => (
            <div key={idx} className="w-1/3 h-full flex-shrink-0 relative bg-[#060a16]">
              <img 
                src={src} 
                alt={`Banner slide ${idx + 1}`}
                className="w-full h-full object-cover object-center block"
                referrerPolicy="no-referrer"
              />
              {/* Subtle overlay to ensure readability */}
              <div className="absolute inset-0 bg-slate-950/10" />
            </div>
          ))}
        </div>

        {/* Premium iOS-style Notification Bell */}
        <button
          id="notif-bell-btn"
          onClick={() => {
            const nextOpenState = !isNotifPanelOpen;
            setIsNotifPanelOpen(nextOpenState);
            if (nextOpenState) {
              // mark all current notifications as read by saving the latest notification timestamp
              let maxTime = 0;
              filteredNotifications.forEach(notif => {
                const notifTime = parseCustomDate(notif.date)?.getTime() || 0;
                if (notifTime > maxTime) {
                  maxTime = notifTime;
                }
              });
              const finalTime = maxTime || Date.now();
              setLastReadTime(finalTime);
              localStorage.setItem('notification_last_read_time', finalTime.toString());
              localStorage.setItem('lastReadTime', finalTime.toString()); // Keep legacy fallback sync
            }
          }}
          className="absolute right-[18px] top-[16px] z-50 flex items-center justify-center cursor-pointer bg-white/95 hover:bg-white active:scale-95 transition-all text-slate-800"
          style={{
            width: isMobile ? '36px' : '42px',
            height: isMobile ? '36px' : '42px',
            borderRadius: '50%',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          <Bell className={`w-5 h-5 text-slate-800 ${(unreadCount > 0 && !isNotifPanelOpen) ? 'shake-animation' : ''}`} />
          {unreadCount > 0 && !isNotifPanelOpen && (
            <span 
              id="notif-unread-red-dot"
              className="absolute top-[11px] right-[11px] rounded-full bg-[#FF3B30]"
              style={{
                width: '8px',
                height: '8px',
                boxShadow: '0 0 8px rgba(255, 59, 48, 0.35)',
              }}
            />
          )}
        </button>
        
        <div className="max-w-6xl mx-auto w-full relative h-full flex flex-col md:flex-row md:items-center justify-between z-10 py-2">
          <div className="absolute right-[6%] top-1/2 -translate-y-1/2 text-right z-10 select-none">
            <div className="carousel-clock-time">
              {formattedTime}
            </div>
            <div className="carousel-clock-date">
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* Notification Panel dropdown / slide-down modal */}
      <AnimatePresence>
        {isNotifPanelOpen && (
          <>
            <div 
              id="notif-panel-backdrop"
              className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[1px]" 
              onClick={() => setIsNotifPanelOpen(false)} 
            />

            <motion.div
              id="notif-panel"
              initial={{ opacity: 0, y: isMobile ? -20 : -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: isMobile ? -20 : -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="fixed z-50 bg-white/98 backdrop-blur-xl border border-slate-100 p-5 flex flex-col gap-4 shadow-2xl max-h-[420px] overflow-y-auto
                         w-[calc(100%-32px)] sm:w-[380px]"
              style={{
                borderRadius: '24px',
                top: isMobile ? '80px' : `${16 - Math.min(scrollY * 0.6, bannerHeight) + 48}px`,
                right: isMobile ? '16px' : '18px',
                boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
              }}
            >
              {/* Panel Title Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 shrink-0">
                <span className="font-sans font-bold text-[16px] text-slate-800">
                  Thông báo cập nhật
                </span>
                <button 
                  onClick={() => setIsNotifPanelOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Notification Cards list */}
              <div className="flex flex-col gap-3 overflow-y-auto max-h-[320px] pr-1">
                {filteredNotifications.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    Không có thông báo mới nào
                  </div>
                ) : (
                  filteredNotifications.map((notif, idx) => {
                    const notifDate = parseCustomDate(notif.date);
                    const isRecent = notifDate ? (new Date().getTime() - notifDate.getTime() <= 24 * 60 * 60 * 1000) : false;

                    return (
                      <div 
                        key={idx}
                        id={`notif-card-${idx}`}
                        className={`flex flex-col gap-1.5 transition-all duration-300 hover:scale-[1.01] cursor-pointer ${
                          isRecent 
                            ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800/40 shadow-md shadow-blue-100/50 dark:shadow-none" 
                            : "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 shadow-sm shadow-slate-100/5 dark:shadow-none"
                        }`}
                        style={{
                          borderRadius: '20px',
                          padding: '18px 20px',
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div 
                            className="font-mono"
                            style={{
                              fontSize: '12px',
                              fontWeight: 600,
                              color: '#3B82F6',
                            }}
                          >
                            {formatNotificationDate(notif.date)}
                          </div>
                          {isRecent && (
                            <span className="bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 select-none">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="font-sans leading-snug" style={{ fontSize: '14px' }}>
                          <span className="font-bold text-slate-800 dark:text-slate-100">{notif.name}</span>
                          <span className="font-medium text-slate-600 dark:text-slate-400"> đã cập nhật báo cáo</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer to push content down below the fixed top banner */}
      <div style={{ height: `${bannerHeight - 40}px` }} />

      {/* Main Content */}
      <main 
        className="w-full max-w-full relative z-10 flex flex-col bg-[#f8fafc] dark:bg-slate-950 rounded-t-[28px] shadow-non"
        style={{
          marginTop: `${cardMarginTop}px`,
          transition: 'all 0.3s ease',
        }}
      >

        <div className="px-6 pt-4 pb-6 space-y-6 w-full max-w-6xl mx-auto">
          {/* PWA Install Prompt Card */}
          <AnimatePresence>
            {showPwaPrompt && pwaPlatform && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-6xl mx-auto w-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 sm:p-5 rounded-[2rem] border border-white dark:border-slate-800 shadow-xl shadow-slate-200/10 dark:shadow-none flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex-shrink-0">
                    <span className="text-2xl" role="img" aria-label="smartphone">📲</span>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                      Cài đặt BC IPC
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-xs sm:text-sm mt-1 leading-relaxed">
                      {pwaPlatform === 'ios' 
                        ? "Nhấn Chia sẻ → Thêm vào màn hình chính để sử dụng thuận tiện hơn." 
                        : "Cài đặt để sử dụng nhanh hơn và thuận tiện hơn."}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 sm:self-center self-end">
                  {pwaPlatform === 'ios' ? (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleDismissPwa}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
                    >
                      Đóng
                    </motion.button>
                  ) : (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleDismissPwa}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer"
                      >
                        Để sau
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: "0 4px 12px rgba(99, 102, 241, 0.2)" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleInstallPwa}
                        className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all duration-300 shadow-md shadow-indigo-500/10 cursor-pointer"
                      >
                        Cài đặt
                      </motion.button>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.section 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-6xl mx-auto bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 sm:p-6 rounded-[2rem] border border-white dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none"
          >
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
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
                {googleSheetsConnected ? (
                  <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-[10px] font-bold uppercase tracking-normal">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Đã kết nối Google Sheets
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-xl text-[10px] font-bold uppercase tracking-normal">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Chế độ Ngoại tuyến (Local Demo)
                    </div>
                    <button 
                      onClick={() => setShowInstructions(!showInstructions)}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline transition-all bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl cursor-pointer"
                    >
                      {showInstructions ? 'Ẩn hướng dẫn' : 'Cách kết nối Google Sheets ↗'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <AnimatePresence>
              {showInstructions && !googleSheetsConnected && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-6"
                >
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/15 p-4 sm:p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 text-slate-700 dark:text-slate-300 text-xs leading-relaxed space-y-3 font-medium">
                    <h4 className="font-bold text-indigo-700 dark:text-indigo-400 text-sm flex items-center gap-1.5 uppercase tracking-wide">
                      📋 Hướng dẫn kết nối Google Sheets (Đồng bộ thời gian thực)
                    </h4>
                    <ol className="list-decimal pl-5 space-y-2">
                      <li>
                        Tạo một bảng tính <strong>Google Sheets</strong> mới.
                      </li>
                      <li>
                        Tạo 2 trang tính (sheet tabs) với tiêu đề chuẩn xác:
                        <ul className="list-disc pl-5 mt-1 space-y-1 text-[11px]">
                          <li>
                            Tab <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-indigo-600 dark:text-indigo-400">Nhân viên</code>: Cột A1 nhập <code className="font-bold">MSNV</code>, Cột B1 nhập <code className="font-bold">Họ và tên</code>. Thêm các dòng nhân viên mẫu (Ví dụ: <code className="font-mono text-slate-500">IPC001</code> - <code className="font-mono text-slate-500">Nguyễn Văn An</code>).
                          </li>
                          <li>
                            Tab <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold text-indigo-600 dark:text-indigo-400">Báo cáo tháng</code>: Nhập tiêu đề ở hàng đầu tiên theo thứ tự:<br />
                            <code className="font-bold text-[11px] text-slate-500">MSNV | Tháng | Số mẫu | Ngày làm | Đi trễ | Quên chấm công | Ngày cập nhật | Họ và tên</code>
                          </li>
                        </ul>
                      </li>
                      <li>
                        Vào menu <strong>Tiện ích mở rộng (Extensions)</strong> &rarr; <strong>Apps Script</strong>. Xóa toàn bộ mã nguồn mặc định và dán nội dung trong file <code className="bg-white dark:bg-slate-800 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-bold">Code.gs</code> ở dự án của bạn vào.
                      </li>
                      <li>
                        Cập nhật ID Bảng tính của bạn vào biến <code className="font-bold">SPREADSHEET_ID</code> ở dòng 21 trong Code Apps Script.
                      </li>
                      <li>
                        Nhấn nút <strong>Triển khai (Deploy)</strong> ở góc trên bên phải &rarr; <strong>Triển khai mới (New deployment)</strong>.
                        <ul className="list-disc pl-5 mt-1 text-[11px]">
                          <li>Chọn loại cấu hình là <strong>Ứng dụng web (Web app)</strong>.</li>
                          <li>Thực thi dưới danh nghĩa (Execute as): <strong>Tôi (Me)</strong>.</li>
                          <li>Quyền truy cập (Who has access): <strong>Bất kỳ ai (Anyone)</strong>.</li>
                        </ul>
                      </li>
                      <li>
                        Nhấn Triển khai, cấp quyền truy cập đầy đủ cho Google Script, sau đó <strong>sao chép URL Ứng dụng web</strong> nhận được.
                      </li>
                      <li>
                        Quay lại <strong>AI Studio Build &rarr; Settings (Secrets)</strong>, dán URL vừa copy vào mục <strong>VITE_APPS_SCRIPT_URL</strong> để bắt đầu đồng bộ trực tuyến!
                      </li>
                    </ol>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-full min-w-0 overflow-hidden">
              <div className="space-y-1 w-full max-w-full min-w-0 overflow-hidden">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">MSNV</label>
                <input 
                  type="text" 
                  value={employeeId}
                  onChange={e => setEmployeeId(e.target.value)}
                  placeholder="Nhập MSNV"
                  className="w-full max-w-full min-w-0 box-border overflow-hidden px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-[16px] md:text-sm"
                />
                {isSearching && <p className="text-[10px] text-indigo-500 font-bold ml-1">Đang tra cứu...</p>}
                {!isSearching && employeeError && <p className="text-[10px] text-rose-500 font-bold ml-1">{employeeError}</p>}
                {!isSearching && employeeName && (
                  <p className="text-[10px] text-emerald-500 font-bold ml-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> {employeeName}
                  </p>
                )}
              </div>
              <div className="space-y-1 w-full max-w-full min-w-0 overflow-hidden">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1">Tháng báo cáo</label>
                <div className="relative w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" style={{ transform: 'translateZ(0)' }}>
                  <input 
                    type="month" 
                    value={reportingMonth}
                    onChange={e => setReportingMonth(e.target.value)}
                    className="w-full max-w-full min-w-0 box-border overflow-hidden px-4 py-2 bg-transparent text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-[16px] md:text-sm cursor-pointer [appearance:none] [-webkit-appearance:none]"
                  />
                </div>
              </div>
              <div className="space-y-1 relative w-full max-w-full min-w-0 overflow-hidden">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tight ml-1 flex justify-between">
                  Tháng đối chiếu
                </label>
                <div className="relative w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800" style={{ transform: 'translateZ(0)' }}>
                  <input 
                    type="month" 
                    value={comparisonMonth}
                    onChange={e => setComparisonMonth(e.target.value)}
                    className="w-full max-w-full min-w-0 box-border overflow-hidden px-4 py-2 bg-transparent text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-[16px] md:text-sm cursor-pointer [appearance:none] [-webkit-appearance:none]"
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
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[16px] md:text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Ngày làm</label>
                    <input 
                      type="number" 
                      value={currentStats.workDays ?? ''}
                      onChange={e => setCurrentStats({...currentStats, workDays: e.target.value === '' ? null : parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[16px] md:text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
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
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[16px] md:text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Quên CC</label>
                    <input 
                      type="number" 
                      value={currentStats.forgotDays ?? ''}
                      onChange={e => setCurrentStats({...currentStats, forgotDays: e.target.value === '' ? null : parseInt(e.target.value) || 0})}
                      className="w-full px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[16px] md:text-xs font-medium focus:ring-4 focus:ring-indigo-500/10 text-slate-900 dark:text-white"
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
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-[16px] md:text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Ngày làm</label>
                    <input 
                      type="number" 
                      readOnly
                      disabled
                      value={prevStats?.workDays ?? 0}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-[16px] md:text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
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
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-[16px] md:text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-tight ml-1">Quên CC</label>
                    <input 
                      type="number" 
                      readOnly
                      disabled
                      value={prevStats?.forgotDays ?? 0}
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 text-[16px] md:text-xs font-bold text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none"
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

          {hasGeneratedReport && (
            <>
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
            </>
          )}

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
              <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto max-w-full min-w-0 overflow-hidden">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2 whitespace-nowrap flex-shrink-0">Chọn tháng</span>
                <div className="relative w-full sm:w-auto max-w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" style={{ transform: 'translateZ(0)' }}>
                  <input 
                    type="month" 
                    value={rankingMonth}
                    onChange={e => setRankingMonth(e.target.value)}
                    className="w-full sm:w-auto max-w-full min-w-0 box-border overflow-hidden px-3 py-1.5 bg-transparent text-slate-900 dark:text-white font-bold text-[16px] md:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 [appearance:none] [-webkit-appearance:none]"
                  />
                </div>
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

        {/* Footer with Banner integrated at bottom */}
        <footer 
          id="app-footer-banner"
          className="app-bottom-banner"
          style={{
            backgroundImage: `url(${bottomBanner})`,
          }}
        />
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

