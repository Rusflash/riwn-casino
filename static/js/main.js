// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
let userId = null;
let userBalance = 0;  // Начинаем с 0, чтобы явно видеть когда обновится
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

    console.log('🔐 Saved session:', savedId, savedName);

    if (savedId) {
        userId = savedId;
        sessionId = savedId;
        document.getElementById('app').style.display = 'block';
        document.getElementById('authModal').classList.remove('active');
        // Сначала получаем баланс, потом инициализируем игру
        refreshBalance().then(() => {
            initGame();
        });
    } else {
        document.getElementById('app').style.display = 'none';
        document.getElementById('authModal').classList.add('active');
    }

    setupNavigation();
    setupGameCards();
});

// ============================================================
// ОСНОВНЫЕ ФУНКЦИИ - С ПРИНУДИТЕЛЬНОЙ СИНХРОНИЗАЦИЕЙ
// ============================================================
async function refreshBalance() {
    try {
        const response = await fetch('/api/balance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001' })
        });
        const data = await response.json();
        console.log('💰 Balance API response:', data);
        
        if (data.success && data.balance !== undefined) {
            userBalance = data.balance;
            console.log(`✅ Баланс обновлен из API: ${userBalance} ₽`);
            updateBalanceDisplay();
            return userBalance;
        }
    } catch (error) {
        console.error('❌ Ошибка обновления баланса:', error);
    }
    return null;
}

async function initGame() {
    try {
        // Сначала обновляем баланс
        await refreshBalance();
        
        const response = await fetch('/api/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId || 'test_001' })
        });
        const data = await response.json();
        console.log('📊 Init response:', data);
        
        if (data.success) {
            sessionId = data.stats?.user_id || 'test_001';
            
            // ПРИНУДИТЕЛЬНО обновляем баланс из ответа
            if (data.stats && data.stats.balance !== undefined) {
                userBalance = data.stats.balance;
                console.log(`✅ Баланс из init: ${userBalance} ₽`);
            }
            
            updateUI(data.stats);
            
            if (data.pool) {
                const bankEl = document.getElementById('bankBalance');
                if (bankEl) bankEl.textContent = data.pool.toLocaleString() + ' ₽';
            }
            
            // Дополнительная проверка - обновляем баланс еще раз
            await refreshBalance();
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        sessionId = 'test_001';
        await refreshBalance();
    }
}

function updateUI(stats) {
    if (!stats) return;
    
    console.log('📊 Updating UI with stats:', stats);
    
    // ПРИНУДИТЕЛЬНО устанавливаем баланс из stats
    if (stats.balance !== undefined) {
        userBalance = stats.balance;
        console.log(`✅ Баланс установлен из stats: ${userBalance} ₽`);
    }
    
    userLevel = stats.level || 1;
    
    // Обновляем отображение
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
    console.log(`💵 Обновление отображения баланса: ${userBalance} ₽`);
    const balanceEls = document.querySelectorAll('.balance, #balance, #balanceDisplay');
    balanceEls.forEach(el => {
        if (el) {
            el.textContent = userBalance.toLocaleString() + ' ₽';
        }
    });
}

function updateLevelDisplay() {
    const levelEls = document.querySelectorAll('.level, #level');
    levelEls.forEach(el => {
        if (el) el.textContent = userLevel;
    });
}

function getCurrentBalance() {
    console.log(`🔍 getCurrentBalance возвращает: ${userBalance}`);
    return userBalance;
}

function checkBalance(amount) {
    // ПРИНУДИТЕЛЬНО обновляем баланс перед проверкой
    return new Promise(async (resolve) => {
        await refreshBalance();
        console.log(`🔍 checkBalance: amount=${amount}, balance=${userBalance}`);
        if (amount > userBalance) {
            showNotification('❌ Недостаточно средств! Баланс: ' + userBalance.toLocaleString() + ' ₽', 'error');
            resolve(false);
        } else {
            resolve(true);
        }
    });
}

