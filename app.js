import { supabase } from './supabase-config.js';

console.log('🚀 ПРИЛОЖЕНИЕ ЗАПУСКАЕТСЯ');

const playBtn = document.getElementById('playBtn');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('trackTitle');
const descriptionBlock = document.getElementById('descriptionBlock');
const descriptionText = document.getElementById('trackDescription');

let audio = null;
let isPlaying = false;
let currentTrackId = null;
let playCounted = false; // Чтобы не считать одно прослушивание дважды

async function init() {
    console.log('📡 Загрузка трека из Supabase...');
    statusEl.textContent = 'Подключение...';
    
    try {
        const params = new URLSearchParams(window.location.search);
        const trackId = params.get('track');
        
        console.log(' Track ID из URL:', trackId);
        
        let query = supabase.from('tracks').select('*').eq('active', true);
        
        if (trackId) {
            query = query.eq('id', trackId);
        }
        
        const { data, error } = await query.limit(1);
        
        if (error) {
            console.error(' Ошибка Supabase:', error);
            statusEl.textContent = 'Ошибка БД: ' + error.message;
            return;
        }
        
        if (!data || data.length === 0) {
            statusEl.textContent = '⚠️ Нет доступных треков';
            return;
        }
        
        const track = data[0];
        currentTrackId = track.id;
        console.log('✅ Трек найден:');
        console.log('  ID:', track.id);
        console.log('  Название:', track.title);
        console.log('  Описание:', track.description);
        console.log('  URL:', track.file_url);
        console.log('  Прослушиваний:', track.play_count || 0);
        
        titleEl.textContent = track.title || 'Аудиопрогулка';
        
        if (track.description && track.description.trim()) {
            descriptionText.textContent = track.description;
            descriptionBlock.style.display = 'block';
        } else {
            descriptionBlock.style.display = 'none';
        }
        
        statusEl.textContent = 'Загрузка аудио...';
        
        const fileUrl = track.file_url + '?t=' + Date.now();
        console.log('🎵 Финальный URL:', fileUrl);
        
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
            
            let errorMsg = 'Ошибка загрузки';
            if (audio.error?.code === 1) errorMsg = 'Ошибка сети';
            else if (audio.error?.code === 2) errorMsg = 'Файл повреждён';
            else if (audio.error?.code === 3) errorMsg = 'Ошибка декодирования';
            else if (audio.error?.code === 4) errorMsg = 'Формат не поддерживается';
            
            statusEl.textContent = '❌ ' + errorMsg;
        });
        
        audio.addEventListener('ended', () => {
            console.log('️ Воспроизведение завершено');
            isPlaying = false;
            playBtn.textContent = '▶ Играть сначала';
        });
        
        audio.load();
        
    } catch (error) {
        console.error('💥 Критическая ошибка:', error);
        statusEl.textContent = '❌ ' + error.message;
    }
}

// Увеличение счетчика прослушиваний
async function incrementPlayCount() {
    if (!currentTrackId || playCounted) return;
    
    try {
        console.log(' Увеличиваем счетчик прослушиваний...');
        
        // Вызываем RPC функцию
        const { error } = await supabase.rpc('increment_play_count', {
            track_id: currentTrackId
        });
        
        if (error) {
            console.error('❌ Ошибка увеличения счетчика:', error);
        } else {
            console.log('✅ Счетчик увеличен');
            playCounted = true; // Помечаем что уже посчитали
        }
    } catch (e) {
        console.error('💥 Ошибка статистики:', e);
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
        console.log('⏸ Пауза');
        audio.pause();
        playBtn.textContent = '▶ Продолжить';
        isPlaying = false;
    } else {
        console.log('▶ Запуск воспроизведения...');
        try {
            await audio.play();
            playBtn.textContent = ' Пауза';
            isPlaying = true;
            console.log('✅ Воспроизведение началось');
            
            // Увеличиваем счетчик при первом запуске
            await incrementPlayCount();
        } catch (e) {
            console.error('❌ Ошибка play():', e);
            statusEl.textContent = '❌ Нажмите ещё раз';
        }
    }
});

console.log('🚀 Инициализация...');
init();
