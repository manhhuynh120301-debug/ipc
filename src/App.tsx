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

interface RankingItem {
  msnv: string;
  name: string;
  samples: number;
  workDays: number;
  lateDays: number;
  forgotDays: number;
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

// --- Ranking UI: podium top 1-3 + rows top 4+ ---
// Ranking logic:
// - "Số mẫu" board sorts by productivity = samples / workDays (descending),
//   tie-break by higher samples. This is fairer: fewer work days with the
//   same samples means higher productivity and ranks higher.
// - "Ngày làm" board sorts by b.workDays - a.workDays (unchanged), and shows
//   each person's work-day change vs the previous month as a small chip
//   with up/down icon (like the report StatCards).

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return parts.slice(-2).map((p) => p.charAt(0)).join('').toUpperCase();
};

// Năng suất = số mẫu / ngày làm; ngày làm = 0 thì tính bằng 0 để tránh chia cho 0
const productivity = (item: RankingItem) => (item.workDays > 0 ? item.samples / item.workDays : 0);

// Tháng liền trước của một tháng input yyyy-MM (để so sánh ngày làm với tháng trước)
const getPreviousMonthInput = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const PODIUM_STYLES = [
  {
    // Top 1: gold, tallest card, crown
    // (gradient viết bằng inline style để tương thích cả Safari đời cũ)
    card: "border-amber-500/55 hover:border-amber-500/90 hover:shadow-[0_18px_38px_rgba(245,158,11,0.35)] min-h-[190px] sm:min-h-[198px]",
    cardBg: "linear-gradient(180deg, rgba(245,158,11,0.15), rgba(248,250,252,0.6))",
    name: "text-amber-600",
    numColor: "#d97706",
    avatar: "w-9 h-9 text-xs sm:w-12 sm:h-12 sm:text-[15px]",
    avatarBg: "linear-gradient(135deg, #f59e0b, #ef4444)",
    avatarFallback: "#f59e0b",
    badge: "bg-amber-500",
  },
  {
    // Top 2: blue
    card: "border-blue-500/55 hover:border-blue-500/90 hover:shadow-[0_18px_38px_rgba(59,130,246,0.35)] min-h-[168px] sm:min-h-[176px]",
    cardBg: "linear-gradient(180deg, rgba(59,130,246,0.14), rgba(248,250,252,0.6))",
    name: "text-blue-500",
    numColor: "#3b82f6",
    avatar: "w-8 h-8 text-[11px] sm:w-[42px] sm:h-[42px] sm:text-[13px]",
    avatarBg: "linear-gradient(135deg, #06b6d4, #3b82f6)",
    avatarFallback: "#0ea5e9",
    badge: "bg-blue-500",
  },
  {
    // Top 3: green, lowest card
    card: "border-emerald-500/50 hover:border-emerald-500/90 hover:shadow-[0_18px_38px_rgba(16,185,129,0.32)] min-h-[146px] sm:min-h-[156px]",
    cardBg: "linear-gradient(180deg, rgba(16,185,129,0.13), rgba(248,250,252,0.6))",
    name: "text-emerald-600",
    numColor: "#059669",
    avatar: "w-8 h-8 text-[11px] sm:w-[38px] sm:h-[38px] sm:text-xs",
    avatarBg: "linear-gradient(135deg, #10b981, #059669)",
    avatarFallback: "#10b981",
    badge: "bg-emerald-500",
  },
] as const;

