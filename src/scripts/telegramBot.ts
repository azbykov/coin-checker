import { Telegraf } from 'telegraf';
import { MessageService } from '../services/messageService';
import { ScreenshotTelegramService } from '../services/screenshotTelegramService';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

class TelegramBot {
  private bot: Telegraf;
  private messageService: MessageService;
  private screenshotTelegramService: ScreenshotTelegramService;

  constructor() {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
    }

    this.bot = new Telegraf(botToken);
    this.messageService = new MessageService(this.bot, botToken);
    this.screenshotTelegramService = new ScreenshotTelegramService(this.bot, botToken);
    
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
/screenshot <url> [selector] - Создать скриншот
/batch - Запустить пакетный анализ
/info - Информация о боте
/stop - Остановить бота (админ)

💡 <b>Примеры использования:</b>
• /scan https://example.com
• /screenshot https://example.com
• /screenshot https://example.com .price
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
/screenshot <url> [selector] - Создать скриншот сайта или элемента
/multi <url> <selector1> <selector2> ... - Создать скриншоты нескольких элементов
/batch - Запустить анализ всех сайтов из списка

📊 <b>Информация:</b>
/status - Статус бота и соединения
/info - Информация о боте
/help - Показать эту справку

⚙️ <b>Настройки:</b>
/settings - Настройки бота (в разработке)

💡 <b>Примеры:</b>
• /scan https://pepeascension.com
• /screenshot https://example.com
• /screenshot https://example.com .price
• /multi https://example.com .header .content .footer
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

    // Обработчик команды /stop (только для администраторов)
    this.bot.command('stop', async (ctx) => {
      // Проверяем, является ли пользователь администратором
      const adminChatId = process.env.TELEGRAM_CHAT_ID;
      if (ctx.chat.id.toString() !== adminChatId) {
        ctx.reply('❌ У вас нет прав для выполнения этой команды');
        return;
      }

      try {
        await ctx.reply('🛑 Останавливаю бота...', { parse_mode: 'HTML' });
        logger.info(`Бот остановлен администратором: ${ctx.chat.id}`);
        
        // Останавливаем бота
        await this.stop();
        
        // Завершаем процесс
        process.exit(0);
      } catch (error) {
        logger.error('Ошибка при остановке бота:', error as Error);
        ctx.reply('❌ Ошибка при остановке бота');
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
        
        // Создаем скриншот и отправляем в Telegram
        const result = await this.screenshotTelegramService.processScreenshot(
          url,
          {
            saveToDisk: true,
            savePath: './screenshots',
            sendToTelegram: true,
            chatId: ctx.chat.id.toString(),
            caption: `Скриншот сайта ${url}`,
            format: 'png'
          }
        );
        
        if (result.success) {
          // Обновляем сообщение с результатом
          const resultMessage = `
✅ <b>Сканирование завершено</b>

🌐 <b>URL:</b> ${url}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
📊 <b>Статус:</b> Успешно
⏱ <b>Время обработки:</b> ${result.processingTime}ms

💡 <b>Результат:</b>
• Скриншот создан и отправлен
• Файл сохранен на сервере
${result.savedPath ? `• Путь: ${result.savedPath}` : ''}
          `;
          
          ctx.telegram.editMessageText(
            ctx.chat.id,
            scanMessage.message_id,
            undefined,
            resultMessage,
            { parse_mode: 'HTML' }
          );
        } else {
          // Обновляем сообщение с ошибкой
          const errorMessage = `
❌ <b>Ошибка сканирования</b>

🌐 <b>URL:</b> ${url}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
📊 <b>Статус:</b> Ошибка

💡 <b>Ошибка:</b> ${result.error}
          `;
          
          ctx.telegram.editMessageText(
            ctx.chat.id,
            scanMessage.message_id,
            undefined,
            errorMessage,
            { parse_mode: 'HTML' }
          );
        }
        
      } catch (error) {
        ctx.reply('❌ Ошибка при сканировании сайта');
        logger.error('Ошибка в команде scan:', error as Error);
      }
    });

