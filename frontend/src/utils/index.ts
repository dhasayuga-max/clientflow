import clsx, { ClassValue } from 'clsx';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string | Date, fmt = 'dd MMM yyyy'): string {
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(date, fmt);
  } catch {
    return String(dateStr);
  }
}

export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    paid: 'badge-paid',
    pending: 'badge-pending',
    overdue: 'badge-overdue',
    draft: 'badge-draft',
    sent: 'badge-sent',
    accepted: 'badge-accepted',
    rejected: 'badge-rejected',
  };
  return map[status] || 'badge-draft';
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function getMonthName(month: number): string {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1] || '';
}

export function truncate(str: string, length = 30): string {
  return str.length > length ? str.slice(0, length) + '...' : str;
}
