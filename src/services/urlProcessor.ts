// TODO: Задача 20 - Обработка списка URL
// Назначение: Управление очередью URL и параллельной обработкой
// Вход: Массив URL
// Выход: Результаты обработки
// Ошибки: Нет

import { ProcessingResult } from '../types';
import { orchestrator } from './orchestrator';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { validateUrl, isCryptoProjectUrl } from '../utils/urlValidator';

export class UrlProcessor {
  async processUrlList(urls: string[]): Promise<ProcessingResult[]> {
    logger.info(`Starting to process ${urls.length} URLs`);
    
    // Фильтрация и валидация URL
    const validUrls = this.filterValidUrls(urls);
    logger.info(`Found ${validUrls.length} valid URLs out of ${urls.length}`);
    
    if (validUrls.length === 0) {
      logger.warn('No valid URLs to process');
      return [];
    }
    
    // Обработка URL с ограничением параллелизма
    return this.processWithConcurrencyLimit(validUrls);
  }

  private filterValidUrls(urls: string[]): string[] {
    return urls.filter(url => {
      if (!validateUrl(url)) {
        logger.warn(`Invalid URL format: ${url}`);
        return false;
      }
      
      if (!isCryptoProjectUrl(url)) {
        logger.warn(`URL doesn't appear to be a crypto project: ${url}`);
        return false;
      }
      
      return true;
    });
  }

  private async processWithConcurrencyLimit(urls: string[]): Promise<ProcessingResult[]> {
    const maxConcurrent = config.app.maxConcurrentRequests;
    const results: ProcessingResult[] = [];
    
    // Обработка URL батчами
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      logger.info(`Processing batch ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(urls.length / maxConcurrent)}`);
      
      const batchPromises = batch.map(url => orchestrator.processUrl(url));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Пауза между батчами
      if (i + maxConcurrent < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    return results;
  }

  async processSingleUrl(url: string): Promise<ProcessingResult> {
    if (!validateUrl(url)) {
      return {
        url,
        success: false,
        error: 'Invalid URL format',
        processingTime: 0,
      };
    }
    
    return orchestrator.processUrl(url);
  }
}

export const urlProcessor = new UrlProcessor(); 