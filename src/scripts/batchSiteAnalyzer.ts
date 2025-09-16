// TODO: Задача - Анализ массива сайтов
// Назначение: Анализ списка сайтов с селекторами и отправка результатов в Telegram
// Вход: Конфигурационный файл с сайтами
// Выход: Отчёты в Telegram с данными и скриншотами
// Ошибки: Ошибки загрузки, парсинга, отправки

import fs from 'fs';
import path from 'path';
import { config } from '../config/config';
import { TelegramService, createMessageService } from '../services/telegramService';

import { ScreenshotTelegramService } from '../services/screenshotTelegramService';
import { browserService } from '../services/browserService';
import { visionParser } from '../services/visionParser';
import { logger } from '../utils/logger';
import { CryptoProjectData, SiteConfig } from '../types';

export class BatchSiteAnalyzer {
  private telegramService: TelegramService;
  private messageService: any;
  private screenshotTelegramService: ScreenshotTelegramService;
  private telegramEnabled: boolean = false;
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || config.app.screenshotsDir;
    this.telegramService = new TelegramService(config.telegram.botToken);
    this.messageService = createMessageService(this.telegramService.getBot(), config.telegram.botToken);
    this.screenshotTelegramService = new ScreenshotTelegramService(this.telegramService.getBot(), config.telegram.botToken);
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Создана папка для скриншотов: ${this.outputDir}`);
    }
  }

  private saveScreenshot(screenshot: Buffer, url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${hostname}_${timestamp}.png`;
      const filepath = path.join(this.outputDir, filename);
      
