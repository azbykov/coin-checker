// TODO: Задача - Парсер цен и валют
// Назначение: Извлечение числовых значений и валют из строк
// Вход: Строка с ценой (например, "$1,234.56", "0.001 USDT")
// Выход: Объект с числовым значением и валютой
// Ошибки: Нет

import { logger } from './logger';

export interface ParsedPrice {
  value: number | null;
  currency: string;
}

/**
 * Парсит строку с ценой и извлекает числовое значение и валюту
 * @param priceString - Строка с ценой (например, "$1,234.56", "0.001 USDT", "N/A")
 * @returns Объект с числовым значением и валютой
 */
export function parsePrice(priceString: string): ParsedPrice {
  if (!priceString || priceString.trim() === '' || priceString.toUpperCase() === 'N/A') {
    return { value: null, currency: 'USD' };
  }

  const trimmed = priceString.trim();
  
  // Словарь валют для распознавания
  const currencyMap: { [key: string]: string } = {
    '$': 'USD',
    'USD': 'USD',
    'USDT': 'USDT',
    'USDC': 'USDC',
    'ETH': 'ETH',
    'BTC': 'BTC',
    'BNB': 'BNB',
    'MATIC': 'MATIC',
    'AVAX': 'AVAX',
    'SOL': 'SOL'
  };

  // Паттерн для поиска чисел (включая числа с запятыми и точками)
  const numberPattern = /[\d,]+\.?\d*/g;
  
  // Ищем число в строке
  const numberMatch = trimmed.match(numberPattern);
  
  if (!numberMatch) {
    logger.warn(`Could not extract number from price string: "${priceString}"`);
    return { value: null, currency: 'USD' };
  }

  // Берем первое найденное число
  const numberString = numberMatch[0];
  
  // Убираем запятые и конвертируем в число
  const numericValue = parseFloat(numberString.replace(/,/g, ''));
  
  if (isNaN(numericValue)) {
    logger.warn(`Could not parse number from: "${numberString}"`);
    return { value: null, currency: 'USD' };
  }

  // Ищем валюту
  let currency = 'USD'; // По умолчанию
  
  // Проверяем символы валют в начале или конце строки
  const upperTrimmed = trimmed.toUpperCase();
  
  for (const [symbol, currencyCode] of Object.entries(currencyMap)) {
    if (upperTrimmed.includes(symbol.toUpperCase())) {
      currency = currencyCode;
      break;
    }
  }

  // Специальная обработка для USDT и других криптовалют
  if (upperTrimmed.includes('USDT')) {
    currency = 'USDT';
  } else if (upperTrimmed.includes('USDC')) {
    currency = 'USDC';
  } else if (upperTrimmed.includes('ETH')) {
    currency = 'ETH';
  } else if (upperTrimmed.includes('BTC')) {
    currency = 'BTC';
  }

  return { value: numericValue, currency };
}

/**
 * Парсит строку с суммой (например, "$1,234,567.89", "2.5M USD")
 * @param amountString - Строка с суммой
 * @returns Объект с числовым значением и валютой
 */
export function parseAmount(amountString: string): ParsedPrice {
  if (!amountString || amountString.trim() === '' || amountString.toUpperCase() === 'N/A') {
    return { value: null, currency: 'USD' };
  }

  const trimmed = amountString.trim();
  
  // Обработка суффиксов (M, K, B)
  let multiplier = 1;
  let processedString = trimmed;
  
  if (trimmed.includes('M')) {
    multiplier = 1000000;
    processedString = trimmed.replace('M', '');
  } else if (trimmed.includes('K')) {
    multiplier = 1000;
    processedString = trimmed.replace('K', '');
  } else if (trimmed.includes('B')) {
    multiplier = 1000000000;
    processedString = trimmed.replace('B', '');
  }

  const parsed = parsePrice(processedString);
  
  if (parsed.value !== null) {
    parsed.value = parsed.value * multiplier;
  }

  return parsed;
}

/**
 * Конвертирует VisionApiResponse в CryptoProjectData с парсингом чисел
 * @param visionResponse - Ответ от Vision API
 * @param url - URL проекта
 * @param customData - Дополнительные данные
 * @returns CryptoProjectData с числовыми значениями
 */
export function convertVisionResponseToCryptoProjectData(
  visionResponse: any,
  url: string,
  customData?: any[]
): any {
  const currentPrice = parsePrice(visionResponse.currentPrice);
  const nextPrice = parsePrice(visionResponse.nextPrice);
  const listingPrice = parsePrice(visionResponse.listingPrice);
  const raised = parseAmount(visionResponse.raised);

  // Определяем основную валюту (приоритет: raised -> currentPrice -> USD)
  let mainCurrency = 'USD';
  if (raised.currency && raised.currency !== 'USD') {
    mainCurrency = raised.currency;
  } else if (currentPrice.currency && currentPrice.currency !== 'USD') {
    mainCurrency = currentPrice.currency;
  }

  return {
    currentPrice: currentPrice.value,
    nextPrice: nextPrice.value,
    listingPrice: listingPrice.value,
    raised: raised.value,
    currency: mainCurrency,
    url,
    timestamp: new Date(),
    customData
  };
}
