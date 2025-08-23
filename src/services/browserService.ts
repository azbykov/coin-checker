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