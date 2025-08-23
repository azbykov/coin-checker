# BatchSiteAnalyzer - Анализ сайтов с сохранением скриншотов

## Описание

`BatchSiteAnalyzer` - это класс для анализа массива сайтов с автоматическим сохранением скриншотов и отправкой результатов в Telegram.

## Основные возможности

- ✅ Анализ списка сайтов из конфигурационного файла
- ✅ Автоматическое создание скриншотов
- ✅ Сохранение скриншотов в указанную папку
- ✅ Анализ скриншотов через OpenAI Vision API
- ✅ Отправка результатов в Telegram
- ✅ Настраиваемая папка для скриншотов

## Конфигурация

### Переменные окружения

Добавьте в `.env` файл:

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id

# Настройки приложения
SCREENSHOTS_DIR=screenshots  # Папка для скриншотов (по умолчанию: screenshots)
LOG_LEVEL=info
MAX_CONCURRENT_REQUESTS=3

# Настройки браузера
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
```

### Конфигурация сайтов

Создайте файл `src/config/sites.json`:

```json
[
  {
    "url": "https://example.com",
    "selector": ".price-section",
    "skip": false
  },
  {
    "url": "https://test.com",
    "skip": true
  }
]
```

## Использование

### 1. Базовое использование

```typescript
import { batchSiteAnalyzer } from './src/scripts/batchSiteAnalyzer';

// Запуск анализа с настройками по умолчанию
await batchSiteAnalyzer.run();
```

### 2. С кастомной папкой для скриншотов

```typescript
import { BatchSiteAnalyzer } from './src/scripts/batchSiteAnalyzer';

// Создание анализатора с кастомной папкой
const analyzer = new BatchSiteAnalyzer('output/screenshots');
await analyzer.run();
```

### 3. Через npm скрипты

```bash
# Запуск с настройками по умолчанию
npm run batch-sites

# Тестирование
npm run test-batch

# Запуск vision scanner
npm run vision https://example.com
```

## Структура сохраненных файлов

Скриншоты сохраняются в следующем формате:

```
screenshots/
├── example_com_2024-01-15T10-30-45-123Z.png
├── test_com_2024-01-15T10-31-12-456Z.png
└── ...
```

Имя файла формируется как: `{hostname}_{timestamp}.png`

## Логирование

Анализатор ведет подробные логи:

- Создание папки для скриншотов
- Сохранение каждого скриншота
- Результаты анализа
- Ошибки при обработке

## Обработка ошибок

- Если не удается сделать скриншот, анализ продолжается без него
- Если не удается отправить в Telegram, результаты выводятся в консоль
- Все ошибки логируются с подробностями

## Примеры вывода

### Успешный анализ

```
==================================================
🔍 Анализ проекта

🌐 Сайт: https://example.com
💰 Текущая цена: $0.50
📈 Следующая цена: $0.75
🏷️ Цена листинга: $1.00
💵 Собрано средств: $500,000

⏰ Время анализа: 15.01.2024, 13:30:45
==================================================
```

### Ошибка

```
❌ Не удалось проанализировать сайт: https://example.com
```

## Интеграция с другими модулями

`BatchSiteAnalyzer` использует:

- `screenshotService` - для создания скриншотов
- `visionParser` - для анализа через OpenAI Vision API
- `telegramService` - для отправки в Telegram
- `logger` - для логирования

## Требования

- Node.js >= 20.0.0
- OpenAI API ключ
- Telegram Bot токен
- Puppeteer (для скриншотов)
