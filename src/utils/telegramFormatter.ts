// TODO: Задача - Форматирование сообщений для Telegram
// Назначение: Красивое форматирование данных крипто-проектов для Telegram бота
// Вход: Данные крипто-проекта, настройки форматирования
// Выход: Отформатированные HTML сообщения
// Ошибки: Нет

import { CryptoProjectData } from '../types';

export interface TelegramFormatOptions {
  showEmojis?: boolean;
  showTimestamp?: boolean;
  showCurrency?: boolean;
  compactMode?: boolean;
}

/**
 * Форматирует число с валютой для отображения
 */
export function formatCurrency(value: number | null, currency: string, showSymbol: boolean = true): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  const symbol = getCurrencySymbol(currency);
  const formatted = formatNumber(value);
  
  if (showSymbol && symbol) {
    return `${symbol}${formatted}`;
  }
  
  return `${formatted} ${currency}`;
}

/**
 * Форматирует число с разделителями тысяч
 */
export function formatNumber(value: number): string {
  if (value === null || value === undefined) {
    return 'N/A';
  }

  // Для больших чисел показываем в сокращенном виде
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  } else if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }

  // Для малых чисел показываем с нужной точностью
  if (value < 0.000001) {
    return value.toExponential(2);
  } else if (value < 0.01) {
    return value.toFixed(6);
  } else if (value < 1) {
    return value.toFixed(4);
  } else {
    return value.toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 2 
    });
  }
}

/**
 * Получает символ валюты
 */
function getCurrencySymbol(currency: string): string {
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'USDT': '$',
    'USDC': '$',
    'EUR': '€',
    'GBP': '£',
    'BTC': '₿',
    'ETH': 'Ξ',
    'BNB': 'BNB',
    'MATIC': 'MATIC',
    'AVAX': 'AVAX',
    'SOL': '◎'
  };

  return symbols[currency.toUpperCase()] || currency;
}

/**
 * Форматирует URL для отображения
 */
export function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    return `<a href="${url}">${domain}</a>`;
  } catch {
    return url;
  }
}

/**
 * Получает эмодзи для типа данных
 */
function getDataEmoji(field: string): string {
  const emojis: { [key: string]: string } = {
    currentPrice: '💰',
    nextPrice: '📈',
    listingPrice: '🏷️',
    raised: '💵',
    currency: '💱',
    url: '🌐',
    timestamp: '⏰',
    status: '📊'
  };

  return emojis[field] || '📋';
}

/**
 * Форматирует данные крипто-проекта в красивое сообщение для Telegram
 */
export function formatCryptoProjectMessage(
  data: CryptoProjectData, 
  options: TelegramFormatOptions = {}
): string {
  const {
    showEmojis = true,
    showTimestamp = true,
    showCurrency = true
  } = options;

  const emoji = (field: string) => showEmojis ? getDataEmoji(field) : '';

  let message = '';

  // Заголовок
  if (showEmojis) {
    message += `🔍 <b>Анализ крипто-проекта</b>\n\n`;
  } else {
    message += `<b>Анализ крипто-проекта</b>\n\n`;
  }

  // URL
  message += `${emoji('url')} <b>Сайт:</b> ${formatUrl(data.url)}\n`;

  // Цены
  message += `${emoji('currentPrice')} <b>Текущая цена:</b> `;
  if (showCurrency) {
    message += `<code>${formatCurrency(data.currentPrice, data.currency)}</code>\n`;
  } else {
    message += `<code>${formatNumber(data.currentPrice)}</code>\n`;
  }

  // Следующая цена
  if (data.nextPrice !== null) {
    message += `${emoji('nextPrice')} <b>Следующая цена:</b> `;
    if (showCurrency) {
      message += `<code>${formatCurrency(data.nextPrice, data.currency)}</code>\n`;
    } else {
      message += `<code>${formatNumber(data.nextPrice)}</code>\n`;
    }
  }

  // Цена листинга
  if (data.listingPrice !== null) {
    message += `${emoji('listingPrice')} <b>Цена листинга:</b> `;
    if (showCurrency) {
      message += `<code>${formatCurrency(data.listingPrice, data.currency)}</code>\n`;
    } else {
      message += `<code>${formatNumber(data.listingPrice)}</code>\n`;
    }
  }

  // Собранные средства
  message += `${emoji('raised')} <b>Собрано средств:</b> `;
  if (showCurrency) {
    message += `<code>${formatCurrency(data.raised, data.currency)}</code>\n`;
  } else {
    message += `<code>${formatNumber(data.raised)}</code>\n`;
  }

  // Валюта (если не показывается в ценах)
  if (!showCurrency) {
    message += `${emoji('currency')} <b>Валюта:</b> <code>${data.currency}</code>\n`;
  }

  // Время анализа
  if (showTimestamp) {
    message += `${emoji('timestamp')} <b>Время анализа:</b> <i>${data.timestamp.toLocaleString('ru-RU')}</i>`;
  }

  return message.trim();
}