// ============================================================
// РУЛЕТКА - С ПРИНУДИТЕЛЬНЫМ ОБНОВЛЕНИЕМ БАЛАНСА
// ============================================================
async function rouletteSpin() {
    const spinBtn = document.getElementById('rouletteSpin');
    if (spinBtn.disabled) return;
    
    // Обновляем баланс перед ставкой
    await refreshBalance();
    
    const bet = parseInt(document.getElementById('rouletteBet').value);
    if (isNaN(bet) || bet <= 0) { 
        showNotification('❌ Введите сумму!', 'error'); 
        return; 
    }
    
    console.log(`🎡 Ставка: ${bet}, Баланс: ${userBalance}`);
    
    if (bet > userBalance) {
        showNotification('❌ Недостаточно средств! Баланс: ' + userBalance.toLocaleString() + ' ₽', 'error');
        return;
    }
    
    const payload = { 
        user_id: sessionId || 'test_001', 
        bet: bet, 
        type: rouletteState.betType 
    };
    
    if (rouletteState.betType === 'number') {
        if (rouletteState.selectedNumber === null) { 
            showNotification('❌ Выберите число!', 'error'); 
            return; 
        }
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
        console.log('🎡 Roulette response:', data);
        
        if (data.success) {
            // ПРИНУДИТЕЛЬНО обновляем баланс из ответа
            if (data.balance !== undefined) {
                userBalance = data.balance;
                console.log(`💰 Новый баланс из игры: ${userBalance}`);
            } else if (data.stats && data.stats.balance !== undefined) {
                userBalance = data.stats.balance;
                console.log(`💰 Новый баланс из stats: ${userBalance}`);
            }
            
            // Обновляем отображение
            updateBalanceDisplay();
            updateUI(data.stats);
            
            const result = document.getElementById('rouletteResult');
            result.className = 'game-result ' + (data.win ? 'win' : 'loss');
            result.innerHTML = `Выпало: <strong style="color:${data.color === 'red' ? '#ff0040' : data.color === 'green' ? '#00cc44' : '#fff'}">${data.result}</strong> (${data.color.toUpperCase()})<br>${data.win ? '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽' : '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽'}`;
            
            if (data.win) {
                showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
            } else {
                showNotification('😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽', 'error');
            }
        } else {
            showNotification('❌ ' + data.error, 'error');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            await refreshBalance();
        }
    } catch (error) { 
        showNotification('❌ Ошибка соединения!', 'error');
        console.error('Roulette error:', error);
        await refreshBalance();
    }
    
    setTimeout(() => {
        spinBtn.disabled = false;
        document.getElementById('rouletteBoard').classList.remove('spinning');
    }, 2000);
}

// ============================================================
// СЛОТЫ - С ПРИНУДИТЕЛЬНЫМ ОБНОВЛЕНИЕМ БАЛАНСА
// ============================================================
async function slotsSpin() {
    const spinBtn = document.getElementById('slotsSpinBtn');
    if (spinBtn.disabled) return;
    
    await refreshBalance();
    
    const bet = parseInt(document.getElementById('slotsBet').value);
    if (isNaN(bet) || bet <= 0) { 
        showNotification('❌ Введите сумму!', 'error'); 
        return; 
    }
    
    console.log(`🎰 Ставка: ${bet}, Баланс: ${userBalance}`);
    
    if (bet > userBalance) {
        showNotification('❌ Недостаточно средств! Баланс: ' + userBalance.toLocaleString() + ' ₽', 'error');
        return;
    }
    
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
        console.log('🎰 Slots response:', data);
        
        if (data.success) {
            if (data.balance !== undefined) {
                userBalance = data.balance;
                console.log(`💰 Новый баланс: ${userBalance}`);
            } else if (data.stats && data.stats.balance !== undefined) {
                userBalance = data.stats.balance;
            }
            
            updateBalanceDisplay();
            updateUI(data.stats);
            
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
            }, 2000);
        } else {
            showNotification('❌ ' + data.error, 'error');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            await refreshBalance();
        }
    } catch (error) { 
        showNotification('❌ Ошибка соединения!', 'error');
        console.error('Slots error:', error);
        await refreshBalance();
    }
    
    setTimeout(() => {
        spinBtn.disabled = false;
        document.querySelectorAll('.slot-reel').forEach(r => r.classList.remove('spinning'));
    }, 3000);
}

