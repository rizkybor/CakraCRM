import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatCompactCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    ...(withTime && { timeStyle: 'short' }),
  }).format(new Date(value));
}

/** Converts an ISO string to the value format expected by <input type="date">. */
export function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

/** Converts an ISO string to the value format expected by <input type="datetime-local">. */
export function toDateTimeInput(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  const offset = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}
