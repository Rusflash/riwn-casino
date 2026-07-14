// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let userId = null;
let userBalance = 10000;
let userLevel = 1;
let sessionId = null;
let currentGame = 'lobby';

// ============================================================
// ЗАГРУЗКА СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        document.getElementById('loadingOverlay').classList.remove('active');
    }, 800);

    const savedId = localStorage.getItem('ruwin_user_id');
    const savedName = localStorage.getItem('ruwin_username');

    if (savedId) {
        userId = savedId;
        sessionId = savedId;
        document.getElementById('app').style.display = 'block';
        document.getElementById('authModal').classList.remove('active');
        initGame();
    } else {
        document.getElementById('app').style.display = 'none';
        document.getElementById('authModal').classList.add('active');
    }

    setupNavigation();
    setupGameCards();
});

// ============================================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================================
async function initGame() {
    try {
        const response = await fetch('/api/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId || 'test_001' })
        });
        const data = await response.json();
        if (data.success) {
            sessionId = data.stats?.user_id || 'test_001';
            updateUI(data.stats);
            if (data.pool) {
                const bankEl = document.getElementById('bankBalance');
                if (bankEl) bankEl.textContent = data.pool.toLocaleString() + ' ₽';
            }
        }
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        sessionId = 'test_001';
        // Пробуем получить баланс через отдельный запрос
        refreshBalance();
    }
}

async function refreshBalance() {
    try {
        const response = await fetch('/api/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001' })
        });
        const data = await response.json();
        if (data.success) {
            userBalance = data.balance;
            updateBalanceDisplay();
        }
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
    }
}

function updateUI(stats) {
    if (!stats) return;
    
    userBalance = stats.balance || 10000;
    userLevel = stats.level || 1;
    
    updateBalanceDisplay();
    updateLevelDisplay();
    
    if (document.getElementById('totalBetsStat')) {
        document.getElementById('totalBetsStat').textContent = stats.total_bets || 0;
    }
    if (document.getElementById('winsStat')) {
        document.getElementById('winsStat').textContent = stats.wins || 0;
    }
    if (document.getElementById('winrateStat')) {
        document.getElementById('winrateStat').textContent = (stats.winrate || 0) + '%';
    }
}

function updateBalanceDisplay() {
    const balanceEls = document.querySelectorAll('.balance, #balance, #balanceDisplay');
    balanceEls.forEach(el => {
        if (el) el.textContent = userBalance.toLocaleString() + ' ₽';
    });
}

function updateLevelDisplay() {
    const levelEls = document.querySelectorAll('.level, #level');
    levelEls.forEach(el => {
        if (el) el.textContent = userLevel;
    });
}

function getCurrentBalance() {
    return userBalance;
}

function checkBalance(amount) {
    if (amount > userBalance) {
        showNotification('❌ Недостаточно средств! Баланс: ' + userBalance.toLocaleString() + ' ₽', 'error');
        return false;
    }
    return true;
}

// ============================================================
// НАВИГАЦИЯ
// ============================================================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const game = this.dataset.game;
            currentGame = game;
            const lobby = document.getElementById('lobby');
            const container = document.getElementById('gameContainer');
            if (game === 'lobby') {
                lobby.style.display = 'block';
                container.classList.remove('active');
                container.innerHTML = '';
                refreshBalance();
            } else {
                lobby.style.display = 'none';
                container.classList.add('active');
                loadGame(game);
            }
        });
    });
}

function setupGameCards() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const game = this.dataset.game;
            const navBtn = document.querySelector('.nav-btn[data-game="' + game + '"]');
            if (navBtn) navBtn.click();
        });
    });
}

