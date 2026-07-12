// main.js - Обновленный с банком

let sessionId = null;
let currentGame = 'lobby';
let gameData = {};
let casinoBank = null;

document.addEventListener('DOMContentLoaded', function() {
    // Создаем частицы
    createParticles();
    
    // Инициализация
    initGame();
    setupNavigation();
    setupGameCards();
    setupModal();
    setupBankUI();
});

function createParticles() {
    const container = document.createElement('div');
    container.className = 'particles';
    document.body.appendChild(container);
    
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.width = (Math.random() * 3 + 1) + 'px';
        particle.style.height = particle.style.width;
        particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 10) + 's';
        container.appendChild(particle);
    }
}

async function initGame() {
    try {
        showLoading(true);
        
        const response = await fetch('/api/init', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        
        sessionId = data.session_id;
        casinoBank = new CasinoBank();
        
        updateUI(data.stats);
        updateBankUI();
        
        showLoading(false);
        
        // Приветственное уведомление
        showNotification('🎰 Добро пожаловать в RuWin Casino!', 'success');
        
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('❌ Ошибка подключения к серверу', 'error');
        showLoading(false);
    }
}

function setupBankUI() {
    // Добавляем информацию о банке в интерфейс
    const bankInfo = document.createElement('div');
    bankInfo.className = 'bank-info';
    bankInfo.innerHTML = `
        <div class="bank-balance">
            <span class="bank-label">🏦 Банк казино</span>
            <span class="bank-amount" id="bankBalance">${casinoBank.balance.toLocaleString()} ₽</span>
        </div>
        <div class="bank-stats">
            <span class="bank-stat">🎯 Преимущество: ${(casinoBank.houseEdge * 100).toFixed(1)}%</span>
            <span class="bank-stat" id="bankProfit">💰 Прибыль: ${casinoBank.currentProfit.toLocaleString()} ₽</span>
        </div>
    `;
    
    const header = document.querySelector('.header-premium');
    if (header) {
        header.appendChild(bankInfo);
    }
}

function updateBankUI() {
    if (!casinoBank) return;
    
    const bankBalance = document.getElementById('bankBalance');
    const bankProfit = document.getElementById('bankProfit');
    
    if (bankBalance) {
        bankBalance.textContent = casinoBank.balance.toLocaleString() + ' ₽';
    }
    if (bankProfit) {
        const profit = casinoBank.currentProfit;
        bankProfit.textContent = `💰 Прибыль: ${profit.toLocaleString()} ₽`;
        bankProfit.style.color = profit >= 0 ? 'var(--casino-green)' : 'var(--casino-red)';
    }
}

function showLoading(show) {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = message;
    
    container.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // Авто-удаление
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Показываем выигрыш с анимацией
function showWinAnimation(amount) {
    // Конфетти
    createConfetti();
    
    // Уведомление
    showNotification(`🎉 ВЫИГРЫШ +${amount.toLocaleString()} ₽!`, 'success');
    
    // Звук (если есть)
    playSound('win');
}

function createConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    
    const colors = ['#ffd700', '#ff0040', '#00ff88', '#00d4ff', '#8b00ff', '#ff6b00'];
    
    for (let i = 0; i < 100; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = Math.random() * 100 + '%';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.width = (Math.random() * 6 + 4) + 'px';
        piece.style.height = (Math.random() * 6 + 4) + 'px';
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (Math.random() * 2 + 1) + 's';
        piece.style.animationDelay = (Math.random() * 0.5) + 's';
        container.appendChild(piece);
    }
    
    setTimeout(() => {
        container.remove();
    }, 3000);
}

function playSound(type) {
    // Заглушка для звуков
    // В реальном проекте использовать Audio API
    console.log(`🔊 Sound: ${type}`);
}
