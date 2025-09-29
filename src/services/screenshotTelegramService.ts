// TODO: Задача 15 - Интегрированный сервис скриншотов и Telegram
// Назначение: Создание скриншотов и отправка их в Telegram с сохранением на диск
// Вход: URL страницы, chat ID, опции
// Выход: Результат отправки и сохранения
// Ошибки: Ошибки создания скриншота, отправки, сохранения

import { Telegraf } from 'telegraf';
import { ScreenshotService } from './screenshotService';
import { MessageService } from './messageService';
// import { ScreenshotResult } from '../types';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errorHandler';
import { sanitizeUrl } from '../utils/urlValidator';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ScreenshotTelegramOptions {
  saveToDisk?: boolean;
  savePath?: string;
  sendToTelegram?: boolean;
  chatId?: string;
  caption?: string;
  filename?: string;
  timeout?: number;
  selector?: string;
  selectors?: string[]; // Массив селекторов для множественных блоков
  quality?: number;
  format?: 'png' | 'jpeg';
}

export interface ScreenshotTelegramResult {
  url: string;
  success: boolean;
  screenshot?: Buffer;
  savedPath?: string;
  telegramMessageId?: number;
  error?: string;
  processingTime: number;
}

export interface MultipleScreenshotsTelegramResult {
  url: string;
  success: boolean;
  screenshots: Array<{
    selector: string;
    screenshot: Buffer;
    savedPath?: string;
    telegramMessageId?: number;
    error?: string;
  }>;
  processingTime: number;
}

export class ScreenshotTelegramService {
  private screenshotService: ScreenshotService;
  private messageService: MessageService;
  private bot: Telegraf;

  constructor(bot: Telegraf, botToken: string) {
    this.bot = bot;
    this.screenshotService = new ScreenshotService();
    this.messageService = new MessageService(bot, botToken);
  }

  async processScreenshot(
    url: string, 
    options: ScreenshotTelegramOptions = {},
    existingScreenshot?: Buffer
  ): Promise<ScreenshotTelegramResult> {
    const startTime = Date.now();
    const sanitizedUrl = sanitizeUrl(url);
    
    const {
      saveToDisk = true,
      savePath = './screenshots',
      sendToTelegram = true,
      chatId,
      caption,
      filename,
      timeout = 30000,
      selector,
      quality: _quality = 90,
      format = 'png'
    } = options;

    try {
      logger.info(`Processing screenshot for: ${sanitizedUrl}`);

      let screenshotBuffer: Buffer;
      
      if (existingScreenshot) {
        // Используем готовый скриншот
        screenshotBuffer = existingScreenshot;
        logger.info(`Using existing screenshot for: ${sanitizedUrl}`);
      } else {
        // Создаем новый скриншот
        const screenshotResult = await this.screenshotService.takeScreenshot(
          sanitizedUrl, 
          timeout, 
          selector
        );

        if (!screenshotResult.success) {
          throw new Error(screenshotResult.error || 'Не удалось создать скриншот');
        }
        
        screenshotBuffer = screenshotResult.screenshot;
      }

      let savedPath: string | undefined;
      let telegramMessageId: number | undefined;

      // 2. Сохраняем на диск (если требуется)
      if (saveToDisk) {
        savedPath = await this.saveScreenshotToDisk(
          screenshotBuffer,
          sanitizedUrl,
          savePath,
          filename,
          format
        );
        logger.info(`Screenshot saved to: ${savedPath}`);
      }

      // 3. Отправляем в Telegram (если требуется)
      if (sendToTelegram && chatId) {
        const telegramCaption = this.generateCaption(sanitizedUrl, caption, savedPath);
        
        if (format === 'jpeg') {
          // Для JPEG отправляем как документ для лучшего качества
          await this.messageService.sendDocument(
            chatId,
            screenshotBuffer,
            `${filename || this.generateFilename(sanitizedUrl)}.jpg`,
            telegramCaption
          );
        } else {
          // Для PNG отправляем как фото
          await this.messageService.sendPhoto(
            chatId,
            screenshotBuffer,
            telegramCaption
          );
        }
        
        logger.info(`Screenshot sent to Telegram chat: ${chatId}`);
      }

      const processingTime = Date.now() - startTime;

      logger.info(`Screenshot processing completed for: ${sanitizedUrl} (${processingTime}ms)`);

      const result: ScreenshotTelegramResult = {
        url: sanitizedUrl,
        success: true,
        screenshot: screenshotBuffer,
        processingTime
      };
      
      if (savedPath) {
        result.savedPath = savedPath;
      }
      
      if (telegramMessageId) {
        result.telegramMessageId = telegramMessageId;
      }
      
      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = (error as Error).message;
      
      logger.error(`Failed to process screenshot for ${sanitizedUrl}`, error as Error);
      
      return {
        url: sanitizedUrl,
        success: false,
        error: errorMessage,
        processingTime
      };
    }
  }

