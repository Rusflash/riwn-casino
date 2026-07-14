// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let userId = null;
let userBalance = 10000;
let userLevel = 1;
let sessionId = null;
let streakCount = 0;
let totalBets = 0;
let wins = 0;

// ============================================================
// ЗАГРУЗКА СТРАНИЦЫ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // Скрываем загрузку
    setTimeout(() => {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.classList.add('hidden');
            document.getElementById('app').style.display = 'block';
        }
    }, 800);

    // Проверяем сохраненную сессию
    const savedId = localStorage.getItem('ruwin_user_id');
    if (savedId) {
        userId = savedId;
        sessionId = savedId;
        document.getElementById('authModal').classList.remove('active');
        initGame();
    } else {
        document.getElementById('authModal').classList.add('active');
    }

    // Настройка навигации
    setupNavigation();
    setupGameCards();
    
    // Автообновление баланса
    setInterval(() => {
        if (sessionId) refreshBalance();
    }, 10000);
});

// ============================================================
// ОСНОВНЫЕ ФУНКЦИИ
// ============================================================
async function refreshBalance() {
    try {
        const response = await fetch('/api/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001' })
        });
        const data = await response.json();
        if (data.success && data.balance !== undefined) {
            userBalance = data.balance;
            updateBalanceDisplay();
            return userBalance;
        }
    } catch (e) {
        console.error('Balance error:', e);
    }
    return null;
}

async function initGame() {
    try {
        await refreshBalance();
        const response = await fetch('/api/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId || 'test_001' })
        });
        const data = await response.json();
        if (data.success) {
            sessionId = data.stats?.user_id || 'test_001';
            if (data.stats) {
                userBalance = data.stats.balance || 10000;
                totalBets = data.stats.total_bets || 0;
                wins = data.stats.wins || 0;
                updateUI(data.stats);
            }
        }
    } catch (e) {
        console.error('Init error:', e);
        sessionId = 'test_001';
    }
}

function updateUI(stats) {
    if (!stats) return;
    if (stats.balance !== undefined) userBalance = stats.balance;
    if (stats.total_bets !== undefined) totalBets = stats.total_bets;
    if (stats.wins !== undefined) wins = stats.wins;
    userLevel = stats.level || 1;
    
    updateBalanceDisplay();
    updateStatsDisplay();
}

function updateBalanceDisplay() {
    const elements = document.querySelectorAll('.balance, #balance, #balanceDisplay, .balance-box .amount');
    elements.forEach(el => {
        if (el) {
            el.textContent = userBalance.toLocaleString() + ' ₽';
        }
    });
}

function updateStatsDisplay() {
    const els = {
        'totalBetsStat': totalBets,
        'winsStat': wins,
        'winrateStat': totalBets > 0 ? Math.round((wins / totalBets) * 100) + '%' : '0%'
    };
    Object.keys(els).forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = els[id];
    });
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
            const navBtn = document.querySelector(`.nav-btn[data-game="${game}"]`);
            if (navBtn) navBtn.click();
        });
    });
}

