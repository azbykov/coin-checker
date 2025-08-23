#!/usr/bin/env tsx

// TODO: Пакетная обработка URL
// Назначение: Обработка массива URL и возврат структурированных данных
// Вход: Массив URL
// Выход: Массив результатов обработки
// Ошибки: Ошибки обработки отдельных URL

import { orchestrator } from '../services/orchestrator';
import { urlProcessor } from '../services/urlProcessor';
import { reportService } from '../services/reportService';
import { logger } from '../utils/logger';
import { ProcessingResult } from '../types';

export class BatchProcessor {
  /**
   * Обрабатывает массив URL и возвращает результаты
   * @param urls - массив URL для обработки
   * @param options - опции обработки
   * @returns Promise<ProcessingResult[]> - результаты обработки
   */
  async processUrls(
    urls: string[],
    options: {
      sendToTelegram?: boolean;
      saveToFile?: boolean;
      maxConcurrent?: number;
    } = {}
  ): Promise<ProcessingResult[]> {
    const {
      sendToTelegram = false,
      saveToFile = true,
      maxConcurrent: _maxConcurrent = 3
    } = options;

    try {
      logger.info(`Начинаем пакетную обработку ${urls.length} URL`);
      
      // Инициализация оркестратора
      await orchestrator.initialize();
      
      // Обработка URL
      const results = await urlProcessor.processUrlList(urls);
      
      // Генерация статистики
      const stats = await reportService.generateStatistics(results);
      logger.info(`Обработка завершена. Успешно: ${stats.successful}/${stats.total} (${stats.successRate.toFixed(1)}%)`);
      
      // Отправка в Telegram (если включено)
      if (sendToTelegram) {
        await orchestrator.generateAndSendReport(results);
      }
      
      // Сохранение в файл (если включено)
      if (saveToFile) {
        await reportService.saveReportData(results);
      }
      
      return results;
      
    } catch (error) {
      logger.error('Ошибка при пакетной обработке', error as Error);
      throw error;
    } finally {
      // Очистка ресурсов
      await orchestrator.cleanup();
    }
  }

  /**
   * Обрабатывает один URL и возвращает результат
   * @param url - URL для обработки
   * @returns Promise<ProcessingResult> - результат обработки
   */
  async processSingleUrl(url: string): Promise<ProcessingResult> {
    try {
      logger.info(`Обрабатываем один URL: ${url}`);
      
      // Инициализация оркестратора
      await orchestrator.initialize();
      
      // Обработка URL
      const result = await urlProcessor.processSingleUrl(url);
      
      logger.info(`Обработка завершена. Успешно: ${result.success}`);
      
      return result;
      
    } catch (error) {
      logger.error('Ошибка при обработке URL', error as Error);
      throw error;
    } finally {
      // Очистка ресурсов
      await orchestrator.cleanup();
    }
  }

  /**
   * Получает статистику по результатам обработки
   * @param results - результаты обработки
   * @returns объект со статистикой
   */
  async getStatistics(results: ProcessingResult[]) {
    return await reportService.generateStatistics(results);
  }

  /**
   * Форматирует результаты в JSON
   * @param results - результаты обработки
   * @returns отформатированный JSON
   */
  formatResultsAsJson(results: ProcessingResult[]): string {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    const formattedResults = {
      summary: {
        total: results.length,
        successful: successful.length,
        failed: failed.length,
        successRate: results.length > 0 ? (successful.length / results.length) * 100 : 0,
        totalTime: results.reduce((sum, r) => sum + r.processingTime, 0),
        averageTime: results.length > 0 ? Math.round(results.reduce((sum, r) => sum + r.processingTime, 0) / results.length) : 0
      },
      successful: successful.map(r => ({
        url: r.url,
        data: r.data,
        processingTime: r.processingTime
      })),
      failed: failed.map(r => ({
        url: r.url,
        error: r.error,
        processingTime: r.processingTime
      }))
    };
    
    return JSON.stringify(formattedResults, null, 2);
  }
}

// Экспорт для использования в других модулях
export const batchProcessor = new BatchProcessor(); 