// TODO: Задача 14 - Отправка сообщений
// Назначение: Отправка структурированных сообщений в Telegram
// Вход: Сообщение и chat ID
// Выход: Результат отправки
// Ошибки: Ошибки сети, неверный chat ID

import { Telegraf } from 'telegraf';
import { TelegramMessage } from '../types';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errorHandler';

export class MessageService {
  private bot: Telegraf;
  private botToken: string;

  constructor(bot: Telegraf, botToken: string) {
    this.bot = bot;
    this.botToken = botToken;
  }

  async sendMessage(message: TelegramMessage): Promise<boolean> {
    try {
      logger.info(`Sending message to chat ${message.chatId}`);

      // Используем прямые API вызовы вместо Telegraf
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: message.chatId,
          text: message.text,
          parse_mode: message.parseMode || undefined
        })
      });

      const data = await response.json() as any;
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      logger.info(`Message sent successfully to chat ${message.chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send message to chat ${message.chatId}`, error as Error);
      throw new ApiError(`Failed to send message: ${(error as Error).message}`);
    }
  }

  async sendReport(chatId: string, report: string): Promise<boolean> {
    const message: TelegramMessage = {
      chatId,
      text: report,
      parseMode: 'HTML',
    };

    return this.sendMessage(message);
  }

  async sendError(chatId: string, error: string): Promise<boolean> {
    const message: TelegramMessage = {
      chatId,
      text: `❌ Ошибка: ${error}`,
      parseMode: 'HTML',
    };

    return this.sendMessage(message);
  }

  async sendPhoto(chatId: string, photo: Buffer, caption?: string): Promise<boolean> {
    try {
      logger.info(`Sending photo to chat ${chatId}`);

      // Отправляем фото как base64
      const photoBase64 = photo.toString('base64');
      const photoUrl = `data:image/png;base64,${photoBase64}`;

      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendPhoto`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoUrl,
          caption: caption
        })
      });

      const data = await response.json() as any;
      
      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      logger.info(`Photo sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send photo to chat ${chatId}`, error as Error);
      throw new ApiError(`Failed to send photo: ${(error as Error).message}`);
    }
  }
}

export function createMessageService(bot: Telegraf, botToken: string): MessageService {
  return new MessageService(bot, botToken);
} 