// ============================================================
// ЗАГРУЗКА ИГР
// ============================================================
function loadGame(game) {
    const container = document.getElementById('gameContainer');
    switch(game) {
        case 'slots': loadSlots(container); break;
        case 'roulette': loadRoulette(container); break;
        case 'blackjack': loadBlackjack(container); break;
        case 'crash': loadCrash(container); break;
        case 'dice': loadDice(container); break;
        default: container.innerHTML = `<div class="game-wrapper"><h2 class="game-title">🎮 ${game.toUpperCase()}</h2><div class="game-result info">В разработке...</div></div>`;
    }
}

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================
function switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    tabs.forEach((t, i) => {
        if (i === (tab === 'login' ? 0 : 1)) {
            t.classList.add('active');
            forms[i].style.display = 'block';
        } else {
            t.classList.remove('active');
            forms[i].style.display = 'none';
        }
    });
    document.getElementById('loginError').textContent = '';
    document.getElementById('registerError').textContent = '';
    document.getElementById('registerSuccess').textContent = '';
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    errorEl.textContent = '⏳ Вход...';
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        if (data.success) {
            userId = data.user_id;
            sessionId = data.user_id;
            localStorage.setItem('ruwin_user_id', userId);
            localStorage.setItem('ruwin_username', data.username);
            document.getElementById('authModal').classList.remove('active');
            document.getElementById('app').style.display = 'block';
            if (data.stats) updateUI(data.stats);
            showNotification('✅ Добро пожаловать, ' + data.username + '!', 'success');
            initGame();
        } else {
            errorEl.textContent = '❌ ' + data.error;
        }
    } catch (error) {
        errorEl.textContent = '❌ Ошибка соединения';
    }
    return false;
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const email = document.getElementById('regEmail').value.trim();
    const errorEl = document.getElementById('registerError');
    const successEl = document.getElementById('registerSuccess');
    errorEl.textContent = '';
    successEl.textContent = '⏳ Регистрация...';
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        const data = await response.json();
        if (data.success) {
            successEl.textContent = '✅ ' + data.message + ' Теперь войдите!';
            document.getElementById('regUsername').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regEmail').value = '';
            setTimeout(() => switchAuthTab('login'), 1500);
        } else {
            errorEl.textContent = '❌ ' + data.error;
            successEl.textContent = '';
        }
    } catch (error) {
        errorEl.textContent = '❌ Ошибка соединения';
        successEl.textContent = '';
    }
    return false;
}

function handleLogout() {
    userId = null;
    sessionId = null;
    localStorage.removeItem('ruwin_user_id');
    localStorage.removeItem('ruwin_username');
    document.getElementById('app').style.display = 'none';
    document.getElementById('authModal').classList.add('active');
    showNotification('👋 Вы вышли из аккаунта', 'info');
}

function toggleProfile() {
    const modal = document.getElementById('profileModal');
    const body = document.getElementById('profileBody');
    body.innerHTML = `
        <div style="text-align:center;">
            <div style="font-size:48px;margin-bottom:10px;">👤</div>
            <h3 style="margin-bottom:4px;color:var(--text-primary);">${localStorage.getItem('ruwin_username') || 'Игрок'}</h3>
            <p style="color:var(--text-secondary);margin-bottom:4px;">💰 Баланс: ${userBalance.toLocaleString()} ₽</p>
            <p style="color:var(--text-secondary);margin-bottom:16px;">🏆 Уровень: ${userLevel}</p>
            <button onclick="document.getElementById('profileModal').classList.remove('active')" style="padding:10px 30px;background:var(--bg-card);border:1px solid var(--neon-cyan);border-radius:10px;color:var(--text-primary);cursor:pointer;">Закрыть</button>
        </div>
    `;
    modal.classList.add('active');
}

// ============================================================
// УВЕДОМЛЕНИЯ
// ============================================================
function showNotification(message, type = 'info', duration = 4000) {
    const container = document.getElementById('notifications');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = 'notification ' + type;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 10);
    const timeout = setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    }, duration);
    notification.addEventListener('click', () => {
        clearTimeout(timeout);
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 400);
    });
}