      fs.writeFileSync(filepath, screenshot);
      logger.info(`Скриншот сохранен: ${filepath}`);
      return filepath;
    } catch (error) {
      logger.error('Ошибка сохранения скриншота', error as Error);
      return '';
    }
  }

  private loadSitesConfig(): SiteConfig[] {
    try {
      const configPath = path.join(__dirname, '../config/sites.json');
      const configData = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      logger.error('Failed to load sites configuration', error as Error);
      throw new Error('Failed to load sites configuration');
    }
  }

  private async analyzeSite(siteConfig: SiteConfig): Promise<CryptoProjectData | null> {
    try {
      logger.info(`Starting analysis of site: ${siteConfig.url}`);
      
      // Проверяем, есть ли множественные селекторы
      if (siteConfig.selectors && siteConfig.selectors.length > 0) {
        logger.info(`Using multiple selectors: ${siteConfig.selectors.join(', ')}`);
        
        // Используем новый метод для множественных скриншотов
        const multipleScreenshotsResult = await this.screenshotTelegramService.processMultipleScreenshots(
          siteConfig.url,
          {
            saveToDisk: true,
            savePath: this.outputDir,
            sendToTelegram: false, // Не отправляем в Telegram пока не проанализируем
            selectors: siteConfig.selectors,
            format: 'png'
          }
        );
        
        if (!multipleScreenshotsResult.success) {
          logger.error(`Failed to take multiple screenshots for ${siteConfig.url}`);
          return null;
        }
        
        // Анализируем каждый скриншот и объединяем данные
        let combinedData: CryptoProjectData | null = null;
        const allVisionData: any[] = [];
        
        for (const screenshotInfo of multipleScreenshotsResult.screenshots) {
          if (screenshotInfo.error) {
            logger.warn(`Skipping screenshot with error for selector "${screenshotInfo.selector}": ${screenshotInfo.error}`);
            continue;
          }
          
          // Анализируем скриншот с помощью Vision API
          const visionData = await visionParser.parseScreenshot(screenshotInfo.screenshot);
          
          if (visionData) {
            logger.info(`Vision data from selector "${screenshotInfo.selector}": ${JSON.stringify(visionData)}`);
            allVisionData.push(visionData);
          }
        }
        
        // Объединяем все данные в один объект
        if (allVisionData.length > 0) {
          combinedData = this.mergeVisionData(allVisionData, siteConfig.url);
          logger.info(`Combined vision data: ${JSON.stringify(combinedData)}`);
        }
        
        return combinedData;
        
      } else if (siteConfig.selector) {
        // Обычный одиночный селектор
        logger.info(`Using selector: ${siteConfig.selector}`);
        logger.info(`Taking screenshot for: ${siteConfig.url}`);

        // Делаем скриншот как в visionScanner.ts
        const screenshotResult = await this.takeScreenshotWithSelector(siteConfig.url, siteConfig.selector);
        
        if (!screenshotResult.success) {
          logger.error(`Failed to take screenshot for ${siteConfig.url}: ${screenshotResult.error}`);
          return null;
        }

        // Сохраняем скриншот
        this.saveScreenshot(screenshotResult.screenshot, siteConfig.url);

        // Анализируем скриншот с помощью Vision API
        const visionData = await visionParser.parseScreenshot(screenshotResult.screenshot);
        
        if (!visionData) {
          logger.error(`Failed to parse screenshot for ${siteConfig.url}`);
          return null;
        }

        const result: CryptoProjectData = {
          ...visionData,
          url: siteConfig.url,
          timestamp: new Date(),
        };

        return result;
      } else {
        // Полностраничный скриншот
        logger.info(`Taking full page screenshot for: ${siteConfig.url}`);

        const screenshotResult = await this.takeScreenshotWithSelector(siteConfig.url);
        
        if (!screenshotResult.success) {
          logger.error(`Failed to take screenshot for ${siteConfig.url}: ${screenshotResult.error}`);
          return null;
        }

        // Сохраняем скриншот
        this.saveScreenshot(screenshotResult.screenshot, siteConfig.url);

        // Анализируем скриншот с помощью Vision API
        const visionData = await visionParser.parseScreenshot(screenshotResult.screenshot);
        
        if (!visionData) {
          logger.error(`Failed to parse screenshot for ${siteConfig.url}`);
          return null;
        }

        const result: CryptoProjectData = {
          ...visionData,
          url: siteConfig.url,
          timestamp: new Date(),
        };

        return result;
      }
      
    } catch (error) {
      logger.error(`Failed to analyze site ${siteConfig.url}`, error as Error);
      return null;
    }
  }

  private async takeScreenshotWithSelector(url: string, selector?: string): Promise<{ success: boolean; screenshot: Buffer; error?: string }> {
    const { Page } = await import('puppeteer');
    let page: any = null;

    try {
      const browser = await browserService.getBrowser();
      page = await browser.newPage();
      
      // Обработка ошибок страницы
      page.on('error', (error: Error) => {
        logger.error(`Ошибка страницы: ${error.message}`);
      });
      
      page.on('pageerror', (error: Error) => {
        logger.error(`JavaScript ошибка: ${error.message}`);
      });
      
      // Настройка viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Устанавливаем user-agent для обхода блокировки
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Переход на страницу
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Ожидание загрузки контента
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Дополнительное ожидание для динамического контента
      try {
        await page.waitForFunction('document.readyState === "complete"', { timeout: 10000 });
      } catch (error) {
        logger.warn('Страница не полностью загружена, продолжаем...');
      }
      
      let screenshot: Buffer;
      
      if (selector) {
        const escapedSelector = selector.replace(/[#\[\]%]/g, '\\$&');
        
        try {
          // Ждем появления элемента
          await page.waitForSelector(escapedSelector, { timeout: 10000 });
          
          // Делаем скриншот конкретного элемента
          const element = await page.$(escapedSelector);
          if (!element) {
            throw new Error(`Элемент с селектором "${selector}" не найден`);
          }
          
          // Проверяем, что элемент все еще видим
          const isVisible = await element.isVisible();
          if (!isVisible) {
            throw new Error(`Элемент с селектором "${selector}" не видим`);
          }
          
          screenshot = await element.screenshot({
            type: 'png'
          }) as Buffer;
          
          logger.info(`Скриншот элемента "${selector}" создан для: ${url}`);
        } catch (selectorError) {
          logger.warn(`Селектор "${selector}" не найден, делаем полностраничный скриншот: ${(selectorError as Error).message}`);
          
          // Если селектор не найден, делаем полностраничный скриншот
          screenshot = await page.screenshot({
            type: 'png',
            fullPage: true,
          }) as Buffer;
        }
      } else {
        // Полностраничный скриншот
        screenshot = await page.screenshot({
          type: 'png',
          fullPage: true,
        }) as Buffer;
      }

      return {
        success: true,
        screenshot
      };
      
    } catch (error) {
      logger.error(`Failed to take screenshot of ${url}`, error as Error);
      
      return {
        success: false,
        screenshot: Buffer.alloc(0),
        error: (error as Error).message,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  private formatTelegramMessage(data: CryptoProjectData, _screenshot: Buffer): string {
    const message = `
🔍 <b>Анализ проекта</b>

🌐 <b>Сайт:</b> ${data.url}
💰 <b>Текущая цена:</b> ${data.currentPrice}
📈 <b>Следующая цена:</b> ${data.nextPrice}
🏷️ <b>Цена листинга:</b> ${data.listingPrice}
💵 <b>Собрано средств:</b> ${data.raised}

⏰ <b>Время анализа:</b> ${data.timestamp.toLocaleString('ru-RU')}
    `;

    return message.trim();
  }

  private async sendToTelegram(data: CryptoProjectData, screenshot: Buffer, screenshotPath?: string): Promise<void> {
    try {
      // Формируем подпись для скриншота с анализом
      const caption = this.formatTelegramMessage(data, screenshot);
      
      // Отправляем скриншот с анализом в одном сообщении
      await this.screenshotTelegramService.processScreenshot(
        data.url,
        {
          saveToDisk: true,
          savePath: this.outputDir,
          sendToTelegram: true,
          chatId: config.telegram.chatId,
          caption: caption,
          format: 'png'
        }
      );

      logger.info(`Successfully sent combined report to Telegram for ${data.url}`);
    } catch (error) {
      logger.error(`Failed to send report to Telegram for ${data.url}`, error as Error);
    }
  }

  async run(): Promise<void> {
    try {
      logger.info('Starting batch site analysis');

      // Загружаем конфигурацию сайтов
      const sites = this.loadSitesConfig();
      logger.info(`Loaded ${sites.length} sites for analysis!!`);

      // Запускаем Telegram бота
      logger.info('Starting Telegram bot...');
      logger.info(`Bot token: ${config.telegram.botToken ? 'Set' : 'Missing'}`);
      logger.info(`Chat ID: ${config.telegram.chatId ? 'Set' : 'Missing'}`);
      
      try {
        await this.telegramService.start();
        this.telegramEnabled = true;
        logger.info('Telegram bot started successfully');
      } catch (error) {
        logger.error('Failed to start Telegram bot, but continuing with analysis...', error as Error);
        logger.error('Error details:', error as Error);
        this.telegramEnabled = false;
        // Продолжаем без Telegram
      }

      // Анализируем каждый сайт
      logger.info(`Starting analysis of ${sites.length} sites...`);
      for (const site of sites) {
        // Пропускаем сайты с флагом skip
        logger.info(`Processing site: ${site.url}`);
        
        if (site.skip === true) {
          logger.info(`Skipping site: ${site.url} (skip flag is true)`);
          continue;
        }

        try {
          const data = await this.analyzeSite(site);
          
          if (data) {
            // Выводим результат в консоль
            console.log('\n' + '='.repeat(50));
            console.log(this.formatTelegramMessage(data, Buffer.alloc(0)));
            console.log('='.repeat(50) + '\n');
            
            // Отправляем в Telegram если бот работает
            if (this.telegramEnabled) {
              try {
                // Используем уже созданный скриншот из анализа
                const screenshotResult = await this.takeScreenshotWithSelector(site.url, site.selector);
                
                if (screenshotResult.success) {
                  // Отправляем скриншот с анализом в одном сообщении
                  const caption = this.formatTelegramMessage(data, screenshotResult.screenshot);
                  
                  try {
                    // Отправляем скриншот напрямую через messageService
                    await this.messageService.sendPhoto(
                      config.telegram.chatId,
                      screenshotResult.screenshot,
                      caption
                    );
                    
                    logger.info(`Successfully sent combined report to Telegram for ${data.url}`);
                  } catch (photoError) {
                    // Если не удалось отправить фото, отправляем как документ
                    logger.warn(`Failed to send photo, trying as document: ${(photoError as Error).message}`);
                    
                    await this.messageService.sendDocument(
                      config.telegram.chatId,
                      screenshotResult.screenshot,
                      `screenshot_${new URL(data.url).hostname}.png`,
                      caption
                    );
                    
                    logger.info(`Successfully sent document report to Telegram for ${data.url}`);
                  }
                } else {
                  // Если не удалось создать скриншот, отправляем только анализ
                  const message = this.formatTelegramMessage(data, Buffer.alloc(0));
                  await this.messageService.sendReport(config.telegram.chatId, message);
                }
              } catch (telegramError) {
                logger.error(`Failed to send to Telegram: ${site.url}`, telegramError as Error);
              }
            }
          } else {
            // Выводим ошибку в консоль
            console.log(`❌ Не удалось проанализировать сайт: ${site.url}`);
            
            // Отправляем в Telegram если бот работает
            if (this.telegramEnabled) {
              try {
                await this.messageService.sendError(
                  config.telegram.chatId,
                  `Не удалось проанализировать сайт: ${site.url}`
                );
              } catch (telegramError) {
                logger.error(`Failed to send error to Telegram: ${site.url}`, telegramError as Error);
              }
            }
          }

          // Пауза между запросами
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          logger.error(`Error processing site ${site.url}`, error as Error);
          console.log(`❌ Ошибка при обработке сайта ${site.url}: ${(error as Error).message}`);
          
          // Отправляем в Telegram если бот работает
          if (this.telegramEnabled) {
            try {
              await this.messageService.sendError(
                config.telegram.chatId,
                `Ошибка при обработке сайта ${site.url}: ${(error as Error).message}`
              );
            } catch (telegramError) {
              logger.error(`Failed to send error to Telegram: ${site.url}`, telegramError as Error);
            }
          }
        }
      }

      logger.info('Batch site analysis completed');

    } catch (error) {
      logger.error('Failed to run batch site analysis', error as Error);
      throw error;
    } finally {
      // Останавливаем Telegram бота если он был запущен и работает
      if (this.telegramEnabled && this.telegramService) {
        try {
          await this.telegramService.stop();
        } catch (error) {
          logger.warn('Failed to stop Telegram bot (may not be running)');
        }
      }
    }
  }

  /**
   * Объединяет данные из нескольких Vision API результатов в один объект
   * Приоритет отдается непустым значениям и значениям, отличным от "N/A"
   */
  private mergeVisionData(visionDataArray: any[], url: string): CryptoProjectData {
    const merged: any = {
      url: url,
      timestamp: new Date(),
      currentPrice: 'N/A',
      nextPrice: 'N/A', 
      listingPrice: 'N/A',
      raised: 'N/A'
    };

    // Проходим по всем данным и выбираем лучшие значения
    for (const data of visionDataArray) {
      // Обновляем только если новое значение лучше (не пустое и не "N/A")
      if (data.currentPrice && data.currentPrice !== 'N/A') {
        // Если текущее значение "N/A", заменяем на новое
        if (merged.currentPrice === 'N/A') {
          merged.currentPrice = data.currentPrice;
        }
        // Если оба значения не "N/A", оставляем первое (можно изменить логику)
      }
      
      if (data.nextPrice && data.nextPrice !== 'N/A') {
        if (merged.nextPrice === 'N/A') {
          merged.nextPrice = data.nextPrice;
        }
      }
      
      if (data.listingPrice && data.listingPrice !== 'N/A') {
        if (merged.listingPrice === 'N/A') {
          merged.listingPrice = data.listingPrice;
        }
      }
      
      if (data.raised && data.raised !== 'N/A') {
        if (merged.raised === 'N/A') {
          merged.raised = data.raised;
        }
      }
    }

    logger.info(`Merged ${visionDataArray.length} vision data sets into: ${JSON.stringify(merged)}`);
    return merged as CryptoProjectData;
  }
}

// Экспорт для использования в других модулях
export const batchSiteAnalyzer = new BatchSiteAnalyzer();
