// TODO: Задача - Утилиты для работы с селекторами
// Назначение: Общие методы для создания локаторов и работы с селекторами
// Вход: Page и строка селектора
// Выход: Locator для Puppeteer
// Ошибки: Некорректный формат селектора

import { Page, Locator, ElementHandle } from 'puppeteer';
import { logger } from './logger';

/**
 * Создает локатор на основе строки селектора
 * Поддерживает различные типы селекторов:
 * - CSS селекторы: ".class", "#id", "[attribute]"
 * - Текстовые селекторы: "text=Your purchased $PEAP"
 * - XPath селекторы: "xpath=//p[contains(text(), 'Your purchased')]/../.."
 * - Комбинированные селекторы: "text=Your purchased $PEAP >> xpath=../../.."
 */
export function createLocator(page: Page, selector: string): Locator<ElementHandle> {
  // Проверяем, является ли селектор комбинированным (с >>)
  if (selector.includes(' >> ')) {
    const parts = selector.split(' >> ');
    if (parts.length !== 2) {
      throw new Error(`Неправильный формат комбинированного селектора: ${selector}`);
    }
    
    const [firstSelector, secondSelector] = parts;
    if (!firstSelector || !secondSelector) {
      throw new Error(`Неправильный формат комбинированного селектора: ${selector}`);
    }
    
    // Обрабатываем второй селектор (обычно xpath)
    if (secondSelector.startsWith('xpath=')) {
      const xpath = secondSelector.substring(6); // убираем "xpath="
      // Для XPath используем page.locator с полным путем
      return page.locator(`${firstSelector.trim()} >> xpath=${xpath}`);
    } else {
      // Для других селекторов также используем page.locator
      return page.locator(`${firstSelector.trim()} >> ${secondSelector.trim()}`);
    }
  }
  
  // Обрабатываем простые селекторы
  if (selector.startsWith('text=')) {
    const text = selector.substring(5); // убираем "text="
    return page.locator(`text=${text}`);
  }
  
  if (selector.startsWith('xpath=')) {
    const xpath = selector.substring(6); // убираем "xpath="
    return page.locator(`xpath=${xpath}`);
  }
  
  // По умолчанию считаем CSS селектором
  return page.locator(selector);
}

/**
 * Делает скриншот элемента или страницы с использованием селектора
 */
export async function takeScreenshotWithSelector(
  page: Page, 
  selector?: string, 
  timeout = 10000
): Promise<Buffer> {
  if (selector) {
    try {
      // Создаем локатор для более мощных селекторов
      const locator = createLocator(page, selector);
      
      // Ждем появления элемента и делаем скриншот
      const elementHandle = await locator.setTimeout(timeout).waitHandle();
      
      const screenshot = await elementHandle.screenshot({
        type: 'png'
      }) as Buffer;
      
      logger.info(`Скриншот элемента "${selector}" создан через Locator API`);
      return screenshot;
    } catch (selectorError) {
      logger.warn(`Селектор "${selector}" не найден, делаем полностраничный скриншот: ${(selectorError as Error).message}`);
      
      // Если селектор не найден, делаем полностраничный скриншот
      return await page.screenshot({
        type: 'png',
        fullPage: true,
      }) as Buffer;
    }
  } else {
    // Полностраничный скриншот
    return await page.screenshot({
      type: 'png',
      fullPage: true,
    }) as Buffer;
  }
}

/**
 * Настраивает страницу для скриншотов
 */
export async function setupPageForScreenshots(page: Page): Promise<void> {
  // Настройка viewport
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Устанавливаем user-agent для обхода блокировки
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Обработка ошибок страницы
  page.on('error', (error: Error) => {
    logger.error(`Ошибка страницы: ${error.message}`);
  });
  
  page.on('pageerror', (error: Error) => {
    logger.error(`JavaScript ошибка: ${error.message}`);
  });
}

/**
 * Ждет полной загрузки страницы
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  // Ожидание загрузки контента
  await new Promise((r) => setTimeout(r, 3000));
  
  // Дополнительное ожидание для динамического контента
  try {
    await page.waitForFunction('document.readyState === "complete"', { timeout: 10000 });
  } catch (error) {
    logger.warn('Страница не полностью загружена, продолжаем...');
  }
}
