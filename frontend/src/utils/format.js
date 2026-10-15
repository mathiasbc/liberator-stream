const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

export const toNumber = (v) => {
  if (isNum(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[^0-9.-]+/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
};

export const formatInt = (v) =>
  isNum(v) ? Math.round(v).toLocaleString('en-US') : '—';

export const formatUsd = (v, decimals = 0) =>
  isNum(v)
    ? `$${v.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`
    : '—';

export const formatCompactUsd = (v) => {
  const n = toNumber(v);
  if (n === null) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return formatUsd(n);
};

export const formatCompact = (v) => {
  if (!isNum(v)) return '—';
  const abs = Math.abs(v);
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(abs < 10 ? 2 : 0);
};

// Uses a real minus sign so negative numbers line up with positive ones
export const formatPct = (v, digits = 2, { sign = false } = {}) => {
  const n = toNumber(v);
  if (n === null) return '—';
  const body = Math.abs(n).toFixed(digits);
  if (n < 0) return `−${body}%`;
  return `${sign ? '+' : ''}${body}%`;
};

// "45s", "4m", "1h 12m", "3d 4h"
export const formatAgo = (seconds) => {
  if (!isNum(seconds)) return '—';
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

// Countdown clock: "0:42", "12:03", "4:12:33", and "3d 20h 53m" once it's
// days away (seconds stop mattering and the label stays short)
export const formatCountdown = (seconds) => {
  if (!isNum(seconds)) return '—';
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  if (d > 0) return `${d}d ${h}h ${String(m).padStart(2, '0')}m`;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${sec}`;
  return `${m}:${sec}`;
};

// Rough human duration for far-off events: "~37h", "~1.5 days", "~545 days"
export const formatEta = (seconds) => {
  if (!isNum(seconds)) return '—';
  const hours = seconds / 3600;
  if (hours < 48) return `~${Math.max(1, Math.round(hours))}h`;
  const days = hours / 24;
  return `~${days < 10 ? days.toFixed(1) : Math.round(days).toLocaleString('en-US')} days`;
};

export const formatMonthYear = (date) =>
  date instanceof Date && !isNaN(date)
    ? date.toLocaleString('en-US', {
        month: 'short',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';

// "Oct '25"
export const formatMonthShort = (date) =>
  date instanceof Date && !isNaN(date)
    ? `${date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })} '${String(date.getUTCFullYear()).slice(-2)}`
    : '—';

export const formatDate = (date) =>
  date instanceof Date && !isNaN(date)
    ? date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : '—';
