// TODO: Задача - CLI для извлечения HTML по селектору
// Назначение: Командная строка для извлечения HTML содержимого
// Вход: URL и селектор через аргументы командной строки
// Выход: HTML содержимое в консоли или файл
// Ошибки: Некорректные аргументы, ошибки загрузки страницы

import { htmlExtractor } from './htmlExtractor';
import { browserService } from '../services/browserService';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

interface CliOptions {
  url: string;
  selector: string;
  attributes?: string[];
  output?: string;
  help?: boolean;
}

function parseArguments(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    url: '',
    selector: ''
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--url':
      case '-u':
        options.url = args[++i] || '';
        break;
      case '--selector':
      case '-s':
        options.selector = args[++i] || '';
        break;
      case '--attribute':
      case '-a':
        if (!options.attributes) options.attributes = [];
        const attr = args[++i];
        if (attr) options.attributes.push(attr);
        break;
      case '--output':
      case '-o':
        const outputArg = args[++i];
        if (outputArg) options.output = outputArg;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (!options.url && arg && !arg.startsWith('-')) {
          options.url = arg;
        } else if (!options.selector && arg && !arg.startsWith('-') && options.url) {
          options.selector = arg;
        }
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
🔍 HTML Extractor CLI

Использование:
  npm run extract:html -- [опции] [URL] [селектор]

Опции:
  -u, --url <url>           URL сайта для анализа
  -s, --selector <selector> Селектор для извлечения HTML
  -a, --attribute <attr>    Атрибут для извлечения (можно использовать несколько раз)
  -o, --output <file>       Файл для сохранения результата
  -h, --help               Показать эту справку

Примеры:
  # Извлечь HTML по CSS селектору
  npm run extract:html -- --url https://example.com --selector ".price"

  # Извлечь HTML с атрибутами
  npm run extract:html -- --url https://example.com --selector ".token" --attribute class --attribute data-price

  # Извлечь HTML по текстовому селектору
  npm run extract:html -- https://example.com "text=Price"

  # Извлечь HTML по XPath селектору
  npm run extract:html -- https://example.com "xpath=//div[contains(@class, 'price')]"

  # Сохранить результат в файл
  npm run extract:html -- --url https://example.com --selector ".content" --output result.html

Типы селекторов:
  CSS:     ".class", "#id", "[attribute]"
  Текст:   "text=Your text here"
  XPath:   "xpath=//div[@class='example']"
  Комбинированный: "text=Price >> xpath=../../.."
`);
}

async function saveToFile(result: any, filename: string): Promise<void> {
  try {
    const outputPath = path.resolve(filename);
    const content = JSON.stringify(result, null, 2);
    
    fs.writeFileSync(outputPath, content, 'utf-8');
    console.log(`✅ Результат сохранен в файл: ${outputPath}`);
  } catch (error) {
    logger.error(`Failed to save result to file: ${filename}`, error as Error);
    throw error;
  }
}

async function main(): Promise<void> {
  const options = parseArguments();

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.url || !options.selector) {
    console.error('❌ Ошибка: Необходимо указать URL и селектор');
    console.log('\nИспользуйте --help для получения справки');
    process.exit(1);
  }

  try {
    console.log('🚀 Запуск HTML Extractor...');
    console.log(`🌐 URL: ${options.url}`);
    console.log(`🎯 Селектор: ${options.selector}`);
    
    if (options.attributes) {
      console.log(`🏷️ Атрибуты: ${options.attributes.join(', ')}`);
    }
    
    console.log('');

    await browserService.initialize();

    const result = await htmlExtractor.extractFromUrl(
      options.url,
      options.selector,
      options.attributes
    );

    htmlExtractor.printResult(result);

    if (options.output) {
      await saveToFile(result, options.output);
    }

    if (result.success) {
      console.log('✅ Извлечение HTML завершено успешно!');
      process.exit(0);
    } else {
      console.log('❌ Извлечение HTML завершено с ошибками');
      process.exit(1);
    }

  } catch (error) {
    logger.error('HTML extraction failed', error as Error);
    console.error('❌ Произошла ошибка при извлечении HTML');
    process.exit(1);
  } finally {
    await browserService.close();
  }
}

// Запуск если файл выполняется напрямую
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in main', error as Error);
    process.exit(1);
  });
}
