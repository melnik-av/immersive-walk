import { supabase } from './supabase-config.js';

const CACHE_VERSION = 'v6';

let audio = null;
let isPlaying = false;
let wakeLock = null;

const playBtn = document.getElementById('playBtn');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('trackTitle');

// Wake Lock - не даем экрану гаснуть
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
            console.log('🔒 Wake Lock активирован');
        } catch (err) { 
            console.error('Wake Lock ошибка:', err); 
        }
    }
}

async function releaseWakeLock() {
    if (wakeLock) { 
        await wakeLock.release(); 
        wakeLock = null; 
    }
}

document.addEventListener('visibilitychange', async () => {
    if (wakeLock && document.visibilityState === 'visible' && isPlaying) {
        await requestWakeLock();
    }
});

// Получение ID трека из URL
function getTrackIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('track');
}

// Загрузка трека
async function loadTrack() {
    try {
        console.log('🚀 Подключение к Supabase...');
        statusEl.textContent = 'Подключение к Supabase...';
        
        const trackId = getTrackIdFromUrl();
        let query = supabase.from('tracks').select('*').eq('active', true);
        
        if (trackId) {
            console.log('Загрузка трека по ID:', trackId);
            query = query.eq('id', trackId);
        }
        
        query = query.limit(1);
        
        const { data, error } = await query;

        if (error) {
            console.error('❌ Ошибка базы данных:', error);
            statusEl.textContent = `❌ Ошибка БД: ${error.message}`;
            return;
        }

        if (!data || data.length === 0) {
            console.log('⚠️ Нет активных треков');
            statusEl.textContent = trackId 
                ? ' Трек не найден или недоступен' 
                : '⚠️ Нет доступных треков';
            return;
        }

        const track = data[0];
        console.log('✅ Найден трек:', track);
        titleEl.textContent = track.title || 'Аудиопрогулка';
        
        if (!track.file_url) {
            console.error('❌ Нет URL файла в базе');
            statusEl.textContent = '❌ Ошибка: нет ссылки на файл';
            return;
        }
        
        console.log('🎵 URL файла:', track.file_url);
        statusEl.textContent = '⏳ Скачивание трека...';
        await cacheAndPlay(track.file_url);
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        statusEl.textContent = `❌ Ошибка: ${error.message}`;
    }
}

// Кэширование и воспроизведение
async function cacheAndPlay(fileUrl) {
    try {
        console.log('📥 Загрузка файла:', fileUrl);
        
        // Проверяем доступность файла
        const response = await fetch(fileUrl, { method: 'HEAD' });
        console.log('📊 Статус файла:', response.status, response.ok);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Получаем размер файла
        const contentLength = response.headers.get('content-length');
        console.log('📦 Размер файла:', contentLength ? (parseInt(contentLength) / 1024 / 1024).toFixed(2) + ' MB' : 'неизвестно');
        
        // Кэшируем
        const cache = await caches.open('audio-walk-v6');
        await cache.put(fileUrl, response.clone());
        
        localStorage.setItem('audioCacheDate', Date.now().toString());
        localStorage.setItem('cacheVersion', CACHE_VERSION);
        localStorage.setItem('currentTrackUrl', fileUrl);
        
        console.log('✅ Файл закэширован');
        statusEl.textContent = '✅ Трек готов';
        enablePlayer(fileUrl);
        
    } catch (error) {
        console.error('❌ Ошибка кэширования:', error);
        statusEl.textContent = `❌ Ошибка загрузки: ${error.message}`;
    }
}

// Активация плеера
function enablePlayer(fileUrl) {
    console.log('🎵 Создание аудио элемента, URL:', fileUrl);
    
    audio = new Audio(fileUrl);
    
    // Добавляем атрибуты для iOS
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('preload', 'auto');
    
    // Событие: данные загружены и можно играть
    audio.addEventListener('loadeddata', () => {
        console.log('🎵 loadeddata - данные загружены');
        playBtn.disabled = false;
        playBtn.textContent = '▶ Играть';
    }, { once: true });
    
    // Событие: метаданные загружены
    audio.addEventListener('loadedmetadata', () => {
        console.log('🎵 loadedmetadata - метаданные:', audio.duration, 'сек');
    }, { once: true });
    
    // Событие: можно играть без остановки
    audio.addEventListener('canplaythrough', () => {
        console.log('🎵 canplaythrough - готово к воспроизведению');
        playBtn.disabled = false;
        playBtn.textContent = '▶ Играть';
    }, { once: true });
    
    // Событие: можно начать играть
    audio.addEventListener('canplay', () => {
        console.log('🎵 canplay - можно играть');
        playBtn.disabled = false;
        playBtn.textContent = '▶ Играть';
    }, { once: true });
    
    // Событие: прогресс загрузки
    audio.addEventListener('progress', (e) => {
        console.log('📥 Прогресс загрузки:', e.loaded / e.total * 100, '%');
    });
    
    // Ошибка загрузки
    audio.addEventListener('error', (e) => {
        console.error('❌ Ошибка аудио:', e);
        console.error('Код ошибки:', audio.error?.code);
        console.error('Сообщение:', audio.error?.message);
        
        let errorMsg = '❌ Ошибка загрузки аудио';
        if (audio.error?.code === 4) {
            errorMsg = '❌ Формат не поддерживается';
        } else if (audio.error?.code === 1) {
            errorMsg = '❌ Ошибка сети';
        }
        
        statusEl.textContent = errorMsg;
        playBtn.disabled = true;
        playBtn.textContent = 'Ошибка';
    });
    
    // Окончание воспроизведения
    audio.addEventListener('ended', () => {
        console.log('⏹️ Воспроизведение завершено');
        isPlaying = false;
        playBtn.textContent = '▶ Играть сначала';
        releaseWakeLock();
    });
    
    // Принудительно активируем кнопку через 3 секунды (fallback для iOS)
    setTimeout(() => {
        if (playBtn.disabled) {
            console.log('⏰ Fallback: принудительная активация кнопки');
            playBtn.disabled = false;
            playBtn.textContent = '▶ Играть';
        }
    }, 3000);
    
    // Начинаем предзагрузку
    console.log('🔄 Начинаем загрузку аудио...');
    audio.load();
}

// Обработка кнопки Play/Pause
playBtn.addEventListener('click', async () => {
    if (!audio) {
        console.error('❌ Аудио объект не создан');
        return;
    }
    
    if (!isPlaying) await requestWakeLock();

    if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶ Продолжить';
        await releaseWakeLock();
    } else {
        try {
            await audio.play();
            playBtn.textContent = '⏸ Пауза';
            console.log('▶ Воспроизведение началось');
        } catch (e) {
            console.error('❌ Ошибка play():', e);
            statusEl.textContent = ' Не удалось воспроизвести';
        }
    }
    isPlaying = !isPlaying;
});

// Запуск приложения
console.log('🚀 Запуск приложения...');
loadTrack();