// ============================================================
// РУЛЕТКА
// ============================================================
let rouletteState = { betType: 'number', selectedNumber: null };

function loadRoulette(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎡 ЕВРОПЕЙСКАЯ РУЛЕТКА</h2>
            <div class="roulette-board" id="rouletteBoard">${generateRouletteNumbers()}</div>
            <div class="game-result info" id="rouletteResult">Сделайте ставку!</div>
            <div class="bet-grid">
                <button class="bet-btn active" data-type="number">🎯 Число</button>
                <button class="bet-btn red" data-type="red">🔴 Красное</button>
                <button class="bet-btn" data-type="black">⚫ Чёрное</button>
                <button class="bet-btn" data-type="even">2️⃣ Чёт</button>
                <button class="bet-btn" data-type="odd">1️⃣ Нечёт</button>
                <button class="bet-btn" data-type="half1">⬆ 1-18</button>
                <button class="bet-btn" data-type="half2">⬇ 19-36</button>
            </div>
            <div id="numberSelector">
                <label style="font-size:11px;color:var(--text-secondary);">Выберите число:</label>
                <div class="number-grid">${generateNumberSelector()}</div>
            </div>
            <input type="number" id="rouletteBet" class="game-input" value="10" min="1">
            <button class="spin-btn" id="rouletteSpin">🎰 СПИН</button>
        </div>
    `;
    setupRouletteEvents();
}

function generateRouletteNumbers() {
    const nums = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    return nums.map(n => {
        const c = n === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) ? 'red' : 'black';
        return `<div class="roulette-number ${c}" data-number="${n}">${n}</div>`;
    }).join('');
}

function generateNumberSelector() {
    let html = '';
    for (let i = 0; i <= 36; i++) {
        const c = i === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(i) ? 'red' : 'black';
        html += `<button class="num-btn" data-number="${i}" style="color:${i === 0 ? '#00cc44' : c === 'red' ? '#ff0040' : '#fff'}">${i}</button>`;
    }
    return html;
}

function setupRouletteEvents() {
    document.querySelectorAll('.bet-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            rouletteState.betType = this.dataset.type;
            document.getElementById('numberSelector').style.display = rouletteState.betType === 'number' ? 'block' : 'none';
        });
    });
    document.querySelectorAll('.num-btn').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('.num-btn').forEach(n => n.classList.remove('selected'));
            this.classList.add('selected');
            rouletteState.selectedNumber = parseInt(this.dataset.number);
        });
    });
    document.getElementById('rouletteSpin').addEventListener('click', rouletteSpin);
}

async function rouletteSpin() {
    const spinBtn = document.getElementById('rouletteSpin');
    if (spinBtn.disabled) return;
    const bet = parseInt(document.getElementById('rouletteBet').value);
    if (isNaN(bet) || bet <= 0) { showNotification('❌ Введите сумму!', 'error'); return; }
    if (!checkBalance(bet)) return;
    const payload = { user_id: sessionId || 'test_001', bet: bet, type: rouletteState.betType };
    if (rouletteState.betType === 'number') {
        if (rouletteState.selectedNumber === null) { showNotification('❌ Выберите число!', 'error'); return; }
        payload.number = rouletteState.selectedNumber;
    }
    spinBtn.disabled = true;
    document.getElementById('rouletteResult').className = 'game-result info';
    document.getElementById('rouletteResult').textContent = '⏳ Крутим...';
    document.getElementById('rouletteBoard').classList.add('spinning');
    try {
        const response = await fetch('/api/game/roulette', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
            const result = document.getElementById('rouletteResult');
            result.className = 'game-result ' + (data.win ? 'win' : 'loss');
            result.innerHTML = `Выпало: <strong style="color:${data.color === 'red' ? '#ff0040' : data.color === 'green' ? '#00cc44' : '#fff'}">${data.result}</strong> (${data.color.toUpperCase()})<br>${data.win ? '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽' : '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽'}`;
            if (data.win) {
                showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
            } else {
                showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
            }
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            updateUI(data.stats);
        } else {
            showNotification('❌ ' + data.error, 'error');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
        }
    } catch (error) { showNotification('❌ Ошибка соединения!', 'error'); }
    setTimeout(() => {
        spinBtn.disabled = false;
        document.getElementById('rouletteBoard').classList.remove('spinning');
    }, 2000);
}

// ============================================================
// СЛОТЫ
// ============================================================
function loadSlots(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎰 СЛОТЫ</h2>
            <div class="slots-reels" id="slotsReels">
                <div class="slot-reel"><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div></div>
                <div class="slot-reel"><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div></div>
                <div class="slot-reel"><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div></div>
            </div>
            <div class="game-result info" id="slotsResult">Сделайте ставку!</div>
            <input type="number" id="slotsBet" class="game-input" value="10" min="1">
            <button class="spin-btn" id="slotsSpinBtn">🎰 КРУТИТЬ</button>
        </div>
    `;
    document.getElementById('slotsSpinBtn').addEventListener('click', slotsSpin);
}

