// static/main.js - ПОЛНОСТЬЮ РАБОЧАЯ ВЕРСИЯ

let sessionId = null;
let currentGame = 'lobby';
let userBalance = 10000;
let userLevel = 1;

document.addEventListener('DOMContentLoaded', function() {
    // Показываем загрузку
    showLoading(true);
    
    // Инициализация
    initGame();
    setupNavigation();
    setupGameCards();
    setupModal();
    
    // Скрываем загрузку через 1 сек
    setTimeout(() => {
        showLoading(false);
    }, 1000);
});

// ===== ИНИЦИАЛИЗАЦИЯ =====
async function initGame() {
    try {
        const response = await fetch('/api/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.success) {
            sessionId = data.session_id || 'test_session';
            
            // Обновляем UI
            if (data.stats) {
                updateUI(data.stats);
            }
            
            // Показываем приветствие
            showNotification('🎰 Добро пожаловать в RuWin Casino!', 'success');
        } else {
            // Если API не работает - используем тестовые данные
            console.warn('API не отвечает, используем тестовый режим');
            sessionId = 'test_session_' + Date.now();
            updateUI({
                balance: 10000,
                level: 1,
                total_bets: 0,
                wins: 0,
                winrate: 0
            });
            showNotification('🔧 Тестовый режим (API не подключен)', 'warning');
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        
        // Тестовый режим
        sessionId = 'test_session_' + Date.now();
        updateUI({
            balance: 10000,
            level: 1,
            total_bets: 0,
            wins: 0,
            winrate: 0
        });
        showNotification('🔧 Офлайн режим (сервер не запущен)', 'warning');
    }
}

// ===== ОБНОВЛЕНИЕ UI =====
function updateUI(stats) {
    if (!stats) return;
    
    const balanceEl = document.getElementById('balance');
    const levelEl = document.getElementById('level');
    const totalBetsEl = document.getElementById('totalBets');
    const winsEl = document.getElementById('wins');
    const winrateEl = document.getElementById('winrate');
    
    if (balanceEl) {
        userBalance = stats.balance || 10000;
        balanceEl.textContent = userBalance.toLocaleString() + ' ₽';
    }
    if (levelEl) {
        userLevel = stats.level || 1;
        levelEl.textContent = userLevel;
    }
    if (totalBetsEl) totalBetsEl.textContent = stats.total_bets || 0;
    if (winsEl) winsEl.textContent = stats.wins || 0;
    if (winrateEl) winrateEl.textContent = (stats.winrate || 0) + '%';
}

// ===== НАВИГАЦИЯ =====
function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            // Убираем активный класс у всех кнопок
            navBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const game = this.dataset.game;
            currentGame = game;
            
            // Скрываем все секции
            document.querySelectorAll('.game-section').forEach(s => {
                s.classList.remove('active');
            });
            
            if (game === 'lobby') {
                // Показываем лобби
                const lobby = document.getElementById('lobby');
                if (lobby) lobby.classList.add('active');
                
                // Очищаем контейнер игр
                const container = document.getElementById('game-container');
                if (container) {
                    container.innerHTML = '';
                    container.classList.remove('active');
                }
            } else {
                // Скрываем лобби
                const lobby = document.getElementById('lobby');
                if (lobby) lobby.classList.remove('active');
                
                // Показываем контейнер игр
                const container = document.getElementById('game-container');
                if (container) {
                    container.classList.add('active');
                    loadGame(game);
                }
            }
        });
    });
}

// ===== КАРТОЧКИ ИГР =====
function setupGameCards() {
    const cards = document.querySelectorAll('.game-card-premium');
    
    cards.forEach(card => {
        card.addEventListener('click', function() {
            const game = this.dataset.game;
            const navBtn = document.querySelector(`.nav-btn[data-game="${game}"]`);
            if (navBtn) {
                navBtn.click();
            } else {
                // Если кнопки нет в навигации - создаем
                showNotification('⚠️ Игра "' + game + '" в разработке', 'warning');
            }
        });
    });
}

// ===== ЗАГРУЗКА ИГР =====
function loadGame(game) {
    const container = document.getElementById('game-container');
    if (!container) return;
    
    // Показываем загрузку
    container.innerHTML = `
        <div class="game-wrapper">
            <div style="text-align:center;padding:40px;">
                <div class="loading-spinner" style="margin:0 auto;"></div>
                <p style="color:var(--text-secondary);margin-top:20px;">Загрузка игры...</p>
            </div>
        </div>
    `;
    
    // Загружаем игру с задержкой для анимации
    setTimeout(() => {
        try {
            switch(game) {
                case 'roulette':
                    if (typeof loadRoulette === 'function') {
                        loadRoulette(container);
                    } else {
                        showGameNotReady(container, 'Рулетка', '🎰');
                    }
                    break;
                    
                case 'slots':
                    if (typeof loadSlots === 'function') {
                        loadSlots(container);
                    } else {
                        showGameNotReady(container, 'Слоты', '🎲');
                    }
                    break;
                    
                case 'blackjack':
                    if (typeof loadBlackjack === 'function') {
                        loadBlackjack(container);
                    } else {
                        showGameNotReady(container, 'Блэкджек', '🃏');
                    }
                    break;
                    
                case 'crash':
                    if (typeof loadCrash === 'function') {
                        loadCrash(container);
                    } else {
                        showGameNotReady(container, 'Aviator', '✈️');
                    }
                    break;
                    
                default:
                    showGameNotReady(container, game.charAt(0).toUpperCase() + game.slice(1), '🎮');
            }
        } catch (error) {
            console.error('Ошибка загрузки игры:', error);
            container.innerHTML = `
                <div class="game-wrapper">
                    <h2 class="game-title">❌ ОШИБКА</h2>
                    <div class="game-result loss">Не удалось загрузить игру</div>
                    <button class="spin-btn" onclick="location.reload()">🔄 Обновить</button>
                </div>
            `;
        }
    }, 500);
}

// ===== ЗАГЛУШКА ДЛЯ НЕГОТОВЫХ ИГР =====
function showGameNotReady(container, name, icon) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">${icon} ${name}</h2>
            <div class="game-result info" style="padding:40px;text-align:center;">
                <div style="font-size:64px;margin-bottom:20px;">🚧</div>
                <h3 style="margin-bottom:10px;">Игра в разработке</h3>
                <p style="color:var(--text-secondary);">Скоро появится!</p>
            </div>
            <button class="spin-btn" onclick="document.querySelector('.nav-btn[data-game=\\'lobby\\']').click()">
                🏠 Вернуться в лобби
            </button>
        </div>
    `;
}

// ===== МОДАЛКА =====
function setupModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    }
}

function showModal(content) {
    const modal = document.getElementById('modal');
    const body = document.getElementById('modalBody');
    
    if (modal && body) {
        body.innerHTML = content;
        modal.classList.add('active');
    }
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
function toggleMenu() {
    showModal(`
        <div style="text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">👤</div>
            <h3 style="margin-bottom:5px;">Профиль</h3>
            <p style="color:var(--text-secondary);">Баланс: ${userBalance.toLocaleString()} ₽</p>
            <p style="color:var(--text-secondary);">Уровень: ${userLevel}</p>
            <hr style="border-color:rgba(255,255,255,0.05);margin:15px 0;">
            <button class="spin-btn" onclick="closeModal()" style="max-width:200px;margin:0 auto;">Закрыть</button>
        </div>
    `);
}

// Глобальные функции
window.showModal = showModal;
window.closeModal = closeModal;
window.showNotification = showNotification;
window.showLoading = showLoading;
window.updateUI = updateUI;

console.log('✅ RuWin Casino загружен!');
