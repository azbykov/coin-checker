# ScreenshotTelegramService

Интегрированный сервис для создания скриншотов и отправки их в Telegram с использованием Telegraf.

## 🚀 Возможности

### ✅ Основные функции

- **Создание скриншотов** - полная страница или отдельные элементы
- **Отправка в Telegram** - прямое отправление буферов через Telegraf
- **Сохранение на диск** - автоматическое сохранение файлов
- **Пакетная обработка** - обработка множества URL одновременно
- **Гибкие опции** - настройка качества, формата, селекторов
- **Детальная отчетность** - статистика и результаты обработки

### 📊 Поддерживаемые форматы

- **PNG** - для скриншотов с прозрачностью
- **JPEG** - для сжатых изображений
- **Настраиваемое качество** - от 1 до 100

## 🔧 Использование

### Базовое использование

```typescript
import { Telegraf } from 'telegraf';
import { ScreenshotTelegramService } from './services/screenshotTelegramService';

const bot = new Telegraf(botToken);
const service = new ScreenshotTelegramService(bot, botToken);

// Простой скриншот
const result = await service.processScreenshot('https://example.com', {
  saveToDisk: true,
  sendToTelegram: true,
  chatId: '123456789'
});
```

### Продвинутые опции

```typescript
// Скриншот с селектором и кастомными настройками
const result = await service.processScreenshot('https://example.com', {
  saveToDisk: true,
  savePath: './custom-screenshots',
  sendToTelegram: true,
  chatId: '123456789',
  selector: '.price-container',
  format: 'jpeg',
  quality: 90,
  caption: 'Скриншот цен',
  filename: 'custom_screenshot'
});
```

### Пакетная обработка

```typescript
const urls = [
  'https://site1.com',
  'https://site2.com',
  'https://site3.com'
];

const results = await service.processScreenshots(urls, {
  saveToDisk: true,
  sendToTelegram: false // Не отправляем каждый отдельно
});

// Отправляем общий отчет
await service.sendBatchReport(results, chatId);
```

### Скриншот с анализом

```typescript
const analysisData = {
  currentPrice: '$0.000123',
  nextPrice: '$0.000145',
  listingPrice: '$0.000100',
  raised: '$1,234,567'
};

const result = await service.sendScreenshotWithReport(
  'https://crypto-site.com',
  chatId,
  analysisData,
  { format: 'png' }
);
```

## 📋 API Reference

### ScreenshotTelegramOptions

```typescript
interface ScreenshotTelegramOptions {
  saveToDisk?: boolean;        // Сохранять на диск (по умолчанию: true)
  savePath?: string;           // Путь для сохранения (по умолчанию: './screenshots')
  sendToTelegram?: boolean;    // Отправлять в Telegram (по умолчанию: true)
  chatId?: string;             // ID чата для отправки
  caption?: string;            // Подпись к изображению
  filename?: string;           // Кастомное имя файла
  timeout?: number;            // Таймаут в мс (по умолчанию: 30000)
  selector?: string;           // CSS селектор для элемента
  quality?: number;            // Качество JPEG (1-100, по умолчанию: 90)
  format?: 'png' | 'jpeg';     // Формат изображения (по умолчанию: 'png')
}
```

### ScreenshotTelegramResult

```typescript
interface ScreenshotTelegramResult {
  url: string;                 // Обработанный URL
  success: boolean;            // Успешность операции
  screenshot?: Buffer;         // Буфер с изображением
  savedPath?: string;          // Путь к сохраненному файлу
  telegramMessageId?: number;  // ID сообщения в Telegram
  error?: string;              // Описание ошибки
  processingTime: number;      // Время обработки в мс
}
```

## 🤖 Telegram Bot Команды

### /scan <url>
Создает скриншот сайта и отправляет его в чат.

```
/scan https://example.com
```

### /screenshot <url> [selector]
Создает скриншот сайта или конкретного элемента.