async function slotsSpin() {
    const spinBtn = document.getElementById('slotsSpinBtn');
    if (spinBtn.disabled) return;
    const bet = parseInt(document.getElementById('slotsBet').value);
    if (isNaN(bet) || bet <= 0) { showNotification('❌ Введите сумму!', 'error'); return; }
    if (!checkBalance(bet)) return;
    spinBtn.disabled = true;
    document.querySelectorAll('.slot-reel').forEach(r => r.classList.add('spinning'));
    document.getElementById('slotsResult').className = 'game-result info';
    document.getElementById('slotsResult').textContent = '⏳ Крутим...';
    try {
        const response = await fetch('/api/game/slots', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', bet: bet })
        });
        const data = await response.json();
        if (data.success) {
            const reels = document.querySelectorAll('.slot-reel');
            reels.forEach((reel, idx) => {
                setTimeout(() => {
                    reel.classList.remove('spinning');
                    const symbols = reel.querySelectorAll('.slot-symbol');
                    symbols.forEach((sym, row) => {
                        const pos = idx * 3 + row;
                        if (data.reels && data.reels[pos]) sym.textContent = data.reels[pos];
                    });
                }, idx * 300 + 500);
            });
            setTimeout(() => {
                const result = document.getElementById('slotsResult');
                result.className = 'game-result ' + (data.win ? 'win' : 'loss');
                result.textContent = data.win ? '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽' : '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽';
                if (data.win) {
                    showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
                } else {
                    showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
                }
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                }
                updateUI(data.stats);
            }, 2000);
        } else {
            showNotification('❌ ' + data.error, 'error');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
        }
    } catch (error) { showNotification('❌ Ошибка соединения!', 'error'); }
    setTimeout(() => {
        spinBtn.disabled = false;
        document.querySelectorAll('.slot-reel').forEach(r => r.classList.remove('spinning'));
    }, 3000);
}

// ============================================================
// БЛЭКДЖЕК
// ============================================================
let blackjackState = { deck: [], playerHand: [], dealerHand: [], bet: 0, gameOver: false };