  async processScreenshots(
    urls: string[],
    options: ScreenshotTelegramOptions = {}
  ): Promise<ScreenshotTelegramResult[]> {
    const results: ScreenshotTelegramResult[] = [];
    
    logger.info(`Processing ${urls.length} screenshots`);

    for (const [index, url] of urls.entries()) {
      try {
        const result = await this.processScreenshot(url, options);
        results.push(result);
        
        logger.info(`Processed ${index + 1}/${urls.length}: ${url} - ${result.success ? 'SUCCESS' : 'FAILED'}`);
        
        // Пауза между запросами
        if (index < urls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        logger.error(`Error processing screenshot for ${url}:`, error as Error);
        results.push({
          url,
          success: false,
          error: (error as Error).message,
          processingTime: 0
        });
      }
    }

    return results;
  }

  async processMultipleScreenshots(
    url: string, 
    options: ScreenshotTelegramOptions = {}
  ): Promise<MultipleScreenshotsTelegramResult> {
    const startTime = Date.now();
    const sanitizedUrl = sanitizeUrl(url);
    
    const {
      saveToDisk = true,
      savePath = './screenshots',
      sendToTelegram = true,
      chatId,
      caption,
      timeout = 30000,
      selectors = [],
      quality: _quality = 90,
      format = 'png'
    } = options;

    if (!selectors || selectors.length === 0) {
      throw new Error('Не указаны селекторы для множественных скриншотов');
    }

    try {
      logger.info(`Processing multiple screenshots for: ${sanitizedUrl} with ${selectors.length} selectors`);

      // Создаем множественные скриншоты
      const screenshotResults = await this.screenshotService.takeScreenshotWithMultipleSelectors(
        sanitizedUrl, 
        selectors, 
        timeout
      );

      const screenshots: Array<{
        selector: string;
        screenshot: Buffer;
        savedPath?: string;
        telegramMessageId?: number;
        error?: string;
      }> = [];

      // Обрабатываем каждый скриншот
      for (let i = 0; i < screenshotResults.length; i++) {
        const result = screenshotResults[i];
        const selector = selectors[i];
        
        if (!selector) {
          logger.warn(`Пропускаем пустой селектор для ${sanitizedUrl}`);
          continue;
        }
        
        if (!result || !result.success) {
          screenshots.push({
            selector,
            screenshot: Buffer.alloc(0),
            error: result?.error || 'Неизвестная ошибка'
          });
          continue;
        }

        let savedPath: string | undefined;
        let telegramMessageId: number | undefined;

        // Сохраняем на диск (если требуется)
        if (saveToDisk) {
          try {
            const filename = this.generateFilename(sanitizedUrl, format);
            const selectorSafe = selector.replace(/[^a-zA-Z0-9]/g, '_');
            const filenameWithSelector = `${selectorSafe}_${filename}`;
            
            savedPath = await this.saveScreenshotToDisk(
              result.screenshot,
              sanitizedUrl,
              savePath,
              filenameWithSelector,
              format
            );
            logger.info(`Screenshot for selector "${selector}" saved to: ${savedPath}`);
          } catch (error) {
            logger.error(`Failed to save screenshot for selector "${selector}"`, error as Error);
          }
        }

        // Отправляем в Telegram (если требуется)
        if (sendToTelegram && chatId) {
          try {
            const selectorCaption = this.generateCaption(
              sanitizedUrl, 
              `${caption || ''}\n\nСелектор: ${selector}`, 
              savedPath
            );
            
            if (format === 'jpeg') {
              // Для JPEG отправляем как есть, так как convertToJpeg не существует
              const sentMessage = await this.bot.telegram.sendPhoto(chatId, 
                { source: result.screenshot }, 
                { caption: selectorCaption, parse_mode: 'HTML' }
              );
              telegramMessageId = sentMessage.message_id;
            } else {
              const sentMessage = await this.bot.telegram.sendPhoto(chatId, 
                { source: result.screenshot }, 
                { caption: selectorCaption, parse_mode: 'HTML' }
              );
              telegramMessageId = sentMessage.message_id;
            }
            
            logger.info(`Screenshot for selector "${selector}" sent to Telegram`);
          } catch (error) {
            logger.error(`Failed to send screenshot for selector "${selector}" to Telegram`, error as Error);
          }
        }

        screenshots.push({
          selector,
          screenshot: result.screenshot,
          ...(savedPath && { savedPath }),
          ...(telegramMessageId && { telegramMessageId })
        });
      }

      const processingTime = Date.now() - startTime;
      const success = screenshots.some(s => !s.error);

      logger.info(`Multiple screenshots processing completed for: ${sanitizedUrl} in ${processingTime}ms`);

      return {
        url: sanitizedUrl,
        success,
        screenshots,
        processingTime
      };

    } catch (error) {
      logger.error(`Failed to process multiple screenshots for ${sanitizedUrl}`, error as Error);
      
      const processingTime = Date.now() - startTime;
      
      return {
        url: sanitizedUrl,
        success: false,
        screenshots: selectors.map(selector => ({
          selector,
          screenshot: Buffer.alloc(0),
          error: (error as Error).message
        })),
        processingTime
      };
    }
  }

  async sendScreenshotWithReport(
    url: string,
    chatId: string,
    analysisData?: any,
    options: ScreenshotTelegramOptions = {}
  ): Promise<ScreenshotTelegramResult> {
    try {
      // Создаем скриншот
      const result = await this.processScreenshot(url, {
        ...options,
        sendToTelegram: true,
        chatId
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Отправляем текстовый отчет
      const report = this.generateAnalysisReport(url, analysisData, result);
      await this.messageService.sendReport(chatId, report);

      return result;

    } catch (error) {
      logger.error(`Failed to send screenshot with report for ${url}:`, error as Error);
      throw new ApiError(`Failed to send screenshot with report: ${(error as Error).message}`);
    }
  }

  async sendBatchReport(
    results: ScreenshotTelegramResult[],
    chatId: string
  ): Promise<boolean> {
    try {
      const report = this.generateBatchReport(results);
      await this.messageService.sendReport(chatId, report);
      
      logger.info(`Batch report sent to chat: ${chatId}`);
      return true;
      
    } catch (error) {
      logger.error(`Failed to send batch report:`, error as Error);
      return false;
    }
  }

  private async saveScreenshotToDisk(
    screenshot: Buffer,
    url: string,
    savePath: string,
    filename?: string,
    format: 'png' | 'jpeg' = 'png'
  ): Promise<string> {
    try {
      // Создаем директорию если не существует
      await fs.mkdir(savePath, { recursive: true });

      // Генерируем имя файла
      const finalFilename = filename || this.generateFilename(url, format);
      const filePath = path.join(savePath, finalFilename);

      // Сохраняем файл
      await fs.writeFile(filePath, screenshot);

      return filePath;
    } catch (error) {
      logger.error(`Failed to save screenshot to disk:`, error as Error);
      throw new Error(`Failed to save screenshot: ${(error as Error).message}`);
    }
  }

  private generateFilename(url: string, format: 'png' | 'jpeg' = 'png'): string {
    const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${domain}_${timestamp}.${format}`;
  }

  private generateCaption(url: string, customCaption?: string, _savedPath?: string): string {
    const domain = new URL(url).hostname;
    const timestamp = new Date().toLocaleString('ru-RU');
    
    let caption = `📸 <b>Скриншот сайта</b>\n\n`;
    caption += `🌐 <b>URL:</b> ${url}\n`;
    caption += `🏠 <b>Домен:</b> ${domain}\n`;
    caption += `⏰ <b>Время:</b> ${timestamp}\n`;
    
    if (customCaption) {
      caption += `\n${customCaption}`;
    }
    
    return caption;
  }

  private generateAnalysisReport(url: string, analysisData?: any, screenshotResult?: ScreenshotTelegramResult): string {
    const domain = new URL(url).hostname;
    const timestamp = new Date().toLocaleString('ru-RU');
    
    let report = `📊 <b>Анализ сайта</b>\n\n`;
    report += `🌐 <b>URL:</b> ${url}\n`;
    report += `🏠 <b>Домен:</b> ${domain}\n`;
    report += `⏰ <b>Время анализа:</b> ${timestamp}\n`;
    
    if (screenshotResult) {
      report += `📸 <b>Скриншот:</b> ${screenshotResult.success ? '✅ Создан' : '❌ Ошибка'}\n`;
      if (screenshotResult.processingTime) {
        report += `⏱ <b>Время обработки:</b> ${screenshotResult.processingTime}ms\n`;
      }
    }
    
    if (analysisData) {
      report += `\n📈 <b>Данные анализа:</b>\n`;
      if (analysisData.currentPrice) {
        report += `💰 <b>Текущая цена:</b> ${analysisData.currentPrice}\n`;
      }
      if (analysisData.nextPrice) {
        report += `📈 <b>Следующая цена:</b> ${analysisData.nextPrice}\n`;
      }
      if (analysisData.listingPrice) {
        report += `📋 <b>Цена листинга:</b> ${analysisData.listingPrice}\n`;
      }
      if (analysisData.raised) {
        report += `💵 <b>Собрано:</b> ${analysisData.raised}\n`;
      }
    }
    
    return report;
  }

  private generateBatchReport(results: ScreenshotTelegramResult[]): string {
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    
    let report = `📊 <b>Пакетный анализ завершен</b>\n\n`;
    report += `📈 <b>Статистика:</b>\n`;
    report += `• Всего сайтов: ${total}\n`;
    report += `• Успешно: ${successful}\n`;
    report += `• Ошибок: ${failed}\n`;
    report += `• Общее время: ${totalTime}ms\n`;
    report += `• Среднее время: ${Math.round(totalTime / total)}ms\n\n`;
    
    if (failed > 0) {
      report += `❌ <b>Сайты с ошибками:</b>\n`;
      results.filter(r => !r.success).forEach(r => {
        report += `• ${r.url}: ${r.error}\n`;
      });
      report += `\n`;
    }
    
    report += `✅ <b>Успешно обработанные:</b>\n`;
    results.filter(r => r.success).forEach(r => {
      const domain = new URL(r.url).hostname;
      report += `• ${domain} (${r.processingTime}ms)\n`;
    });
    
    return report;
  }
}

export function createScreenshotTelegramService(bot: Telegraf, botToken: string): ScreenshotTelegramService {
  return new ScreenshotTelegramService(bot, botToken);
}