function filterGames(tag) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.filter-btn[onclick="filterGames('${tag}')"]`);
    if (btn) btn.classList.add('active');
    
    document.querySelectorAll('.game-card').forEach(card => {
        card.style.display = (tag === 'all' || card.dataset.tag === tag) ? '' : 'none';
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
        case 'mines': loadMines(container); break;
        default: container.innerHTML = `
            <div class="game-wrapper">
                <h2 class="game-title">🎮 ${game.toUpperCase()}</h2>
                <div class="game-result info">В разработке...</div>
            </div>
        `;
    }
}

// ============================================================
// ИГРА: СЛОТЫ
// ============================================================
function loadSlots(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎰 СЛОТЫ</h2>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:250px;margin:0 auto 12px;" id="slotsGrid">
                ${Array(9).fill().map(() => `<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;text-align:center;font-size:28px;border:1px solid rgba(255,255,255,0.03);">🎰</div>`).join('')}
            </div>
            <div class="game-result info" id="slotsResult">Сделайте ставку!</div>
            <input type="number" id="slotsBet" class="game-input" value="10" min="1">
            <button class="spin-btn" id="slotsSpin">🎰 КРУТИТЬ</button>
        </div>
    `;
    
    document.getElementById('slotsSpin').addEventListener('click', async function() {
        const bet = parseInt(document.getElementById('slotsBet').value);
        if (isNaN(bet) || bet <= 0) {
            showNotification('❌ Введите сумму!', 'error');
            return;
        }
        if (!checkBalance(bet)) return;
        
        const resultEl = document.getElementById('slotsResult');
        resultEl.className = 'game-result info';
        resultEl.textContent = '⏳ Крутим...';
        this.disabled = true;
        
        try {
            const response = await fetch('/api/game/slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: sessionId || 'test_001', bet: bet })
            });
            const data = await response.json();
            
            if (data.success) {
                const cells = document.querySelectorAll('#slotsGrid div');
                cells.forEach((el, i) => {
                    if (data.reels && data.reels[i]) el.textContent = data.reels[i];
                });
                
                if (data.win) {
                    resultEl.className = 'game-result win';
                    resultEl.textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!';
                    showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
                } else {
                    resultEl.className = 'game-result loss';
                    resultEl.textContent = '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽';
                    showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
                }
                
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                    updateStatsDisplay();
                }
            } else {
                showNotification('❌ ' + data.error, 'error');
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                }
            }
        } catch (e) {
            showNotification('❌ Ошибка соединения!', 'error');
        }
        
        this.disabled = false;
    });
}

// ============================================================
// ИГРА: РУЛЕТКА
// ============================================================
function loadRoulette(container) {
    let selected = null;
    
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎡 РУЛЕТКА</h2>
            <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;margin:8px 0;" id="rouletteGrid">
                ${[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26].map(n => {
                    const c = n === 0 ? '#00cc44' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) ? '#ff0040' : '#fff';
                    return `<div style="background:rgba(255,255,255,0.02);padding:6px 2px;text-align:center;border-radius:4px;color:${c};font-weight:700;font-size:12px;cursor:pointer;border:1px solid rgba(255,255,255,0.03);" data-num="${n}">${n}</div>`;
                }).join('')}
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;margin:6px 0;">
                <button class="filter-btn active" onclick="rouletteBetType='number'">🎯 Число</button>
                <button class="filter-btn" onclick="rouletteBetType='red'">🔴 Красное</button>
                <button class="filter-btn" onclick="rouletteBetType='black'">⚫ Чёрное</button>
                <button class="filter-btn" onclick="rouletteBetType='even'">2️⃣ Чёт</button>
                <button class="filter-btn" onclick="rouletteBetType='odd'">1️⃣ Нечёт</button>
                <button class="filter-btn" onclick="rouletteBetType='half1'">⬆ 1-18</button>
                <button class="filter-btn" onclick="rouletteBetType='half2'">⬇ 19-36</button>
            </div>
            <div class="game-result info" id="rouletteResult">Выберите ставку!</div>
            <input type="number" id="rouletteBet" class="game-input" value="10" min="1">
            <button class="spin-btn" id="rouletteSpin">🎡 СПИН</button>
        </div>
    `;
    
    window.rouletteBetType = 'number';
    
    document.querySelectorAll('#rouletteGrid div').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('#rouletteGrid div').forEach(d => d.style.borderColor = 'rgba(255,255,255,0.03)');
            this.style.borderColor = 'var(--neon-gold)';
            selected = parseInt(this.dataset.num);
            showNotification('✅ Выбрано число ' + selected, 'info');
        });
    });
    
    document.getElementById('rouletteSpin').addEventListener('click', async function() {
        const bet = parseInt(document.getElementById('rouletteBet').value);
        if (isNaN(bet) || bet <= 0) {
            showNotification('❌ Введите сумму!', 'error');
            return;
        }
        if (!checkBalance(bet)) return;
        
        let payload = {
            user_id: sessionId || 'test_001',
            bet: bet,
            type: window.rouletteBetType
        };
        
        if (window.rouletteBetType === 'number') {
            if (selected === null) {
                showNotification('❌ Выберите число!', 'error');
                return;
            }
            payload.number = selected;
        }
        
        const resultEl = document.getElementById('rouletteResult');
        resultEl.className = 'game-result info';
        resultEl.textContent = '⏳ Крутим...';
        this.disabled = true;
        
        try {
            const response = await fetch('/api/game/roulette', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            
            if (data.success) {
                const colorMap = { red: '#ff0040', green: '#00cc44', black: '#fff' };
                resultEl.innerHTML = `Выпало: <strong style="color:${colorMap[data.color] || '#fff'}">${data.result}</strong> (${data.color.toUpperCase()})<br>`;
                
                if (data.win) {
                    resultEl.className = 'game-result win';
                    resultEl.innerHTML += '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!';
                    showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
                } else {
                    resultEl.className = 'game-result loss';
                    resultEl.innerHTML += '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽';
                    showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
                }
                
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                    updateStatsDisplay();
                }
            } else {
                showNotification('❌ ' + data.error, 'error');
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                }
            }
        } catch (e) {
            showNotification('❌ Ошибка соединения!', 'error');
        }
        
        this.disabled = false;
    });
}