// ============================================================
// БЛЭКДЖЕК - С ПРИНУДИТЕЛЬНЫМ ОБНОВЛЕНИЕМ БАЛАНСА
// ============================================================
async function blackjackStart() {
    const bet = parseInt(document.getElementById('blackjackBet').value);
    if (isNaN(bet) || bet <= 0) { 
        showNotification('❌ Введите сумму!', 'error'); 
        return; 
    }
    
    await refreshBalance();
    console.log(`🃏 Ставка: ${bet}, Баланс: ${userBalance}`);
    
    if (bet > userBalance) {
        showNotification('❌ Недостаточно средств! Баланс: ' + userBalance.toLocaleString() + ' ₽', 'error');
        return;
    }
    
    blackjackState.bet = bet;
    
    try {
        const response = await fetch('/api/game/blackjack', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: sessionId || 'test_001', bet: bet, action: 'start' })
        });
        const data = await response.json();
        console.log('🃏 Blackjack response:', data);
        
        if (data.success) {
            blackjackState.deck = data.deck || [];
            blackjackState.playerHand = data.player_hand || [];
            blackjackState.dealerHand = data.dealer_hand || [];
            blackjackState.gameOver = data.game_over || false;
            updateBlackjackUI(data);
            
            if (data.game_over) {
                if (data.balance !== undefined) {
                    userBalance = data.balance;
                } else if (data.stats && data.stats.balance !== undefined) {
                    userBalance = data.stats.balance;
                }
                updateBalanceDisplay();
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
            await refreshBalance();
        }
    } catch (error) { 
        showNotification('❌ Ошибка!', 'error');
        console.error('Blackjack error:', error);
        await refreshBalance();
    }
}

// ============================================================
// AVIATOR - С ПРИНУДИТЕЛЬНЫМ ОБНОВЛЕНИЕМ БАЛАНСА
// ============================================================
async function crashStart() {
    if (crashState.isActive || crashState.isBetPlaced) return;
    
    await refreshBalance();
    
    const bet = parseInt(document.getElementById('crashBet').value);
    if (isNaN(bet) || bet <= 0) { 
        showNotification('❌ Введите сумму!', 'error'); 
        return; 
    }
    
    console.log(`✈️ Ставка: ${bet}, Баланс: ${userBalance}`);
    
    if (bet > userBalance) {
        showNotification('❌ Недостаточно средств! Баланс: ' + userBalance.toLocaleString() + ' ₽', 'error');
        return;
    }
    
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
        console.log('✈️ Crash start response:', data);
        
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
            await refreshBalance();
        }
    } catch (error) { 
        showNotification('❌ Ошибка!', 'error');
        console.error('Crash start error:', error);
        resetCrash();
        await refreshBalance();
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
            body: JSON.stringify({ user_id: sessionId || 'test_001', action: 'cashout', bet: crashState.bet, multiplier: currentMultiplier })
        });
        const data = await response.json();
        console.log('✈️ Crash cashout response:', data);
        
        if (data.success) {
            if (data.balance !== undefined) {
                userBalance = data.balance;
            } else if (data.stats && data.stats.balance !== undefined) {
                userBalance = data.stats.balance;
            }
            updateBalanceDisplay();
            updateUI(data.stats);
            
            const result = document.getElementById('crashResult');
            result.className = 'game-result win';
            result.textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽ (' + currentMultiplier.toFixed(2) + 'x)';
            showNotification('🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽!', 'success');
            addCrashHistory(currentMultiplier, true);
            resetCrash();
        }
    } catch (error) { 
        showNotification('❌ Ошибка!', 'error');
        console.error('Crash cashout error:', error);
        resetCrash();
        await refreshBalance();
    }
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
            } else if (data.stats && data.stats.balance !== undefined) {
                userBalance = data.stats.balance;
            }
            updateBalanceDisplay();
            updateUI(data.stats);
            showNotification('💥 КРАШ! Проигрыш ' + crashState.bet + ' ₽', 'error');
            addCrashHistory(finalMultiplier, false);
        }
    } catch (error) {
        console.error('Crash crash error:', error);
        await refreshBalance();
    }
    resetCrash();
}