const StatPill = ({
  item,
  mode,
  numColor,
  className,
  variant = 'row',
}: {
  item: RankingItem;
  mode: 'samples' | 'workDays';
  numColor?: string;
  className?: string;
  variant?: 'podium' | 'row';
}) => {
  const numStyle = numColor ? { color: numColor } : undefined;
  const isPodium = variant === 'podium';
  const unitClass = isPodium ? "text-[9px] sm:text-[11px]" : "text-[11px]";
  return (
    <span className={cn(
      "rounded-xl sm:rounded-full font-black text-center flex items-center justify-center border",
      isPodium ? "px-1.5 sm:px-3 py-1 max-w-full" : "px-2 py-1 sm:py-1 sm:px-3",
      className
    )}>
      {mode === 'samples' ? (
        <span className={cn(
          "whitespace-nowrap flex items-center leading-tight",
          // Trên điện thoại: xếp 2 dòng cho gọn, màn hình lớn trở lại 1 dòng
          isPodium ? "flex-col sm:flex-row text-[11px] sm:text-sm" : "gap-0.5 text-[13px] sm:text-sm"
        )}>
          <span className="flex items-center gap-0.5">
            <span style={numStyle}>{item.samples}</span>
            <span className={cn("font-semibold text-slate-400", unitClass)}>mẫu</span>
          </span>
          <span className={cn("text-slate-300 mx-0.5", isPodium && "hidden sm:inline")}>/</span>
          <span className="flex items-center gap-0.5">
            <span style={numStyle}>{item.workDays}</span>
            <span className={cn("font-semibold text-slate-400", unitClass)}>ngày</span>
          </span>
        </span>
      ) : (
        <span className={cn("whitespace-nowrap flex items-center gap-0.5", isPodium ? "text-[11px] sm:text-sm" : "text-[13px] sm:text-sm")}>
          <span style={numStyle}>{item.workDays}</span>
          <span className={cn("font-semibold text-slate-400", unitClass)}>ngày</span>
        </span>
      )}
    </span>
  );
};

// Chip chênh lệch ngày làm so với tháng trước (chỉ dùng ở tab Ngày làm)
const DiffChip = ({ diff }: { diff: number }) => {
  if (diff > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold px-1.5 py-0.5 whitespace-nowrap">
        <TrendingUp className="w-3 h-3" />
        {diff}
      </span>
    );
  }
  if (diff < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-50 border border-rose-100 text-rose-600 text-[10px] font-extrabold px-1.5 py-0.5 whitespace-nowrap">
        <TrendingDown className="w-3 h-3" />
        {Math.abs(diff)}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 text-amber-500 px-1.5 py-0.5 whitespace-nowrap">
      <Minus className="w-4 h-4" strokeWidth={3} />
    </span>
  );
};

const PodiumCard = ({
  item,
  rank,
  mode,
  diff = null,
  onSelect,
}: {
  item: RankingItem;
  rank: 0 | 1 | 2; // 0 = top 1, 1 = top 2, 2 = top 3
  mode: 'samples' | 'workDays';
  diff?: number | null;
  onSelect: (item: RankingItem) => void;
}) => {
  const s = PODIUM_STYLES[rank];
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: rank === 0 ? 0 : rank === 1 ? 0.05 : 0.1 }}
      whileHover={{ y: -6, scale: 1.03 }}
      onClick={() => onSelect(item)}
      className={cn(
        "group flex-1 min-w-0 flex flex-col items-center justify-center text-center rounded-2xl border px-0.5 sm:px-1 py-2 sm:py-2.5 cursor-pointer transition-[border-color,box-shadow] duration-300",
        s.card
      )}
      style={{ backgroundImage: s.cardBg }}
    >
      {rank === 0 ? (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className="w-5 h-[18px] mb-1 text-amber-500 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)] transition-transform duration-300 group-hover:scale-125 group-hover:-rotate-[8deg]"
        >
          <path d="M3 8l4.6 3.8L12 5l4.4 6.8L21 8l-1.6 10.5a1 1 0 0 1-1 .5H5.6a1 1 0 0 1-1-.5z" />
        </svg>
      ) : (
        <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-extrabold mb-1 transition-transform duration-300 group-hover:scale-125", s.badge)}>
          {rank + 1}
        </span>
      )}
      <div
        className={cn("rounded-full flex items-center justify-center text-white font-extrabold shadow-md mb-1.5 transition-transform duration-300 group-hover:scale-110", s.avatar)}
        style={{ backgroundColor: s.avatarFallback, backgroundImage: s.avatarBg }}
      >
        {getInitials(item.name)}
      </div>
      <div className="w-full min-h-[24px] sm:min-h-[28px] flex items-start justify-center px-0.5">
        <span
          className={cn("text-[9px] sm:text-[10.5px] font-extrabold leading-tight break-words text-center", s.name)}
          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
        >
          {item.name}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 max-w-full">
        <StatPill
          item={item}
          mode={mode}
          variant="podium"
          numColor={s.numColor}
          className="bg-white border-slate-200 shadow-sm text-slate-700 transition-transform duration-300 group-hover:scale-105"
        />
        {mode === 'workDays' && diff !== null && <DiffChip diff={diff} />}
      </div>
    </motion.div>
  );
};