// ============================================================
// ИГРА: БЛЭКДЖЕК
// ============================================================
function loadBlackjack(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🃏 БЛЭКДЖЕК</h2>
            <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px;margin:8px 0;">
                <div style="font-size:14px;color:var(--text-secondary);">🤖 Дилер: <span id="bjDealer">? ?</span></div>
                <div style="font-size:14px;color:var(--text-secondary);">👤 Вы: <span id="bjPlayer">? ?</span></div>
            </div>
            <div class="game-result info" id="bjResult">Сделайте ставку!</div>
            <input type="number" id="bjBet" class="game-input" value="10" min="1">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                <button class="spin-btn" id="bjStart" style="font-size:13px;">🃏 СТАРТ</button>
                <button class="spin-btn" id="bjHit" style="font-size:13px;background:var(--neon-green);color:#000;" disabled>✋ ВЗЯТЬ</button>
                <button class="spin-btn" id="bjStand" style="font-size:13px;background:var(--neon-gold);color:#000;" disabled>✋ СТОП</button>
                <button class="spin-btn" id="bjReset" style="font-size:13px;background:var(--neon-red);">🔄 СБРОС</button>
            </div>
        </div>
    `;
    
    let deck = [], playerHand = [], dealerHand = [], gameOver = true;
    
    function createDeck() {
        const suits = ['♠','♥','♦','♣'];
        const values = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
        return suits.flatMap(s => values.map(v => ({ suit: s, value: v })));
    }
    
    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    
    function cardValue(c) {
        if (c.value === 'A') return 11;
        if (['J','Q','K'].includes(c.value)) return 10;
        return parseInt(c.value);
    }
    
    function handSum(hand) {
        let sum = hand.reduce((s, c) => s + cardValue(c), 0);
        let aces = hand.filter(c => c.value === 'A').length;
        while (sum > 21 && aces > 0) {
            sum -= 10;
            aces--;
        }
        return sum;
    }
    
    function cardDisplay(c) {
        return c.value + c.suit;
    }
    
    document.getElementById('bjStart').addEventListener('click', async function() {
        const bet = parseInt(document.getElementById('bjBet').value);
        if (isNaN(bet) || bet <= 0) {
            showNotification('❌ Введите сумму!', 'error');
            return;
        }
        if (!checkBalance(bet)) return;
        
        try {
            const response = await fetch('/api/game/blackjack', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: sessionId || 'test_001', bet: bet, action: 'start' })
            });
            const data = await response.json();
            
            if (data.success) {
                deck = data.deck || [];
                playerHand = data.player_hand || [];
                dealerHand = data.dealer_hand || [];
                gameOver = data.game_over || false;
                
                document.getElementById('bjPlayer').textContent = playerHand.map(cardDisplay).join(' ');
                document.getElementById('bjDealer').textContent = dealerHand.map(c => c === '?' ? '?' : cardDisplay(c)).join(' ');
                
                if (data.game_over) {
                    if (data.win) {
                        document.getElementById('bjResult').className = 'game-result win';
                        document.getElementById('bjResult').textContent = '🎉 БЛЭКДЖЕК! +' + data.win_amount + ' ₽';
                        showNotification('🎉 +' + data.win_amount + ' ₽!', 'success');
                    }
                    if (data.balance !== undefined) {
                        userBalance = data.balance;
                        updateBalanceDisplay();
                        updateStatsDisplay();
                    }
                    document.getElementById('bjHit').disabled = true;
                    document.getElementById('bjStand').disabled = true;
                } else {
                    document.getElementById('bjResult').className = 'game-result info';
                    document.getElementById('bjResult').textContent = 'Игра началась!';
                    document.getElementById('bjHit').disabled = false;
                    document.getElementById('bjStand').disabled = false;
                    document.getElementById('bjStart').disabled = true;
                }
            } else {
                showNotification('❌ ' + data.error, 'error');
            }
        } catch (e) {
            showNotification('❌ Ошибка!', 'error');
        }
    });
    
    document.getElementById('bjHit').addEventListener('click', async function() {
        if (gameOver) return;
        
        try {
            const response = await fetch('/api/game/blackjack/hit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: sessionId || 'test_001',
                    deck: deck,
                    player_hand: playerHand,
                    bet: parseInt(document.getElementById('bjBet').value)
                })
            });
            const data = await response.json();
            
            if (data.success) {
                deck = data.deck;
                playerHand = data.player_hand;
                gameOver = data.game_over || false;
                
                document.getElementById('bjPlayer').textContent = playerHand.map(cardDisplay).join(' ');
                
                if (data.game_over) {
                    document.getElementById('bjHit').disabled = true;
                    document.getElementById('bjStand').disabled = true;
                    
                    if (data.win === false) {
                        document.getElementById('bjResult').className = 'game-result loss';
                        document.getElementById('bjResult').textContent = '😞 ПЕРЕБОР! -' + Math.abs(data.win_amount) + ' ₽';
                        showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
                    }
                    
                    if (data.balance !== undefined) {
                        userBalance = data.balance;
                        updateBalanceDisplay();
                        updateStatsDisplay();
                    }
                }
            }
        } catch (e) {
            showNotification('❌ Ошибка!', 'error');
        }
    });
    
    document.getElementById('bjStand').addEventListener('click', async function() {
        if (gameOver) return;
        
        try {
            const response = await fetch('/api/game/blackjack/stand', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: sessionId || 'test_001',
                    deck: deck,
                    player_hand: playerHand,
                    dealer_hand: dealerHand,
                    bet: parseInt(document.getElementById('bjBet').value)
                })
            });
            const data = await response.json();
            
            if (data.success) {
                gameOver = true;
                playerHand = data.player_hand || playerHand;
                dealerHand = data.dealer_hand || dealerHand;
                
                document.getElementById('bjPlayer').textContent = playerHand.map(cardDisplay).join(' ');
                document.getElementById('bjDealer').textContent = dealerHand.map(cardDisplay).join(' ');
                document.getElementById('bjHit').disabled = true;
                document.getElementById('bjStand').disabled = true;
                document.getElementById('bjStart').disabled = false;
                
                if (data.win === true) {
                    document.getElementById('bjResult').className = 'game-result win';
                    document.getElementById('bjResult').textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!';
                    showNotification('🎉 +' + data.win_amount + ' ₽!', 'success');
                } else if (data.win === false) {
                    document.getElementById('bjResult').className = 'game-result loss';
                    document.getElementById('bjResult').textContent = '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽';
                    showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
                } else {
                    document.getElementById('bjResult').className = 'game-result info';
                    document.getElementById('bjResult').textContent = '🤝 НИЧЬЯ';
                }
                
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                    updateStatsDisplay();
                }
            }
        } catch (e) {
            showNotification('❌ Ошибка!', 'error');
        }
    });
    
    document.getElementById('bjReset').addEventListener('click', function() {
        deck = [];
        playerHand = [];
        dealerHand = [];
        gameOver = true;
        document.getElementById('bjPlayer').textContent = '? ?';
        document.getElementById('bjDealer').textContent = '? ?';
        document.getElementById('bjResult').className = 'game-result info';
        document.getElementById('bjResult').textContent = 'Сделайте ставку!';
        document.getElementById('bjHit').disabled = true;
        document.getElementById('bjStand').disabled = true;
        document.getElementById('bjStart').disabled = false;
    });
}

// ============================================================
// ИГРА: AVIATOR
// ============================================================
let crashState = {
    multiplier: 1,
    isActive: false,
    isBetPlaced: false,
    crashPoint: 0,
    bet: 0,
    interval: null,
    startTime: 0,
    isCrashed: false
};

function loadCrash(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">✈️ AVIATOR</h2>
            <div class="crash-wrapper">
                <div class="crash-chart">
                    <canvas id="crashCanvas"></canvas>
                    <div class="rocket" id="rocket">🚀</div>
                    <div class="rocket-trail" id="rocketTrail"></div>
                    <div class="crash-multiplier" id="crashMultiplier">1.00x</div>
                </div>
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
    
    // Настройка canvas
    const canvas = document.getElementById('crashCanvas');
    if (canvas) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
        const ctx = canvas.getContext('2d');
        ctx.strokeStyle = 'rgba(255,255,255,0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 8; i++) {
            const y = (i / 8) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }
}

async function crashStart() {
    if (crashState.isActive || crashState.isBetPlaced) return;
    
    await refreshBalance();
    
    const bet = parseInt(document.getElementById('crashBet').value);
    if (isNaN(bet) || bet <= 0) {
        showNotification('❌ Введите сумму!', 'error');
        return;
    }
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
    document.getElementById('crashResult').textContent = '✈️ Взлетает...';
    document.getElementById('crashMultiplier').classList.remove('crashed');
    document.getElementById('crashMultiplier').textContent = '1.00x';
    
    const rocket = document.getElementById('rocket');
    const trail = document.getElementById('rocketTrail');
    rocket.classList.add('flying');
    trail.classList.add('flying');
    
    try {
        const response = await fetch('/api/game/crash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: sessionId || 'test_001',
                action: 'start',
                bet: bet
            })
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
                    crashState.multiplier = 1 + (1 - Math.pow(1 - progress, 1.5)) * (crashState.crashPoint - 1);
                } else {
                    crashState.multiplier = crashState.crashPoint;
                }
                
                const dm = Math.round(crashState.multiplier * 100) / 100;
                const el = document.getElementById('crashMultiplier');
                el.textContent = dm.toFixed(2) + 'x';
                
                const x = 10 + Math.min(elapsed / 2.5, 1) * 75;
                const y = 20 + (dm - 1) * 12;
                rocket.style.left = Math.min(x, 85) + '%';
                rocket.style.bottom = Math.min(y, 85) + '%';
                trail.style.left = (Math.min(x, 85) - 2) + '%';
                trail.style.bottom = (Math.min(y, 85) - 8) + '%';
                
                if (dm > lastMultiplier + 0.05) {
                    el.classList.remove('bump');
                    void el.offsetWidth;
                    el.classList.add('bump');
                    lastMultiplier = dm;
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
    } catch (e) {
        showNotification('❌ Ошибка!', 'error');
        resetCrash();
    }
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
            body: JSON.stringify({
                user_id: sessionId || 'test_001',
                action: 'cashout',
                bet: crashState.bet,
                multiplier: currentMultiplier
            })
        });
        const data = await response.json();
        
        if (data.success) {
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
                updateStatsDisplay();
            }
            
            document.getElementById('crashResult').className = 'game-result win';
            document.getElementById('crashResult').textContent = '🎉 +' + data.win_amount + ' ₽ (' + currentMultiplier.toFixed(2) + 'x)';
            showNotification('🎉 +' + data.win_amount + ' ₽!', 'success');
            addCrashHistory(currentMultiplier, true);
            resetCrash();
        }
    } catch (e) {
        showNotification('❌ Ошибка!', 'error');
        resetCrash();
    }
}

async function crashCrash() {
    if (crashState.isCrashed) return;
    
    crashState.isCrashed = true;
    crashState.isActive = false;
    document.getElementById('crashCashout').disabled = true;
    document.getElementById('crashMultiplier').classList.add('crashed');
    
    const rocket = document.getElementById('rocket');
    const trail = document.getElementById('rocketTrail');
    rocket.classList.remove('flying');
    trail.classList.remove('flying');
    rocket.classList.add('explode');
    
    const finalMultiplier = Math.round(crashState.multiplier * 100) / 100;
    document.getElementById('crashResult').className = 'game-result loss';
    document.getElementById('crashResult').textContent = '💥 КРАШ! (' + finalMultiplier.toFixed(2) + 'x)';
    
    try {
        const response = await fetch('/api/game/crash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: sessionId || 'test_001',
                action: 'crash',
                bet: crashState.bet
            })
        });
        const data = await response.json();
        
        if (data.success) {
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
                updateStatsDisplay();
            }
            showNotification('💥 Проигрыш ' + crashState.bet + ' ₽', 'error');
            addCrashHistory(finalMultiplier, false);
        }
    } catch (e) {}
    
    setTimeout(resetCrash, 800);
}

function resetCrash() {
    crashState.isActive = false;
    crashState.isBetPlaced = false;
    crashState.isCrashed = false;
    if (crashState.interval) {
        clearInterval(crashState.interval);
        crashState.interval = null;
    }
    
    document.getElementById('crashStart').disabled = false;
    document.getElementById('crashCashout').disabled = true;
    document.getElementById('crashMultiplier').classList.remove('crashed');
    document.getElementById('crashMultiplier').textContent = '1.00x';
    
    const rocket = document.getElementById('rocket');
    const trail = document.getElementById('rocketTrail');
    rocket.classList.remove('flying', 'explode');
    trail.classList.remove('flying');
    rocket.style.left = '10%';
    rocket.style.bottom = '20%';
    trail.style.left = '8%';
    trail.style.bottom = '10%';
}

function addCrashHistory(point, win) {
    const history = document.getElementById('crashHistory');
    const item = document.createElement('span');
    item.className = 'crash-history-item ' + (win ? 'win' : 'loss');
    item.textContent = point.toFixed(2) + 'x';
    history.prepend(item);
    if (history.children.length > 12) {
        history.removeChild(history.lastChild);
    }
}

// ============================================================
// ИГРА: КОСТИ
// ============================================================
function loadDice(container) {
    let diceType = 'over';
    
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎲 КОСТИ</h2>
            <div style="display:flex;justify-content:center;gap:20px;font-size:56px;margin:10px 0;">
                <div id="d1">⚀</div>
                <div id="d2">⚀</div>
            </div>
            <div class="game-result info" id="diceResult">Бросьте кости!</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin:6px 0;">
                <button class="filter-btn active" onclick="window.diceType='over'">⬆ >7</button>
                <button class="filter-btn" onclick="window.diceType='under'">⬇ <7</button>
                <button class="filter-btn" onclick="window.diceType='seven'">🎯 =7</button>
            </div>
            <input type="number" id="diceBet" class="game-input" value="10" min="1">
            <button class="spin-btn" id="diceBtn">🎲 БРОСИТЬ</button>
        </div>
    `;
    
    window.diceType = 'over';
    
    document.getElementById('diceBtn').addEventListener('click', async function() {
        const bet = parseInt(document.getElementById('diceBet').value);
        if (isNaN(bet) || bet <= 0) {
            showNotification('❌ Введите сумму!', 'error');
            return;
        }
        if (!checkBalance(bet)) return;
        
        const resultEl = document.getElementById('diceResult');
        resultEl.className = 'game-result info';
        resultEl.textContent = '⏳ Бросаем...';
        this.disabled = true;
        
        try {
            const response = await fetch('/api/game/dice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: sessionId || 'test_001',
                    bet: bet,
                    type: window.diceType
                })
            });
            const data = await response.json();
            
            if (data.success) {
                const symbols = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
                document.getElementById('d1').textContent = symbols[data.d1 - 1];
                document.getElementById('d2').textContent = symbols[data.d2 - 1];
                
                if (data.win) {
                    resultEl.className = 'game-result win';
                    resultEl.textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽ (' + data.total + ')';
                    showNotification('🎉 +' + data.win_amount + ' ₽!', 'success');
                } else {
                    resultEl.className = 'game-result loss';
                    resultEl.textContent = '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽ (' + data.total + ')';
                    showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
                }
                
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                    updateStatsDisplay();
                }
            } else {
                showNotification('❌ ' + data.error, 'error');
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                }
            }
        } catch (e) {
            showNotification('❌ Ошибка соединения!', 'error');
        }
        
        this.disabled = false;
    });
}

