// TODO: Задача 17 - Валидация данных
// Назначение: Проверка корректности данных от Vision API
// Вход: Данные от API
// Выход: boolean - валидность данных
// Ошибки: Нет

import { VisionApiResponse, CryptoProjectData } from '../types';

export class DataValidator {
  static validateVisionResponse(response: VisionApiResponse): boolean {
    return (
      typeof response.currentPrice === 'string' &&
      typeof response.listingPrice === 'string' &&
      typeof response.raised === 'string' &&
      response.currentPrice.length > 0 &&
      response.listingPrice.length > 0 &&
      response.raised.length > 0
    );
  }

  static validateCryptoProjectData(data: CryptoProjectData): boolean {
    return (
      typeof data.currentPrice === 'string' &&
      typeof data.listingPrice === 'string' &&
      typeof data.raised === 'string' &&
      typeof data.url === 'string' &&
      data.timestamp instanceof Date &&
      data.url.length > 0
    );
  }

  static sanitizePrice(price: string): string {
    // Удаляем лишние символы и нормализуем формат
    return price
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\d.,$€£¥₽]/g, '');
  }

  static sanitizeAmount(amount: string): string {
    // Нормализуем формат суммы
    return amount
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\d.,$€£¥₽]/g, '');
  }

  static isNumericValue(value: string): boolean {
    // Проверяем, содержит ли значение числа
    return /\d/.test(value);
  }

  static hasValidCurrencySymbol(value: string): boolean {
    // Проверяем наличие валютных символов
    const currencySymbols = ['$', '€', '£', '¥', '₽', '₿'];
    return currencySymbols.some(symbol => value.includes(symbol));
  }
} 