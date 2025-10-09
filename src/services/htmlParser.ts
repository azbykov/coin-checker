// TODO: Задача - HTML парсер для крипто-проектов
// Назначение: Извлечение данных крипто-проектов из HTML по селекторам
// Вход: Page, конфигурация селекторов
// Выход: CryptoProjectData с извлеченными данными
// Ошибки: Ошибки парсинга, неверные селекторы

import { Page } from 'puppeteer';
import { CryptoProjectData, HtmlSelectorsConfig } from '../types';
import { getHtmlBySelector, getTextBySelector } from '../utils/selectorUtils';
import { parsePrice, parseAmount } from '../utils/priceParser';
import { logger } from '../utils/logger';

export class HtmlParser {
  /**
   * Извлекает данные крипто-проекта из HTML по селекторам
   */
  async parseCryptoProject(
    page: Page, 
    url: string, 
    selectors: HtmlSelectorsConfig
  ): Promise<CryptoProjectData | null> {
    try {
      logger.info(`Parsing HTML for crypto project: ${url}`);

      const result: CryptoProjectData = {
        currentPrice: 0,
        nextPrice: null,
        listingPrice: null,
        raised: 0,
        currency: 'USD',
        url,
        timestamp: new Date(),
        customData: []
      };

      // Извлекаем текущую цену
      if (selectors.currentPrice) {
        const currentPriceData = await this.extractPriceData(page, selectors.currentPrice);
        if (currentPriceData) {
          result.currentPrice = currentPriceData.value || 0;
          if (currentPriceData.currency && currentPriceData.currency !== 'USD') {
            result.currency = currentPriceData.currency;
          }
        }
      }

      // Извлекаем следующую цену
      if (selectors.nextPrice) {
        const nextPriceData = await this.extractPriceData(page, selectors.nextPrice);
        if (nextPriceData && nextPriceData.value !== null) {
          result.nextPrice = nextPriceData.value;
        }
      }

      // Извлекаем цену листинга
      if (selectors.listingPrice) {
        const listingPriceData = await this.extractPriceData(page, selectors.listingPrice);
        if (listingPriceData && listingPriceData.value !== null) {
          result.listingPrice = listingPriceData.value;
        }
      }

      // Извлекаем собранные средства
      if (selectors.raised) {
        const raisedData = await this.extractAmountData(page, selectors.raised);
        if (raisedData) {
          result.raised = raisedData.value || 0;
          // Если валюта не была определена ранее, используем валюту из raised
          if (result.currency === 'USD' && raisedData.currency && raisedData.currency !== 'USD') {
            result.currency = raisedData.currency;
          }
        }
      }

      // Извлекаем валюту отдельно (если указан специальный селектор)
      if (selectors.currency) {
        const currency = await this.extractCurrency(page, selectors.currency);
        if (currency) {
          result.currency = currency;
        }
      }

      logger.info(`Successfully parsed HTML data for ${url}: ${JSON.stringify(result)}`);
      return result;

    } catch (error) {
      logger.error(`Failed to parse HTML for ${url}`, error as Error);
      return null;
    }
  }

  /**
   * Извлекает данные о цене по селектору
   */
  private async extractPriceData(page: Page, selector: string): Promise<{ value: number | null; currency: string } | null> {
    try {
      // Сначала пробуем получить текст
      const text = await getTextBySelector(page, selector);
      if (text) {
        const parsed = parsePrice(text);
        return {
          value: parsed.value,
          currency: parsed.currency
        };
      }

      // Если текст не найден, пробуем получить HTML
      const html = await getHtmlBySelector(page, selector);
      if (html) {
        const parsed = parsePrice(html);
        return {
          value: parsed.value,
          currency: parsed.currency
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to extract price data for selector: ${selector}`, error as Error);
      return null;
    }
  }

  /**
   * Извлекает данные о сумме по селектору
   */
  private async extractAmountData(page: Page, selector: string): Promise<{ value: number | null; currency: string } | null> {
    try {
      // Сначала пробуем получить текст
      const text = await getTextBySelector(page, selector);
      if (text) {
        const parsed = parseAmount(text);
        return {
          value: parsed.value,
          currency: parsed.currency
        };
      }

      // Если текст не найден, пробуем получить HTML
      const html = await getHtmlBySelector(page, selector);
      if (html) {
        const parsed = parseAmount(html);
        return {
          value: parsed.value,
          currency: parsed.currency
        };
      }

      return null;
    } catch (error) {
      logger.error(`Failed to extract amount data for selector: ${selector}`, error as Error);
      return null;
    }
  }

  /**
   * Извлекает валюту по селектору
   */
  private async extractCurrency(page: Page, selector: string): Promise<string | null> {
    try {
      const text = await getTextBySelector(page, selector);
      if (text) {
        // Очищаем текст от лишних символов
        const cleanText = text.trim().toUpperCase();
        
        // Проверяем известные валюты
        const currencies = ['USD', 'USDT', 'USDC', 'EUR', 'GBP', 'BTC', 'ETH', 'BNB', 'MATIC', 'AVAX', 'SOL'];
        for (const currency of currencies) {
          if (cleanText.includes(currency)) {
            return currency;
          }
        }
        
        return cleanText;
      }

      return null;
    } catch (error) {
      logger.error(`Failed to extract currency for selector: ${selector}`, error as Error);
      return null;
    }
  }

  /**
   * Извлекает дополнительные данные по селекторам
   */
  async extractCustomData(page: Page, selectors: { [key: string]: string }): Promise<{ [key: string]: string }> {
    const customData: { [key: string]: string } = {};

    for (const [key, selector] of Object.entries(selectors)) {
      try {
        const text = await getTextBySelector(page, selector);
        if (text) {
          customData[key] = text.trim();
        }
      } catch (error) {
        logger.warn(`Failed to extract custom data for ${key}: ${selector} - ${(error as Error).message}`);
      }
    }

    return customData;
  }

  /**
   * Проверяет доступность селекторов на странице
   */
  async validateSelectors(page: Page, selectors: HtmlSelectorsConfig): Promise<{ [key: string]: boolean }> {
    const validation: { [key: string]: boolean } = {};

    for (const [key, selector] of Object.entries(selectors)) {
      if (selector) {
        try {
          const text = await getTextBySelector(page, selector);
          validation[key] = text !== null && text.trim() !== '';
        } catch (error) {
          validation[key] = false;
        }
      }
    }

    return validation;
  }
}

// Экспорт для использования в других модулях
export const htmlParser = new HtmlParser();