function loadBlackjack(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🃏 БЛЭКДЖЕК</h2>
            <div class="blackjack-table">
                <div class="blackjack-hand">
                    <h4>🤖 Карты дилера</h4>
                    <div class="blackjack-cards" id="dealerCards"><div class="blackjack-card">?</div><div class="blackjack-card">?</div></div>
                    <div style="margin-top:8px;font-size:18px;font-weight:700;color:var(--text-secondary);" id="dealerSum">Сумма: 0</div>
                </div>
                <div class="blackjack-hand">
                    <h4>👤 Ваши карты</h4>
                    <div class="blackjack-cards" id="playerCards"><div class="blackjack-card">?</div><div class="blackjack-card">?</div></div>
                    <div style="margin-top:8px;font-size:18px;font-weight:700;color:var(--text-secondary);" id="playerSum">Сумма: 0</div>
                </div>
                <div class="game-result info" id="blackjackResult">Сделайте ставку!</div>
                <input type="number" id="blackjackBet" class="game-input" value="10" min="1">
                <div class="blackjack-actions">
                    <button class="blackjack-action" id="blackjackStart">🃏 СТАРТ</button>
                    <button class="blackjack-action" id="blackjackHit" disabled>✋ ВЗЯТЬ</button>
                    <button class="blackjack-action" id="blackjackStand" disabled>✋ СТОП</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('blackjackStart').addEventListener('click', blackjackStart);
    document.getElementById('blackjackHit').addEventListener('click', blackjackHit);
    document.getElementById('blackjackStand').addEventListener('click', blackjackStand);
}

function sumHand(hand) {
    let sum = hand.reduce((a, b) => a + b, 0);
    let aces = hand.filter(c => c === 11).length;
    while (sum > 21 && aces > 0) { sum -= 10; aces--; }
    return sum;
}

async function blackjackStart() {
    const bet = parseInt(document.getElementById('blackjackBet').value);
    if (isNaN(bet) || bet <= 0) { showNotification('❌ Введите сумму!', 'error'); return; }
    if (!checkBalance(bet)) return;
    blackjackState.bet = bet;
    try {
        const response = await fetch('/api/game/blackjack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', bet: bet, action: 'start' })
        });
        const data = await response.json();
        if (data.success) {
            blackjackState.deck = data.deck || [];
            blackjackState.playerHand = data.player_hand || [];
            blackjackState.dealerHand = data.dealer_hand || [];
            blackjackState.gameOver = data.game_over || false;
            updateBlackjackUI(data);
            if (data.game_over) {
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                }
                updateUI(data.stats);
            }
            document.getElementById('blackjackHit').disabled = data.game_over;
            document.getElementById('blackjackStand').disabled = data.game_over;
        } else {
            showNotification('❌ ' + data.error, 'error');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
        }
    } catch (error) { showNotification('❌ Ошибка!', 'error'); }
}

async function blackjackHit() {
    if (blackjackState.gameOver) return;
    try {
        const response = await fetch('/api/game/blackjack/hit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', deck: blackjackState.deck, player_hand: blackjackState.playerHand, bet: blackjackState.bet })
        });
        const data = await response.json();
        if (data.success) {
            blackjackState.deck = data.deck;
            blackjackState.playerHand = data.player_hand;
            blackjackState.gameOver = data.game_over || false;
            updateBlackjackUI(data);
            if (data.game_over) {
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                }
                updateUI(data.stats);
            }
        }
    } catch (error) { showNotification('❌ Ошибка!', 'error'); }
}

async function blackjackStand() {
    if (blackjackState.gameOver) return;
    try {
        const response = await fetch('/api/game/blackjack/stand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', deck: blackjackState.deck, player_hand: blackjackState.playerHand, dealer_hand: blackjackState.dealerHand, bet: blackjackState.bet })
        });
        const data = await response.json();
        if (data.success) {
            blackjackState.gameOver = true;
            updateBlackjackUI(data);
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            updateUI(data.stats);
        }
    } catch (error) { showNotification('❌ Ошибка!', 'error'); }
}

