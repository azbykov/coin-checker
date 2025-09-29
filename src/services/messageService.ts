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
  // private _botToken: string;

  constructor(bot: Telegraf, _botToken: string) {
    this.bot = bot;
    // this._botToken = botToken;
  }

  async sendMessage(message: TelegramMessage): Promise<boolean> {
    try {
      logger.info(`Sending message to chat ${message.chatId}`);

      const options: any = {
        parse_mode: message.parseMode || undefined
      };
      
      if (message.disableWebPagePreview !== undefined) {
        options.disable_web_page_preview = message.disableWebPagePreview;
      }
      
      if (message.replyMarkup) {
        options.reply_markup = message.replyMarkup;
      }

      await this.bot.telegram.sendMessage(
        message.chatId,
        message.text,
        options
      );

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
      text: `❌ <b>Ошибка:</b> ${error}`,
      parseMode: 'HTML',
    };

    return this.sendMessage(message);
  }

  async sendSuccess(chatId: string, message: string): Promise<boolean> {
    const telegramMessage: TelegramMessage = {
      chatId,
      text: `✅ <b>Успешно:</b> ${message}`,
      parseMode: 'HTML',
    };

    return this.sendMessage(telegramMessage);
  }

  async sendWarning(chatId: string, message: string): Promise<boolean> {
    const telegramMessage: TelegramMessage = {
      chatId,
      text: `⚠️ <b>Предупреждение:</b> ${message}`,
      parseMode: 'HTML',
    };

    return this.sendMessage(telegramMessage);
  }

  async sendInfo(chatId: string, message: string): Promise<boolean> {
    const telegramMessage: TelegramMessage = {
      chatId,
      text: `ℹ️ <b>Информация:</b> ${message}`,
      parseMode: 'HTML',
    };

    return this.sendMessage(telegramMessage);
  }

  async sendPhoto(chatId: string, photo: Buffer, caption?: string): Promise<boolean> {
    try {
      logger.info(`Sending photo to chat ${chatId}`);

      const photoOptions: any = {
        parse_mode: 'HTML'
      };
      
      if (caption) {
        photoOptions.caption = caption;
      }

      await this.bot.telegram.sendPhoto(
        chatId,
        { source: photo },
        photoOptions
      );

      logger.info(`Photo sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send photo to chat ${chatId}`, error as Error);
      throw new ApiError(`Failed to send photo: ${(error as Error).message}`);
    }
  }

  async sendDocument(chatId: string, document: Buffer, filename?: string, caption?: string): Promise<boolean> {
    try {
      logger.info(`Sending document to chat ${chatId}`);

      const documentOptions: any = {
        parse_mode: 'HTML'
      };
      
      if (caption) {
        documentOptions.caption = caption;
      }

      await this.bot.telegram.sendDocument(
        chatId,
        { source: document, filename: filename || 'document' },
        documentOptions
      );

      logger.info(`Document sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send document to chat ${chatId}`, error as Error);
      throw new ApiError(`Failed to send document: ${(error as Error).message}`);
    }
  }

  async sendMediaGroup(chatId: string, media: Array<{ type: 'photo' | 'document', media: Buffer, caption?: string }>): Promise<boolean> {
    try {
      logger.info(`Sending media group to chat ${chatId}`);

      const mediaGroup = media.map((item) => {
        const mediaItem: any = {
          type: item.type,
          media: { source: item.media },
          parse_mode: 'HTML' as const
        };
        
        if (item.caption) {
          mediaItem.caption = item.caption;
        }
        
        return mediaItem;
      });

      await this.bot.telegram.sendMediaGroup(chatId, mediaGroup);

      logger.info(`Media group sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send media group to chat ${chatId}`, error as Error);
      throw new ApiError(`Failed to send media group: ${(error as Error).message}`);
    }
  }

  async sendKeyboard(chatId: string, text: string, keyboard: any): Promise<boolean> {
    try {
      logger.info(`Sending keyboard message to chat ${chatId}`);

      await this.bot.telegram.sendMessage(
        chatId,
        text,
        {
          parse_mode: 'HTML',
          reply_markup: keyboard
        }
      );

      logger.info(`Keyboard message sent successfully to chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to send keyboard message to chat ${chatId}`, error as Error);
      throw new ApiError(`Failed to send keyboard message: ${(error as Error).message}`);
    }
  }

  async editMessage(chatId: string, messageId: number, newText: string): Promise<boolean> {
    try {
      logger.info(`Editing message ${messageId} in chat ${chatId}`);

      await this.bot.telegram.editMessageText(
        chatId,
        messageId,
        undefined,
        newText,
        {
          parse_mode: 'HTML'
        }
      );

      logger.info(`Message ${messageId} edited successfully in chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to edit message ${messageId} in chat ${chatId}`, error as Error);
      throw new ApiError(`Failed to edit message: ${(error as Error).message}`);
    }
  }

  async deleteMessage(chatId: string, messageId: number): Promise<boolean> {
    try {
      logger.info(`Deleting message ${messageId} in chat ${chatId}`);

      await this.bot.telegram.deleteMessage(chatId, messageId);

      logger.info(`Message ${messageId} deleted successfully in chat ${chatId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete message ${messageId} in chat ${chatId}`, error as Error);
      throw new ApiError(`Failed to delete message: ${(error as Error).message}`);
    }
  }

  // Метод для получения информации о боте
  async getBotInfo(): Promise<any> {
    try {
      const botInfo = await this.bot.telegram.getMe();
      logger.info(`Bot info retrieved: ${botInfo.username}`);
      return botInfo;
    } catch (error) {
      logger.error('Failed to get bot info', error as Error);
      throw new ApiError(`Failed to get bot info: ${(error as Error).message}`);
    }
  }

  // Метод для проверки соединения с Telegram API
  async testConnection(): Promise<boolean> {
    try {
      await this.bot.telegram.getMe();
      logger.info('Telegram API connection test successful');
      return true;
    } catch (error) {
      logger.error('Telegram API connection test failed', error as Error);
      return false;
    }
  }
}

export function createMessageService(bot: Telegraf, botToken: string): MessageService {
  return new MessageService(bot, botToken);
} 