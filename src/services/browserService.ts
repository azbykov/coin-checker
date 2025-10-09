// TODO: Задача 7 - Инициализация браузера
// Назначение: Управление жизненным циклом браузера Puppeteer
// Вход: Конфигурация браузера
// Выход: Экземпляр браузера
// Ошибки: Ошибки запуска браузера, таймауты

import puppeteer, { Browser } from 'puppeteer';
import { logger } from '../utils/logger';
import { NetworkError } from '../utils/errorHandler';

export class BrowserService {
  private browser: Browser | null = null;
  private isInitialized = false;

  async initialize(headless = true): Promise<void> {
    try {
      this.browser = await puppeteer.launch({
        headless: headless === true ? true : headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-default-browser-check',
          '--no-pings',
          '--disable-background-networking',
          '--disable-component-extensions-with-background-pages',
          '--disable-ipc-flooding-protection',
        ],
      });
      this.isInitialized = true;
      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser', error as Error);
      throw new NetworkError('Browser initialization failed');
    }
  }

  async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.isInitialized) {
      await this.initialize();
    }
    return this.browser!;
  }

  async newPage() {
    const browser = await this.getBrowser();
    const page = await browser.newPage();
    
    // Настройки для проблемных сайтов
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Блокируем ненужные ресурсы для ускорения загрузки
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });
    
    // Обработка JavaScript ошибок
    page.on('pageerror', (error) => {
      logger.warn(`JavaScript error on page: ${error.message}`);
    });
    
    // Обработка console ошибок
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        logger.warn(`Console error: ${msg.text()}`);
      }
    });
    
    return page;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.isInitialized = false;
      logger.info('Browser closed');
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.browser !== null;
  }
}

export const browserService = new BrowserService(); 