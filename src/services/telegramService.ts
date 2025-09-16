// TODO: Задача 13 - Инициализация Telegraf
// Назначение: Создание и настройка Telegram бота
// Вход: Bot token
// Выход: Экземпляр Telegraf
// Ошибки: Неверный token, ошибки сети

import { Telegraf } from 'telegraf';
import { logger } from '../utils/logger';
import { ApiError } from '../utils/errorHandler';
import { MessageService } from './messageService';

export class TelegramService {
  private bot: Telegraf;
  private botToken: string;

  constructor(botToken: string) {
    if (!botToken) {
      throw new ApiError('Telegram bot token is required');
    }

    this.botToken = botToken;
    this.bot = new Telegraf(botToken);
    this.setupBot();
  }

  private setupBot(): void {
    // Обработчик команды /start
    this.bot.start((ctx) => {
      ctx.reply('Привет! Я бот для анализа крипто-проектов. Отправляю отчёты о ценах и собранных средствах.');
    });

    // Обработчик команды /help
    this.bot.help((ctx) => {
      ctx.reply('Доступные команды:\n/start - Начать работу\n/help - Показать справку');
    });

    // Обработчик ошибок
    this.bot.catch((err, ctx) => {
      logger.error('Telegram bot error', err as Error);
      ctx.reply('Произошла ошибка при обработке команды.');
    });
  }

  async start(): Promise<void> {
    try {
      // Проверяем токен через API вместо запуска polling
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      const data = await response.json() as any;
      
      if (!data.ok) {
        throw new Error(`Invalid bot token: ${data.description}`);
      }
      
      logger.info('Telegram bot token validated successfully');
    } catch (error) {
      logger.error('Failed to validate Telegram bot token', error as Error);
      throw new ApiError('Failed to start Telegram bot');
    }
  }

  async stop(): Promise<void> {
    try {
      // Проверяем, запущен ли бот перед остановкой
      if (this.bot && typeof this.bot.stop === 'function') {
        await this.bot.stop();
        logger.info('Telegram bot stopped');
      } else {
        logger.info('Telegram bot was not running');
      }
    } catch (error) {
      logger.warn('Failed to stop Telegram bot (may not be running)');
    }
  }

  getBot(): Telegraf {
    return this.bot;
  }
}

export function createTelegramService(botToken: string): TelegramService {
  return new TelegramService(botToken);
}

export function createMessageService(bot: Telegraf, botToken: string): MessageService {
  return new MessageService(bot, botToken);
} 