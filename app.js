import { supabase } from './supabase-config.js';

console.log('🚀 ПРИЛОЖЕНИЕ ЗАПУСКАЕТСЯ');

const playBtn = document.getElementById('playBtn');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('trackTitle');

let audio = null;
let isPlaying = false;

async function init() {
    console.log('📡 Загрузка трека из Supabase...');
    statusEl.textContent = 'Подключение...';
    
    try {
        // Получаем активный трек
        const { data, error } = await supabase
            .from('tracks')
            .select('*')
            .eq('active', true)
            .limit(1);
        
        if (error) {
            console.error('❌ Ошибка Supabase:', error);
            statusEl.textContent = 'Ошибка БД: ' + error.message;
            return;
        }
        
        if (!data || data.length === 0) {
            statusEl.textContent = '️ Нет доступных треков';
            console.log('⚠️ Треков нет');
            return;
        }
        
        const track = data[0];
        console.log('✅ Трек найден:', track);
        console.log(' URL:', track.file_url);
        
        titleEl.textContent = track.title || 'Аудиопрогулка';
        statusEl.textContent = 'Загрузка аудио...';
        
        // Проверяем доступность файла
        console.log('🔍 Проверка доступности файла...');
        const testResponse = await fetch(track.file_url, { method: 'HEAD' });
        console.log('📊 Статус файла:', testResponse.status, testResponse.ok);
        
        if (!testResponse.ok) {
            throw new Error(`Файл недоступен (HTTP ${testResponse.status})`);
        }
        
        // Создаем аудио объект
        console.log('🎵 Создание Audio объекта...');
        audio = new Audio(track.file_url);
        
        // События
        audio.addEventListener('canplay', () => {
            console.log('✅ Аудио готово к воспроизведению');
            statusEl.textContent = '✅ Готово к воспроизведению';
            playBtn.disabled = false;
            playBtn.textContent = '▶ Играть';
        });
        
        audio.addEventListener('canplaythrough', () => {
            console.log('✅ Аудио загружено полностью');
        });
        
        audio.addEventListener('loadeddata', () => {
            console.log('📊 Данные загружены, длительность:', audio.duration, 'сек');
        });
        
        audio.addEventListener('error', (e) => {
            console.error('❌ Ошибка аудио:', e);
            console.error('Код ошибки:', audio.error?.code);
            console.error('Сообщение:', audio.error?.message);
            
            let errorMsg = 'Ошибка загрузки';
            if (audio.error?.code === 1) errorMsg = 'Ошибка сети';
            else if (audio.error?.code === 2) errorMsg = 'Файл повреждён';
            else if (audio.error?.code === 4) errorMsg = 'Формат не поддерживается';
            
            statusEl.textContent = '❌ ' + errorMsg;
            playBtn.disabled = true;
        });
        
        audio.addEventListener('ended', () => {
            console.log('⏹️ Воспроизведение завершено');
            isPlaying = false;
            playBtn.textContent = '▶ Играть сначала';
        });
        
        // Начинаем загрузку
        console.log(' Начинаем загрузку аудио...');
        audio.load();
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        statusEl.textContent = '❌ Ошибка: ' + error.message;
    }
}

// Обработчик кнопки Play/Pause
playBtn.addEventListener('click', async () => {
    console.log('👆 Клик по кнопке, isPlaying:', isPlaying);
    
    if (!audio) {
        console.error('❌ Audio объект не создан');
        statusEl.textContent = '❌ Аудио не загружено';
        return;
    }
    
    if (isPlaying) {
        // Пауза
        console.log('⏸ Пауза');
        audio.pause();
        playBtn.textContent = '▶ Продолжить';
        isPlaying = false;
    } else {
        // Воспроизведение
        console.log('▶ Запуск воспроизведения...');
        try {
            await audio.play();
            playBtn.textContent = '⏸ Пауза';
            isPlaying = true;
            console.log('✅ Воспроизведение началось');
        } catch (e) {
            console.error('❌ Ошибка play():', e);
            statusEl.textContent = '❌ Нажмите ещё раз';
        }
    }
});

// Запускаем приложение
console.log(' Инициализация...');
init();
