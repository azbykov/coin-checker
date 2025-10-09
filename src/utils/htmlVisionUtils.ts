// TODO: Задача - HTML-Vision гибридный анализ
// Назначение: Утилиты для извлечения HTML контента и анализа через GPT-4
// Вход: Puppeteer page, селектор
// Выход: HTML контент элемента для GPT анализа
// Ошибки: Обработка отсутствующих элементов

import { Page } from 'puppeteer';
import { logger } from './logger';

/**
 * Извлекает HTML контент элемента по селектору для анализа через GPT
 */
export async function extractElementForVision(
  page: Page,
  selector: string
): Promise<string | null> {
  try {
    logger.info(`Extracting HTML element for analysis: ${selector}`);
    
    // Ждем появления элемента
    await page.waitForSelector(selector, { timeout: 10000 });
    
    // Получаем элемент
    const element = await page.$(selector);
    if (!element) {
      logger.warn(`Element not found: ${selector}`);
      return null;
    }
    
    // Извлекаем HTML контент элемента
    const htmlContent = await page.evaluate((el) => {
      return el.outerHTML;
    }, element);
    
    logger.info(`Successfully extracted HTML content for: ${selector} (${htmlContent.length} chars)`);
    return htmlContent;
    
  } catch (error) {
    logger.error(`Failed to extract HTML element: ${selector}`, error as Error);
    return null;
  }
}

/**
 * Извлекает HTML контент элемента по селектору
 */
export async function extractElementHtml(
  page: Page,
  selector: string
): Promise<string | null> {
  try {
    logger.info(`Extracting HTML content for: ${selector}`);
    
    // Ждем появления элемента
    await page.waitForSelector(selector, { timeout: 10000 });
    
    // Получаем HTML контент элемента
    const html = await page.$eval(selector, (el) => el.outerHTML);
    
    logger.info(`Successfully extracted HTML content for: ${selector}`);
    return html;
    
  } catch (error) {
    logger.error(`Failed to extract HTML content: ${selector}`, error as Error);
    return null;
  }
}

/**
 * Извлекает текст элемента по селектору
 */
export async function extractElementText(
  page: Page,
  selector: string
): Promise<string | null> {
  try {
    logger.info(`Extracting text content for: ${selector}`);
    
    // Ждем появления элемента
    await page.waitForSelector(selector, { timeout: 10000 });
    
    // Получаем текстовый контент элемента
    const text = await page.$eval(selector, (el) => el.textContent);
    
    logger.info(`Successfully extracted text content for: ${selector}`);
    return text;
    
  } catch (error) {
    logger.error(`Failed to extract text content: ${selector}`, error as Error);
    return null;
  }
}

/**
 * Проверяет, существует ли элемент на странице
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Получает информацию об элементе (размеры, позиция)
 */
export async function getElementInfo(page: Page, selector: string): Promise<{
  width: number;
  height: number;
  x: number;
  y: number;
} | null> {
  try {
    const element = await page.$(selector);
    if (!element) {
      return null;
    }
    
    const box = await element.boundingBox();
    if (!box) {
      return null;
    }
    
    return {
      width: box.width,
      height: box.height,
      x: box.x,
      y: box.y
    };
  } catch (error) {
    logger.error(`Failed to get element info: ${selector}`, error as Error);
    return null;
  }
}
