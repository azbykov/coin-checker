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
import { jsonApiService } from '../services/jsonApiService';
import { customDataService } from '../services/customDataService';
import { GoogleSheetsService } from '../services/googleSheetsService';
import { logger } from '../utils/logger';
import { CryptoProjectData, SiteConfig, SitesDataSourceConfig } from '../types';
import { takeScreenshotWithSelector, setupPageForScreenshots, waitForPageLoad } from '../utils/selectorUtils';
import { convertVisionResponseToCryptoProjectData } from '../utils/priceParser';
import { formatCryptoProjectMessage, formatErrorMessage, formatCompletionMessage, formatStartMessage } from '../utils/telegramFormatter';
import { htmlParser } from '../services/htmlParser';
import { extractElementForVision } from '../utils/htmlVisionUtils';

export class BatchSiteAnalyzer {
  private telegramService: TelegramService;
  private messageService: any;
  private screenshotTelegramService: ScreenshotTelegramService;
  private googleSheetsService: GoogleSheetsService;
  private telegramEnabled: boolean = false;
  private googleSheetsEnabled: boolean = false;
  private outputDir: string;

  constructor(outputDir?: string) {
    this.outputDir = outputDir || config.app.screenshotsDir;
    this.telegramService = new TelegramService(config.telegram.botToken);
    this.messageService = createMessageService(this.telegramService.getBot(), config.telegram.botToken);
    this.screenshotTelegramService = new ScreenshotTelegramService(this.telegramService.getBot(), config.telegram.botToken);
    this.googleSheetsService = new GoogleSheetsService(config.googleSheets);
    this.ensureOutputDir();
  }

  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Создана папка для скриншотов: ${this.outputDir}`);
    }
  }


  private saveScreenshot(screenshot: Buffer, url: string): string {
    // В продакшене не сохраняем скриншоты для экономии места
    const isProduction = process.env['NODE_ENV'] === 'production';
    
    if (isProduction) {
      logger.debug('Сохранение скриншотов отключено (NODE_ENV=production)');
      return '';
    }
    
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

  private async loadSitesConfig(limit?: number, sitesConfig?: SitesDataSourceConfig): Promise<SiteConfig[]> {
    try {
      let sites: SiteConfig[] = [];
      
      // Определяем источник конфигурации
      const useGoogleSheets = sitesConfig?.source === 'googleSheets' || 
        (!sitesConfig && this.googleSheetsEnabled && this.googleSheetsService);
      const useCustomFile = sitesConfig?.source === 'file' && sitesConfig?.filePath;
      
      if (useGoogleSheets) {
        logger.info('Loading sites configuration from Google Sheets...');
        const sheetsConfig = await this.googleSheetsService.loadSitesConfig();
        sites = sheetsConfig as SiteConfig[];
      } else if (useCustomFile && sitesConfig.filePath) {
        // Загружаем из указанного файла
        logger.info(`Loading sites configuration from custom file: ${sitesConfig.filePath}...`);
        const configData = fs.readFileSync(sitesConfig.filePath, 'utf-8');
        sites = JSON.parse(configData);
      } else {
        // Загружаем из sites.json (по умолчанию)
        logger.info('Loading sites configuration from sites.json...');
        const configPath = path.join(__dirname, '../config/sites.json');
        const configData = fs.readFileSync(configPath, 'utf-8');
        sites = JSON.parse(configData);
      }
      
      // Фильтруем пропущенные сайты
      const activeSites = sites.filter(site => !site.skip);
      const skippedCount = sites.length - activeSites.length;
      
      if (skippedCount > 0) {
        logger.info(`Skipped ${skippedCount} sites with skip flag`);
      }
      
      // Применяем лимит к активным сайтам если указан
      let finalSites = activeSites;
      if (limit && limit > 0) {
        logger.info(`Applying limit of ${limit} sites to ${activeSites.length} active sites`);
        finalSites = activeSites.slice(0, limit);
      }
      
      logger.info(`Loaded ${finalSites.length} sites for analysis (${activeSites.length} active total)`);
      return finalSites;
      
    } catch (error) {
      logger.error('Failed to load sites configuration', error as Error);
      
      // Fallback к sites.json если Google Sheets недоступен
      if (sitesConfig?.source === 'googleSheets') {
        logger.info('Google Sheets failed, falling back to sites.json...');
        try {
          const configPath = path.join(__dirname, '../config/sites.json');
          const configData = fs.readFileSync(configPath, 'utf-8');
          let sites = JSON.parse(configData);
          
          // Фильтруем пропущенные сайты
          const activeSites = sites.filter((site: SiteConfig) => !site.skip);
          
          // Применяем лимит к активным сайтам если указан
          let finalSites = activeSites;
          if (limit && limit > 0) {
            logger.info(`Applying limit of ${limit} sites to ${activeSites.length} active sites (fallback)`);
            finalSites = activeSites.slice(0, limit);
          }
          
          logger.info(`Fallback loaded ${finalSites.length} sites from sites.json (${activeSites.length} active total)`);
          return finalSites;
        } catch (fallbackError) {
          logger.error('Fallback to sites.json also failed', fallbackError as Error);
          throw new Error('Failed to load sites configuration from both Google Sheets and local file');
        }
      }
      
      // Fallback к sites.json если кастомный файл недоступен
      if (sitesConfig?.source === 'file') {
        logger.info(`Custom file ${sitesConfig.filePath} failed, falling back to sites.json...`);
        try {
          const configPath = path.join(__dirname, '../config/sites.json');
          const configData = fs.readFileSync(configPath, 'utf-8');
          let sites = JSON.parse(configData);
          
          // Фильтруем пропущенные сайты
          const activeSites = sites.filter((site: SiteConfig) => !site.skip);
          
          // Применяем лимит к активным сайтам если указан
          let finalSites = activeSites;
          if (limit && limit > 0) {
            logger.info(`Applying limit of ${limit} sites to ${activeSites.length} active sites (fallback)`);
            finalSites = activeSites.slice(0, limit);
          }
          
          logger.info(`Fallback loaded ${finalSites.length} sites from sites.json (${activeSites.length} active total)`);
          return finalSites;
        } catch (fallbackError) {
          logger.error('Fallback to sites.json also failed', fallbackError as Error);
          throw new Error('Failed to load sites configuration from both custom file and fallback file');
        }
      }
      
      throw error;
    }
  }

  public async analyzeSite(siteConfig: SiteConfig): Promise<CryptoProjectData | null> {
    try {
      logger.info(`Starting analysis of site: ${siteConfig.url}`);
      
      // Собираем customData если есть
      let customData: any[] = [];
      if (siteConfig.customData && siteConfig.customData.length > 0) {
        logger.info(`Collecting custom data for: ${siteConfig.url}`);
        customData = await customDataService.collectCustomData(siteConfig.url, siteConfig.customData);
      }
      
      // Проверяем источник данных
      if (siteConfig.dataSource === 'json' && siteConfig.jsonApi) {
        logger.info(`Using JSON API for: ${siteConfig.url}`);
        return await this.analyzeJsonApi(siteConfig, customData);
      }
      
      if (siteConfig.dataSource === 'html' && siteConfig.htmlSelectors) {
        logger.info(`Using HTML parsing for: ${siteConfig.url}`);
        return await this.analyzeHtml(siteConfig, customData);
      }
      
      if (siteConfig.dataSource === 'html-vision' && siteConfig.selector) {
        logger.info(`Using HTML-Vision hybrid analysis for: ${siteConfig.url}`);
        return await this.analyzeHtmlVision(siteConfig, customData);
      }
      
      // Проверяем, есть ли множественные селекторы
      if (siteConfig.selectors && siteConfig.selectors.length > 0) {
        logger.info(`Using multiple selectors: ${siteConfig.selectors.join(', ')}`);
        
        // Используем новый метод для множественных скриншотов
        const multipleScreenshotsResult = await this.screenshotTelegramService.processMultipleScreenshots(
          siteConfig.url,
          {
            saveToDisk: process.env['NODE_ENV'] !== 'production',
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
          const visionData = await visionParser.parseScreenshot(screenshotInfo.screenshot, customData);
          
          if (visionData) {
            logger.info(`Vision data from selector "${screenshotInfo.selector}": ${JSON.stringify(visionData)}`);
            allVisionData.push(visionData);
          }
        }
        
        // Объединяем все данные в один объект
        if (allVisionData.length > 0) {
          combinedData = this.mergeVisionData(allVisionData, siteConfig.url, customData);
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
        const visionData = await visionParser.parseScreenshot(screenshotResult.screenshot, customData);
        
        if (!visionData) {
          logger.error(`Failed to parse screenshot for ${siteConfig.url}`);
          return null;
        }

        // Конвертируем в CryptoProjectData с парсингом чисел
        const result = convertVisionResponseToCryptoProjectData(visionData, siteConfig.url, customData);

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
        const visionData = await visionParser.parseScreenshot(screenshotResult.screenshot, customData);
        
        if (!visionData) {
          logger.error(`Failed to parse screenshot for ${siteConfig.url}`);
          return null;
        }

        // Конвертируем в CryptoProjectData с парсингом чисел
        const result = convertVisionResponseToCryptoProjectData(visionData, siteConfig.url, customData);

        return result;
      }
      
    } catch (error) {
      logger.error(`Failed to analyze site ${siteConfig.url}`, error as Error);
      return null;
    }
  }

  private async analyzeJsonApi(siteConfig: SiteConfig, customData: any[]): Promise<CryptoProjectData | null> {
    try {
      if (!siteConfig.jsonApi) {
        logger.error('JSON API configuration is missing');
        return null;
      }

      // Получаем данные из JSON API
      const jsonResult = await jsonApiService.fetchData(siteConfig.url, siteConfig.jsonApi);
      
      if (!jsonResult.success) {
        logger.error(`Failed to fetch JSON data for ${siteConfig.url}: ${jsonResult.error}`);
        return null;
      }

      // Парсим данные в формат CryptoProjectData
      const parsedData = jsonApiService.parseData(jsonResult.data, siteConfig.jsonApi, siteConfig.url);
      
      if (!parsedData) {
        logger.error(`Failed to parse JSON data for ${siteConfig.url}`);
        return null;
      }

      // Отправляем данные в ChatGPT для дополнительного анализа
      logger.info(`Sending JSON data to ChatGPT for analysis: ${siteConfig.url}`);
      const aiAnalysis = await this.analyzeWithChatGPT(jsonResult.data, customData, siteConfig.url);

      console.log('aiAnalysis111', {aiAnalysis});
      
      // Объединяем JSON данные с AI анализом
      const finalData: CryptoProjectData = {
        ...parsedData,
        customData: customData,
        // Перезаписываем поля AI анализом, если он более точный
        ...(aiAnalysis || {})
      };
      
      logger.info(`Successfully analyzed JSON data with AI for ${siteConfig.url}: ${JSON.stringify(finalData)}`);
      return finalData;
    } catch (error) {
      logger.error(`Failed to analyze JSON API for ${siteConfig.url}`, error as Error);
      return null;
    }
  }

  /**
   * Анализирует сайт через HTML парсинг
   */
  private async analyzeHtml(siteConfig: SiteConfig, customData: any[]): Promise<CryptoProjectData | null> {
    try {
      if (!siteConfig.htmlSelectors) {
        logger.error('HTML selectors configuration is missing');
        return null;
      }

      logger.info(`Analyzing HTML for: ${siteConfig.url}`);

      // Создаем новую страницу
      const page = await browserService.newPage();
      
      try {
        // Настраиваем страницу
        await setupPageForScreenshots(page);
        
        // Переходим на страницу
        await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Ждем загрузки
        await waitForPageLoad(page);

        // Парсим данные через HTML
        const result = await htmlParser.parseCryptoProject(page, siteConfig.url, siteConfig.htmlSelectors);
        
        if (result) {
          // Добавляем customData
          result.customData = customData;
          
          logger.info(`Successfully analyzed HTML for ${siteConfig.url}: ${JSON.stringify(result)}`);
          return result;
        }

        return null;
        
      } finally {
        await page.close();
      }

    } catch (error) {
      logger.error(`Failed to analyze HTML for ${siteConfig.url}`, error as Error);
      return null;
    }
  }

  /**
   * Гибридный анализ: извлекаем HTML элемент и анализируем через Vision API
   */
  private async analyzeHtmlVision(siteConfig: SiteConfig, customData: any[]): Promise<CryptoProjectData | null> {
    try {
      if (!siteConfig.selector) {
        logger.error('HTML Vision selector configuration is missing');
        return null;
      }

      logger.info(`Analyzing HTML-Vision for: ${siteConfig.url} with selector: ${siteConfig.selector}`);

      // Создаем новую страницу
      const page = await browserService.newPage();
      
      try {
        // Настраиваем страницу
        await setupPageForScreenshots(page);
        
        // Переходим на страницу
        await page.goto(siteConfig.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Ждем загрузки
        await waitForPageLoad(page);

        // Извлекаем HTML контент элемента
        const htmlContent = await extractElementForVision(page, siteConfig.selector);
        
        if (!htmlContent) {
          logger.error(`Failed to extract HTML content for: ${siteConfig.url}`);
          return null;
        }

        // Анализируем HTML через GPT-4
        const aiData = await visionParser.parseHtml(htmlContent);
        
        if (!aiData) {
          logger.error(`Failed to parse HTML with GPT-4 for: ${siteConfig.url}`);
          return null;
        }

        // Конвертируем в CryptoProjectData
        const formattedData = convertVisionResponseToCryptoProjectData(aiData, siteConfig.url);
        
        // Добавляем customData
        formattedData.customData = customData;
        
        logger.info(`Successfully analyzed HTML-Vision for ${siteConfig.url}: ${JSON.stringify(formattedData)}`);
        return formattedData;
        
      } finally {
        await page.close();
      }

    } catch (error) {
      logger.error(`Failed to analyze HTML-Vision for ${siteConfig.url}`, error as Error);
      return null;
    }
  }

  /**
   * Анализирует JSON данные с помощью ChatGPT
   */
  private async analyzeWithChatGPT(
    jsonData: any, 
    customData: any[], 
    url: string
  ): Promise<CryptoProjectData | null> {
    try {
      console.log('jsonData111', {customData, jsonData, url});
      // Формируем промпт для анализа JSON данных
      let prompt = `Ты - помощник для анализа данных криптовалютных проектов.

Проанализируй следующие JSON данные и верни структурированную информацию в формате JSON:

JSON данные:
${JSON.stringify(jsonData, null, 2)}`;

      // Добавляем customData если есть
      if (customData && customData.length > 0) {
        const successfulData = customData.filter(item => item.success && item.data.trim());
        if (successfulData.length > 0) {
          prompt += '\n\nДополнительная информация:';
          for (const item of successfulData) {
            prompt += `\n${item.label}: ${item.data}`;
          }
        }
      }

      prompt += `\n\nВерни JSON объект с полями:
{
  "currentPrice": "текущая цена токена",
  "nextPrice": "следующая цена токена", 
  "listingPrice": "цена при листинге",
  "raised": "собранная сумма"
}

ВАЖНЫЕ ПРАВИЛА ФОРМАТИРОВАНИЯ:
1. Цены должны быть в исходном числовом формате (например: "0.0120919147161117" или "0.1819")
2. Суммы должны быть в числовом формате с точностью до 2 знаков (например: "10940083.36" или "10.94")
3. Если значение не найдено, используй "N/A"
4. Извлекай точные числовые значения из JSON данных
5. Для "raised" ищи поля типа: totalRaised, totalSold, raised, funds, collected
6. Для "listingPrice" ищи поля типа: listingPrice, launchPrice, finalPrice, icoPrice
7. Для "currentPrice" ищи поля типа: currentPrice, tokenPrice, price, current
8. Для "nextPrice" ищи поля типа: nextPrice, nextStagePrice, stagePrice, upcomingPrice

ПРИМЕРЫ ПРАВИЛЬНОГО ФОРМАТИРОВАНИЯ:
- Цена: "0.0120919147161117" (исходное значение, не "$0.012091" или "0.012091 USD")
- Сумма: "10940083.36" (2 знака после запятой, не "$10,940,083.35" или "10.94M USD")
- Если в JSON есть "tokenPrice": "0.0120919147161117", то currentPrice = "0.0120919147161117"`;

      // Логируем промпт для отладки
      logger.debug(`Sending prompt to ChatGPT: ${prompt.substring(0, 500)}...`);

      // Отправляем в OpenAI
      const response = await visionParser['client'].chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        logger.warn('Empty response from ChatGPT for JSON analysis');
        return null;
      }

      // Логируем ответ от ChatGPT
      logger.debug(`ChatGPT response: ${content}`);

      // Парсим ответ
      const aiData = JSON.parse(content);
      
      // Валидируем и форматируем данные
      const formattedData = {
        currentPrice: parseFloat(this.formatPrice(aiData.currentPrice)) || 0,
        nextPrice: this.formatPrice(aiData.nextPrice) !== 'N/A' ? parseFloat(this.formatPrice(aiData.nextPrice)) : null,
        listingPrice: this.formatPrice(aiData.listingPrice) !== 'N/A' ? parseFloat(this.formatPrice(aiData.listingPrice)) : null,
        raised: parseFloat(this.formatAmount(aiData.raised)) || 0,
        currency: aiData.currency || 'USD',
        url: url,
        timestamp: new Date(),
      };
      
      logger.info(`ChatGPT analysis result: ${JSON.stringify(formattedData)}`);
      
      return formattedData;
    } catch (error) {
      logger.error('Failed to analyze JSON data with ChatGPT', error as Error);
      return null;
    }
  }

  /**
   * Форматирует цену (возвращает исходное значение)
   */
  private formatPrice(value: any): string {
    if (!value || value === 'N/A') return 'N/A';
    
    // Убираем валютные символы и пробелы
    const cleanValue = String(value).replace(/[$€£¥,\s]/g, '');
    
    // Проверяем, является ли значение числом
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) return 'N/A';
    
    // Возвращаем исходное числовое значение без форматирования
    return numValue.toString();
  }

  /**
   * Форматирует сумму в читабельный формат (до 2 знаков после запятой)
   */
  private formatAmount(value: any): string {
    if (!value || value === 'N/A') return 'N/A';
    
    // Убираем валютные символы, запятые и пробелы
    let cleanValue = String(value).replace(/[$€£¥,\s]/g, '');
    
    // Обрабатываем сокращения (M, K, B)
    if (cleanValue.includes('M')) {
      cleanValue = cleanValue.replace('M', '');
      const numValue = parseFloat(cleanValue) * 1000000;
      return isNaN(numValue) ? 'N/A' : numValue.toFixed(2);
    }
    
    if (cleanValue.includes('K')) {
      cleanValue = cleanValue.replace('K', '');
      const numValue = parseFloat(cleanValue) * 1000;
      return isNaN(numValue) ? 'N/A' : numValue.toFixed(2);
    }
    
    if (cleanValue.includes('B')) {
      cleanValue = cleanValue.replace('B', '');
      const numValue = parseFloat(cleanValue) * 1000000000;
      return isNaN(numValue) ? 'N/A' : numValue.toFixed(2);
    }
    
    // Проверяем, является ли значение числом
    const numValue = parseFloat(cleanValue);
    if (isNaN(numValue)) return 'N/A';
    
    // Форматируем до 2 знаков после запятой
    return numValue.toFixed(2);
  }

  private async takeScreenshotWithSelector(url: string, selector?: string): Promise<{ success: boolean; screenshot: Buffer; error?: string }> {
    let page: any = null;

    try {
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
      const screenshot = await takeScreenshotWithSelector(page, selector, 10000);

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
    return formatCryptoProjectMessage(data, {
      showEmojis: true,
      showTimestamp: true,
      showCurrency: true,
      compactMode: false
    });
  }


  async run(limit?: number, sitesConfig?: SitesDataSourceConfig): Promise<void> {
    try {
      logger.info('Starting batch site analysis');

      // Загружаем конфигурацию сайтов
      const sites = await this.loadSitesConfig(limit, sitesConfig);

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

      // Инициализируем Google Sheets
      logger.info('Initializing Google Sheets connection...');
      try {
        await this.googleSheetsService.initialize();
        this.googleSheetsEnabled = true;
        logger.info('Google Sheets initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize Google Sheets, but continuing with analysis...', error as Error);
        this.googleSheetsEnabled = false;
        // Продолжаем без Google Sheets
      }

      // Отправляем сообщение о начале анализа
      if (this.telegramEnabled) {
        try {
          await this.messageService.sendText(
            config.telegram.chatId,
            formatStartMessage(sites.length),
            'HTML'
          );
        } catch (error) {
          logger.error('Failed to send start message to Telegram', error as Error);
        }
      }

      // Анализируем каждый сайт
      logger.info(`Starting analysis of ${sites.length} sites...`);
      let processedCount = 0;
      let successfulCount = 0;
      let failedCount = 0;
      const startTime = Date.now();

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
            successfulCount++;
            
            // Выводим результат в консоль
            console.log('\n' + '='.repeat(50));
            console.log(this.formatTelegramMessage(data, Buffer.alloc(0)));
            console.log('='.repeat(50) + '\n');
            
            // Сохраняем в Google Sheets если подключение активно
            if (this.googleSheetsEnabled) {
              try {
                const projectId = await this.googleSheetsService.saveCryptoProject(data);
                logger.info(`Data saved to Google Sheets for ${data.url} (ID: ${projectId})`);
              } catch (error) {
                logger.error(`Failed to save data to Google Sheets for ${data.url}`, error as Error);
                // Сохраняем историю ошибки
                try {
                  await this.googleSheetsService.saveBotRunHistory(0, data.url, 'error', (error as Error).message);
                } catch (historyError) {
                  logger.error(`Failed to save bot run history for ${data.url}`, historyError as Error);
                }
              }
            }
            
            // Отправляем в Telegram если бот работает
            if (this.telegramEnabled) {
              try {
                // Проверяем источник данных - для JSON API, HTML и HTML-Vision не отправляем скриншоты
                if (site.dataSource === 'json' || site.dataSource === 'html' || site.dataSource === 'html-vision') {
                  // Для JSON API, HTML и HTML-Vision отправляем только текстовый отчет
                  const message = this.formatTelegramMessage(data, Buffer.alloc(0));
                  await this.messageService.sendReport(config.telegram.chatId, message);
                  logger.info(`Successfully sent ${site.dataSource} report to Telegram for ${data.url}`);
                } else {
                  // Для скриншотов создаем и отправляем изображение
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
                await this.messageService.sendText(
                  config.telegram.chatId,
                  formatErrorMessage(site.url, 'Не удалось проанализировать сайт'),
                  'HTML'
                );
              } catch (telegramError) {
                logger.error(`Failed to send error to Telegram: ${site.url}`, telegramError as Error);
              }
            }
          }

          processedCount++;

          // Пауза между запросами
          await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
          failedCount++;
          processedCount++;
          
          logger.error(`Error processing site ${site.url}`, error as Error);
          console.log(`❌ Ошибка при обработке сайта ${site.url}: ${(error as Error).message}`);
          
          // Сохраняем историю ошибки в Google Sheets
          if (this.googleSheetsEnabled) {
            try {
              await this.googleSheetsService.saveBotRunHistory(0, site.url, 'error', (error as Error).message);
            } catch (historyError) {
              logger.error(`Failed to save bot run history for ${site.url}`, historyError as Error);
            }
          }
          
          // Отправляем в Telegram если бот работает
          if (this.telegramEnabled) {
            try {
              await this.messageService.sendText(
                config.telegram.chatId,
                formatErrorMessage(site.url, (error as Error).message),
                'HTML'
              );
            } catch (telegramError) {
              logger.error(`Failed to send error to Telegram: ${site.url}`, telegramError as Error);
            }
          }
        }
      }

      // Отправляем сообщение о завершении анализа
      if (this.telegramEnabled) {
        try {
          const processingTime = Date.now() - startTime;
          await this.messageService.sendText(
            config.telegram.chatId,
            formatCompletionMessage(sites.length, successfulCount, failedCount, processingTime),
            'HTML'
          );
        } catch (error) {
          logger.error('Failed to send completion message to Telegram', error as Error);
        }
      }

      logger.info(`Batch site analysis completed. Successful: ${successfulCount}, Failed: ${failedCount}`);

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
      
      // Закрываем подключение к Google Sheets
      if (this.googleSheetsEnabled && this.googleSheetsService) {
        try {
          await this.googleSheetsService.close();
          logger.info('Google Sheets connection closed');
        } catch (error) {
          logger.warn('Failed to close Google Sheets connection');
        }
      }
      
      // Очищаем ресурсы браузера
      try {
        await browserService.close();
        logger.info('Browser service cleaned up in batch analyzer');
      } catch (error) {
        logger.warn('Failed to cleanup browser service in batch analyzer');
      }
    }
  }

  /**
   * Объединяет данные из нескольких Vision API результатов в один объект
   * Приоритет отдается непустым значениям и значениям, отличным от "N/A"
   */
  private mergeVisionData(visionDataArray: any[], url: string, customData: any[]): CryptoProjectData {
    const merged: any = {
      url: url,
      timestamp: new Date(),
      currentPrice: 'N/A',
      nextPrice: 'N/A', 
      listingPrice: 'N/A',
      raised: 'N/A',
      currency: 'USD'
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

      // Обновляем валюту если найдена
      if (data.currency && data.currency !== 'USD') {
        merged.currency = data.currency;
      }
    }

    // Добавляем customData
    merged.customData = customData;
    
    logger.info(`Merged ${visionDataArray.length} vision data sets into: ${JSON.stringify(merged)}`);
    
    // Конвертируем в CryptoProjectData с парсингом чисел
    return convertVisionResponseToCryptoProjectData(merged, url, customData);
  }
}

// Экспорт для использования в других модулях
export const batchSiteAnalyzer = new BatchSiteAnalyzer();
