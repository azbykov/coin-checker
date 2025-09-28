// TODO: Задача 11 - Парсинг изображений
// Назначение: Отправка скриншотов в GPT-4 Vision и получение структурированных данных
// Вход: Buffer с изображением
// Выход: VisionApiResponse с данными о крипто-проекте
// Ошибки: Ошибки API, неверный формат ответа, таймауты

import OpenAI from 'openai';
import { VisionApiResponse, CustomDataResult } from '../types';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errorHandler';

const VISION_PROMPT = `Ты - помощник для анализа веб-страниц криптовалютных проектов. 

Твоя задача - найти на изображении следующие данные и вернуть их в формате JSON:

1. currentPrice - текущая цена токена
2. nextPrice - следующая цена токена (если есть)
3. listingPrice - цена токена при листинге (если есть)  
4. raised - сколько средств собрано

Верни JSON объект с этими полями. Если какое-то значение не найдено, используй "N/A".

Пример структуры ответа:
{
  "currentPrice": "$0.015",
  "nextPrice": "$0.020",
  "listingPrice": "$0.010", 
  "raised": "$2,000,000"
}`;

export class VisionParser {
  private client: OpenAI;

  constructor(client: OpenAI) {
    this.client = client;
  }

  async parseImage(imageBuffer: Buffer): Promise<VisionApiResponse> {
    return this.parseScreenshot(imageBuffer);
  }

  async parseScreenshot(imageBuffer: Buffer, customData?: CustomDataResult[]): Promise<VisionApiResponse> {
    try {
      logger.info('Sending image to GPT-4 Vision API');

      // Формируем промпт с customData
      const prompt = this.buildPromptWithCustomData(customData);

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: prompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${imageBuffer.toString('base64')}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0.1,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      
      if (!content) {
        throw new ApiError('Empty response from Vision API');
      }

      logger.info(`Raw response from Vision API: ${content}`);

      // Парсинг JSON ответа
      const parsedResponse = this.parseJsonResponse(content);
      
      logger.info('Successfully parsed image with Vision API');
      
      return parsedResponse;
      
    } catch (error) {
      logger.error('Failed to parse image with Vision API', error as Error);
      throw new ApiError(`Vision API error: ${(error as Error).message}`);
    }
  }

  private buildPromptWithCustomData(customData?: CustomDataResult[]): string {
    let prompt = VISION_PROMPT;
    
    if (customData && customData.length > 0) {
      const successfulData = customData.filter(item => item.success && item.data.trim());
      
      if (successfulData.length > 0) {
        prompt += '\n\nДополнительная информация для анализа:\n';
        
        for (const item of successfulData) {
          prompt += `\n${item.label}:\n${item.data}\n`;
        }
        
        prompt += '\nИспользуй эту дополнительную информацию для более точного анализа данных на изображении.';
      }
    }
    
    return prompt;
  }

  private parseJsonResponse(content: string): VisionApiResponse {
    try {
      // Парсим JSON напрямую, так как используем response_format: json_object
      const parsed = JSON.parse(content);
      
      // Валидация структуры ответа
      if (!parsed.currentPrice || !parsed.raised) {
        throw new Error('Invalid response structure - currentPrice and raised are required');
      }

      return {
        currentPrice: parsed.currentPrice,
        nextPrice: parsed.nextPrice || 'N/A',
        listingPrice: parsed.listingPrice || 'N/A',
        raised: parsed.raised,
      };
    } catch (error) {
      logger.error('Failed to parse JSON response', error as Error);
      throw new ApiError('Invalid JSON response from Vision API');
    }
  }
}

export function createVisionParser(client: OpenAI): VisionParser {
  return new VisionParser(client);
}

// Экспорт экземпляра для использования в других модулях
export const visionParser = createVisionParser(new OpenAI({
  apiKey: process.env['OPENAI_API_KEY']!,
})); 