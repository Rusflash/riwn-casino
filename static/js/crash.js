// crash.js - Aviator

let crashState = { multiplier: 1, isActive: false, isBetPlaced: false, crashPoint: 0, amount: 0, interval: null };

function loadCrash(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">✈️ AVIATOR</h2>
            <div class="crash-game">
                <div class="crash-chart" id="crashChart"><div class="crash-multiplier" id="crashMultiplier">1.00x</div></div>
                <div class="game-result info" id="crashResult">Сделайте ставку!</div>
                <input type="number" id="crashBet" class="game-input" value="10" min="1">
                <div class="crash-controls">
                    <button class="crash-btn bet" id="crashStart">🚀 СТАВКА</button>
                    <button class="crash-btn cashout" id="crashCashout" disabled>💰 ЗАБРАТЬ</button>
                </div>
                <div class="crash-history" id="crashHistory"></div>
            </div>
        </div>
    `;
    document.getElementById('crashStart').addEventListener('click', crashStart);
    document.getElementById('crashCashout').addEventListener('click', crashCashout);
}

async function crashStart() {
    if (crashState.isActive) return;
    const amount = parseFloat(document.getElementById('crashBet').value);
    if (isNaN(amount) || amount <= 0) { showModal('❌ Введите сумму!'); return; }
    crashState.amount = amount;
    crashState.isBetPlaced = true;
    crashState.isActive = true;
    crashState.multiplier = 1;
    document.getElementById('crashStart').disabled = true;
    document.getElementById('crashCashout').disabled = false;
    document.getElementById('crashResult').className = 'game-result info';
    document.getElementById('crashResult').textContent = '✈️ Самолет взлетает...';
    try {
        const response = await fetch('/api/crash/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, amount: amount })
        });
        const data = await response.json();
        if (data.success) {
            crashState.crashPoint = data.crash_point;
            updateUI(data.stats);
            let startTime = Date.now();
            crashState.interval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(elapsed / 5, 1);
                if (progress < 1) crashState.multiplier = 1 + progress * (crashState.crashPoint - 1);
                else crashState.multiplier = crashState.crashPoint;
                document.getElementById('crashMultiplier').textContent = crashState.multiplier.toFixed(2) + 'x';
                if (crashState.multiplier >= crashState.crashPoint - 0.01) {
                    clearInterval(crashState.interval);
                    crashCrash();
                }
            }, 50);
        } else {
            showModal('❌ ' + data.error);
            resetCrash();
        }
    } catch (error) { showModal('❌ Ошибка!');
        resetCrash(); }
}

async function crashCashout() {
    if (!crashState.isActive || !crashState.isBetPlaced) return;
    clearInterval(crashState.interval);
    crashState.isActive = false;
    document.getElementById('crashCashout').disabled = true;
    try {
        const response = await fetch('/api/crash/cashout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, amount: crashState.amount, multiplier: crashState.multiplier })
        });
        const data = await response.json();
        if (data.success) {
            const result = document.getElementById('crashResult');
            result.className = 'game-result win';
            result.textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽ (' + crashState.multiplier.toFixed(2) + 'x)';
            showWinAnimation(data.win_amount);
            updateUI(data.stats);
            addCrashHistory(crashState.multiplier, true);
            resetCrash();
        }
    } catch (error) { showModal('❌ Ошибка!');
        resetCrash(); }
}

async function crashCrash() {
    if (!crashState.isActive || !crashState.isBetPlaced) return;
    crashState.isActive = false;
    document.getElementById('crashCashout').disabled = true;
    document.getElementById('crashMultiplier').classList.add('crashed');
    const result = document.getElementById('crashResult');
    result.className = 'game-result loss';
    result.textContent = '💥 КРАШ! (' + crashState.crashPoint.toFixed(2) + 'x)';
    try {
        const response = await fetch('/api/crash/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, amount: crashState.amount })
        });
        const data = await response.json();
        if (data.success) {
            updateUI(data.stats);
            showLossAnimation(Math.abs(crashState.amount));
            addCrashHistory(crashState.crashPoint, false);
        }
    } catch (error) {}
    resetCrash();
}

function resetCrash() {
    crashState.isActive = false;
    crashState.isBetPlaced = false;
    crashState.multiplier = 1;
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