/**
 * Форматирует сообщение об ошибке
 */
export function formatErrorMessage(url: string, error: string, showEmojis: boolean = true): string {
  const emoji = showEmojis ? '❌' : '';
  const errorEmoji = showEmojis ? '⚠️' : '';

  return `${emoji} <b>Ошибка анализа</b>

${errorEmoji} <b>Сайт:</b> ${formatUrl(url)}
${errorEmoji} <b>Ошибка:</b> <code>${error}</code>

${showEmojis ? '⏰' : ''} <b>Время:</b> <i>${new Date().toLocaleString('ru-RU')}</i>`;
}

/**
 * Форматирует сообщение о статусе процесса
 */
export function formatStatusMessage(
  processed: number, 
  total: number, 
  currentUrl: string, 
  showEmojis: boolean = true
): string {
  const emoji = showEmojis ? '📊' : '';
  const progressEmoji = showEmojis ? '🔄' : '';
  const urlEmoji = showEmojis ? '🌐' : '';

  const percentage = Math.round((processed / total) * 100);
  const progressBar = generateProgressBar(percentage, showEmojis);

  return `${emoji} <b>Статус анализа</b>

${progressEmoji} <b>Прогресс:</b> ${progressBar} ${percentage}%
${progressEmoji} <b>Обработано:</b> ${processed}/${total}

${urlEmoji} <b>Текущий сайт:</b> ${formatUrl(currentUrl)}`;
}

/**
 * Генерирует прогресс-бар
 */
function generateProgressBar(percentage: number, showEmojis: boolean = true): string {
  const filled = Math.round(percentage / 10);
  const empty = 10 - filled;

  if (showEmojis) {
    const filledChar = '🟩';
    const emptyChar = '⬜';
    return filledChar.repeat(filled) + emptyChar.repeat(empty);
  } else {
    return '█'.repeat(filled) + '░'.repeat(empty);
  }
}

/**
 * Форматирует сообщение о завершении анализа
 */
export function formatCompletionMessage(
  total: number, 
  successful: number, 
  failed: number, 
  processingTime: number,
  showEmojis: boolean = true
): string {
  const emoji = showEmojis ? '✅' : '';
  const successEmoji = showEmojis ? '🎉' : '';
  const errorEmoji = showEmojis ? '❌' : '';
  const timeEmoji = showEmojis ? '⏱️' : '';

  const successRate = Math.round((successful / total) * 100);

  return `${emoji} <b>Анализ завершен</b>

${successEmoji} <b>Успешно:</b> ${successful} (${successRate}%)
${errorEmoji} <b>Ошибок:</b> ${failed}
${timeEmoji} <b>Время выполнения:</b> ${formatDuration(processingTime)}

${showEmojis ? '📊' : ''} <b>Всего обработано:</b> ${total}`;
}

/**
 * Форматирует продолжительность в читаемый вид
 */
function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}ч ${minutes % 60}м ${seconds % 60}с`;
  } else if (minutes > 0) {
    return `${minutes}м ${seconds % 60}с`;
  } else {
    return `${seconds}с`;
  }
}

/**
 * Форматирует сообщение о начале анализа
 */
export function formatStartMessage(totalSites: number, showEmojis: boolean = true): string {
  const emoji = showEmojis ? '🚀' : '';
  const sitesEmoji = showEmojis ? '🌐' : '';
  const timeEmoji = showEmojis ? '⏰' : '';

  return `${emoji} <b>Запуск анализа крипто-проектов</b>

${sitesEmoji} <b>Сайтов для анализа:</b> ${totalSites}
${timeEmoji} <b>Время начала:</b> <i>${new Date().toLocaleString('ru-RU')}</i>

${showEmojis ? '⏳' : ''} Начинаем обработку...`;
}
