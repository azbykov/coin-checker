#!/bin/bash

# 🚀 Скрипт автоматического развертывания Crypto Checker
# Использование: ./deploy.sh [server_user@server_ip]

set -e  # Остановка при ошибке

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Проверяем аргументы
if [ $# -eq 0 ]; then
    echo "Использование: $0 [server_user@server_ip]"
    echo "Пример: $0 ubuntu@192.168.1.100"
    echo "Для локального развертывания: $0 local"
    exit 1
fi

SERVER="$1"
APP_DIR="/opt/coin-checker"
APP_USER="coin-checker"

# Функция для выполнения команд на сервере
run_remote() {
    if [ "$SERVER" = "local" ]; then
        eval "$1"
    else
        ssh "$SERVER" "$1"
    fi
}

# Функция для копирования файлов на сервер
copy_to_server() {
    if [ "$SERVER" = "local" ]; then
        cp -r "$1" "$2"
    else
        scp -r "$1" "$SERVER:$2"
    fi
}

log "Начинаем развертывание Crypto Checker на $SERVER"

# 1. Подготовка сервера
log "Шаг 1: Подготовка сервера..."

run_remote "
    # Обновляем систему
    sudo apt update && sudo apt upgrade -y
    
    # Устанавливаем Node.js 20+
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs git
    
    # Устанавливаем зависимости для Puppeteer
    sudo apt-get install -y \\
        ca-certificates \\
        fonts-liberation \\
        libappindicator3-1 \\
        libasound2 \\
        libatk-bridge2.0-0 \\
        libatk1.0-0 \\
        libc6 \\
        libcairo2 \\
        libcups2 \\
        libdbus-1-3 \\
        libexpat1 \\
        libfontconfig1 \\
        libgbm1 \\
        libgcc1 \\
        libglib2.0-0 \\
        libgtk-3-0 \\
        libnspr4 \\
        libnss3 \\
        libpango-1.0-0 \\
        libpangocairo-1.0-0 \\
        libstdc++6 \\
        libx11-6 \\
        libx11-xcb1 \\
        libxcb1 \\
        libxcomposite1 \\
        libxcursor1 \\
        libxdamage1 \\
        libxext6 \\
        libxfixes3 \\
        libxi6 \\
        libxrandr2 \\
        libxrender1 \\
        libxss1 \\
        libxtst6 \\
        lsb-release \\
        wget \\
        xdg-utils
"

success "Сервер подготовлен"

# 2. Создание пользователя и директорий
log "Шаг 2: Создание пользователя и директорий..."

run_remote "
    # Создаем системного пользователя
    sudo useradd -r -s /bin/false -d $APP_DIR $APP_USER 2>/dev/null || true
    
    # Создаем директорию приложения
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
"

success "Пользователь и директории созданы"

# 3. Копирование файлов приложения
log "Шаг 3: Копирование файлов приложения..."

# Создаем временный архив
TEMP_ARCHIVE="/tmp/coin-checker-$(date +%s).tar.gz"
tar -czf "$TEMP_ARCHIVE" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=screenshots \
    --exclude=output \
    --exclude=logs \
    --exclude=backups \
    .

# Копируем архив на сервер
copy_to_server "$TEMP_ARCHIVE" "/tmp/"

# Распаковываем на сервере
run_remote "
    cd $APP_DIR
    tar -xzf /tmp/$(basename $TEMP_ARCHIVE)
    rm /tmp/$(basename $TEMP_ARCHIVE)
    sudo chown -R $APP_USER:$APP_USER $APP_DIR
"

# Удаляем временный архив
rm "$TEMP_ARCHIVE"

success "Файлы приложения скопированы"

# 4. Установка зависимостей
log "Шаг 4: Установка зависимостей..."

run_remote "
    cd $APP_DIR
    sudo -u $APP_USER npm install
"

success "Зависимости установлены"

# 5. Создание конфигурационных файлов
log "Шаг 5: Создание конфигурационных файлов..."

run_remote "
    cd $APP_DIR
    
    # Создаем .env файл
    sudo -u $APP_USER cp env.example .env
    sudo chmod 600 .env
    
    # Создаем необходимые директории
    sudo -u $APP_USER mkdir -p screenshots output logs backups
    sudo chown -R $APP_USER:$APP_USER screenshots output logs backups
"

success "Конфигурационные файлы созданы"

# 6. Сборка приложения
log "Шаг 6: Сборка приложения..."

run_remote "
    cd $APP_DIR
    sudo -u $APP_USER npm run build
"

success "Приложение собрано"

# 7. Создание скриптов
log "Шаг 7: Создание скриптов запуска..."

run_remote "
    cd $APP_DIR
    
    # Создаем скрипт запуска анализа
    sudo -u $APP_USER cat > run-analysis.sh << 'EOF'
#!/bin/bash

# Настройки
APP_DIR=\"$APP_DIR\"
LOG_FILE=\"$APP_DIR/logs/cron-\$(date +%Y%m%d).log\"
USER=\"$APP_USER\"

# Функция логирования
log() {
    echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\" >> \"\$LOG_FILE\"
}

# Переходим в директорию приложения
cd \"\$APP_DIR\" || exit 1

# Логируем начало выполнения
log \"Starting crypto analysis...\"

# Запускаем анализ от имени пользователя coin-checker
sudo -u \"\$USER\" npm start >> \"\$LOG_FILE\" 2>&1

# Проверяем код возврата
if [ \$? -eq 0 ]; then
    log \"Analysis completed successfully\"
else
    log \"Analysis failed with exit code \$?\"
fi

# Очищаем старые логи (старше 30 дней)
find $APP_DIR/logs -name \"cron-*.log\" -mtime +30 -delete 2>/dev/null || true

log \"Script finished\"
EOF

    # Создаем скрипт мониторинга
    sudo -u $APP_USER cat > monitor.sh << 'EOF'
#!/bin/bash

APP_DIR=\"$APP_DIR\"
LOG_FILE=\"$APP_DIR/logs/monitor.log\"

log() {
    echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\" >> \"\$LOG_FILE\"
}

# Проверяем последний запуск
LAST_RUN=\$(find $APP_DIR/logs -name \"cron-*.log\" -exec basename {} \\; | sort | tail -1)
if [ -n \"\$LAST_RUN\" ]; then
    LAST_RUN_TIME=\$(stat -c %Y \"$APP_DIR/logs/\$LAST_RUN\")
    CURRENT_TIME=\$(date +%s)
    DIFF=\$((CURRENT_TIME - LAST_RUN_TIME))
    
    # Если последний запуск был более 2 часов назад
    if [ \$DIFF -gt 7200 ]; then
        log \"WARNING: Last run was \$((DIFF/3600)) hours ago\"
    else
        log \"OK: Last run was \$((DIFF/60)) minutes ago\"
    fi
else
    log \"ERROR: No run logs found\"
fi

# Проверяем размер логов
LOG_SIZE=\$(du -sh $APP_DIR/logs | cut -f1)
log \"Log directory size: \$LOG_SIZE\"

# Проверяем количество скриншотов
SCREENSHOT_COUNT=\$(find $APP_DIR/screenshots -name \"*.png\" | wc -l)
log \"Screenshots count: \$SCREENSHOT_COUNT\"
EOF

    # Создаем скрипт обновления
    sudo -u $APP_USER cat > update.sh << 'EOF'
#!/bin/bash

APP_DIR=\"$APP_DIR\"
BACKUP_DIR=\"$APP_DIR/backups\"
LOG_FILE=\"$APP_DIR/logs/update.log\"

log() {
    echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] \$1\" | tee -a \"\$LOG_FILE\"
}

# Создаем директорию для бэкапов
mkdir -p \"\$BACKUP_DIR\"

# Переходим в директорию приложения
cd \"\$APP_DIR\" || exit 1

log \"Starting application update...\"

# Создаем бэкап текущей версии
BACKUP_NAME=\"backup-\$(date +%Y%m%d-%H%M%S)\"
log \"Creating backup: \$BACKUP_NAME\"

# Бэкапим только исходный код
tar -czf \"\$BACKUP_DIR/\$BACKUP_NAME.tar.gz\" \\
    --exclude=node_modules \\
    --exclude=dist \\
    --exclude=logs \\
    --exclude=screenshots \\
    --exclude=output \\
    --exclude=backups \\
    .

# Получаем обновления из git
log \"Pulling updates from git...\"
git pull origin main

# Устанавливаем зависимости
log \"Installing dependencies...\"
npm install

# Собираем приложение
log \"Building application...\"
npm run build

# Проверяем, что сборка прошла успешно
if [ -d \"dist\" ]; then
    log \"Build successful\"
else
    log \"Build failed, restoring backup...\"
    tar -xzf \"\$BACKUP_DIR/\$BACKUP_NAME.tar.gz\"
    exit 1
fi

log \"Update completed successfully\"
EOF

    # Делаем скрипты исполняемыми
    sudo chmod +x run-analysis.sh monitor.sh update.sh
    sudo chown $APP_USER:$APP_USER run-analysis.sh monitor.sh update.sh
"

success "Скрипты созданы"

# 8. Настройка systemd сервиса
log "Шаг 8: Настройка systemd сервиса..."

run_remote "
    # Создаем systemd unit файл
    sudo tee /etc/systemd/system/coin-checker.service > /dev/null << EOF
[Unit]
Description=Crypto Checker Application
After=network.target

[Service]
Type=simple
User=$APP_USER
Group=$APP_USER
WorkingDirectory=$APP_DIR
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
EOF

    # Перезагружаем systemd
    sudo systemctl daemon-reload
    sudo systemctl enable coin-checker
"

success "Systemd сервис настроен"

# 9. Настройка cron
log "Шаг 9: Настройка cron..."

run_remote "
    # Добавляем cron задачи
    (sudo crontab -l 2>/dev/null; echo \"# Crypto Checker - анализ каждый час\"; echo \"0 * * * * $APP_DIR/run-analysis.sh\"; echo \"# Crypto Checker - мониторинг каждый день\"; echo \"0 0 * * * $APP_DIR/monitor.sh\") | sudo crontab -
    
    # Запускаем cron если не запущен
    sudo systemctl start cron
    sudo systemctl enable cron
"

success "Cron настроен"

# 10. Настройка logrotate
log "Шаг 10: Настройка logrotate..."

run_remote "
    # Создаем конфигурацию logrotate
    sudo tee /etc/logrotate.d/coin-checker > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        systemctl reload coin-checker 2>/dev/null || true
    endscript
}
EOF
"

success "Logrotate настроен"

# 11. Финальная проверка
log "Шаг 11: Финальная проверка..."

run_remote "
    # Проверяем права доступа
    sudo chown -R $APP_USER:$APP_USER $APP_DIR
    sudo chmod 600 $APP_DIR/.env
    
    # Проверяем, что приложение собирается
    cd $APP_DIR
    sudo -u $APP_USER npm run build
    
    # Проверяем cron задачи
    sudo crontab -l | grep coin-checker
"

success "Финальная проверка завершена"

# Выводим итоговую информацию
echo ""
echo "🎉 Развертывание завершено успешно!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Отредактируйте файл .env на сервере:"
if [ "$SERVER" = "local" ]; then
    echo "   nano $APP_DIR/.env"
else
    echo "   ssh $SERVER 'sudo nano $APP_DIR/.env'"
fi
echo ""
echo "2. Добавьте Google Sheets credentials:"
if [ "$SERVER" = "local" ]; then
    echo "   cp google-credentials.json $APP_DIR/"
    echo "   sudo chown $APP_USER:$APP_USER $APP_DIR/google-credentials.json"
else
    echo "   scp google-credentials.json $SERVER:$APP_DIR/"
    echo "   ssh $SERVER 'sudo chown $APP_USER:$APP_USER $APP_DIR/google-credentials.json'"
fi
echo ""
echo "3. Протестируйте запуск:"
if [ "$SERVER" = "local" ]; then
    echo "   sudo -u $APP_USER $APP_DIR/run-analysis.sh"
else
    echo "   ssh $SERVER 'sudo -u $APP_USER $APP_DIR/run-analysis.sh'"
fi
echo ""
echo "4. Проверьте логи:"
if [ "$SERVER" = "local" ]; then
    echo "   tail -f $APP_DIR/logs/cron-\$(date +%Y%m%d).log"
else
    echo "   ssh $SERVER 'tail -f $APP_DIR/logs/cron-\$(date +%Y%m%d).log'"
fi
echo ""
echo "📊 Полезные команды:"
echo "• Просмотр логов: ssh $SERVER 'tail -f $APP_DIR/logs/*.log'"
echo "• Проверка cron: ssh $SERVER 'sudo crontab -l'"
echo "• Статус сервиса: ssh $SERVER 'sudo systemctl status coin-checker'"
echo "• Обновление: ssh $SERVER 'sudo $APP_DIR/update.sh'"
echo "• Мониторинг: ssh $SERVER 'sudo $APP_DIR/monitor.sh'"
echo ""
echo "🔧 Настройка cron расписания:"
echo "• Редактировать: ssh $SERVER 'sudo crontab -e'"
echo "• Примеры расписания см. в DEPLOYMENT.md"
echo ""
success "Готово! Приложение развернуто на $SERVER"
