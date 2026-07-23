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
        // Получаем ID трека из URL
        const params = new URLSearchParams(window.location.search);
        const trackId = params.get('track');
        
        console.log('📍 Track ID из URL:', trackId);
        
        let query = supabase.from('tracks').select('*').eq('active', true);
        
        if (trackId) {
            query = query.eq('id', trackId);
        }
        
        const { data, error } = await query.limit(1);
        
        if (error) {
            console.error('❌ Ошибка Supabase:', error);
            statusEl.textContent = 'Ошибка БД: ' + error.message;
            return;
        }
        
        if (!data || data.length === 0) {
            statusEl.textContent = '⚠️ Нет доступных треков';
            return;
        }
        
        const track = data[0];
        console.log('✅ Трек найден:');
        console.log('  ID:', track.id);
        console.log('  Название:', track.title);
        console.log('  URL:', track.file_url);
        
        titleEl.textContent = track.title || 'Аудиопрогулка';
        statusEl.textContent = 'Загрузка аудио...';
        
        // Добавляем timestamp чтобы избежать кэширования
        const fileUrl = track.file_url + '?t=' + Date.now();
        console.log('🎵 Финальный URL:', fileUrl);
        
        // Создаем аудио
        console.log('🎵 Создание Audio объекта...');
        audio = new Audio(fileUrl);
        
        audio.addEventListener('canplay', () => {
            console.log('✅ Аудио готово к воспроизведению');
            statusEl.textContent = '✅ Готово к воспроизведению';
            playBtn.disabled = false;
            playBtn.textContent = '▶ Играть';
        });
        
        audio.addEventListener('error', (e) => {
            console.error('❌ Ошибка аудио:', e);
            console.error('Код:', audio.error?.code);
            console.error('Сообщение:', audio.error?.message);
            
            let errorMsg = 'Ошибка загрузки';
            if (audio.error?.code === 1) errorMsg = 'Ошибка сети';
            else if (audio.error?.code === 2) errorMsg = 'Файл повреждён';
            else if (audio.error?.code === 3) errorMsg = 'Ошибка декодирования';
            else if (audio.error?.code === 4) errorMsg = 'Формат не поддерживается';
            
            statusEl.textContent = '❌ ' + errorMsg;
        });
        
        audio.addEventListener('ended', () => {
            console.log('⏹️ Воспроизведение завершено');
            isPlaying = false;
            playBtn.textContent = '▶ Играть сначала';
        });
        
        console.log('🔄 Начинаем загрузку аудио...');
        audio.load();
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        statusEl.textContent = '❌ ' + error.message;
    }
}

// Обработчик кнопки Play/Pause
playBtn.addEventListener('click', async () => {
    console.log('👆 Клик по кнопке, isPlaying:', isPlaying);
    
    if (!audio) {
        console.error('❌ Audio объект не создан');
        statusEl.textContent = ' Аудио не загружено';
        return;
    }
    
    if (isPlaying) {
        // Пауза
        console.log(' Пауза');
        audio.pause();
        playBtn.textContent = '▶ Продолжить';
        isPlaying = false;
    } else {
        // Воспроизведение
        console.log('▶ Запуск воспроизведения...');
        try {
            await audio.play();
            playBtn.textContent = ' Пауза';
            isPlaying = true;
            console.log('✅ Воспроизведение началось');
        } catch (e) {
            console.error('❌ Ошибка play():', e);
            statusEl.textContent = '❌ Нажмите ещё раз';
        }
    }
});

// Запуск приложения
console.log(' Инициализация...');
init();