const RankRow = ({
  item,
  index,
  mode,
  diff = null,
  onSelect,
}: {
  item: RankingItem;
  index: number; // 0-based overall rank
  mode: 'samples' | 'workDays';
  diff?: number | null;
  onSelect: (item: RankingItem) => void;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      whileHover={{ x: 5 }}
      onClick={() => onSelect(item)}
      className="group flex items-center justify-between px-2.5 py-3 sm:p-3.5 rounded-2xl bg-white/40 border border-transparent hover:bg-[#fefce8] hover:border-[#fef3c7] hover:shadow-[0_4px_14px_rgba(254,240,138,0.35)] transition-colors duration-300 cursor-pointer"
    >
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
        <span className="w-5 sm:w-6 text-center font-black flex items-center justify-center flex-shrink-0 text-[16px] sm:text-[18px] text-slate-400 group-hover:text-amber-600 transition-colors duration-300">
          {index + 1}
        </span>
        <div className="flex items-center min-w-0 flex-1 py-0.5 pr-1">
          <span className="text-[12px] sm:text-base font-black text-slate-800 break-words sm:truncate leading-tight">
            {item.name}
          </span>
        </div>
      </div>
      <div className="flex-shrink-0 ml-1.5 sm:ml-2 flex items-center justify-end gap-1.5">
        <StatPill
          item={item}
          mode={mode}
          className="bg-slate-100 text-slate-600 border-slate-200/50 transition-all duration-300 group-hover:scale-105 group-hover:bg-white"
        />
        {mode === 'workDays' && diff !== null && <DiffChip diff={diff} />}
      </div>
    </motion.div>
  );
};

// Lịch sử 1 nhân viên: bấm vào tên trên bảng xếp hạng -> bottom sheet + biểu đồ đường
interface HistoryPoint {
  key: string; // "2026-09"
  label: string; // "09/2026"
  shortLabel: string; // "T9"
  samples: number;
  workDays: number;
}

// Bot cute hiện lúc chờ tải dữ liệu (ảnh động GIF: bot gõ laptop, chữ MH)
const BOT_IMG = "data:image/gif;base64,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";

const BotLoader = ({ text = 'Đang tổng hợp dữ liệu...' }: { text?: string }) => (
  <div className="py-8 flex flex-col items-center justify-center gap-3">
    <style>{`
      @keyframes dot-typing { 0%, 60%, 100% { transform: translateY(0); opacity: .35; } 30% { transform: translateY(-4px); opacity: 1; } }
      .dot-typing span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #6366f1; margin: 0 2px; animation: dot-typing 1.2s ease-in-out infinite; }
      .dot-typing span:nth-child(2) { animation-delay: .15s; }
      .dot-typing span:nth-child(3) { animation-delay: .3s; }
    `}</style>
    <img
      src={BOT_IMG}
      alt="Đang tải"
      className="w-24 h-24 rounded-full object-cover shadow-[0_10px_25px_rgba(99,102,241,0.35)]"
      draggable={false}
    />
    <div className="text-xs font-bold text-slate-500">{text}</div>
    <div className="dot-typing"><span /><span /><span /></div>
  </div>
);