```
/screenshot https://example.com
/screenshot https://example.com .price
/screenshot https://example.com #header
```

### /batch
Запускает пакетный анализ предустановленных сайтов.

```
/batch
```

## 🧪 Тестирование

### Запуск тестов

```bash
# Тест ScreenshotTelegramService
npm run test-screenshot-telegram

# Тест Telegraf API
npm run test-telegraf

# Запуск бота
npm run bot
```

### Тестовые сценарии

1. **Одиночный скриншот** - создание и отправка одного скриншота
2. **Скриншот с отчетом** - скриншот + анализ данных
3. **Пакетная обработка** - обработка множества сайтов
4. **Скриншот с селектором** - скриншот конкретного элемента
5. **Кастомные настройки** - различные форматы и качества

## 📁 Структура файлов

```
screenshots/
├── pepeascension_com_2025-01-22T10-30-45-123Z.png
├── google_com_2025-01-22T10-31-12-456Z.png
└── github_com_2025-01-22T10-31-45-789Z.png
```

### Именование файлов

Файлы автоматически именуются по шаблону:
```
{domain}_{timestamp}.{format}
```

Примеры:
- `pepeascension_com_2025-01-22T10-30-45-123Z.png`
- `google_com_2025-01-22T10-31-12-456Z.jpeg`

## 🔒 Безопасность

### Рекомендации

1. **Валидация URL** - все URL проходят через `sanitizeUrl()`
2. **Таймауты** - настраиваемые таймауты для предотвращения зависания
3. **Обработка ошибок** - детальная обработка всех возможных ошибок
4. **Логирование** - полное логирование всех операций

### Ограничения

- Максимальный размер скриншота: 10MB (ограничение Telegram)
- Поддерживаемые форматы: PNG, JPEG
- Таймаут по умолчанию: 30 секунд

## 📊 Производительность

### Оптимизации

- **Буферизация** - прямая работа с буферами без промежуточных файлов
- **Пакетная обработка** - эффективная обработка множества URL
- **Асинхронность** - неблокирующие операции
- **Управление памятью** - автоматическое освобождение ресурсов

### Метрики

- Среднее время обработки: 2-5 секунд
- Использование памяти: ~50MB на скриншот
- Поддерживаемые разрешения: до 4K

## 🐛 Отладка

### Логирование

```typescript
import { logger } from './utils/logger';

logger.info('Создание скриншота...');
logger.warn('Предупреждение о медленной загрузке');
logger.error('Ошибка при создании скриншота', error);
```

### Обработка ошибок

```typescript
try {
  const result = await service.processScreenshot(url, options);
  if (!result.success) {
    console.error('Ошибка:', result.error);
  }
} catch (error) {
  console.error('Критическая ошибка:', error);
}
```

## 📚 Примеры

### Полный пример использования

```typescript
import { Telegraf } from 'telegraf';
import { ScreenshotTelegramService } from './services/screenshotTelegramService';

async function main() {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
  const service = new ScreenshotTelegramService(bot, process.env.TELEGRAM_BOT_TOKEN!);

  // Одиночный скриншот
  const result = await service.processScreenshot('https://example.com', {
    saveToDisk: true,
    sendToTelegram: true,
    chatId: process.env.TELEGRAM_CHAT_ID!,
    caption: 'Тестовый скриншот',
    format: 'png'
  });

  if (result.success) {
    console.log(`✅ Скриншот создан за ${result.processingTime}ms`);
    console.log(`💾 Сохранен в: ${result.savedPath}`);
  } else {
    console.error(`❌ Ошибка: ${result.error}`);
  }
}

main().catch(console.error);
```

## 🤝 Поддержка

При возникновении проблем:

1. Проверьте логи в консоли
2. Убедитесь в корректности URL
3. Проверьте настройки Telegram бота
4. Убедитесь в наличии свободного места на диске
5. Проверьте подключение к интернету