// ============================================================
// ИГРА: МАЙНС
// ============================================================
function loadMines(container) {
    let mines = [];
    let revealed = [];
    let gameActive = false;
    let bet = 0;
    
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">💣 МАЙНС</h2>
            <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-width:250px;margin:0 auto 10px;" id="minesGrid">
                ${Array(25).fill().map((_, i) => `<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:12px;text-align:center;font-size:18px;cursor:pointer;border:1px solid rgba(255,255,255,0.03);" data-idx="${i}">❓</div>`).join('')}
            </div>
            <div class="game-result info" id="minesResult">Сделайте ставку!</div>
            <input type="number" id="minesBet" class="game-input" value="10" min="1">
            <button class="spin-btn" id="minesStart">💣 СТАРТ</button>
        </div>
    `;
    
    window.minesClick = async function(idx) {
        if (!gameActive) {
            showNotification('❌ Нажми СТАРТ!', 'error');
            return;
        }
        if (revealed.includes(idx)) return;
        
        revealed.push(idx);
        const cell = document.querySelector(`[data-idx="${idx}"]`);
        cell.textContent = '⏳';
        
        try {
            const response = await fetch('/api/game/mines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: sessionId || 'test_001',
                    bet: bet,
                    action: 'click',
                    cell: idx,
                    mines: mines
                })
            });
            const data = await response.json();
            
            if (data.success) {
                if (data.hit) {
                    cell.textContent = '💣';
                    cell.style.background = 'rgba(255,0,64,0.2)';
                    cell.style.borderColor = 'var(--neon-red)';
                    gameActive = false;
                    document.getElementById('minesResult').className = 'game-result loss';
                    document.getElementById('minesResult').textContent = '💥 МИНА! -' + Math.abs(data.win_amount) + ' ₽';
                    showNotification('💥 МИНА! -' + Math.abs(data.win_amount) + ' ₽', 'error');
                } else {
                    cell.textContent = '💎';
                    cell.style.background = 'rgba(0,255,136,0.1)';
                    cell.style.borderColor = 'var(--neon-green)';
                    document.getElementById('minesResult').className = 'game-result win';
                    document.getElementById('minesResult').textContent = '💎 АЛМАЗ! +' + data.win_amount + ' ₽';
                    showNotification('💎 АЛМАЗ! +' + data.win_amount + ' ₽', 'success');
                    gameActive = false;
                }
                
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                    updateStatsDisplay();
                }
            }
        } catch (e) {
            showNotification('❌ Ошибка!', 'error');
            cell.textContent = '❓';
        }
    };
    
    document.getElementById('minesStart').addEventListener('click', async function() {
        bet = parseInt(document.getElementById('minesBet').value);
        if (isNaN(bet) || bet <= 0) {
            showNotification('❌ Введите сумму!', 'error');
            return;
        }
        if (!checkBalance(bet)) return;
        
        try {
            const response = await fetch('/api/game/mines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: sessionId || 'test_001',
                    bet: bet,
                    action: 'start'
                })
            });
            const data = await response.json();
            
            if (data.success) {
                mines = data.mines;
                revealed = [];
                gameActive = true;
                
                document.querySelectorAll('#minesGrid div').forEach(el => {
                    el.textContent = '❓';
                    el.style.background = 'rgba(0,0,0,0.3)';
                    el.style.borderColor = 'rgba(255,255,255,0.03)';
                });
                
                document.getElementById('minesResult').className = 'game-result info';
                document.getElementById('minesResult').textContent = '🔍 Ищи алмазы! (3 мины)';
                showNotification('🔍 Игра началась! Найди алмазы!', 'info');
            }
        } catch (e) {
            showNotification('❌ Ошибка!', 'error');
        }
    });
}

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================
function switchAuthTab(tab) {
    document.querySelectorAll('.modal-tab').forEach((t, i) => {
        t.classList.toggle('active', i === (tab === 'login' ? 0 : 1));
        document.querySelectorAll('.modal-form')[i].style.display = i === (tab === 'login' ? 0 : 1) ? 'flex' : 'none';
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const err = document.getElementById('loginError');
    err.textContent = '⏳ Вход...';
    
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
            
            if (data.stats) {
                userBalance = data.stats.balance || 10000;
                totalBets = data.stats.total_bets || 0;
                wins = data.stats.wins || 0;
                updateUI(data.stats);
            }
            
            showNotification('✅ Добро пожаловать, ' + data.username + '!', 'success');
            await refreshBalance();
        } else {
            err.textContent = '❌ ' + data.error;
        }
    } catch (e) {
        err.textContent = '❌ Ошибка соединения';
    }
    return false;
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const email = document.getElementById('regEmail').value.trim();
    const err = document.getElementById('registerError');
    const suc = document.getElementById('registerSuccess');
    err.textContent = '';
    suc.textContent = '⏳ Регистрация...';
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, email })
        });
        const data = await response.json();
        
        if (data.success) {
            suc.textContent = '✅ ' + data.message + ' Теперь войдите!';
            document.getElementById('regUsername').value = '';
            document.getElementById('regPassword').value = '';
            document.getElementById('regEmail').value = '';
            setTimeout(() => switchAuthTab('login'), 1500);
        } else {
            err.textContent = '❌ ' + data.error;
            suc.textContent = '';
        }
    } catch (e) {
        err.textContent = '❌ Ошибка соединения';
        suc.textContent = '';
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
            <div style="font-size:40px;margin-bottom:6px;">👤</div>
            <h3 style="margin-bottom:4px;">${localStorage.getItem('ruwin_username') || 'Игрок'}</h3>
            <p style="color:var(--text-secondary);">💰 Баланс: ${userBalance.toLocaleString()} ₽</p>
            <p style="color:var(--text-secondary);">🏆 Уровень: ${userLevel}</p>
            <p style="color:var(--text-secondary);">🎯 Ставок: ${totalBets}</p>
            <p style="color:var(--text-secondary);">🏆 Побед: ${wins}</p>
            <button onclick="document.getElementById('profileModal').classList.remove('active')" style="margin-top:10px;padding:8px 24px;background:var(--bg-card);border:1px solid var(--neon-cyan);border-radius:8px;color:var(--text-primary);cursor:pointer;">Закрыть</button>
        </div>
    `;
    modal.classList.add('active');
}