// ============================================================
// КОСТИ - С ПРИНУДИТЕЛЬНЫМ ОБНОВЛЕНИЕМ БАЛАНСА
// ============================================================
async function rollDice() {
    const btn = document.getElementById('diceBtn');
    if (btn.disabled) return;
    
    await refreshBalance();
    
    const bet = parseInt(document.getElementById('diceBet').value);
    if (isNaN(bet) || bet <= 0) { 
        showNotification('❌ Введите сумму!', 'error'); 
        return; 
    }
    
    console.log(`🎲 Ставка: ${bet}, Баланс: ${userBalance}`);
    
    if (bet > userBalance) {
        showNotification('❌ Недостаточно средств! Баланс: ' + userBalance.toLocaleString() + ' ₽', 'error');
        return;
    }
    
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
        console.log('🎲 Dice response:', data);
        
        if (data.success) {
            if (data.balance !== undefined) {
                userBalance = data.balance;
                console.log(`💰 Новый баланс: ${userBalance}`);
            } else if (data.stats && data.stats.balance !== undefined) {
                userBalance = data.stats.balance;
            }
            
            updateBalanceDisplay();
            updateUI(data.stats);
            
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
        } else {
            showNotification('❌ ' + data.error, 'error');
            if (data.balance !== undefined) {
                userBalance = data.balance;
                updateBalanceDisplay();
            }
            await refreshBalance();
        }
    } catch (error) { 
        showNotification('❌ Ошибка соединения!', 'error');
        console.error('Dice error:', error);
        await refreshBalance();
    }
    setTimeout(() => { btn.disabled = false; }, 1500);
}

// ============================================================
// АВТОРИЗАЦИЯ - С ПРИНУДИТЕЛЬНЫМ ОБНОВЛЕНИЕМ БАЛАНСА
// ============================================================
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
        console.log('🔐 Login response:', data);
        
        if (data.success) {
            userId = data.user_id;
            sessionId = data.user_id;
            localStorage.setItem('ruwin_user_id', userId);
            localStorage.setItem('ruwin_username', data.username);
            document.getElementById('authModal').classList.remove('active');
            document.getElementById('app').style.display = 'block';
            
            if (data.stats && data.stats.balance !== undefined) {
                userBalance = data.stats.balance;
                console.log(`💰 Баланс после логина: ${userBalance}`);
            }
            
            updateUI(data.stats);
            showNotification('✅ Добро пожаловать, ' + data.username + '!', 'success');
            
            // Принудительно обновляем баланс
            await refreshBalance();
        } else {
            errorEl.textContent = '❌ ' + data.error;
        }
    } catch (error) {
        errorEl.textContent = '❌ Ошибка соединения';
        console.error('Login error:', error);
    }
    return false;
}

// ============================================================
// НАВИГАЦИЯ - ОБНОВЛЯЕМ БАЛАНС ПРИ ПЕРЕХОДЕ
// ============================================================
function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const game = this.dataset.game;
            currentGame = game;
            const lobby = document.getElementById('lobby');
            const container = document.getElementById('gameContainer');
            
            // Обновляем баланс при смене игры
            await refreshBalance();
            
            if (game === 'lobby') {
                lobby.style.display = 'block';
                container.classList.remove('active');
                container.innerHTML = '';
            } else {
                lobby.style.display = 'none';
                container.classList.add('active');
                loadGame(game);
            }
        });
    });
}

// ============================================================
// ПЕРЕОПРЕДЕЛЯЕМ checkBalance ДЛЯ ИСПОЛЬЗОВАНИЯ В ИГРАХ
// ============================================================
// Теперь checkBalance возвращает Promise
window.checkBalance = checkBalance;

// ============================================================
// ПРИНУДИТЕЛЬНОЕ ОБНОВЛЕНИЕ БАЛАНСА КАЖДЫЕ 5 СЕКУНД
// ============================================================
setInterval(async () => {
    if (sessionId) {
        await refreshBalance();
    }
}, 5000);

// ============================================================
// ВЫВОД В КОНСОЛЬ
// ============================================================
console.log('🎰 RuWin Casino загружен!');
console.log('💰 Текущий баланс:', userBalance);
console.log('👤 Пользователь:', userId || 'Не авторизован');

// Экспортируем функции в глобальный скоуп
window.refreshBalance = refreshBalance;
window.getCurrentBalance = getCurrentBalance;
window.updateBalanceDisplay = updateBalanceDisplay;
window.rouletteSpin = rouletteSpin;
window.slotsSpin = slotsSpin;
window.blackjackStart = blackjackStart;
window.crashStart = crashStart;
window.crashCashout = crashCashout;
window.rollDice = rollDice;
window.handleLogin = handleLogin;
window.checkBalance = checkBalance;
