// TODO: Задача - Custom Data Service
// Назначение: Сервис для сбора дополнительных данных из разных источников
// Вход: Конфигурация customData
// Выход: Собранные данные для передачи в OpenAI
// Ошибки: Ошибки сбора данных, парсинга, сети

import { CustomDataConfig, CustomDataResult } from '../types';
import { logger } from '../utils/logger';
import { jsonApiService } from './jsonApiService';
import { browserService } from './browserService';
import { setupPageForScreenshots, waitForPageLoad, createLocator } from '../utils/selectorUtils';

export class CustomDataService {
  /**
   * Собирает все customData для сайта
   */
  async collectCustomData(
    url: string,
    customDataConfigs: CustomDataConfig[]
  ): Promise<CustomDataResult[]> {
    const results: CustomDataResult[] = [];

    for (const config of customDataConfigs) {
      try {
        logger.info(`Collecting custom data: ${config.label} from ${config.source}`);
        
        const result = await this.collectSingleCustomData(url, config);
        results.push(result);
        
        if (result.success) {
          logger.info(`Successfully collected ${config.label}: ${result.data.substring(0, 100)}...`);
        } else {
          logger.warn(`Failed to collect ${config.label}: ${result.error}`);
        }
      } catch (error) {
        logger.error(`Error collecting custom data ${config.label}`, error as Error);
        results.push({
          label: config.label,
          data: '',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Собирает данные из одного источника
   */
  private async collectSingleCustomData(
    url: string,
    config: CustomDataConfig
  ): Promise<CustomDataResult> {
    switch (config.source) {
      case 'selector':
        return await this.collectFromSelector(url, config);
      case 'json':
        return await this.collectFromJson(url, config);
      case 'text':
        return await this.collectFromText(config);
      default:
        return {
          label: config.label,
          data: '',
          success: false,
          error: `Unsupported source type: ${config.source}`,
        };
    }
  }

  /**
   * Собирает данные из селектора на странице
   */
  private async collectFromSelector(
    url: string,
    config: CustomDataConfig
  ): Promise<CustomDataResult> {
    try {
      if (!config.selector) {
        throw new Error('Selector is required for selector source');
      }

      const browser = await browserService.getBrowser();
      const page = await browser.newPage();

      try {
        await setupPageForScreenshots(page);
        // Используем URL из конфига, если указан, иначе основной URL
        const targetUrl = config.url || url;
        await page.goto(targetUrl, { waitUntil: 'networkidle2' });
        await waitForPageLoad(page);

        console.log('config111', {url, page});

        // Получаем текст из элемента используя locator
        const locator = createLocator(page, config.selector);
        const element = await locator.setTimeout(10000).waitHandle();

        console.log({'locator111': element});
        
        if (!element) {
          throw new Error(`Element not found with selector: ${config.selector}`);
        }

        console.log('element2222', element);

        const text = await element.evaluate((el: any) => el.textContent || '');
        
        return {
          label: config.label,
          data: text.trim(),
          success: true,
        };
      } finally {
        await page.close();
      }
    } catch (error) {
      return {
        label: config.label,
        data: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Собирает данные из JSON API
   */
  private async collectFromJson(
    url: string,
    config: CustomDataConfig
  ): Promise<CustomDataResult> {
    try {
      if (!config.jsonApi) {
        throw new Error('JsonApi config is required for json source');
      }

      // Используем URL из конфига, если указан, иначе основной URL
      const targetUrl = config.url || url;
      const jsonResult = await jsonApiService.fetchData(targetUrl, config.jsonApi);
      
      if (!jsonResult.success) {
        throw new Error(jsonResult.error || 'Failed to fetch JSON data');
      }

      // Преобразуем JSON в читаемый текст
      const dataText = this.formatJsonAsText(jsonResult.data);
      
      return {
        label: config.label,
        data: dataText,
        success: true,
      };
    } catch (error) {
      return {
        label: config.label,
        data: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Собирает статический текст
   */
  private async collectFromText(config: CustomDataConfig): Promise<CustomDataResult> {
    try {
      if (!config.text) {
        throw new Error('Text is required for text source');
      }

      return {
        label: config.label,
        data: config.text,
        success: true,
      };
    } catch (error) {
      return {
        label: config.label,
        data: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Форматирует JSON данные в читаемый текст
   */
  private formatJsonAsText(data: any): string {
    try {
      // Если это простой объект, форматируем его
      if (typeof data === 'object' && data !== null) {
        return JSON.stringify(data, null, 2);
      }
      
      // Если это строка, возвращаем как есть
      return String(data);
    } catch (error) {
      return String(data);
    }
  }

  /**
   * Форматирует customData для передачи в OpenAI промпт
   */
  formatCustomDataForPrompt(customData: CustomDataResult[]): string {
    if (!customData || customData.length === 0) {
      return '';
    }

    const successfulData = customData.filter(item => item.success && item.data.trim());
    
    if (successfulData.length === 0) {
      return '';
    }

    let prompt = '\n\nДополнительная информация:\n';
    
    for (const item of successfulData) {
      prompt += `\n${item.label}:\n${item.data}\n`;
    }

    return prompt;
  }
}

export const customDataService = new CustomDataService();