const HistoryChart = ({ data, mode }: { data: HistoryPoint[]; mode: 'samples' | 'workDays' }) => {
  if (data.length < 2) {
    return <div className="py-10 text-center text-xs font-semibold text-slate-400">Chưa đủ dữ liệu các tháng</div>;
  }
  const first = data[0];
  const lastPt = data[data.length - 1];
  if (!first || !lastPt) {
    return <div className="py-10 text-center text-xs font-semibold text-slate-400">Chưa đủ dữ liệu các tháng</div>;
  }
  const val = (d: HistoryPoint) => (mode === 'samples' ? d.samples : d.workDays);
  const W = 360, H = 200, P = { l: 14, r: 14, t: 26, b: 30 };
  const vals = data.map(val);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = (max - min) * 0.25 || 1;
  const lo = min - span, hi = max + span;
  const X = (i: number) => P.l + (i * (W - P.l - P.r)) / (data.length - 1);
  const Y = (v: number) => P.t + (1 - (v - lo) / (hi - lo)) * (H - P.t - P.b);
  let path = `M ${X(0)},${Y(val(first))}`;
  for (let i = 1; i < data.length; i++) {
    const x0 = X(i - 1), y0 = Y(val(data[i - 1]));
    const x1 = X(i), y1 = Y(val(data[i])), mx = (x0 + x1) / 2;
    path += ` C ${mx},${y0} ${mx},${y1} ${x1},${y1}`;
  }
  const area = `${P.l},${H - P.b} ` + data.map((d, i) => `${X(i)},${Y(val(d))}`).join(' ') + ` ${W - P.r},${H - P.b}`;
  const lastX = X(data.length - 1), lastY = Y(val(lastPt));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="histArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6366f1" stopOpacity="0.28" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => {
        const y = P.t + f * (H - P.t - P.b);
        return <line key={f} x1={P.l} y1={y} x2={W - P.r} y2={y} stroke="#e8edf3" strokeWidth={1} strokeDasharray="4 4" />;
      })}
      <polygon points={area} fill="url(#histArea)" />
      <path d={path} fill="none" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r={9} fill="#6366f1" opacity={0.18} />
      {data.map((d, i) => (
        <g key={d.key}>
          <circle cx={X(i)} cy={Y(val(d))} r={4.5} fill="#fff" stroke="#6366f1" strokeWidth={2.5} />
          <text x={X(i)} y={Y(val(d)) - 11} textAnchor="middle" fontSize={10.5} fontWeight={800} fill="#475569">{val(d)}</text>
          <text x={X(i)} y={H - 10} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="#94a3b8">{d.shortLabel}</text>
        </g>
      ))}
    </svg>
  );
};

