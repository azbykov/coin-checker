# Telegram Bot с Telegraf

Этот проект использует библиотеку [Telegraf](https://telegraf.js.org/) для создания Telegram бота с расширенными возможностями.

## 🚀 Быстрый старт

### 1. Создание бота в Telegram

1. Найдите [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду `/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните полученный токен

### 2. Настройка переменных окружения

Создайте файл `.env` в корне проекта:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# OpenAI
OPENAI_API_KEY=your_openai_api_key_here

# Другие настройки
LOG_LEVEL=info
```

### 3. Получение Chat ID

Для получения вашего Chat ID:

1. Запустите бота: `npm run bot`
2. Отправьте боту любое сообщение
3. Откройте в браузере: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Найдите `chat.id` в ответе

## 📋 Доступные команды

### Основные команды

- `/start` - Приветственное сообщение
- `/help` - Справка по командам
- `/status` - Статус бота и системы
- `/info` - Информация о боте

### Команды анализа

- `/scan <url>` - Просканировать один сайт
- `/batch` - Запустить пакетный анализ

## 🛠 Установка и запуск

### Установка зависимостей

```bash
npm install
```

### Тестирование Telegraf API

```bash
npm run test-telegraf
```

### Запуск бота

```bash
npm run bot
```

### Другие команды

```bash
# Тестирование Telegram API
npm run test-telegram

# Сборка проекта
npm run build

# Запуск в режиме разработки
npm run dev
```

## 🔧 Архитектура

### MessageService

Основной сервис для работы с Telegram API:

```typescript
import { MessageService } from './services/messageService';

const messageService = new MessageService(bot, botToken);

// Отправка сообщений
await messageService.sendMessage({
  chatId: '123456789',
  text: 'Привет!',
  parseMode: 'HTML'
});

// Отправка разных типов сообщений
await messageService.sendSuccess(chatId, 'Операция выполнена успешно!');
await messageService.sendError(chatId, 'Произошла ошибка');
await messageService.sendWarning(chatId, 'Внимание!');
await messageService.sendInfo(chatId, 'Информационное сообщение');

// Отправка медиа
await messageService.sendPhoto(chatId, photoBuffer, 'Описание фото');
await messageService.sendDocument(chatId, documentBuffer, 'report.pdf', 'Отчет');

// Управление сообщениями
await messageService.editMessage(chatId, messageId, 'Новый текст');
await messageService.deleteMessage(chatId, messageId);
```

### TelegramBot

Класс для создания полноценного бота с обработчиками команд:

```typescript
import { TelegramBot } from './scripts/telegramBot';

const bot = new TelegramBot();
await bot.start();
```

## 📊 Возможности

### ✅ Реализовано

- [x] Отправка текстовых сообщений
- [x] Отправка фото и документов
- [x] Отправка медиа групп
- [x] Редактирование и удаление сообщений
- [x] Поддержка HTML и Markdown разметки
- [x] Обработка команд бота
- [x] Обработка ошибок
- [x] Логирование всех операций
- [x] Проверка соединения с API
- [x] Получение информации о боте

### 🚧 В разработке

- [ ] Инлайн клавиатуры
- [ ] Callback кнопки
- [ ] Webhook режим
- [ ] Middleware для авторизации
- [ ] Кэширование сообщений
- [ ] Статистика использования

## 🔒 Безопасность

### Рекомендации

1. **Никогда не публикуйте токен бота** в открытом доступе
2. Используйте переменные окружения для конфиденциальных данных
3. Ограничьте доступ к боту только авторизованным пользователям
4. Регулярно обновляйте зависимости

### Переменные окружения

```env
# Обязательные
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Опциональные
LOG_LEVEL=info
NODE_ENV=production
```

## 🐛 Отладка

### Логирование

Бот использует структурированное логирование:

```typescript
import { logger } from './utils/logger';

logger.info('Информационное сообщение');
logger.warn('Предупреждение');
logger.error('Ошибка', error);
logger.debug('Отладочная информация');
```

### Тестирование

```bash
# Тест API соединения
npm run test-telegraf

# Тест отправки сообщений
npm run test-telegram
```

## 📚 Документация

- [Telegraf Documentation](https://telegraf.js.org/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Node.js Documentation](https://nodejs.org/docs/)

## 🤝 Поддержка

Если у вас возникли вопросы или проблемы:

1. Проверьте логи в консоли
2. Убедитесь, что все переменные окружения настроены
3. Проверьте подключение к интернету
4. Убедитесь, что токен бота действителен

## 📝 Лицензия

MIT License - см. файл LICENSE для подробностей.
