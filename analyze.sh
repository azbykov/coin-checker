#!/bin/bash

# 🚀 Crypto Checker - Скрипт анализа крипто-проектов
# Автор: Crypto Checker Bot
# Версия: 1.0

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция логирования
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

# Проверка наличия Node.js
check_node() {
    if ! command -v node &> /dev/null; then
        error "Node.js не найден. Установите Node.js 18+ или 20+"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        error "Требуется Node.js версии 18 или выше. Текущая версия: $(node --version)"
        exit 1
    fi
    
    success "Node.js $(node --version) найден"
}

# Проверка наличия npm
check_npm() {
    if ! command -v npm &> /dev/null; then
        error "npm не найден"
        exit 1
    fi
    
    success "npm $(npm --version) найден"
}

# Проверка наличия .env файла
check_env() {
    if [ ! -f ".env" ]; then
        error ".env файл не найден. Создайте его на основе env.example"
        exit 1
    fi
    
    success ".env файл найден"
}

# Проверка наличия google-credentials.json
check_credentials() {
    if [ ! -f "google-credentials.json" ]; then
        warning "google-credentials.json не найден. Google Sheets может не работать"
    else
        success "Google credentials найден"
    fi
}

# Проверка наличия собранного проекта
check_build() {
    if [ ! -d "dist" ]; then
        warning "Папка dist не найдена. Запускаю сборку..."
        npm run build
        if [ $? -ne 0 ]; then
            error "Ошибка сборки проекта"
            exit 1
        fi
        success "Проект собран успешно"
    else
        success "Собранный проект найден"
    fi
}

# Проверка зависимостей
check_dependencies() {
    if [ ! -d "node_modules" ]; then
        warning "node_modules не найден. Устанавливаю зависимости..."
        npm install --production
        if [ $? -ne 0 ]; then
            error "Ошибка установки зависимостей"
            exit 1
        fi
        success "Зависимости установлены"
    else
        success "Зависимости найдены"
    fi
}

# Создание директорий
create_directories() {
    mkdir -p screenshots
    mkdir -p logs
    mkdir -p temp
    success "Директории созданы"
}

# Очистка старых файлов
cleanup_old_files() {
    # Удаление скриншотов старше 7 дней
    find screenshots -name "*.png" -mtime +7 -delete 2>/dev/null
    find screenshots -name "*.jpg" -mtime +7 -delete 2>/dev/null
    
    # Удаление временных файлов старше 1 дня
    find temp -name "*" -mtime +1 -delete 2>/dev/null
    
    success "Старые файлы очищены"
}

# Основная функция анализа
run_analysis() {
    local limit=$1
    local save_screenshots=$2
    
    log "🚀 Запуск анализа крипто-проектов..."
    
    # Настройка окружения
    if [ "$save_screenshots" = true ]; then
        export NODE_ENV=development
        log "💾 Режим разработки - скриншоты будут сохранены"
    else
        export NODE_ENV=production
        log "💾 Продакшен режим - скриншоты не сохраняются (экономия места)"
    fi
    
    if [ -n "$limit" ]; then
        log "Ограничение: $limit сайтов"
        npm run analyze -- --limit "$limit"
    else
        log "Анализ всех сайтов"
        npm run analyze
    fi
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        success "✅ Анализ завершен успешно"
    else
        error "❌ Анализ завершился с ошибкой (код: $exit_code)"
    fi
    
    return $exit_code
}

# Функция показа помощи
show_help() {
    echo "🚀 Crypto Checker - Скрипт анализа крипто-проектов"
    echo ""
    echo "Использование:"
    echo "  $0 [ОПЦИИ]"
    echo ""
    echo "Опции:"
    echo "  -h, --help          Показать эту справку"
    echo "  -l, --limit N       Ограничить анализ N сайтами"
    echo "  -c, --check         Только проверить окружение"
    echo "  -b, --build         Пересобрать проект"
    echo "  -i, --install       Переустановить зависимости"
    echo "  --cleanup           Очистить старые файлы"
    echo "  --save-screenshots  Запустить в режиме разработки (сохранение скриншотов)"
    echo ""
    echo "Примеры:"
    echo "  $0                  # Анализ всех сайтов (продакшен режим)"
    echo "  $0 -l 5             # Анализ только 5 сайтов"
    echo "  $0 --save-screenshots # Анализ в режиме разработки"
    echo "  $0 -c               # Проверка окружения"
    echo "  $0 -b               # Пересборка проекта"
    echo ""
}

# Функция проверки окружения
check_environment() {
    log "🔍 Проверка окружения..."
    
    check_node
    check_npm
    check_env
    check_credentials
    check_dependencies
    check_build
    create_directories
    
    success "✅ Окружение готово к работе"
}

# Главная функция
main() {
    local limit=""
    local check_only=false
    local rebuild=false
    local reinstall=false
    local cleanup_only=false
    local save_screenshots=false
    
    # Парсинг аргументов
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -l|--limit)
                limit="$2"
                shift 2
                ;;
            -c|--check)
                check_only=true
                shift
                ;;
            -b|--build)
                rebuild=true
                shift
                ;;
            -i|--install)
                reinstall=true
                shift
                ;;
            --cleanup)
                cleanup_only=true
                shift
                ;;
            --save-screenshots)
                save_screenshots=true
                shift
                ;;
            *)
                error "Неизвестная опция: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # Переход в директорию скрипта
    cd "$(dirname "$0")"
    
    # Очистка старых файлов
    if [ "$cleanup_only" = true ]; then
        cleanup_old_files
        exit 0
    fi
    
    # Переустановка зависимостей
    if [ "$reinstall" = true ]; then
        log "🔄 Переустановка зависимостей..."
        rm -rf node_modules
        npm install --production
        if [ $? -ne 0 ]; then
            error "Ошибка переустановки зависимостей"
            exit 1
        fi
        success "Зависимости переустановлены"
    fi
    
    # Пересборка проекта
    if [ "$rebuild" = true ]; then
        log "🔨 Пересборка проекта..."
        rm -rf dist
        npm run build
        if [ $? -ne 0 ]; then
            error "Ошибка пересборки проекта"
            exit 1
        fi
        success "Проект пересобран"
    fi
    
    # Проверка окружения
    check_environment
    
    # Только проверка окружения
    if [ "$check_only" = true ]; then
        exit 0
    fi
    
    # Очистка старых файлов перед анализом
    cleanup_old_files
    
    # Запуск анализа
    run_analysis "$limit" "$save_screenshots"
    
    exit $?
}

# Обработка сигналов для корректного завершения
trap 'echo -e "\n${YELLOW}Получен сигнал завершения. Останавливаю анализ...${NC}"; exit 130' INT TERM

# Запуск главной функции
main "$@"
