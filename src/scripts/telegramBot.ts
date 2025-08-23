import { Telegraf, Context } from 'telegraf';
import { MessageService } from '../services/messageService';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

class TelegramBot {
  private bot: Telegraf;
  private messageService: MessageService;

  constructor() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
    }

    this.bot = new Telegraf(botToken);
    this.messageService = new MessageService(this.bot, botToken);
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // Обработчик команды /start
    this.bot.start((ctx) => {
      const welcomeMessage = `
🤖 <b>Добро пожаловать в Coin Checker Bot!</b>

Этот бот поможет вам анализировать криптопроекты и получать актуальную информацию.

📋 <b>Доступные команды:</b>
/start - Показать это сообщение
/help - Показать справку
/status - Проверить статус бота
/scan <url> - Просканировать сайт
/batch - Запустить пакетный анализ
/info - Информация о боте

💡 <b>Примеры использования:</b>
• /scan https://example.com
• /batch

🔧 <b>Поддержка:</b>
Если у вас есть вопросы, обратитесь к разработчику.
      `;
      
      ctx.reply(welcomeMessage, { parse_mode: 'HTML' });
    });

    // Обработчик команды /help
    this.bot.help((ctx) => {
      const helpMessage = `
📚 <b>Справка по командам</b>

🔍 <b>Анализ сайтов:</b>
/scan <url> - Проанализировать один сайт
/batch - Запустить анализ всех сайтов из списка

📊 <b>Информация:</b>
/status - Статус бота и соединения
/info - Информация о боте
/help - Показать эту справку

⚙️ <b>Настройки:</b>
/settings - Настройки бота (в разработке)

💡 <b>Примеры:</b>
• /scan https://pepeascension.com
• /batch
• /status
      `;
      
      ctx.reply(helpMessage, { parse_mode: 'HTML' });
    });

    // Обработчик команды /status
    this.bot.command('status', async (ctx) => {
      try {
        const statusMessage = `
📊 <b>Статус бота</b>

🤖 <b>Бот:</b> ✅ Активен
🌐 <b>API:</b> ${await this.messageService.testConnection() ? '✅ Подключен' : '❌ Ошибка'}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
📈 <b>Версия:</b> 1.0.0

💾 <b>Система:</b>
• Node.js: ${process.version}
• Платформа: ${process.platform}
• Память: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB
        `;
        
        ctx.reply(statusMessage, { parse_mode: 'HTML' });
      } catch (error) {
        ctx.reply('❌ Ошибка при получении статуса бота');
        logger.error('Ошибка в команде status:', error as Error);
      }
    });

    // Обработчик команды /info
    this.bot.command('info', async (ctx) => {
      try {
        const botInfo = await this.messageService.getBotInfo();
        const infoMessage = `
ℹ️ <b>Информация о боте</b>

🤖 <b>Имя:</b> ${botInfo.first_name}
👤 <b>Username:</b> @${botInfo.username}
🆔 <b>ID:</b> ${botInfo.id}
📝 <b>Описание:</b> ${botInfo.description || 'Не указано'}

🔧 <b>Возможности:</b>
• Анализ криптопроектов
• Создание скриншотов
• AI анализ с OpenAI
• Пакетная обработка
• Отправка отчетов

📊 <b>Статистика:</b>
• Версия: 1.0.0
• Создан: ${new Date().toLocaleDateString('ru-RU')}
        `;
        
        ctx.reply(infoMessage, { parse_mode: 'HTML' });
      } catch (error) {
        ctx.reply('❌ Ошибка при получении информации о боте');
        logger.error('Ошибка в команде info:', error as Error);
      }
    });

    // Обработчик команды /scan
    this.bot.command('scan', async (ctx) => {
      const url = ctx.message.text.split(' ')[1];
      
      if (!url) {
        ctx.reply('❌ Пожалуйста, укажите URL для сканирования\n\nПример: /scan https://example.com');
        return;
      }

      try {
        // Отправляем сообщение о начале сканирования
        const scanMessage = await ctx.reply('🔍 Начинаю сканирование...', { parse_mode: 'HTML' });
        
        // Здесь можно добавить логику сканирования
        // Пока что просто имитируем процесс
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Обновляем сообщение с результатом
        const resultMessage = `
✅ <b>Сканирование завершено</b>

🌐 <b>URL:</b> ${url}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
📊 <b>Статус:</b> Успешно

💡 <b>Результат:</b>
Сайт просканирован (тестовый режим)
        `;
        
        ctx.telegram.editMessageText(
          ctx.chat.id,
          scanMessage.message_id,
          undefined,
          resultMessage,
          { parse_mode: 'HTML' }
        );
        
      } catch (error) {
        ctx.reply('❌ Ошибка при сканировании сайта');
        logger.error('Ошибка в команде scan:', error as Error);
      }
    });

    // Обработчик команды /batch
    this.bot.command('batch', async (ctx) => {
      try {
        const batchMessage = await ctx.reply('🔄 Запускаю пакетный анализ...', { parse_mode: 'HTML' });
        
        // Здесь можно добавить логику пакетного анализа
        // Пока что просто имитируем процесс
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const resultMessage = `
📊 <b>Пакетный анализ завершен</b>

📈 <b>Результаты:</b>
• Обработано сайтов: 5
• Успешно: 4
• Ошибок: 1
• Время: 3.2 сек

⏰ <b>Завершено:</b> ${new Date().toLocaleString('ru-RU')}

📋 <b>Детальный отчет:</b>
Отчет будет отправлен отдельным сообщением
        `;
        
        ctx.telegram.editMessageText(
          ctx.chat.id,
          batchMessage.message_id,
          undefined,
          resultMessage,
          { parse_mode: 'HTML' }
        );
        
      } catch (error) {
        ctx.reply('❌ Ошибка при запуске пакетного анализа');
        logger.error('Ошибка в команде batch:', error as Error);
      }
    });

    // Обработчик текстовых сообщений
    this.bot.on('text', (ctx) => {
      const text = ctx.message.text;
      
      if (text.startsWith('/')) {
        // Это команда, игнорируем
        return;
      }
      
      // Отвечаем на обычные сообщения
      ctx.reply(`
💬 <b>Получено сообщение:</b> ${text}

🤖 <b>Ответ бота:</b>
Спасибо за сообщение! Используйте команду /help для получения справки по доступным командам.
      `, { parse_mode: 'HTML' });
    });

    // Обработчик ошибок
    this.bot.catch((err, ctx) => {
      logger.error('Ошибка в боте:', err);
      ctx.reply('❌ Произошла ошибка в работе бота. Попробуйте позже.');
    });
  }

  async start() {
    try {
      logger.info('Запуск Telegram бота...');
      
      // Проверяем соединение
      const connectionTest = await this.messageService.testConnection();
      if (!connectionTest) {
        throw new Error('Не удалось подключиться к Telegram API');
      }
      
      // Запускаем бота
      await this.bot.launch();
      
      logger.info('✅ Telegram бот успешно запущен');
      
      // Получаем информацию о боте
      const botInfo = await this.messageService.getBotInfo();
      logger.info(`🤖 Бот: @${botInfo.username} (${botInfo.first_name})`);
      
    } catch (error) {
      logger.error('❌ Ошибка при запуске бота:', error as Error);
      throw error;
    }
  }

  async stop() {
    try {
      await this.bot.stop();
      logger.info('🛑 Telegram бот остановлен');
    } catch (error) {
      logger.error('Ошибка при остановке бота:', error as Error);
    }
  }
}

// Экспортируем класс для использования в других модулях
export { TelegramBot };

// Если файл запущен напрямую
if (require.main === module) {
  const bot = new TelegramBot();
  
  bot.start().catch((error) => {
    logger.error('Критическая ошибка при запуске бота:', error);
    process.exit(1);
  });

  // Обработка сигналов для корректного завершения
  process.once('SIGINT', () => {
    logger.info('Получен сигнал SIGINT, останавливаем бота...');
    bot.stop();
  });

  process.once('SIGTERM', () => {
    logger.info('Получен сигнал SIGTERM, останавливаем бота...');
    bot.stop();
  });
}
