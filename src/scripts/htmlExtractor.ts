// TODO: Задача - Извлечение HTML по селектору
// Назначение: Демонстрация получения HTML содержимого элементов по селекторам
// Вход: URL и селектор
// Выход: HTML содержимое элемента
// Ошибки: Ошибки загрузки страницы, неверный селектор

import { browserService } from '../services/browserService';
import { getHtmlBySelector, getTextBySelector, getAttributeBySelector, setupPageForScreenshots, waitForPageLoad } from '../utils/selectorUtils';
import { logger } from '../utils/logger';

interface HtmlExtractionResult {
  url: string;
  selector: string;
  html?: string;
  text?: string;
  attributes?: { [key: string]: string };
  success: boolean;
  error?: string;
}

export class HtmlExtractor {
  /**
   * Извлекает HTML содержимое по селектору с одного сайта
   */
  async extractFromUrl(url: string, selector: string, attributes?: string[]): Promise<HtmlExtractionResult> {
    const result: HtmlExtractionResult = {
      url,
      selector,
      success: false
    };

    try {
      logger.info(`Extracting HTML from: ${url} with selector: ${selector}`);

      // Создаем новую страницу
      const page = await browserService.newPage();
      
      try {
        // Настраиваем страницу
        await setupPageForScreenshots(page);
        
        // Переходим на страницу
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Ждем загрузки
        await waitForPageLoad(page);

        // Получаем HTML содержимое
        const html = await getHtmlBySelector(page, selector);
        if (html) {
          result.html = html;
          result.success = true;
        }

        // Получаем текстовое содержимое
        const text = await getTextBySelector(page, selector);
        if (text) {
          result.text = text;
        }

        // Получаем атрибуты если указаны
        if (attributes && attributes.length > 0) {
          result.attributes = {};
          for (const attr of attributes) {
            const value = await getAttributeBySelector(page, selector, attr);
            if (value) {
              result.attributes[attr] = value;
            }
          }
        }

        logger.info(`Successfully extracted HTML from: ${url}`);
        
      } finally {
        await page.close();
      }

    } catch (error) {
      result.error = (error as Error).message;
      logger.error(`Failed to extract HTML from: ${url}`, error as Error);
    }

    return result;
  }

  /**
   * Извлекает HTML с нескольких сайтов
   */
  async extractFromUrls(urls: string[], selector: string, attributes?: string[]): Promise<HtmlExtractionResult[]> {
    const results: HtmlExtractionResult[] = [];

    for (const url of urls) {
      const result = await this.extractFromUrl(url, selector, attributes);
      results.push(result);
      
      // Пауза между запросами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return results;
  }

  /**
   * Выводит результат в консоль
   */
  printResult(result: HtmlExtractionResult): void {
    console.log('\n' + '='.repeat(60));
    console.log(`🔍 Извлечение HTML`);
    console.log('='.repeat(60));
    console.log(`🌐 URL: ${result.url}`);
    console.log(`🎯 Селектор: ${result.selector}`);
    console.log(`✅ Успех: ${result.success ? 'Да' : 'Нет'}`);
    
    if (result.error) {
      console.log(`❌ Ошибка: ${result.error}`);
    }
    
    if (result.html) {
      console.log(`\n📄 HTML содержимое:`);
      console.log('-'.repeat(40));
      console.log(result.html);
      console.log('-'.repeat(40));
    }
    
    if (result.text) {
      console.log(`\n📝 Текстовое содержимое:`);
      console.log('-'.repeat(40));
      console.log(result.text);
      console.log('-'.repeat(40));
    }
    
    if (result.attributes) {
      console.log(`\n🏷️ Атрибуты:`);
      console.log('-'.repeat(40));
      for (const [key, value] of Object.entries(result.attributes)) {
        console.log(`${key}: ${value}`);
      }
      console.log('-'.repeat(40));
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// Экспорт для использования в других модулях
export const htmlExtractor = new HtmlExtractor();

// Пример использования
async function example() {
  try {
    await browserService.initialize();
    
    const extractor = new HtmlExtractor();
    
    // Пример 1: Получение HTML по CSS селектору
    const result1 = await extractor.extractFromUrl(
      'https://pepeascension.com/',
      '.price', // CSS селектор
      ['class', 'data-price'] // дополнительные атрибуты
    );
    extractor.printResult(result1);
    
    // Пример 2: Получение HTML по текстовому селектору
    const result2 = await extractor.extractFromUrl(
      'https://pepeascension.com/',
      'text=Price' // текстовый селектор
    );
    extractor.printResult(result2);
    
    // Пример 3: Получение HTML по XPath селектору
    const result3 = await extractor.extractFromUrl(
      'https://pepeascension.com/',
      'xpath=//div[contains(@class, "token")]' // XPath селектор
    );
    extractor.printResult(result3);
    
  } catch (error) {
    logger.error('Example failed', error as Error);
  } finally {
    await browserService.close();
  }
}

// Запуск примера если файл выполняется напрямую
if (require.main === module) {
  example();
}
