// TODO: Задача 9 - Валидация URL
// Назначение: Проверка корректности URL для скриншотов
// Вход: URL строка
// Выход: boolean - валидность URL
// Ошибки: Некорректный формат URL

import { ValidationError } from './errorHandler';

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string): string {
  const trimmedUrl = url.trim();
  
  if (!validateUrl(trimmedUrl)) {
    throw new ValidationError(`Invalid URL format: ${url}`);
  }
  
  return trimmedUrl;
}

export function isCryptoProjectUrl(url: string): boolean {
  const cryptoKeywords = [
    'ico', 'ido', 'launchpad', 'presale', 'token', 'coin',
    'crypto', 'blockchain', 'defi', 'nft'
  ];
  
  const lowerUrl = url.toLowerCase();
  return cryptoKeywords.some(keyword => lowerUrl.includes(keyword));
} 