# 🚀 Инструкция по развертыванию Crypto Checker

Полная инструкция по развертыванию приложения на сервере и настройке автоматического запуска через cron.

## 📋 Содержание

1. [Подготовка сервера](#подготовка-сервера)
2. [Установка зависимостей](#установка-зависимостей)
3. [Настройка приложения](#настройка-приложения)
4. [Сборка и тестирование](#сборка-и-тестирование)
5. [Настройка cron](#настройка-cron)
6. [Мониторинг и логи](#мониторинг-и-логи)
7. [Обновление приложения](#обновление-приложения)
8. [Устранение неполадок](#устранение-неполадок)

---

## 🖥 Подготовка сервера

### Системные требования

- **ОС**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **RAM**: минимум 2GB, рекомендуется 4GB+
- **CPU**: 2+ ядра
- **Диск**: минимум 10GB свободного места
- **Сеть**: стабильное интернет-соединение

### Установка Node.js

```bash
# Обновляем систему
sudo apt update && sudo apt upgrade -y

# Устанавливаем Node.js 20+ (через NodeSource)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Проверяем версию
node --version  # должно быть v20.x.x или выше
npm --version
```

### Установка дополнительных пакетов

```bash
# Устанавливаем необходимые пакеты для Puppeteer
sudo apt-get install -y \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    wget \
    xdg-utils

# Устанавливаем Git для клонирования репозитория
sudo apt-get install -y git
```

---

## 📦 Установка зависимостей

### Клонирование репозитория

```bash
# Создаем директорию для приложения
sudo mkdir -p /opt/coin-checker
sudo chown $USER:$USER /opt/coin-checker

# Клонируем репозиторий
cd /opt/coin-checker
git clone <your-repository-url> .

# Или если у вас уже есть код, копируем его
# scp -r /path/to/coin-checker/* user@server:/opt/coin-checker/
```

### Установка npm зависимостей

```bash
cd /opt/coin-checker

# Устанавливаем зависимости
npm install

# Проверяем, что все установилось корректно
npm list --depth=0
```

---

## ⚙️ Настройка приложения

### Создание пользователя для приложения

```bash
# Создаем системного пользователя для приложения
sudo useradd -r -s /bin/false -d /opt/coin-checker coin-checker

# Устанавливаем права на директорию
sudo chown -R coin-checker:coin-checker /opt/coin-checker
sudo chmod -R 755 /opt/coin-checker
```

### Настройка переменных окружения

```bash
# Создаем файл .env
sudo cp env.example .env
sudo chown coin-checker:coin-checker .env
sudo chmod 600 .env

# Редактируем .env файл
sudo nano .env
```

**Содержимое .env файла:**

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
SCREENSHOTS_DIR=/opt/coin-checker/screenshots

# Google Sheets Configuration
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_CREDENTIALS_PATH=/opt/coin-checker/google-credentials.json
```

### Настройка Google Sheets

```bash
# Копируем файл с credentials
sudo cp google-credentials.json /opt/coin-checker/
sudo chown coin-checker:coin-checker /opt/coin-checker/google-credentials.json
sudo chmod 600 /opt/coin-checker/google-credentials.json
```

### Создание необходимых директорий

```bash
# Создаем директории для логов и скриншотов
sudo mkdir -p /opt/coin-checker/{screenshots,output,logs}
sudo chown -R coin-checker:coin-checker /opt/coin-checker/{screenshots,output,logs}
sudo chmod -R 755 /opt/coin-checker/{screenshots,output,logs}
```

---

## 🔨 Сборка и тестирование

### Сборка приложения

```bash
cd /opt/coin-checker

# Собираем TypeScript в JavaScript
npm run build

# Проверяем, что сборка прошла успешно
ls -la dist/
```

### Тестирование

```bash
# Тестируем запуск приложения
sudo -u coin-checker npm start

# Или тестируем отдельные команды
sudo -u coin-checker npm run scan:help
```

### Создание systemd сервиса (опционально)

```bash
# Создаем systemd unit файл
sudo nano /etc/systemd/system/coin-checker.service
```

**Содержимое файла:**

```ini
[Unit]
Description=Crypto Checker Application
After=network.target

[Service]
Type=simple
User=coin-checker
Group=coin-checker
WorkingDirectory=/opt/coin-checker
ExecStart=/usr/bin/node dist/scripts/runBatchAnalysis.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

# Логирование
StandardOutput=journal
StandardError=journal
SyslogIdentifier=coin-checker

[Install]
WantedBy=multi-user.target
```

```bash
# Перезагружаем systemd и включаем сервис
sudo systemctl daemon-reload
sudo systemctl enable coin-checker
# sudo systemctl start coin-checker  # запускаем только если нужен постоянный сервис
```

---

## ⏰ Настройка cron

### Создание скрипта запуска

```bash
# Создаем скрипт для запуска через cron
sudo nano /opt/coin-checker/run-analysis.sh
```

**Содержимое скрипта:**

```bash
#!/bin/bash

# Настройки
APP_DIR="/opt/coin-checker"
LOG_FILE="/opt/coin-checker/logs/cron-$(date +%Y%m%d).log"
USER="coin-checker"

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Переходим в директорию приложения
cd "$APP_DIR" || exit 1

# Логируем начало выполнения
log "Starting crypto analysis..."

# Запускаем анализ от имени пользователя coin-checker
sudo -u "$USER" npm start >> "$LOG_FILE" 2>&1

# Проверяем код возврата
if [ $? -eq 0 ]; then
    log "Analysis completed successfully"
else
    log "Analysis failed with exit code $?"
fi

# Очищаем старые логи (старше 30 дней)
find /opt/coin-checker/logs -name "cron-*.log" -mtime +30 -delete

log "Script finished"
```

```bash
# Делаем скрипт исполняемым
sudo chmod +x /opt/coin-checker/run-analysis.sh
sudo chown coin-checker:coin-checker /opt/coin-checker/run-analysis.sh
```

### Настройка cron задач

```bash
# Открываем crontab для редактирования
sudo crontab -e
```

**Добавляем следующие строки:**

```cron
# Crypto Checker - анализ каждый час
0 * * * * /opt/coin-checker/run-analysis.sh

# Crypto Checker - анализ каждые 30 минут (если нужна более частая проверка)
# */30 * * * * /opt/coin-checker/run-analysis.sh

# Crypto Checker - анализ каждые 6 часов
# 0 */6 * * * /opt/coin-checker/run-analysis.sh

# Crypto Checker - анализ каждый день в 9:00
# 0 9 * * * /opt/coin-checker/run-analysis.sh

# Crypto Checker - анализ в рабочие дни в 9:00 и 18:00
# 0 9,18 * * 1-5 /opt/coin-checker/run-analysis.sh
```

### Альтернативные варианты расписания

```cron
# Каждые 15 минут
*/15 * * * * /opt/coin-checker/run-analysis.sh

# Каждые 2 часа
0 */2 * * * /opt/coin-checker/run-analysis.sh

# Только в рабочие дни, каждые 4 часа с 9:00 до 17:00
0 9,13,17 * * 1-5 /opt/coin-checker/run-analysis.sh

# Только по выходным, каждые 6 часов
0 */6 * * 0,6 /opt/coin-checker/run-analysis.sh

# Каждый день в 8:00, 12:00, 16:00, 20:00
0 8,12,16,20 * * * /opt/coin-checker/run-analysis.sh
```

### Проверка cron

```bash
# Проверяем, что cron задачи добавлены
sudo crontab -l

# Проверяем статус cron сервиса
sudo systemctl status cron

# Если cron не запущен, запускаем его
sudo systemctl start cron
sudo systemctl enable cron

# Просматриваем логи cron
sudo tail -f /var/log/cron
# или
sudo journalctl -u cron -f
```

---

## 📊 Мониторинг и логи

### Настройка логирования

```bash
# Создаем директорию для логов
sudo mkdir -p /var/log/coin-checker
sudo chown coin-checker:coin-checker /var/log/coin-checker

# Настраиваем logrotate для ротации логов
sudo nano /etc/logrotate.d/coin-checker
```

**Содержимое logrotate конфигурации:**

```
/opt/coin-checker/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 coin-checker coin-checker
    postrotate
        # Перезапускаем сервис если он запущен
        systemctl reload coin-checker 2>/dev/null || true
    endscript
}
```

### Мониторинг выполнения

```bash
# Создаем скрипт для мониторинга
sudo nano /opt/coin-checker/monitor.sh
```

**Содержимое скрипта мониторинга:**

```bash
#!/bin/bash

APP_DIR="/opt/coin-checker"
LOG_FILE="/opt/coin-checker/logs/monitor.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Проверяем последний запуск
LAST_RUN=$(find /opt/coin-checker/logs -name "cron-*.log" -exec basename {} \; | sort | tail -1)
if [ -n "$LAST_RUN" ]; then
    LAST_RUN_TIME=$(stat -c %Y "/opt/coin-checker/logs/$LAST_RUN")
    CURRENT_TIME=$(date +%s)
    DIFF=$((CURRENT_TIME - LAST_RUN_TIME))
    
    # Если последний запуск был более 2 часов назад
    if [ $DIFF -gt 7200 ]; then
        log "WARNING: Last run was $((DIFF/3600)) hours ago"
    else
        log "OK: Last run was $((DIFF/60)) minutes ago"
    fi
else
    log "ERROR: No run logs found"
fi

# Проверяем размер логов
LOG_SIZE=$(du -sh /opt/coin-checker/logs | cut -f1)
log "Log directory size: $LOG_SIZE"

# Проверяем количество скриншотов
SCREENSHOT_COUNT=$(find /opt/coin-checker/screenshots -name "*.png" | wc -l)
log "Screenshots count: $SCREENSHOT_COUNT"
```

```bash
# Делаем скрипт исполняемым
sudo chmod +x /opt/coin-checker/monitor.sh

# Добавляем в cron для ежедневной проверки
sudo crontab -e
# Добавляем: 0 0 * * * /opt/coin-checker/monitor.sh
```

### Просмотр логов

```bash
# Просмотр логов cron
tail -f /opt/coin-checker/logs/cron-$(date +%Y%m%d).log

# Просмотр всех логов
tail -f /opt/coin-checker/logs/*.log

# Поиск ошибок в логах
grep -i error /opt/coin-checker/logs/*.log

# Статистика запусков
grep "Starting crypto analysis" /opt/coin-checker/logs/*.log | wc -l
```

---

## 🔄 Обновление приложения

### Создание скрипта обновления

```bash
# Создаем скрипт для обновления
sudo nano /opt/coin-checker/update.sh
```

**Содержимое скрипта обновления:**

```bash
#!/bin/bash

APP_DIR="/opt/coin-checker"
BACKUP_DIR="/opt/coin-checker/backups"
LOG_FILE="/opt/coin-checker/logs/update.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Создаем директорию для бэкапов
mkdir -p "$BACKUP_DIR"

# Переходим в директорию приложения
cd "$APP_DIR" || exit 1

log "Starting application update..."

# Создаем бэкап текущей версии
BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
log "Creating backup: $BACKUP_NAME"

# Бэкапим только исходный код (не node_modules и dist)
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs \
    --exclude=screenshots \
    --exclude=output \
    --exclude=backups \
    .

# Получаем обновления из git
log "Pulling updates from git..."
git pull origin main

# Устанавливаем зависимости
log "Installing dependencies..."
npm install

# Собираем приложение
log "Building application..."
npm run build

# Проверяем, что сборка прошла успешно
if [ -d "dist" ]; then
    log "Build successful"
else
    log "Build failed, restoring backup..."
    tar -xzf "$BACKUP_DIR/$BACKUP_NAME.tar.gz"
    exit 1
fi

# Перезапускаем сервис если он запущен
if systemctl is-active --quiet coin-checker; then
    log "Restarting service..."
    sudo systemctl restart coin-checker
fi

log "Update completed successfully"
```

```bash
# Делаем скрипт исполняемым
sudo chmod +x /opt/coin-checker/update.sh
```

### Автоматическое обновление через cron

```bash
# Добавляем в crontab еженедельное обновление
sudo crontab -e
# Добавляем: 0 2 * * 0 /opt/coin-checker/update.sh
```

---

## 🛠 Устранение неполадок

### Частые проблемы и решения

#### 1. Ошибки Puppeteer

```bash
# Устанавливаем дополнительные зависимости
sudo apt-get update
sudo apt-get install -y \
    libnss3-dev \
    libatk-bridge2.0-dev \
    libdrm2 \
    libxkbcommon0 \
    libgtk-3-dev \
    libgbm-dev

# Очищаем кэш Puppeteer
sudo -u coin-checker rm -rf /home/coin-checker/.cache/puppeteer
```

#### 2. Проблемы с правами доступа

```bash
# Исправляем права на все файлы
sudo chown -R coin-checker:coin-checker /opt/coin-checker
sudo chmod -R 755 /opt/coin-checker
sudo chmod 600 /opt/coin-checker/.env
sudo chmod 600 /opt/coin-checker/google-credentials.json
```

#### 3. Проблемы с памятью

```bash
# Увеличиваем лимиты для Node.js
sudo nano /etc/security/limits.conf
# Добавляем:
# coin-checker soft memlock unlimited
# coin-checker hard memlock unlimited
# coin-checker soft nofile 65536
# coin-checker hard nofile 65536
```

#### 4. Проблемы с cron

```bash
# Проверяем, что cron запущен
sudo systemctl status cron

# Проверяем логи cron
sudo tail -f /var/log/syslog | grep CRON

# Тестируем выполнение скрипта вручную
sudo -u coin-checker /opt/coin-checker/run-analysis.sh
```

#### 5. Проблемы с Telegram API

```bash
# Проверяем доступность Telegram API
curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"

# Проверяем переменные окружения
sudo -u coin-checker env | grep TELEGRAM
```

### Диагностические команды

```bash
# Проверка статуса всех компонентов
sudo systemctl status cron
sudo systemctl status coin-checker  # если используете systemd

# Проверка логов
sudo journalctl -u coin-checker -f  # если используете systemd
tail -f /opt/coin-checker/logs/*.log

# Проверка использования ресурсов
ps aux | grep node
df -h /opt/coin-checker
free -h

# Проверка сетевых соединений
netstat -tulpn | grep node
```

### Восстановление из бэкапа

```bash
# Останавливаем сервис
sudo systemctl stop coin-checker

# Восстанавливаем из бэкапа
cd /opt/coin-checker
tar -xzf backups/backup-YYYYMMDD-HHMMSS.tar.gz

# Переустанавливаем зависимости
npm install
npm run build

# Запускаем сервис
sudo systemctl start coin-checker
```

---

## 📋 Чек-лист развертывания

### ✅ Подготовка сервера
- [ ] Установлен Node.js 20+
- [ ] Установлены системные зависимости для Puppeteer
- [ ] Создан пользователь `coin-checker`
- [ ] Настроены права доступа

### ✅ Установка приложения
- [ ] Клонирован репозиторий в `/opt/coin-checker`
- [ ] Установлены npm зависимости
- [ ] Создан файл `.env` с корректными настройками
- [ ] Настроен Google Sheets credentials
- [ ] Созданы необходимые директории

### ✅ Сборка и тестирование
- [ ] Приложение успешно собирается (`npm run build`)
- [ ] Тестовый запуск прошел успешно
- [ ] Все API ключи работают корректно

### ✅ Настройка автоматизации
- [ ] Создан скрипт `run-analysis.sh`
- [ ] Настроены cron задачи
- [ ] Протестирован запуск через cron
- [ ] Настроено логирование

### ✅ Мониторинг
- [ ] Настроен logrotate
- [ ] Создан скрипт мониторинга
- [ ] Настроены уведомления об ошибках
- [ ] Создан скрипт обновления

---

## 🎯 Готово!

Ваше приложение Crypto Checker успешно развернуто и настроено для автоматического запуска. 

**Основные команды для управления:**

```bash
# Ручной запуск анализа
sudo -u coin-checker /opt/coin-checker/run-analysis.sh

# Просмотр логов
tail -f /opt/coin-checker/logs/cron-$(date +%Y%m%d).log

# Проверка cron задач
sudo crontab -l

# Обновление приложения
sudo /opt/coin-checker/update.sh

# Мониторинг статуса
sudo /opt/coin-checker/monitor.sh
```

**Полезные файлы:**
- Логи: `/opt/coin-checker/logs/`
- Скриншоты: `/opt/coin-checker/screenshots/`
- Результаты: `/opt/coin-checker/output/`
- Конфигурация: `/opt/coin-checker/.env`

При возникновении проблем обращайтесь к разделу [Устранение неполадок](#устранение-неполадок).
