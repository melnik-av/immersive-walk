import { supabase } from './supabase-config.js';

const CACHE_VERSION = 'v5';

let audio = null;
let isPlaying = false;
let wakeLock = null;

const playBtn = document.getElementById('playBtn');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('trackTitle');

// Wake Lock
async function requestWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            wakeLock = await navigator.wakeLock.request('screen');
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

// Загрузка трека
async function loadTrack() {
    try {
        console.log('Подключение к Supabase...');
        statusEl.textContent = 'Подключение к Supabase...';
        
        const { data, error } = await supabase
            .from('tracks')
            .select('*')
            .eq('active', true)
            .limit(1);

        if (error) {
            console.error('❌ Ошибка базы данных:', error);
            statusEl.textContent = `❌ Ошибка БД: ${error.message}`;
            return;
        }

        if (!data || data.length === 0) {
            console.log('️ Нет активных треков');
            statusEl.textContent = '⚠️ Нет доступных треков';
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
        
        console.log(' URL файла:', track.file_url);
        statusEl.textContent = '⏳ Скачивание трека...';
        await cacheAndPlay(track.file_url);
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        statusEl.textContent = `❌ Ошибка: ${error.message}`;
    }
}

async function cacheAndPlay(fileUrl) {
    try {
        const response = await fetch(fileUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const cache = await caches.open('audio-walk-v5');
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

function enablePlayer(fileUrl) {
    audio = new Audio(fileUrl);
    
    audio.addEventListener('canplay', () => {
        console.log('🎵 Аудио готово');
        playBtn.disabled = false;
        playBtn.textContent = '▶ Играть';
    });
    
    audio.addEventListener('error', (e) => {
        console.error('❌ Ошибка воспроизведения:', e);
    });
    
    audio.addEventListener('ended', () => {
        isPlaying = false;
        playBtn.textContent = '▶ Играть сначала';
        releaseWakeLock();
    });
}

playBtn.addEventListener('click', async () => {
    if (!audio) return;
    
    if (!isPlaying) await requestWakeLock();

    if (isPlaying) {
        audio.pause();
        playBtn.textContent = '▶ Продолжить';
        await releaseWakeLock();
    } else {
        await audio.play();
        playBtn.textContent = '⏸ Пауза';
    }
    isPlaying = !isPlaying;
});

// Запуск
console.log('🚀 Запуск приложения...');
loadTrack();
