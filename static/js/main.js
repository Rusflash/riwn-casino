// main.js - Основной JavaScript

let sessionId = null;
let currentGame = 'lobby';

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => showLoading(false), 800);
    initGame();
    setupNavigation();
    setupGameCards();
    setupModal();
});

async function initGame() {
    try {
        showLoading(true);
        const response = await fetch('/api/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        sessionId = data.session_id;
        if (data.stats) updateUI(data.stats);
        showLoading(false);
        showNotification('🎰 Добро пожаловать в RuWin Casino!', 'success');
    } catch (error) {
        console.error('Ошибка:', error);
        showNotification('❌ Ошибка подключения к серверу', 'error');
        showLoading(false);
    }
}

function updateUI(stats) {
    if (!stats) return;
    const el = (id) => document.getElementById(id);
    if (el('balance')) el('balance').textContent = stats.balance.toLocaleString() + ' ₽';
    if (el('level')) el('level').textContent = stats.level || 1;
    if (el('totalBets')) el('totalBets').textContent = stats.total_bets || 0;
    if (el('wins')) el('wins').textContent = stats.wins || 0;
    if (el('winrate')) el('winrate').textContent = (stats.winrate || 0) + '%';
}

function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const game = this.dataset.game;
            currentGame = game;
            document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
            if (game === 'lobby') {
                document.getElementById('lobby').classList.add('active');
                document.getElementById('game-container').innerHTML = '';
                document.getElementById('game-container').classList.remove('active');
            } else {
                document.getElementById('lobby').classList.remove('active');
                document.getElementById('game-container').classList.add('active');
                loadGame(game);
            }
        });
    });
}

function setupGameCards() {
    document.querySelectorAll('.game-card-premium').forEach(card => {
        card.addEventListener('click', function() {
            const game = this.dataset.game;
            const navBtn = document.querySelector('.nav-btn[data-game="' + game + '"]');
            if (navBtn) navBtn.click();
        });
    });
}

function loadGame(game) {
    const container = document.getElementById('game-container');
    switch(game) {
        case 'roulette':
            if (typeof loadRoulette === 'function') loadRoulette(container);
            break;
        case 'slots':
            if (typeof loadSlots === 'function') loadSlots(container);
            break;
        case 'blackjack':
            if (typeof loadBlackjack === 'function') loadBlackjack(container);
            break;
        case 'crash':
            if (typeof loadCrash === 'function') loadCrash(container);
            break;
        default:
            container.innerHTML = '<div class="game-wrapper"><h2 class="game-title">🎮 ' + game.toUpperCase() + '</h2><div class="game-result info">Игра в разработке...</div></div>';
    }
}

function setupModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === this) closeModal();
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
    if (modal) modal.classList.remove('active');
}

function toggleMenu() {
    showNotification('👤 Меню пользователя', 'info');
}