function updateBlackjackUI(data) {
    const playerCards = document.getElementById('playerCards');
    const dealerCards = document.getElementById('dealerCards');
    if (data.player_hand) {
        playerCards.innerHTML = data.player_hand.map(c => {
            const color = c > 10 ? 'red' : 'black';
            const value = c === 11 ? 'A' : c === 10 ? '10' : c;
            return `<div class="blackjack-card ${color}">${value}</div>`;
        }).join('');
        document.getElementById('playerSum').textContent = 'Сумма: ' + sumHand(data.player_hand);
    }
    if (data.dealer_hand) {
        dealerCards.innerHTML = data.dealer_hand.map(c => {
            if (c === '?') return '<div class="blackjack-card">?</div>';
            const color = c > 10 ? 'red' : 'black';
            const value = c === 11 ? 'A' : c === 10 ? '10' : c;
            return `<div class="blackjack-card ${color}">${value}</div>`;
        }).join('');
        const dealerSum = data.dealer_hand.filter(c => c !== '?').length > 0 ? sumHand(data.dealer_hand.filter(c => c !== '?')) : 0;
        document.getElementById('dealerSum').textContent = 'Сумма: ' + dealerSum;
    }
    const result = document.getElementById('blackjackResult');
    if (data.game_over) {
        if (data.win === true) {
            result.className = 'game-result win';
            result.textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽';
            showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
        } else if (data.win === false) {
            result.className = 'game-result loss';
            result.textContent = '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽';
            showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
        } else {
            result.className = 'game-result info';
            result.textContent = '🤝 НИЧЬЯ';
        }
        document.getElementById('blackjackHit').disabled = true;
        document.getElementById('blackjackStand').disabled = true;
    } else {
        result.className = 'game-result info';
        result.textContent = 'Игра продолжается...';
    }
}

// ============================================================
// AVIATOR
// ============================================================
let crashState = { multiplier: 1, isActive: false, isBetPlaced: false, crashPoint: 0, bet: 0, interval: null, startTime: 0, isCrashed: false };

