// TODO: Задача 10 - Клиент OpenAI
// Назначение: Инициализация и управление клиентом OpenAI
// Вход: API ключ OpenAI
// Выход: Клиент OpenAI
// Ошибки: Неверный API ключ, ошибки сети

import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errorHandler';
import { VisionParser } from './visionParser';

export class OpenAIService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
    });
  }

  getClient(): OpenAI {
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.client.models.list();
      logger.info('OpenAI connection test successful');
      return true;
    } catch (error) {
      logger.error('OpenAI connection test failed', error as Error);
      return false;
    }
  }
}

export function createOpenAIService(apiKey: string): OpenAIService {
  if (!apiKey) {
    throw new ApiError('OpenAI API key is required');
  }
  
  return new OpenAIService(apiKey);
}

export function createVisionParser(client: OpenAI): VisionParser {
  return new VisionParser(client);
} 