    // Обработчик команды /multi для множественных селекторов
    this.bot.command('multi', async (ctx) => {
      const args = ctx.message.text.split(' ');
      const url = args[1];
      const selectors = args.slice(2);
      
      if (!url) {
        ctx.reply('❌ Пожалуйста, укажите URL для скриншота\n\nПримеры:\n/multi https://example.com .selector1 .selector2\n/multi https://example.com #header .content');
        return;
      }

      if (selectors.length === 0) {
        ctx.reply('❌ Пожалуйста, укажите хотя бы один селектор\n\nПримеры:\n/multi https://example.com .selector1 .selector2\n/multi https://example.com #header .content');
        return;
      }

      try {
        const scanMessage = await ctx.reply(`📸 Создаю скриншоты для ${selectors.length} элементов...`, { parse_mode: 'HTML' });
        
        const result = await this.screenshotTelegramService.processMultipleScreenshots(
          url,
          {
            saveToDisk: true,
            savePath: './screenshots',
            sendToTelegram: true,
            chatId: ctx.chat.id.toString(),
            caption: `Множественные скриншоты с сайта ${url}`,
            selectors: selectors,
            format: 'png'
          }
        );
        
        if (result.success) {
          const successCount = result.screenshots.filter(s => !s.error).length;
          const errorCount = result.screenshots.filter(s => s.error).length;
          
          const resultMessage = `
✅ <b>Множественные скриншоты созданы</b>

🌐 <b>URL:</b> ${url}
📊 <b>Статистика:</b>
• Всего селекторов: ${selectors.length}
• Успешно: ${successCount}
• Ошибок: ${errorCount}
⏱ <b>Время обработки:</b> ${result.processingTime}ms

${errorCount > 0 ? `❌ <b>Ошибки:</b>\n${result.screenshots.filter(s => s.error).map(s => `• ${s.selector}: ${s.error}`).join('\n')}\n` : ''}
✅ <b>Успешно обработанные селекторы:</b>
${result.screenshots.filter(s => !s.error).map(s => `• ${s.selector}`).join('\n')}
          `;
          
          ctx.telegram.editMessageText(
            ctx.chat.id,
            scanMessage.message_id,
            undefined,
            resultMessage,
            { parse_mode: 'HTML' }
          );
        } else {
          const errorMessage = `
❌ <b>Ошибка создания множественных скриншотов</b>

🌐 <b>URL:</b> ${url}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
📊 <b>Статус:</b> Ошибка

💡 <b>Детали:</b>
${result.screenshots.map(s => `• ${s.selector}: ${s.error || 'Успешно'}`).join('\n')}
          `;
          
          ctx.telegram.editMessageText(
            ctx.chat.id,
            scanMessage.message_id,
            undefined,
            errorMessage,
            { parse_mode: 'HTML' }
          );
        }
        
      } catch (error) {
        ctx.reply('❌ Ошибка при создании множественных скриншотов');
        logger.error('Ошибка в команде multi:', error as Error);
      }
    });