// ============================================================
// БОНУСЫ
// ============================================================
function claimBonus(type) {
    const bonuses = {
        welcome: { amount: 1000, msg: '🎉 Приветственный бонус +1000 ₽!' },
        cashback: { amount: 500, msg: '🔄 Кешбэк +500 ₽!' },
        daily: { amount: 200, msg: '🔥 Ежедневный бонус +200 ₽!' }
    };
    const bonus = bonuses[type];
    if (!bonus) return;
    
    if (localStorage.getItem('bonus_' + type)) {
        showNotification('❌ Бонус уже получен!', 'error');
        return;
    }
    
    userBalance += bonus.amount;
    updateBalanceDisplay();
    localStorage.setItem('bonus_' + type, 'true');
    showNotification(bonus.msg, 'success');
}

// ============================================================
// УВЕДОМЛЕНИЯ
// ============================================================
function showNotification(message, type = 'info', duration = 3000) {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const n = document.createElement('div');
    n.className = 'notification ' + type;
    n.textContent = message;
    container.appendChild(n);
    
    setTimeout(() => {
        n.style.opacity = '0';
        n.style.transform = 'translateX(100%)';
        setTimeout(() => n.remove(), 300);
    }, duration);
    
    n.addEventListener('click', () => n.remove());
}

// ============================================================
// ЗАКРЫТИЕ МОДАЛОК
// ============================================================
document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', function(e) {
        if (e.target === this) this.classList.remove('active');
    });
});

// ============================================================
// ЭКСПОРТЫ В ГЛОБАЛЬНЫЙ ОБЪЕКТ
// ============================================================
window.filterGames = filterGames;
window.toggleProfile = toggleProfile;
window.handleLogout = handleLogout;
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.switchAuthTab = switchAuthTab;
window.refreshBalance = refreshBalance;
window.claimBonus = claimBonus;
window.diceType = window.diceType;
window.rouletteBetType = window.rouletteBetType;
window.minesClick = window.minesClick;

console.log('🎰 RuWin Casino загружен!');
console.log('💰 Баланс:', userBalance);
console.log('👤 Пользователь:', userId || 'Не авторизован');
