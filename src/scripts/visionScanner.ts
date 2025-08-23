#!/usr/bin/env tsx

// Подавляем warning о deprecated headless
process.env['PUPPETEER_SKIP_CHROMIUM_DOWNLOAD'] = 'true';

/**
 * Сканер с анализом через OpenAI Vision API
 * Делает скриншоты, анализирует их через GPT-4 Vision и возвращает структурированные данные
 */

import 'dotenv/config';
import puppeteer, { Browser, Page } from 'puppeteer';
import { logger } from '../utils/logger';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { OpenAIService, createVisionParser } from '../services/openaiService';

interface VisionScanResult {
  url: string;
  success: boolean;
  screenshotPath?: string;
  error?: string;
  processingTime: number;
  timestamp: string;
  data?: {
    currentPrice: string;
    nextPrice: string;
    listingPrice: string;
    raised: string;
  };
}

class VisionScanner {
  private browser: Browser | null = null;
  private openaiService: OpenAIService;
  private visionParser: any;
  private outputDir: string;

  constructor(outputDir = 'screenshots') {
    this.outputDir = outputDir;
    const apiKey = process.env['OPENAI_API_KEY'];
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    this.openaiService = new OpenAIService(apiKey);
    this.visionParser = createVisionParser(this.openaiService.getClient());
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
          this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-field-trial-config',
          '--disable-ipc-flooding-protection',
          '--no-first-run',
          '--no-default-browser-check',
          '--disable-default-apps',
          '--disable-extensions',
          '--disable-plugins',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--mute-audio',
          '--no-zygote',
          '--single-process',
        ],
        timeout: 30000,
      });
      logger.info('Браузер инициализирован');
    } catch (error) {
      logger.error('Ошибка инициализации браузера', error as Error);
      throw error;
    }
  }

  async scanUrl(url: string, saveScreenshot = true, selector?: string): Promise<VisionScanResult> {
    const startTime = Date.now();
    let page: Page | null = null;

    try {
      if (!this.browser) {
        throw new Error('Браузер не инициализирован');
      }

      page = await this.browser.newPage();
      
      // Обработка ошибок страницы
      page.on('error', (error) => {
        logger.error(`Ошибка страницы: ${error.message}`);
      });
      
      page.on('pageerror', (error) => {
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
      
      let screenshot: string;
      
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
          type: 'png',
          encoding: 'base64'
        }) as string;
        
        logger.info(`Скриншот элемента "${selector}" создан`);
      } else {
        // Полностраничный скриншот
        screenshot = await page.screenshot({
          type: 'png',
          fullPage: true,
          encoding: 'base64'
        }) as string;
      }

      let screenshotPath: string | undefined;
      
      // Сохранение скриншота в файл
      if (saveScreenshot) {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${hostname}_${timestamp}.png`;
        const filepath = join(this.outputDir, filename);
        
        // Сохраняем base64 в файл
        const buffer = Buffer.from(screenshot as string, 'base64');
        writeFileSync(filepath, buffer);
        
        screenshotPath = filepath;
        logger.info(`Скриншот сохранен: ${filepath}`);
      }

      // Анализ скриншота через OpenAI Vision API
      logger.info(`Анализируем скриншот для ${url}...`);
      const buffer = Buffer.from(screenshot as string, 'base64');
      const visionResult = await this.visionParser.parseImage(buffer);
      
      const processingTime = Date.now() - startTime;

      return {
        url,
        success: true,
        ...(screenshotPath && { screenshotPath }),
        processingTime,
        timestamp: new Date().toISOString(),
        data: visionResult
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

  async scanUrls(urls: string[], maxConcurrent = 2, saveScreenshots = true, selector?: string): Promise<VisionScanResult[]> {
    const results: VisionScanResult[] = [];
    
    // Обработка URL батчами (меньше concurrent для OpenAI API)
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      logger.info(`Обрабатываем батч ${Math.floor(i / maxConcurrent) + 1}/${Math.ceil(urls.length / maxConcurrent)}`);
      
      const batchPromises = batch.map(url => this.scanUrl(url, saveScreenshots, selector));
      const batchResults = await Promise.all(batchPromises);
      
      results.push(...batchResults);
      
      // Пауза между батчами (больше для OpenAI API)
      if (i + maxConcurrent < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      logger.info('Браузер закрыт');
    }
  }

  formatResultsAsJson(results: VisionScanResult[]): string {
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
        screenshotPath: r.screenshotPath,
        error: r.error,
        processingTime: r.processingTime,
        timestamp: r.timestamp,
        data: r.data
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
🔍 Сканер с анализом через OpenAI Vision API

Использование:
  npx tsx src/scripts/visionScanner.ts <url1> <url2> ...
  npx tsx src/scripts/visionScanner.ts --file <filename>

Опции:
  --no-save              Не сохранять скриншоты в файлы
  --output-dir <path>    Папка для сохранения скриншотов (по умолчанию: screenshots)
  --selector <css>       CSS селектор для скриншота конкретного элемента

Примеры:
  npx tsx src/scripts/visionScanner.ts https://example.com https://test.com
  npx tsx src/scripts/visionScanner.ts --file urls.txt
  npx tsx src/scripts/visionScanner.ts --no-save https://example.com
  npx tsx src/scripts/visionScanner.ts --output-dir my-screenshots https://example.com
  npx tsx src/scripts/visionScanner.ts --selector ".price-section" https://example.com
  npx tsx src/scripts/visionScanner.ts --selector "#token-info" --file urls.txt

Селекторы:
  .class-name          - элемент с классом
  #id-name             - элемент с ID
  [data-testid="..."]  - элемент с data-атрибутом
  .parent .child       - вложенный элемент

Требования:
  - Переменная окружения OPENAI_API_KEY должна быть установлена
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

  const scanner = new VisionScanner(outputDir);
  
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
      urls = fileContent
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && !line.startsWith('#'));
    } else {
      urls = filteredArgs;
    }

    console.log(`🔍 Сканируем ${urls.length} URL с анализом через OpenAI Vision...`);
    console.log(`📁 Скриншоты сохраняются в: ${outputDir}`);
    console.log(`💾 Сохранение файлов: ${noSave ? 'отключено' : 'включено'}`);
    if (selector) {
      console.log(`🎯 Селектор: ${selector}`);
    }
    console.log('');
    
    const results = await scanner.scanUrls(urls, 2, !noSave, selector);
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

export { VisionScanner }; 