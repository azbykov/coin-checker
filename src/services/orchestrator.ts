// TODO: Задача 19 - Оркестрация процесса
// Назначение: Координация всех сервисов и управление процессом анализа
// Вход: Список URL для анализа
// Выход: Результаты обработки всех URL
// Ошибки: Ошибки инициализации, таймауты, ошибки API

import { ProcessingResult, CryptoProjectData } from '../types';
import { screenshotService } from './screenshotService';
import { createOpenAIService, createVisionParser } from './openaiService';
import { createTelegramService, createMessageService } from './telegramService';
import { ReportFormatter } from '../utils/reportFormatter';
import { storageService } from './storageService';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { browserService } from './browserService';

export class Orchestrator {
  private openaiService: ReturnType<typeof createOpenAIService>;
  private visionParser: ReturnType<typeof createVisionParser>;
  private telegramService: ReturnType<typeof createTelegramService>;
  private messageService: ReturnType<typeof createMessageService>;

  constructor() {
    this.openaiService = createOpenAIService(config.openai.apiKey);
    this.visionParser = createVisionParser(this.openaiService.getClient());
    this.telegramService = createTelegramService(config.telegram.botToken);
    this.messageService = createMessageService(this.telegramService.getBot(), config.telegram.botToken);
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing orchestrator...');
      
      // Инициализация браузера
      await browserService.initialize(config.browser.headless);
      
      // Тест подключения к OpenAI
      const openaiConnected = await this.openaiService.testConnection();
      if (!openaiConnected) {
        throw new Error('Failed to connect to OpenAI API');
      }
      
      // Запуск Telegram бота
      await this.telegramService.start();
      
      logger.info('Orchestrator initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize orchestrator', error as Error);
      throw error;
    }
  }

  async processUrl(url: string): Promise<ProcessingResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`Processing URL: ${url}`);
      
      // Создание скриншота
      const screenshotResult = await screenshotService.takeScreenshot(url);
      if (!screenshotResult.success) {
        throw new Error(screenshotResult.error || 'Screenshot failed');
      }
      
      // Анализ изображения через Vision API
      const visionData = await this.visionParser.parseImage(screenshotResult.screenshot);
      
      // Создание объекта данных
      const cryptoData: CryptoProjectData = {
        currentPrice: visionData.currentPrice,
        nextPrice: visionData.nextPrice,
        listingPrice: visionData.listingPrice,
        raised: visionData.raised,
        url: url,
        timestamp: new Date(),
      };
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`Successfully processed URL: ${url} in ${processingTime}ms`);
      
      return {
        url,
        success: true,
        data: cryptoData,
        processingTime,
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error(`Failed to process URL: ${url}`, error as Error);
      
      return {
        url,
        success: false,
        error: (error as Error).message,
        processingTime,
      };
    }
  }

  async processUrls(urls: string[]): Promise<ProcessingResult[]> {
    logger.info(`Starting processing of ${urls.length} URLs`);
    
    const results: ProcessingResult[] = [];
    
    for (const url of urls) {
      const result = await this.processUrl(url);
      results.push(result);
      
      // Отправка промежуточного результата в Telegram
      if (result.success && result.data) {
        const report = ReportFormatter.formatSingleProject(result.data);
        await this.messageService.sendReport(config.telegram.chatId, report);
      }
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return results;
  }

  async generateAndSendReport(results: ProcessingResult[]): Promise<void> {
    try {
      // Создание полного отчёта
      const fullReport = ReportFormatter.formatMultipleProjects(results);
      await this.messageService.sendReport(config.telegram.chatId, fullReport);
      
      // Создание краткого отчёта
      const summaryReport = ReportFormatter.formatSummary(results);
      await this.messageService.sendReport(config.telegram.chatId, summaryReport);
      
      // Сохранение результатов
      storageService.saveResults(results);
      
      logger.info('Report generated and sent successfully');
    } catch (error) {
      logger.error('Failed to generate and send report', error as Error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await browserService.close();
      await this.telegramService.stop();
      logger.info('Cleanup completed successfully');
    } catch (error) {
      logger.error('Cleanup failed', error as Error);
    }
  }
}

export const orchestrator = new Orchestrator(); 