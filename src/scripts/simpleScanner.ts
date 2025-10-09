#!/usr/bin/env tsx

/**
 * Простой сканер URL - проходит по массиву ссылок и возвращает JSON
 * Без проверок ботов, только скриншоты и базовые данные
 */

import { Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { validateUrl } from '../utils/urlValidator';
import { browserService } from '../services/browserService';
import { takeScreenshotWithSelector, setupPageForScreenshots, waitForPageLoad } from '../utils/selectorUtils';

interface ScanResult {
  url: string;
  success: boolean;
  screenshot?: string; // base64
  screenshotPath?: string; // путь к сохраненному файлу
  error?: string;
  processingTime: number;
  timestamp: string;
}

class SimpleScanner {
  private outputDir: string;

  constructor(outputDir = 'screenshots') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Создана папка для скриншотов: ${this.outputDir}`);
    }
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Инициализируем браузер через browserService...');
      await browserService.initialize();
      logger.info('Браузер инициализирован');
    } catch (error) {
      logger.error('Ошибка инициализации браузера', error as Error);
      throw error;
    }
  }

  async scanUrl(url: string, saveScreenshot = true, selector?: string): Promise<ScanResult> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      // Валидация URL
      if (!validateUrl(url)) {
        throw new Error(`Некорректный URL: ${url}`);
      }

      const browser = await browserService.getBrowser();
      page = await browser.newPage();
      
      // Настройка страницы для скриншотов
      await setupPageForScreenshots(page);
      
      // Переход на страницу
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Ожидание полной загрузки
      await waitForPageLoad(page);
      
      // Делаем скриншот с использованием общих утилит
      const screenshotBuffer = await takeScreenshotWithSelector(page, selector, 1000);
      const screenshot = screenshotBuffer.toString('base64');

      const processingTime = Date.now() - startTime;

      let screenshotPath: string | undefined;
      
      // Сохранение скриншота в файл
      if (saveScreenshot) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${hostname}_${timestamp}.png`;
        const filepath = join(this.outputDir, filename);
        
        writeFileSync(filepath, screenshotBuffer);
        
        screenshotPath = filepath;
        logger.info(`Скриншот сохранен: ${filepath}`);
      }

      return {
        url,
        success: true,
        screenshot,
        ...(screenshotPath && { screenshotPath }),
        processingTime,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        url,
        success: false,
        error: (error as Error).message,
        processingTime,
        timestamp: new Date().toISOString()
      };
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  async scanUrls(urls: string[], maxConcurrent = 3, saveScreenshots = true, selector?: string): Promise<ScanResult[]> {
    const results: ScanResult[] = [];
    
    // Обработка URL батчами
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      logger.info(`Обрабатываем батч ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(urls.length / maxConcurrent)}`);
      
      const batchPromises = batch.map(url => this.scanUrl(url, saveScreenshots, selector));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Пауза между батчами
      if (i + maxConcurrent < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }

  async close(): Promise<void> {
    try {
      await browserService.close();
      logger.info('Браузер закрыт через browserService');
    } catch (error) {
      logger.warn(`Ошибка при закрытии браузера: ${(error as Error).message}`);
    }
  }

  formatResultsAsJson(results: ScanResult[]): string {
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
      results: results.map(r => ({
        url: r.url,
        success: r.success,
        screenshot: r.screenshot,
        screenshotPath: r.screenshotPath,
        error: r.error,
        processingTime: r.processingTime,
        timestamp: r.timestamp
      }))
    };
    
    return JSON.stringify(formattedResults, null, 2);
  }
}

// CLI интерфейс
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length === 0) {
    console.log(`
🔍 Простой сканер URL с поддержкой Puppeteer Locator API

Использование:
  npm run scan <url1> <url2> ...
  npm run scan:file <filename>
  npm run scan:help

Опции:
  --no-save              Не сохранять скриншоты в файлы
  --output-dir <path>    Папка для сохранения скриншотов (по умолчанию: screenshots)
  --selector <selector>  Селектор для скриншота конкретного элемента

Примеры:
  npm run scan https://example.com https://test.com
  npm run scan:file urls.txt
  npm run scan -- --no-save https://example.com
  npm run scan -- --selector ".price-container" https://example.com

Поддерживаемые селекторы:
  CSS: .class-name, #id-name, [data-testid="..."]
  Текст: text=Текст
  XPath: xpath=//div[@class='example']
  Комбинированные: text=Текст >> xpath=../../..
`);
    return;
  }

  // Парсинг опций
  const noSave = args.includes('--no-save');
  const outputDirIndex = args.indexOf('--output-dir');
  const selectorIndex = args.indexOf('--selector');
  let outputDir = 'screenshots';
  let selector: string | undefined;
  
  if (outputDirIndex !== -1) {
    outputDir = args[outputDirIndex + 1] || 'screenshots';
  }
  
  if (selectorIndex !== -1) {
    selector = args[selectorIndex + 1];
    if (!selector) {
      throw new Error('--selector требует CSS селектор');
    }
  }
  
  // Фильтруем аргументы (убираем опции)
  const filteredArgs = args.filter((arg, index) => {
    if (arg === '--no-save') return false;
    if (arg === '--output-dir') return false;
    if (arg === '--selector') return false;
    if (index > 0 && args[index - 1] === '--output-dir') return false;
    if (index > 0 && args[index - 1] === '--selector') return false;
    return true;
  });

  const scanner = new SimpleScanner(outputDir);
  
      try {
      await scanner.initialize();
      
      let urls: string[] = [];
      
      // Проверяем, есть ли флаг --file
      const fileIndex = filteredArgs.indexOf('--file');
      if (fileIndex !== -1) {
        const filename = filteredArgs[fileIndex + 1];
        if (!filename) {
          throw new Error('--file требует имя файла');
        }
        
        const fs = require('fs');
        const fileContent = fs.readFileSync(filename, 'utf8');
        
        // Проверяем, является ли файл JSON
        if (filename.endsWith('.json')) {
          try {
            const jsonData = JSON.parse(fileContent);
            if (Array.isArray(jsonData)) {
              // Если это массив объектов с URL
              urls = jsonData.map((item: any) => {
                if (typeof item === 'string') {
                  return item;
                } else if (item && typeof item === 'object' && item.url) {
                  return item.url;
                }
                return null;
              }).filter((url: string | null) => url !== null);
            } else {
              throw new Error('JSON файл должен содержать массив');
            }
          } catch (error) {
            throw new Error(`Ошибка парсинга JSON файла: ${(error as Error).message}`);
          }
        } else {
          // Обрабатываем как текстовый файл
          urls = fileContent
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line && !line.startsWith('#'));
        }
      } else {
        urls = filteredArgs;
      }
    
    console.log(`🔍 Сканируем ${urls.length} URL...`);
    console.log(`📁 Скриншоты сохраняются в: ${outputDir}`);
    console.log(`💾 Сохранение файлов: ${noSave ? 'отключено' : 'включено'}`);
    if (selector) {
      console.log(`🎯 Селектор: ${selector}`);
    }
    console.log('');
    
    const results = await scanner.scanUrls(urls, 3, !noSave, selector);
    const jsonResult = scanner.formatResultsAsJson(results);
    
    console.log(jsonResult);
    
  } catch (error) {
    console.error('❌ Ошибка:', (error as Error).message);
    process.exit(1);
  } finally {
    await scanner.close();
  }
}

// Запуск скрипта
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
}

export { SimpleScanner }; 