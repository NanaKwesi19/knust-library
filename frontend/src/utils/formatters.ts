import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';
    return format(d, 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return 'N/A';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return 'Invalid date';
    return format(d, 'MMM d, yyyy h:mm a');
  } catch {
    return 'Invalid date';
  }
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return 'Just now';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    if (isNaN(d.getTime())) return 'Unknown';
    return formatDistanceToNow(d, { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

export function formatCurrency(amount: number | null | undefined, currency = 'GH¢'): string {
  if (amount === null || amount === undefined || isNaN(amount)) return `${currency} 0.00`;
  return `${currency} ${amount.toFixed(2)}`;
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return num.toLocaleString('en-GH');
}

export function truncate(str: string | null | undefined, length: number): string {
  if (!str || str.length <= length) return str || '';
  return str.slice(0, length) + '...';
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}