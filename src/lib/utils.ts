import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumberWithDots(value: string | number) {
  const number = typeof value === 'string' ? value.replace(/\D/g, '') : value.toString();
  if (number === '') return '';
  return new Intl.NumberFormat('es-CO').format(parseInt(number));
}

export function parseFormattedNumber(value: string) {
  return parseInt(value.replace(/\./g, '')) || 0;
}

export function normalizeText(text: string) {
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
