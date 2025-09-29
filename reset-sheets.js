const { GoogleSheetsService } = require('./dist/services/googleSheetsService');
const config = require('./dist/config/config');

async function resetSheets() {
  console.log('🔄 Сброс Google Sheets...');
  
  try {
    const googleSheetsService = new GoogleSheetsService(config.googleSheets);
    await googleSheetsService.initialize();
    
    console.log('✅ Инициализация Google Sheets успешна');
    
    // Пересоздаем листы
    await googleSheetsService.ensureSheetsExist();
    
    console.log('✅ Листы пересозданы с правильной структурой');
    console.log('🎯 Теперь можно запускать анализ!');
    
  } catch (error) {
    console.error('❌ Ошибка при сбросе листов:', error.message);
  }
}

resetSheets();
