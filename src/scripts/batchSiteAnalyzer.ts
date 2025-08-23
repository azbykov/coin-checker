// TODO: Задача - Анализ массива сайтов
// Назначение: Анализ списка сайтов с селекторами и отправка результатов в Telegram
// Вход: Конфигурационный файл с сайтами
// Выход: Отчёты в Telegram с данными и скриншотами
// Ошибки: Ошибки загрузки, парсинга, отправки

import fs from 'fs';
import path from 'path';
import { config } from '../config/config';
import { TelegramService, createMessageService } from '../services/telegramService';
import { screenshotService } from '../services/screenshotService';
import { browserService } from '../services/browserService';
import { visionParser } from '../services/visionParser';
import { logger } from '../utils/logger';
import { CryptoProjectData, SiteConfig } from '../types';

export class BatchSiteAnalyzer {
  private telegramService: TelegramService;
  private messageService: any;
  private telegramEnabled: boolean = false;
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || config.app.screenshotsDir;
    this.telegramService = new TelegramService(config.telegram.botToken);
    this.messageService = createMessageService(this.telegramService.getBot(), config.telegram.botToken);
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
      if (siteConfig.selector) {
        logger.info(`Using selector: ${siteConfig.selector}`);
      }
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

      logger.info(`Successfully analyzed ${siteConfig.url}`);
      return result;

    } catch (error) {
      logger.error(`Error analyzing site ${siteConfig.url}`, error as Error);
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
        // Экранируем специальные символы в селекторе для Tailwind CSS
        const escapedSelector = selector.replace(/[#\[\]]/g, '\\$&');
        
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
      const message = this.formatTelegramMessage(data, screenshot);
      
      // Отправляем сообщение
      await this.messageService.sendReport(config.telegram.chatId, message);
      
      // Отправляем скриншот
      await this.messageService.sendPhoto(
        config.telegram.chatId,
        screenshot,
        `Скриншот: ${data.url}${screenshotPath ? `\nФайл: ${screenshotPath}` : ''}`
      );

      logger.info(`Successfully sent report to Telegram for ${data.url}`);
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
                const screenshotResult = await this.takeScreenshotWithSelector(site.url, site.selector);
                
                if (screenshotResult.success) {
                  // Сохраняем скриншот для Telegram
                  const screenshotPath = this.saveScreenshot(screenshotResult.screenshot, site.url);
                  await this.sendToTelegram(data, screenshotResult.screenshot, screenshotPath);
                } else {
                  // Отправляем только данные без скриншота
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
      // Останавливаем Telegram бота если он был запущен
      if (this.telegramEnabled) {
        await this.telegramService.stop();
      }
    }
  }
}

// Экспорт для использования в других модулях
export const batchSiteAnalyzer = new BatchSiteAnalyzer();