    // Обработчик команды /batch
    this.bot.command('batch', async (ctx) => {
      try {
        const batchMessage = await ctx.reply('🔄 Запускаю пакетный анализ...', { parse_mode: 'HTML' });
        
        // Список сайтов для анализа (можно загружать из файла)
        const sites = [
          'https://pepeascension.com',
          'https://google.com',
          'https://github.com'
        ];
        
        // Обновляем сообщение о прогрессе
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          batchMessage.message_id,
          undefined,
          `🔄 <b>Пакетный анализ запущен</b>\n\n📋 <b>Сайтов для обработки:</b> ${sites.length}\n⏰ <b>Начато:</b> ${new Date().toLocaleString('ru-RU')}`,
          { parse_mode: 'HTML' }
        );
        
        // Выполняем пакетную обработку
        const results = await this.screenshotTelegramService.processScreenshots(
          sites,
          {
            saveToDisk: true,
            savePath: './screenshots',
            sendToTelegram: false, // Не отправляем каждый скриншот отдельно
            format: 'png'
          }
        );
        
        // Отправляем общий отчет
        await this.screenshotTelegramService.sendBatchReport(results, ctx.chat.id.toString());
        
        // Обновляем сообщение с результатами
        const successful = results.filter(r => r.success).length;
        const failed = results.length - successful;
        const totalTime = results.reduce((sum, r) => sum + r.processingTime, 0);
        
        const resultMessage = `
📊 <b>Пакетный анализ завершен</b>

📈 <b>Результаты:</b>
• Обработано сайтов: ${results.length}
• Успешно: ${successful}
• Ошибок: ${failed}
• Общее время: ${totalTime}ms
• Среднее время: ${Math.round(totalTime / results.length)}ms

⏰ <b>Завершено:</b> ${new Date().toLocaleString('ru-RU')}

📋 <b>Детальный отчет:</b>
Отправлен отдельным сообщением
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

    // Обработчик команды /screenshot
    this.bot.command('screenshot', async (ctx) => {
      const args = ctx.message.text.split(' ');
      const url = args[1];
      const selector = args[2];
      
      if (!url) {
        ctx.reply('❌ Пожалуйста, укажите URL для скриншота\n\nПримеры:\n/screenshot https://example.com\n/screenshot https://example.com .selector');
        return;
      }

      try {
        const scanMessage = await ctx.reply('📸 Создаю скриншот...', { parse_mode: 'HTML' });
        
        const result = await this.screenshotTelegramService.processScreenshot(
          url,
          {
            saveToDisk: true,
            savePath: './screenshots',
            sendToTelegram: true,
            chatId: ctx.chat.id.toString(),
            caption: selector ? `Скриншот элемента "${selector}" с сайта ${url}` : `Скриншот сайта ${url}`,
            selector: selector,
            format: 'png'
          }
        );
        
        if (result.success) {
          const resultMessage = `
✅ <b>Скриншот создан</b>

🌐 <b>URL:</b> ${url}
${selector ? `🎯 <b>Селектор:</b> ${selector}\n` : ''}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
⏱ <b>Время обработки:</b> ${result.processingTime}ms

💡 <b>Результат:</b>
• Скриншот отправлен в чат
• Файл сохранен на сервере
          `;
          
          ctx.telegram.editMessageText(
            ctx.chat.id,
            scanMessage.message_id,
            undefined,
            resultMessage,
            { parse_mode: 'HTML' }
          );
        } else {
          const errorMessage = `
❌ <b>Ошибка создания скриншота</b>

🌐 <b>URL:</b> ${url}
⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}

💡 <b>Ошибка:</b> ${result.error}
          `;
          
          ctx.telegram.editMessageText(
            ctx.chat.id,
            scanMessage.message_id,
            undefined,
            errorMessage,
            { parse_mode: 'HTML' }
          );
        }
        
      } catch (error) {
        ctx.reply('❌ Ошибка при создании скриншота');
        logger.error('Ошибка в команде screenshot:', error as Error);
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
      logger.info('🛑 Останавливаем Telegram бота...');
      await this.bot.stop();
      logger.info('✅ Telegram бот успешно остановлен');
    } catch (error) {
      logger.error('❌ Ошибка при остановке бота:', error as Error);
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
  process.once('SIGINT', async () => {
    logger.info('Получен сигнал SIGINT, останавливаем бота...');
    await bot.stop();
    process.exit(0);
  });

  process.once('SIGTERM', async () => {
    logger.info('Получен сигнал SIGTERM, останавливаем бота...');
    await bot.stop();
    process.exit(0);
  });

  // Обработка необработанных ошибок
  process.on('uncaughtException', (error) => {
    logger.error('Необработанная ошибка:', error);
    bot.stop().finally(() => {
      process.exit(1);
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Необработанное отклонение промиса:', reason);
    bot.stop().finally(() => {
      process.exit(1);
    });
  });
}
