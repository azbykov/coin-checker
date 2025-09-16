// TODO: Задача 8 - Создание скриншота страницы
// Назначение: Загрузка страницы и создание full-page скриншота
// Вход: URL страницы
// Выход: Buffer с изображением
// Ошибки: Таймауты, недоступность страницы, ошибки сети

import { Page } from 'puppeteer';
import { ScreenshotResult } from '../types';
import { browserService } from './browserService';
import { logger } from '../utils/logger';
// import { NetworkError } from '../utils/errorHandler';
import { sanitizeUrl } from '../utils/urlValidator';

export class ScreenshotService {
  async takeScreenshot(url: string, timeout = 30000, selector?: string): Promise<ScreenshotResult> {
    const sanitizedUrl = sanitizeUrl(url);
    let page: Page | null = null;

    try {
      logger.info(`Taking screenshot of: ${sanitizedUrl}`);
      
      const browser = await browserService.getBrowser();
      page = await browser.newPage();
      
      // Настройка таймаутов
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);
      
      // Настройка viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Переход на страницу
      await page.goto(sanitizedUrl, { 
        waitUntil: 'networkidle2',
        timeout 
      });
      
      // Ожидание загрузки контента
      await new Promise((r) => setTimeout(r, 2000))
      
      // Дополнительное ожидание для динамического контента
      try {
        await page.waitForFunction('document.readyState === "complete"', { timeout: 10000 });
      } catch (error) {
        logger.warn('Страница не полностью загружена, продолжаем...');
      }
      
      let screenshot: Buffer;
      
      if (selector) {
        // Ждем появления элемента
        await page.waitForSelector(selector, { timeout: 10000 });
        
        // Делаем скриншот конкретного элемента
        const element = await page.$(selector);
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
        
        logger.info(`Скриншот элемента "${selector}" создан для: ${sanitizedUrl}`);
      } else {
        // Создание full-page скриншота
        screenshot = await page.screenshot({
          type: 'png',
          fullPage: true,
        }) as Buffer;
      }

      logger.info(`Screenshot taken successfully for: ${sanitizedUrl}`);
      
      return {
        url: sanitizedUrl,
        screenshot: screenshot as Buffer,
        success: true,
      };
      
    } catch (error) {
      logger.error(`Failed to take screenshot of ${sanitizedUrl}`, error as Error);
      
      return {
        url: sanitizedUrl,
        screenshot: Buffer.alloc(0),
        success: false,
        error: (error as Error).message,
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async takeScreenshots(urls: string[]): Promise<ScreenshotResult[]> {
    const results: ScreenshotResult[] = [];
    
    for (const url of urls) {
      const result = await this.takeScreenshot(url);
      results.push(result);
      
      // Небольшая пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return results;
  }

  async takeScreenshotWithMultipleSelectors(url: string, selectors: string[], timeout = 30000): Promise<ScreenshotResult[]> {
    const sanitizedUrl = sanitizeUrl(url);
    let page: Page | null = null;
    const results: ScreenshotResult[] = [];

    try {
      logger.info(`Taking multiple screenshots of: ${sanitizedUrl} with ${selectors.length} selectors`);
      
      const browser = await browserService.getBrowser();
      page = await browser.newPage();
      
      // Настройка таймаутов
      page.setDefaultTimeout(timeout);
      page.setDefaultNavigationTimeout(timeout);
      
      // Настройка viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Переход на страницу
      await page.goto(sanitizedUrl, { 
        waitUntil: 'networkidle2',
        timeout 
      });
      
      // Ожидание загрузки контента
      await new Promise((r) => setTimeout(r, 2000))
      
      // Дополнительное ожидание для динамического контента
      try {
        await page.waitForFunction('document.readyState === "complete"', { timeout: 10000 });
      } catch (error) {
        logger.warn('Страница не полностью загружена, продолжаем...');
      }
      
      // Обрабатываем каждый селектор
      for (let i = 0; i < selectors.length; i++) {
        const selector = selectors[i];
        
        if (!selector) {
          logger.warn(`Пропускаем пустой селектор для ${sanitizedUrl}`);
          continue;
        }
        
        try {
          // Ждем появления элемента
          await page.waitForSelector(selector, { timeout: 10000 });
          
          // Делаем скриншот конкретного элемента
          const element = await page.$(selector);
          if (!element) {
            throw new Error(`Элемент с селектором "${selector}" не найден`);
          }
          
          // Проверяем, что элемент все еще видим
          const isVisible = await element.isVisible();
          if (!isVisible) {
            throw new Error(`Элемент с селектором "${selector}" не видим`);
          }
          
          const screenshot = await element.screenshot({
            type: 'png'
          }) as Buffer;
          
          logger.info(`Скриншот элемента "${selector}" (${i + 1}/${selectors.length}) создан для: ${sanitizedUrl}`);
          
          results.push({
            url: sanitizedUrl,
            screenshot,
            success: true,
          });
          
        } catch (error) {
          logger.error(`Failed to take screenshot of selector "${selector}" for ${sanitizedUrl}`, error as Error);
          
          results.push({
            url: sanitizedUrl,
            screenshot: Buffer.alloc(0),
            success: false,
            error: `Селектор "${selector}": ${(error as Error).message}`,
          });
        }
      }

      logger.info(`Multiple screenshots completed for: ${sanitizedUrl}`);
      
    } catch (error) {
      logger.error(`Failed to process multiple screenshots for ${sanitizedUrl}`, error as Error);
      
      // Если произошла общая ошибка, добавляем её для всех селекторов
      for (let i = 0; i < selectors.length; i++) {
        results.push({
          url: sanitizedUrl,
          screenshot: Buffer.alloc(0),
          success: false,
          error: (error as Error).message,
        });
      }
    } finally {
      if (page) {
        await page.close();
      }
    }
    
    return results;
  }
}

export const screenshotService = new ScreenshotService(); 