const HistorySheet = ({
  item,
  data,
  loading,
  mode,
  onClose,
}: {
  item: RankingItem;
  data: HistoryPoint[];
  loading: boolean;
  mode: 'samples' | 'workDays';
  onClose: () => void;
}) => {
  const val = (d: HistoryPoint) => (mode === 'samples' ? d.samples : d.workDays);
  const unit = mode === 'samples' ? 'mẫu' : 'ngày';
  const total = data.reduce((s, d) => s + val(d), 0);
  const avg = data.length ? Math.round(total / data.length) : 0;
  const best: HistoryPoint | null = data.reduce<HistoryPoint | null>(
    (b, d) => (val(d) > (b ? val(b) : -1) ? d : b),
    null
  );
  const last = data[data.length - 1];
  const prev = data[data.length - 2];
  const trend = last && prev && val(prev) > 0
    ? Math.round(((val(last) - val(prev)) / val(prev)) * 100)
    : null;
  const stats = [
    { v: total.toLocaleString('vi-VN'), l: `Tổng ${data.length} tháng` },
    { v: avg.toLocaleString('vi-VN'), l: 'Trung bình' },
    { v: best ? val(best).toLocaleString('vi-VN') : '—', l: best ? `Cao nhất · ${best.shortLabel}` : 'Cao nhất' },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] bg-slate-900/55 flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0.4 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-[430px] rounded-t-[26px] sm:rounded-[26px] px-[18px] pt-2.5 pb-6 max-h-[88vh] overflow-y-auto"
      >
        <div className="w-[42px] h-[5px] rounded bg-slate-200 mx-auto mb-3" />
        <div className="flex items-center gap-3">
          <div
            className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white font-extrabold text-[17px] shadow-md flex-shrink-0"
            style={{ backgroundColor: '#f59e0b', backgroundImage: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}
          >
            {getInitials(item.name)}
          </div>
          <div className="min-w-0">
            <div className="text-[16px] font-extrabold text-slate-900 truncate">{item.name}</div>
            <div className="text-[11px] text-slate-400 font-semibold mt-0.5">MSNV: {item.msnv}</div>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="ml-auto w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <BotLoader />
        ) : (
          <>
            <div className="flex gap-2 mt-3.5">
              {stats.map((s) => (
                <div key={s.l} className="flex-1 bg-slate-50 border border-slate-100 rounded-[14px] px-1.5 py-2.5 text-center">
                  <div className="text-[15px] font-extrabold text-slate-900">{s.v} <small className="text-[10px] font-semibold text-slate-400">{unit}</small></div>
                  <div className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wide mt-[3px]">{s.l}</div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-3.5 mb-1.5 px-0.5">
              <span className="text-xs font-extrabold text-slate-700">{mode === 'samples' ? 'Số mẫu theo tháng' : 'Ngày làm theo tháng'}</span>
              {trend !== null && prev && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-[3px] rounded-full border",
                  trend >= 0 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : "text-red-600 bg-red-50 border-red-200"
                )}>
                  {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {trend >= 0 ? `+${trend}%` : `${trend}%`} so với {prev.shortLabel}
                </span>
              )}
            </div>
            <div className="bg-slate-50 border border-slate-100 rounded-[18px] px-2 pt-3 pb-1.5">
              <HistoryChart data={data} mode={mode} />
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const requestIdRef = useRef(0);
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
        setBannerHeight(380);
      } else if (w >= 1024) {
        setBannerHeight(340);
      } else if (w >= 768) {
        setBannerHeight(280);
      } else if (w >= 480) {
        setBannerHeight(240);
      } else {
        setBannerHeight(210);
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
  
  // Month controls are always derived from the real current date.
  // This keeps the report month, comparison month, and IPC ranking in sync
  // automatically when a new month begins.
  const getMonthInputValue = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const currentMonth = useMemo(
    () => getMonthInputValue(currentTime),
    [currentTime]
  );

  const previousMonth = useMemo(() => {
    const date = new Date(currentTime.getFullYear(), currentTime.getMonth() - 1, 1);
    return getMonthInputValue(date);
  }, [currentTime]);

  const [reportingMonth, setReportingMonth] = useState(currentMonth);
  const [comparisonMonth, setComparisonMonth] = useState(previousMonth);

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

  const [rankingMonth, setRankingMonth] = useState(previousMonth);
  const [rankingTab, setRankingTab] = useState<'samples' | 'workDays'>('samples');
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [prevRankings, setPrevRankings] = useState<RankingItem[]>([]);
  const [isLoadingRankings, setIsLoadingRankings] = useState(false);
  // Lịch sử 1 nhân viên: bấm vào tên trên bảng xếp hạng
  const [historyItem, setHistoryItem] = useState<RankingItem | null>(null);
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  // Cache số liệu từng tháng (key "2026-09"): tải trước ngầm để bấm tên là hiện ngay
  const historyMonthsCache = useRef(new Map<string, RankingItem[]>());

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
    const timer = setInterval(fetchNotifications, 5000);
    return () => clearInterval(timer);
  }, [APPS_SCRIPT_URL]);

  const fetchRankings = async () => {
    if (!rankingMonth) return;
    setIsLoadingRankings(true);
    try {
      const formattedMonth = toMonthYear(rankingMonth);
      const prevFormattedMonth = toMonthYear(getPreviousMonthInput(rankingMonth));
      const [data, prevData] = await Promise.all([
        apiGetRankings(formattedMonth),
        apiGetRankings(prevFormattedMonth),
      ]);
      setRankings(data);
      setPrevRankings(prevData);
      // Tải trước ngầm 6 tháng gần nhất để bấm vào tên là hiện lịch sử ngay
      warmHistoryCache([
        { key: rankingMonth, data },
        { key: getPreviousMonthInput(rankingMonth), data: prevData },
      ]);
    } catch (err) {
      console.error("Error fetching rankings:", err);
    } finally {
      setIsLoadingRankings(false);
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [rankingMonth]);

  // 6 tháng gần nhất tính đến tháng đang xem (định dạng "2026-09", cũ -> mới)
  const getHistoryMonths = () => {
    const months: string[] = [];
    let cur = rankingMonth;
    for (let i = 0; i < 6; i++) {
      months.unshift(cur);
      cur = getPreviousMonthInput(cur);
    }
    return months;
  };

  // Tải trước ngầm số liệu các tháng (chạy nền, không chặn UI)
  const warmHistoryCache = (already: Array<{ key: string; data: RankingItem[] }>) => {
    already.forEach(({ key, data }) => {
      if (!historyMonthsCache.current.has(key)) historyMonthsCache.current.set(key, data);
    });
    const missing = getHistoryMonths().filter((m) => !historyMonthsCache.current.has(m));
    if (missing.length === 0) return;
    Promise.all(
      missing.map((m) =>
        apiGetRankings(toMonthYear(m))
          .then((d) => ({ m, d: d as RankingItem[] }))
          .catch(() => ({ m, d: [] as RankingItem[] }))
      )
    )
      .then((res) => res.forEach(({ m, d }) => historyMonthsCache.current.set(m, d)))
      .catch(() => {});
  };

  // Dựng dữ liệu lịch sử 1 nhân viên từ cache tháng
  const buildHistory = (item: RankingItem, months: string[]): HistoryPoint[] => {
    const data: HistoryPoint[] = [];
    months.forEach((m) => {
      const found = (historyMonthsCache.current.get(m) || []).find((r) => r.msnv === item.msnv);
      if (!found) return;
      const mm = m.split('-')[1] ?? '01';
      data.push({
        key: m,
        label: toMonthYear(m),
        shortLabel: `T${parseInt(mm, 10)}`,
        samples: found.samples || 0,
        workDays: found.workDays || 0,
      });
    });
    return data;
  };

  // Mở bottom sheet lịch sử: ưu tiên cache đã tải trước, bấm là hiện ngay
  const openHistory = (item: RankingItem) => {
    setHistoryItem(item);
    const months = getHistoryMonths();
    const missing = months.filter((m) => !historyMonthsCache.current.has(m));
    if (missing.length === 0) {
      setIsLoadingHistory(false);
      setHistoryData(buildHistory(item, months));
      return;
    }
    // Trường hợp hiếm (bấm khi cache nền chưa xong): tải nốt tháng còn thiếu
    setHistoryData([]);
    setIsLoadingHistory(true);
    Promise.all(
      missing.map((m) =>
        apiGetRankings(toMonthYear(m))
          .then((d) => ({ m, d: d as RankingItem[] }))
          .catch(() => ({ m, d: [] as RankingItem[] }))
      )
    )
      .then((res) => {
        res.forEach(({ m, d }) => historyMonthsCache.current.set(m, d));
        setHistoryData(buildHistory(item, months));
      })
      .catch(() => {})
      .finally(() => setIsLoadingHistory(false));
  };

  const closeHistory = () => setHistoryItem(null);

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

  // Map msnv -> số ngày làm của tháng trước (để so sánh tăng/giảm ở tab Ngày làm)
  const prevWorkDaysMap = useMemo(() => {
    const map = new Map<string, number>();
    prevRankings.forEach((r) => map.set(r.msnv, r.workDays));
    return map;
  }, [prevRankings]);

  // Chênh lệch ngày làm so với tháng trước; null = không so sánh (tab Số mẫu hoặc thiếu dữ liệu)
  const getWorkDayDiff = (item: RankingItem): number | null => {
    if (rankingTab !== 'workDays') return null;
    const prev = prevWorkDaysMap.get(item.msnv);
    return prev === undefined ? null : item.workDays - prev;
  };

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
    const msnv = employeeId.trim();
  
    if (!msnv) {
      setEmployeeName('');
      setEmployeeError('');
      setIsSearching(false);
      return;
    }
  
    // Chỉ search khi đủ 4 ký tự
    if (msnv.length < 4) {
      setEmployeeName('');
      setEmployeeError('');
      setIsSearching(false);
      return;
    }
  
    const timer = setTimeout(async () => {
      const currentRequestId = ++requestIdRef.current;
      setIsSearching(true);
  
      try {
        const data = await apiGetEmployee(msnv);
  
        // bỏ response cũ
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
  
        if (data.found) {
          setEmployeeName(data.name);
          setEmployeeError('');
        } else {
          setEmployeeName('');
          setEmployeeError('Không tìm thấy mã nhân viên.');
        }
      } catch (err) {
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
  
        setEmployeeName('');
        setEmployeeError('Lỗi kết nối máy chủ.');
      } finally {
        if (currentRequestId === requestIdRef.current) {
          setIsSearching(false);
        }
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
        name: employeeName,
      });

      if (data && (data.success || data.local)) {
        setNotification({ 
          type: 'success', 
          message: data.local 
            ? 'Cập nhật thành công (Chế độ Offline).' 
            : 'Đã cập nhật báo cáo thành công!' 
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
          paddingTop: 'env(safe-area-inset-top)',
          transform: `translateY(-${Math.min(scrollY * 0.6, bannerHeight)}px)`,
          height: `${bannerHeight + 44}px`,
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
          <div className="absolute right-[6%] top-1/2 -translate-y-1/2 z-10 select-none">
            <div className="split-clock-container">
              <div className="split-clock-boxes">
                <div className="split-clock-box-wrapper">
                  <div key={currentTime.getHours()} className="split-clock-box">
                    <div className="split-clock-half split-clock-top">
                      <span className="split-clock-num">{padNum(currentTime.getHours())}</span>
                    </div>
                    <div className="split-clock-half split-clock-bottom">
                      <span className="split-clock-num">{padNum(currentTime.getHours())}</span>
                    </div>
                    <div className="split-clock-flap">
                      <span className="split-clock-num">{padNum(currentTime.getHours())}</span>
                    </div>
                    <div className="split-clock-divider" />
                  </div>
                </div>
                <div className="split-clock-box-wrapper">
                  <div key={currentTime.getMinutes()} className="split-clock-box">
                    <div className="split-clock-half split-clock-top">
                      <span className="split-clock-num">{padNum(currentTime.getMinutes())}</span>
                    </div>
                    <div className="split-clock-half split-clock-bottom">
                      <span className="split-clock-num">{padNum(currentTime.getMinutes())}</span>
                    </div>
                    <div className="split-clock-flap">
                      <span className="split-clock-num">{padNum(currentTime.getMinutes())}</span>
                    </div>
                    <div className="split-clock-divider" />
                  </div>
                </div>
                <div className="split-clock-box-wrapper">
                  <div key={currentTime.getSeconds()} className="split-clock-box">
                    <div className="split-clock-half split-clock-top">
                      <span className="split-clock-num">{padNum(currentTime.getSeconds())}</span>
                    </div>
                    <div className="split-clock-half split-clock-bottom">
                      <span className="split-clock-num">{padNum(currentTime.getSeconds())}</span>
                    </div>
                    <div className="split-clock-flap">
                      <span className="split-clock-num">{padNum(currentTime.getSeconds())}</span>
                    </div>
                    <div className="split-clock-divider" />
                  </div>
                </div>
              </div>
              <div className="split-clock-date">
                {formattedDate}
              </div>
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

        <div className="px-6 pt-4 pb-6 space-y-6 w-full max-w-7xl xl:max-w-[1700px] mx-auto">
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
                  <div className="flex items-center gap-1 px-2 md:px-2.5 py-0.5 md:py-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-xl text-[8px] md:text-[10px] font-bold uppercase tracking-normal whitespace-nowrap shrink-0">
                    <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
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
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2 whitespace-nowrap flex-shrink-0">Tháng Thống Kê</span>
                <div className="relative flex-1 sm:flex-none sm:w-auto min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" style={{ transform: 'translateZ(0)' }}>
                  <input 
                    type="month" 
                    value={rankingMonth}
                    onChange={e => setRankingMonth(e.target.value)}
                    className="w-full sm:w-auto max-w-full min-w-0 box-border overflow-hidden px-3 py-1.5 bg-transparent text-slate-900 dark:text-white font-bold text-[16px] md:text-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 [appearance:none] [-webkit-appearance:none]"
                  />
                </div>
              </div>
            </div>

            {/* Ranking board: tabs Số mẫu / Ngày làm, một bảng duy nhất */}
            <div className="bg-slate-50/50 dark:bg-slate-950/40 px-2 py-4 sm:p-5 rounded-3xl border border-slate-100 dark:border-slate-800/50 space-y-4">
              <div className="flex bg-slate-200/70 dark:bg-slate-800/60 rounded-2xl p-1 gap-1">
                <button
                  onClick={() => setRankingTab('samples')}
                  className={cn(
                    "flex-1 rounded-xl py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer",
                    rankingTab === 'samples'
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Số mẫu
                </button>
                <button
                  onClick={() => setRankingTab('workDays')}
                  className={cn(
                    "flex-1 rounded-xl py-2 text-xs font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer",
                    rankingTab === 'workDays'
                      ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  )}
                >
                  Ngày làm
                </button>
              </div>

              {isLoadingRankings ? (
                <BotLoader text="Đang tải bảng xếp hạng..." />
              ) : rankings.length === 0 ? (
                <div className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-500">
                  Chưa có dữ liệu tháng được chọn
                </div>
              ) : (
                (() => {
                  // Tab Số mẫu: xếp theo năng suất = số mẫu / ngày làm (giảm dần),
                  // hòa năng suất thì ai nhiều mẫu hơn đứng trên.
                  // Tab Ngày làm: giữ nguyên xếp theo ngày làm giảm dần.
                  const sorted = rankingTab === 'samples'
                    ? [...rankings].sort((a, b) => productivity(b) - productivity(a) || b.samples - a.samples)
                    : [...rankings].sort((a, b) => b.workDays - a.workDays);
                  const top3 = sorted.slice(0, 3);
                  const rest = sorted.slice(3);
                  return (
                    <>
                      {top3.length > 0 && (
                        <div className="flex gap-1.5 sm:gap-2 items-end">
                          {top3[1] && <PodiumCard key={top3[1].msnv} item={top3[1]} rank={1} mode={rankingTab} diff={getWorkDayDiff(top3[1])} onSelect={openHistory} />}
                          {top3[0] && <PodiumCard key={top3[0].msnv} item={top3[0]} rank={0} mode={rankingTab} diff={getWorkDayDiff(top3[0])} onSelect={openHistory} />}
                          {top3[2] && <PodiumCard key={top3[2].msnv} item={top3[2]} rank={2} mode={rankingTab} diff={getWorkDayDiff(top3[2])} onSelect={openHistory} />}
                        </div>
                      )}
                      <div className="space-y-2.5">
                        {rest.map((item, i) => (
                          <RankRow key={item.msnv} item={item} index={i + 3} mode={rankingTab} diff={getWorkDayDiff(item)} onSelect={openHistory} />
                        ))}
                      </div>
                    </>
                  );
                })()
              )}
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

      {/* Bottom sheet: lịch sử số mẫu 1 nhân viên (bấm vào tên trên bảng xếp hạng) */}
      <AnimatePresence>
        {historyItem && (
          <HistorySheet
            item={historyItem}
            data={historyData}
            loading={isLoadingHistory}
            mode={rankingTab}
            onClose={closeHistory}
          />
        )}
      </AnimatePresence>

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
