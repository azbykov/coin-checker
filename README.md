# 🪙 Crypto Checker

Приложение для автоматического анализа крипто-проектов (ICO/IDO/launchpad) с использованием AI и отправкой отчётов в Telegram.

## 🎯 Возможности

- 📸 Автоматическое создание скриншотов веб-страниц крипто-проектов
- 🤖 Анализ изображений через OpenAI GPT-4 Vision API
- 📊 Извлечение ключевых данных: текущая цена, цена листинга, собранные средства
- 📱 Отправка структурированных отчётов в Telegram
- 💾 Сохранение результатов в JSON файлы
- ⚡ Параллельная обработка с ограничением нагрузки

## 🛠 Технологии

- **Node.js ≥ 20** + **TypeScript ≥ 5**
- **Puppeteer** - для создания скриншотов
- **OpenAI GPT-4 Vision** - для анализа изображений
- **Telegraf** - для Telegram бота
- **ESLint + Prettier** - для качества кода

## 📦 Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd coin-checker
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env` на основе `env.example`:
```bash
cp env.example .env
```

4. Заполните переменные окружения в `.env`:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Browser Configuration
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000

# Application Configuration
LOG_LEVEL=info
MAX_CONCURRENT_REQUESTS=3
```

## 🚀 Использование

### Разработка
```bash
npm run dev
```

### Сборка
```bash
npm run build
```

### Запуск
```bash
# Запуск с примерными URL
npm start

# Запуск с конкретными URL
npm start https://example-ico.com https://test-launchpad.io

# Анализ массива сайтов из конфигурации
npm run batch-sites
```

### Линтинг и форматирование
```bash
npm run lint
npm run lint:fix
npm run format
```

## 📁 Структура проекта

```
src/
├── config/          # Конфигурация приложения
├── services/        # Основные сервисы
│   ├── browserService.ts      # Управление браузером
│   ├── screenshotService.ts   # Создание скриншотов
│   ├── openaiService.ts       # OpenAI API клиент
│   ├── visionParser.ts        # Парсинг изображений
│   ├── telegramService.ts     # Telegram бот
│   ├── messageService.ts      # Отправка сообщений
│   ├── orchestrator.ts        # Основной оркестратор
│   ├── urlProcessor.ts        # Обработка URL
│   ├── reportService.ts       # Создание отчётов
│   └── storageService.ts      # Сохранение данных
├── utils/           # Утилиты
│   ├── logger.ts              # Логирование
│   ├── errorHandler.ts        # Обработка ошибок
│   ├── urlValidator.ts        # Валидация URL
│   ├── reportFormatter.ts     # Форматирование отчётов
│   ├── dataValidator.ts       # Валидация данных
│   └── signalHandler.ts       # Обработка сигналов
├── types/           # TypeScript типы
│   └── index.ts
└── main.ts          # Точка входа
```

## 🔧 Конфигурация

### Анализ массива сайтов

Для анализа списка сайтов создайте файл `src/config/sites.json`:

```json
[
  {
    "url": "https://example1.com",
    "selector": ".price-selector"
  },
  {
    "url": "https://example2.com",
    "selector": "#price-container"
  },
  {
    "url": "https://example3.com"
  }
]
```

Где:
- `url` - адрес сайта для анализа (обязательный)
- `selector` - CSS селектор для выделения области (необязательный)

### Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `OPENAI_API_KEY` | API ключ OpenAI | Да |
| `TELEGRAM_BOT_TOKEN` | Токен Telegram бота | Да |
| `TELEGRAM_CHAT_ID` | ID чата для отправки сообщений | Да |
| `BROWSER_HEADLESS` | Запуск браузера в headless режиме | Нет |
| `BROWSER_TIMEOUT` | Таймаут браузера (мс) | Нет |
| `LOG_LEVEL` | Уровень логирования | Нет |
| `MAX_CONCURRENT_REQUESTS` | Максимум параллельных запросов | Нет |

## 📊 Примеры отчётов

### Отдельный проект
```
📊 Анализ крипто-проекта

🔗 URL: https://example-ico.com
⏰ Время анализа: 15.12.2024, 14:30:25

💰 Текущая цена: $0.015
📈 Цена при листинге: $0.010
💵 Собрано средств: $2,000,000
```

### Сводный отчёт
```
📊 Отчёт по анализу крипто-проектов

📈 Успешно обработано: 3
❌ Ошибок: 0
⏱️ Общее время: 45000мс

✅ Успешные результаты:

1. Проект
🔗 https://example-ico.com
💰 Текущая цена: $0.015
📈 Цена листинга: $0.010
💵 Собрано: $2,000,000
⏱️ Время обработки: 15000мс
```

## 🐛 Отладка

### Логирование
Приложение использует структурированное логирование с разными уровнями:
- `debug` - детальная отладочная информация
- `info` - общая информация о работе
- `warn` - предупреждения
- `error` - ошибки

### Сохранение результатов
Все результаты сохраняются в папку `output/` в формате JSON:
- `crypto-analysis-YYYY-MM-DDTHH-MM-SS.json` - полные результаты
- `summary-YYYY-MM-DDTHH-MM-SS.json` - сводная статистика

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции
3. Внесите изменения
4. Добавьте тесты
5. Создайте Pull Request

## 📄 Лицензия

MIT License

## 🆘 Поддержка

При возникновении проблем:
1. Проверьте логи приложения
2. Убедитесь в корректности переменных окружения
3. Проверьте доступность API сервисов
4. Создайте Issue в репозитории 