function loadCrash(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">✈️ AVIATOR</h2>
            <div class="crash-chart" id="crashChart">
                <div class="crash-multiplier" id="crashMultiplier">1.00x</div>
            </div>
            <div class="game-result info" id="crashResult">Сделайте ставку!</div>
            <input type="number" id="crashBet" class="game-input" value="10" min="1">
            <div class="crash-controls">
                <button class="crash-btn bet" id="crashStart">🚀 СТАВКА</button>
                <button class="crash-btn cashout" id="crashCashout" disabled>💰 ЗАБРАТЬ</button>
            </div>
            <div class="crash-history" id="crashHistory"></div>
        </div>
    `;
    document.getElementById('crashStart').addEventListener('click', crashStart);
    document.getElementById('crashCashout').addEventListener('click', crashCashout);
    resetCrash();
}

async function crashStart() {
    if (crashState.isActive || crashState.isBetPlaced) return;
    const bet = parseInt(document.getElementById('crashBet').value);
    if (isNaN(bet) || bet <= 0) { showNotification('❌ Введите сумму!', 'error'); return; }
    if (!checkBalance(bet)) return;
    crashState.bet = bet;
    crashState.isBetPlaced = true;
    crashState.isActive = true;
    crashState.isCrashed = false;
    crashState.multiplier = 1;
    crashState.startTime = Date.now();
    document.getElementById('crashStart').disabled = true;
    document.getElementById('crashCashout').disabled = false;
    document.getElementById('crashResult').className = 'game-result info';
    document.getElementById('crashResult').textContent = '✈️ Самолет взлетает...';
    document.getElementById('crashMultiplier').classList.remove('crashed');
    document.getElementById('crashMultiplier').textContent = '1.00x';
    try {
        const response = await fetch('/api/game/crash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', action: 'start', bet: bet })
        });
        const data = await response.json();
        if (data.success) {
            crashState.crashPoint = data.crash_point;
            let lastMultiplier = 1;
            crashState.interval = setInterval(() => {
                if (crashState.isCrashed) return;
                const elapsed = (Date.now() - crashState.startTime) / 1000;
                const progress = Math.min(elapsed / 4, 1);
                if (progress < 1) {
                    const ease = 1 - Math.pow(1 - progress, 1.5);
                    crashState.multiplier = 1 + ease * (crashState.crashPoint - 1);
                } else {
                    crashState.multiplier = crashState.crashPoint;
                }
                const displayMultiplier = Math.round(crashState.multiplier * 100) / 100;
                document.getElementById('crashMultiplier').textContent = displayMultiplier.toFixed(2) + 'x';
                if (displayMultiplier > lastMultiplier + 0.05) {
                    const el = document.getElementById('crashMultiplier');
                    el.style.transform = 'scale(1.05)';
                    setTimeout(() => el.style.transform = 'scale(1)', 100);
                    lastMultiplier = displayMultiplier;
                }
                if (crashState.multiplier >= crashState.crashPoint - 0.005) {
                    clearInterval(crashState.interval);
                    crashCrash();
                }
            }, 50);
        } else {
            showNotification('❌ ' + data.error, 'error');
            resetCrash();
        }
    } catch (error) { showNotification('❌ Ошибка!', 'error'); resetCrash(); }
}

async function crashCashout() {
    if (!crashState.isActive || !crashState.isBetPlaced || crashState.isCrashed) return;
    clearInterval(crashState.interval);
    crashState.isActive = false;
    document.getElementById('crashCashout').disabled = true;
    const currentMultiplier = Math.round(crashState.multiplier * 100) / 100;
    try {
        const response = await fetch('/api/game/crash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', action: 'cashout', bet: crashState.bet, multiplier: currentMultiplier })
        });
        const data = await response.json();
        if (data.success) {
            const result = document.getElementById('crashResult');
            result.className = 'game-result win';
            result.textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽ (' + currentMultiplier.toFixed(2) + 'x)';
            showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            updateUI(data.stats);
            addCrashHistory(currentMultiplier, true);
            resetCrash();
        }
    } catch (error) { showNotification('❌ Ошибка!', 'error'); resetCrash(); }
}

async function crashCrash() {
    if (crashState.isCrashed) return;
    crashState.isCrashed = true;
    crashState.isActive = false;
    document.getElementById('crashCashout').disabled = true;
    document.getElementById('crashMultiplier').classList.add('crashed');
    const finalMultiplier = Math.round(crashState.multiplier * 100) / 100;
    const result = document.getElementById('crashResult');
    result.className = 'game-result loss';
    result.textContent = '💥 КРАШ! (' + finalMultiplier.toFixed(2) + 'x)';
    try {
        const response = await fetch('/api/game/crash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', action: 'crash', bet: crashState.bet })
        });
        const data = await response.json();
        if (data.success) {
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            updateUI(data.stats);
            showNotification('💥 КРАШ! Проигрыш ' + crashState.bet + ' ₽', 'error');
            addCrashHistory(finalMultiplier, false);
        }
    } catch (error) {}
    resetCrash();
}

function resetCrash() {
    crashState.isActive = false;
    crashState.isBetPlaced = false;
    crashState.isCrashed = false;
    crashState.multiplier = 1;
    if (crashState.interval) { clearInterval(crashState.interval); crashState.interval = null; }
    document.getElementById('crashStart').disabled = false;
    document.getElementById('crashCashout').disabled = true;
    document.getElementById('crashMultiplier').classList.remove('crashed');
    document.getElementById('crashMultiplier').textContent = '1.00x';
}

function addCrashHistory(point, win) {
    const history = document.getElementById('crashHistory');
    const item = document.createElement('span');
    item.className = 'crash-history-item ' + (win ? 'win' : 'loss');
    item.textContent = point.toFixed(2) + 'x';
    history.prepend(item);
    if (history.children.length > 10) history.removeChild(history.lastChild);
}

// ============================================================
// КОСТИ
// ============================================================
let diceBetType = 'over';

function loadDice(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎲 КОСТИ</h2>
            <div class="dice-display">
                <div class="die" id="die1">⚀</div>
                <div class="die" id="die2">⚀</div>
            </div>
            <div class="game-result info" id="diceResult">Бросьте кости!</div>
            <div class="dice-options">
                <button class="dice-btn active" data-type="over">⬆ Больше 7</button>
                <button class="dice-btn" data-type="under">⬇ Меньше 7</button>
                <button class="dice-btn" data-type="seven">🎯 Ровно 7</button>
            </div>
            <input type="number" id="diceBet" class="game-input" value="10" min="1">
            <button class="spin-btn" id="diceBtn">🎲 БРОСИТЬ</button>
        </div>
    `;
    document.querySelectorAll('.dice-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.dice-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            diceBetType = this.dataset.type;
        });
    });
    document.getElementById('diceBtn').addEventListener('click', rollDice);
}

