import { Telegraf } from 'telegraf';
import { MessageService } from '../services/messageService';
import { logger } from '../utils/logger';
import dotenv from 'dotenv';

dotenv.config();

async function testTelegraf() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken) {
    logger.error('TELEGRAM_BOT_TOKEN не найден в переменных окружения');
    return;
  }

  if (!chatId) {
    logger.error('TELEGRAM_CHAT_ID не найден в переменных окружения');
    return;
  }

  try {
    // Создаем экземпляр бота
    const bot = new Telegraf(botToken);
    
    // Создаем сервис сообщений
    const messageService = new MessageService(bot, botToken);

    logger.info('Начинаем тестирование Telegraf API...');

    // Тест 1: Проверка соединения
    logger.info('Тест 1: Проверка соединения с Telegram API');
    const connectionTest = await messageService.testConnection();
    if (connectionTest) {
      logger.info('✅ Соединение с Telegram API успешно');
    } else {
      logger.error('❌ Ошибка соединения с Telegram API');
      return;
    }

    // Тест 2: Получение информации о боте
    logger.info('Тест 2: Получение информации о боте');
    const botInfo = await messageService.getBotInfo();
    logger.info(`✅ Информация о боте: ${JSON.stringify(botInfo, null, 2)}`);

    // Тест 3: Отправка простого сообщения
    logger.info('Тест 3: Отправка простого сообщения');
    await messageService.sendMessage({
      chatId,
      text: '🧪 Тестовое сообщение от Coin Checker бота',
      parseMode: 'HTML'
    });
    logger.info('✅ Простое сообщение отправлено');

    // Тест 4: Отправка информационного сообщения
    logger.info('Тест 4: Отправка информационного сообщения');
    await messageService.sendInfo(chatId, 'Это тестовое информационное сообщение');
    logger.info('✅ Информационное сообщение отправлено');

    // Тест 5: Отправка сообщения об успехе
    logger.info('Тест 5: Отправка сообщения об успехе');
    await messageService.sendSuccess(chatId, 'Тест Telegraf API прошел успешно!');
    logger.info('✅ Сообщение об успехе отправлено');

    // Тест 6: Отправка предупреждения
    logger.info('Тест 6: Отправка предупреждения');
    await messageService.sendWarning(chatId, 'Это тестовое предупреждение');
    logger.info('✅ Предупреждение отправлено');

    // Тест 7: Отправка отчета
    logger.info('Тест 7: Отправка отчета');
    const report = `
📊 <b>Тестовый отчет</b>

🔍 <b>Статистика:</b>
• Обработано сайтов: 5
• Успешно: 4
• Ошибок: 1
• Время обработки: 2.5 сек

📈 <b>Результаты:</b>
• Сайт 1: ✅ Успешно
• Сайт 2: ✅ Успешно  
• Сайт 3: ❌ Ошибка
• Сайт 4: ✅ Успешно
• Сайт 5: ✅ Успешно

⏰ <b>Время:</b> ${new Date().toLocaleString('ru-RU')}
    `;
    
    await messageService.sendReport(chatId, report);
    logger.info('✅ Отчет отправлен');

    logger.info('🎉 Все тесты Telegraf API прошли успешно!');

  } catch (error) {
    logger.error('❌ Ошибка при тестировании Telegraf API:', error as Error);
  }
}

// Запускаем тест
testTelegraf().catch((error) => {
  logger.error('Критическая ошибка:', error);
  process.exit(1);
});
