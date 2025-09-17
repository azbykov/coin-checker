// TODO: Задача - JSON API Service
// Назначение: Сервис для получения данных из JSON API
// Вход: Конфигурация JSON API
// Выход: Данные крипто-проекта
// Ошибки: Ошибки сети, парсинга, валидации

import { JsonApiConfig, JsonApiResult, CryptoProjectData } from '../types';
import { logger } from '../utils/logger';

export class JsonApiService {
  /**
   * Получает данные из JSON API и преобразует их в формат CryptoProjectData
   */
  async fetchData(
    url: string,
    config: JsonApiConfig
  ): Promise<JsonApiResult> {
    try {
      logger.info(`Fetching JSON data from ${config.endpoint} for ${url}`);

      const response = await this.makeRequest(config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      logger.debug(`JSON API response received: ${JSON.stringify(data)}`);

      return {
        url,
        data,
        success: true,
      };
    } catch (error) {
      logger.error(`Failed to fetch JSON data from ${config.endpoint}`, error as Error);
      return {
        url,
        data: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Преобразует данные из JSON API в формат CryptoProjectData
   */
  parseData(
    jsonData: any,
    config: JsonApiConfig,
    url: string
  ): CryptoProjectData | null {
    try {
      const result: CryptoProjectData = {
        currentPrice: '',
        nextPrice: '',
        listingPrice: '',
        raised: '',
        url,
        timestamp: new Date(),
      };

      // Извлекаем данные по маппингу
      for (const [key, path] of Object.entries(config.dataMapping)) {
        if (path && key in result) {
          const value = this.getNestedValue(jsonData, path);
          if (value !== undefined) {
            (result as any)[key] = String(value);
          }
        }
      }

      logger.debug(`Parsed JSON data: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error('Failed to parse JSON data', error as Error);
      return null;
    }
  }

  /**
   * Выполняет HTTP запрос
   */
  private async makeRequest(config: JsonApiConfig): Promise<Response> {
    const requestOptions: RequestInit = {
      method: config.method,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers,
      },
    };

    if (config.body && (config.method === 'POST' || config.method === 'PUT')) {
      requestOptions.body = typeof config.body === 'string' 
        ? config.body 
        : JSON.stringify(config.body);
    }

    return fetch(config.endpoint, requestOptions);
  }

  /**
   * Получает значение по вложенному пути (например, "data.current_price")
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}

export const jsonApiService = new JsonApiService();