async function rollDice() {
    const btn = document.getElementById('diceBtn');
    if (btn.disabled) return;
    const bet = parseInt(document.getElementById('diceBet').value);
    if (isNaN(bet) || bet <= 0) { showNotification('❌ Введите сумму!', 'error'); return; }
    if (!checkBalance(bet)) return;
    btn.disabled = true;
    document.getElementById('die1').classList.add('rolling');
    document.getElementById('die2').classList.add('rolling');
    document.getElementById('diceResult').className = 'game-result info';
    document.getElementById('diceResult').textContent = '⏳ Бросаем...';
    try {
        const response = await fetch('/api/game/dice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', bet: bet, type: diceBetType })
        });
        const data = await response.json();
        if (data.success) {
            const diceSymbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
            document.getElementById('die1').textContent = diceSymbols[data.d1 - 1];
            document.getElementById('die2').textContent = diceSymbols[data.d2 - 1];
            setTimeout(() => {
                document.getElementById('die1').classList.remove('rolling');
                document.getElementById('die2').classList.remove('rolling');
            }, 500);
            const result = document.getElementById('diceResult');
            result.className = 'game-result ' + (data.win ? 'win' : 'loss');
            result.textContent = data.win ? '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽ (выпало ' + data.total + ')' : '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽ (выпало ' + data.total + ')';
            if (data.win) {
                showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
            } else {
                showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
            }
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            updateUI(data.stats);
        } else {
            showNotification('❌ ' + data.error, 'error');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
        }
    } catch (error) { showNotification('❌ Ошибка соединения!', 'error'); }
    setTimeout(() => { btn.disabled = false; }, 1500);
}

// ============================================================
// ЗАКРЫТИЕ МОДАЛЬНЫХ ОКОН ПО КЛИКУ ВНЕ
// ============================================================
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            this.classList.remove('active');
        }
    });
});

// ============================================================
// ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ ЛОББИ
// ============================================================
function showBonus() {
    showNotification('🎁 Бонус +80 ₽ зачислен на баланс!', 'success');
    userBalance += 80;
    updateBalanceDisplay();
}

function filterBets(type) {
    document.querySelectorAll('.bets-box .filter button').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector('.bets-box .filter button[onclick="filterBets(\'' + type + '\')"]');
    if (btn) btn.classList.add('active');
    document.querySelectorAll('.bet-row').forEach(row => {
        const amount = row.querySelector('.bet-amount');
        if (type === 'all') {
            row.style.display = 'grid';
        } else if (type === 'win') {
            row.style.display = amount && amount.classList.contains('win') ? 'grid' : 'none';
        } else if (type === 'loss') {
            row.style.display = amount && amount.classList.contains('loss') ? 'grid' : 'none';
        }
    });
}

// ============================================================
// ГЛОБАЛЬНЫЕ ЭКСПОРТЫ
// ============================================================
window.sendChat = function() {
    const input = document.getElementById('chatInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    const container = document.getElementById('chatMessages');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'msg';
    const username = document.getElementById('username')?.textContent || 'Игрок';
    div.innerHTML = `
        <span class="user">👤 ${username}:</span>
        <span class="text">${msg}</span>
        <span class="time">только что</span>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    input.value = '';
};

window.sendChatOnEnter = function(event) {
    if (event.key === 'Enter') window.sendChat();
};

console.log('🎰 RuWin Casino загружен!');
console.log('💰 Баланс:', userBalance);
