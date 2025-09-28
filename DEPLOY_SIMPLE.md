# 🚀 Простое развертывание Crypto Checker на VPS

Упрощенная инструкция для развертывания бота на готовом сервере с Node.js.

## 📋 Требования

- **VPS с установленным Node.js 18+**
- **Установленный браузер** (Chrome/Chromium)
- **SSH доступ** к серверу

## 🔧 1. Подготовка

### Подключение к серверу
```bash
ssh YOUR_USER@YOUR_SERVER_IP
```

### Проверка установленных компонентов
```bash
# Проверка Node.js
node --version  # должно быть v18+ или v20+
npm --version

# Проверка браузера
which google-chrome || which chromium-browser
```

## 📁 2. Развертывание приложения

### Клонирование проекта
```bash
cd ~
git clone https://github.com/YOUR_USERNAME/coin-checker.git
cd coin-checker
```

### Установка зависимостей
```bash
npm install
```

### Сборка проекта
```bash
npm run build
```

## 🔑 3. Настройка окружения

### Создание .env файла
```bash
cp env.example .env
nano .env
```

### Заполните .env файл:
```env
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_FROM_BOTFATHER
TELEGRAM_CHAT_ID=YOUR_CHAT_ID

# OpenAI Configuration
OPENAI_API_KEY=YOUR_OPENAI_API_KEY

# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=YOUR_SPREADSHEET_ID

# JSON файл с учетными данными Google
GOOGLE_SHEETS_CREDENTIALS_PATH=./google-credentials.json
```

### Загрузка Google Credentials
```bash
# Создайте файл google-credentials.json
nano google-credentials.json
```

Вставьте содержимое вашего JSON файла с учетными данными Google Service Account.

### Установка прав доступа
```bash
chmod 600 .env google-credentials.json
```

## 🚀 4. Настройка скрипта анализа

### Сделать скрипт исполняемым
```bash
chmod +x analyze.sh
```

### Тестовый запуск
```bash
# Проверка окружения
./analyze.sh --check

# Анализ одного сайта
./analyze.sh --limit 1

# Анализ всех сайтов
./analyze.sh
```

## ⏰ 5. Настройка автоматического запуска (Cron)

### Создание cron задачи для регулярного анализа
```bash
crontab -e
```

Добавьте следующие строки:
```bash
# Анализ каждые 2 часа
0 */2 * * * cd ~/coin-checker && ./analyze.sh >> ~/logs/cron.log 2>&1

# Анализ каждый день в 9:00
0 9 * * * cd ~/coin-checker && ./analyze.sh >> ~/logs/cron.log 2>&1

# Еженедельная очистка старых скриншотов (старше 7 дней)
0 2 * * 0 find ~/coin-checker/screenshots -name "*.png" -mtime +7 -delete
```

### Создание директории для логов
```bash
mkdir -p ~/logs
```

## 📊 6. Тестирование и запуск

### Первый тестовый запуск
```bash
cd ~/coin-checker
./analyze.sh --limit 1
```

### Проверка логов
```bash
# Просмотр логов cron
tail -f ~/logs/cron.log

# Просмотр логов приложения
tail -f ~/coin-checker/logs/*.log
```

## 🔧 7. Обслуживание

### Обновление кода
```bash
cd ~/coin-checker
git pull origin main
npm install
npm run build
```

### Очистка логов
```bash
# Очистка старых логов
> ~/logs/cron.log

# Очистка старых скриншотов (вручную)
find ~/coin-checker/screenshots -name "*.png" -mtime +7 -delete
```

### Резервное копирование
```bash
# Создание бэкапа конфигурации
tar -czf backup-$(date +%Y%m%d).tar.gz .env google-credentials.json

# Копирование на локальную машину
scp YOUR_USER@YOUR_SERVER_IP:~/backup-*.tar.gz ./
```

## 🚨 8. Устранение неполадок

### Проверка работы браузера
```bash
# Тест браузера
google-chrome --version || chromium-browser --version
```

### Проверка сетевых подключений
```bash
# Проверка доступности Telegram API
curl -I https://api.telegram.org

# Проверка доступности OpenAI API
curl -I https://api.openai.com

# Проверка доступности Google Sheets API
curl -I https://sheets.googleapis.com
```

### Частые проблемы и решения

#### 1. Ошибки прав доступа
```bash
# Исправление прав на файлы
chmod 755 ~/coin-checker
chmod 600 ~/coin-checker/.env ~/coin-checker/google-credentials.json
```

#### 2. Cron не запускается
```bash
# Проверка статуса cron
systemctl status cron

# Проверка логов cron
grep CRON /var/log/syslog
```

## ✅ 9. Проверка работы

### Тестовый запуск
```bash
cd ~/coin-checker
./analyze.sh --limit 1
```

### Проверка в Telegram
Убедитесь, что бот отправляет сообщения в ваш Telegram чат.

### Проверка Google Sheets
Убедитесь, что данные записываются в вашу Google таблицу.

## 📞 10. Мониторинг

### Полезные команды для диагностики
```bash
# Использование памяти и CPU
top
free -h
df -h

# Активные процессы
ps aux | grep node

# Проверка cron задач
crontab -l

# Просмотр логов
tail -f ~/logs/cron.log
```

---

🎉 **Готово!** Ваш Crypto Checker бот настроен и будет работать по расписанию!

## 📝 Команды скрипта analyze.sh

```bash
# Показать справку
./analyze.sh --help

# Проверить окружение
./analyze.sh --check

# Анализ всех сайтов (продакшен режим - без сохранения скриншотов)
./analyze.sh

# Анализ только 5 сайтов
./analyze.sh --limit 5

# Анализ в режиме разработки (с сохранением скриншотов)
./analyze.sh --save-screenshots

# Пересобрать проект
./analyze.sh --build

# Переустановить зависимости
./analyze.sh --install

# Очистить старые файлы
./analyze.sh --cleanup
```

### 💾 Управление скриншотами

Скрипт автоматически управляет сохранением скриншотов в зависимости от режима:

- `./analyze.sh` - **продакшен режим** (`NODE_ENV=production`) - скриншоты НЕ сохраняются локально
- `./analyze.sh --save-screenshots` - **режим разработки** (`NODE_ENV=development`) - скриншоты сохраняются

В любом режиме скриншоты создаются и отправляются в Telegram, но в продакшене не засоряют диск сервера.
