// roulette.js - Рулетка

let rouletteState = {
    betType: 'number',
    selectedNumber: null,
    spinning: false
};

function loadRoulette(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎰 ЕВРОПЕЙСКАЯ РУЛЕТКА</h2>
            <div class="roulette-layout">
                <div class="roulette-board" id="rouletteBoard">
                    ${generateRouletteNumbers()}
                </div>
                <div class="roulette-controls">
                    <div class="game-result info" id="rouletteResult">Сделайте ставку!</div>
                    <div class="bet-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0;">
                        <button class="bet-btn active" data-type="number" style="padding:6px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.2);border-radius:6px;color:#fff;cursor:pointer;font-size:11px;font-weight:600;">🎯 Число</button>
                        <button class="bet-btn" data-type="red" style="padding:6px;background:rgba(255,0,64,0.1);border:1px solid rgba(255,0,64,0.1);border-radius:6px;color:#ff0040;cursor:pointer;font-size:11px;font-weight:600;">🔴 Красное</button>
                        <button class="bet-btn" data-type="black" style="padding:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:6px;color:#fff;cursor:pointer;font-size:11px;font-weight:600;">⚫ Чёрное</button>
                        <button class="bet-btn" data-type="even" style="padding:6px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:6px;color:#00d4ff;cursor:pointer;font-size:11px;font-weight:600;">2️⃣ Чёт</button>
                        <button class="bet-btn" data-type="odd" style="padding:6px;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.1);border-radius:6px;color:#00d4ff;cursor:pointer;font-size:11px;font-weight:600;">1️⃣ Нечёт</button>
                        <button class="bet-btn" data-type="half1" style="padding:6px;background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.1);border-radius:6px;color:#ffd700;cursor:pointer;font-size:11px;font-weight:600;">⬆ 1-18</button>
                        <button class="bet-btn" data-type="half2" style="padding:6px;background:rgba(255,215,0,0.05);border:1px solid rgba(255,215,0,0.1);border-radius:6px;color:#ffd700;cursor:pointer;font-size:11px;font-weight:600;">⬇ 19-36</button>
                        <button class="bet-btn" data-type="dozen" style="padding:6px;background:rgba(139,0,255,0.05);border:1px solid rgba(139,0,255,0.1);border-radius:6px;color:#8b00ff;cursor:pointer;font-size:11px;font-weight:600;">📊 Дюжина</button>
                    </div>
                    <div id="numberSelector">
                        <label style="font-size:11px;color:var(--text-secondary);">Выберите число:</label>
                        <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin:6px 0;">${generateNumberSelector()}</div>
                    </div>
                    <input type="number" id="rouletteBet" class="game-input" value="10" min="1">
                    <button class="spin-btn" id="rouletteSpin">🎰 СПИН</button>
                </div>
            </div>
        </div>
    `;
    setupRouletteEvents();
}

function generateRouletteNumbers() {
    const numbers = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
    return numbers.map(num => {
        const color = num === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num) ? 'red' : 'black';
        return '<div class="roulette-number ' + color + '" data-number="' + num + '">' + num + '</div>';
    }).join('');
}

function generateNumberSelector() {
    let html = '';
    for (let i = 0; i <= 36; i++) {
        const color = i === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(i) ? 'red' : 'black';
        html += '<button class="number-btn" data-number="' + i + '" style="padding:4px;background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.05);border-radius:4px;color:#fff;cursor:pointer;font-size:11px;font-family:\'Orbitron\',monospace;">' + i + '</button>';
    }
    return html;
}

function setupRouletteEvents() {
    document.querySelectorAll('.bet-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.bet-btn').forEach(b => b.style.borderColor = 'rgba(255,255,255,0.05)');
            this.style.borderColor = 'var(--casino-gold)';
            rouletteState.betType = this.dataset.type;
            document.getElementById('numberSelector').style.display = rouletteState.betType === 'number' ? 'block' : 'none';
        });
    });
    document.querySelectorAll('.roulette-number').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('.roulette-number').forEach(n => n.classList.remove('selected'));
            this.classList.add('selected');
            rouletteState.selectedNumber = parseInt(this.dataset.number);
        });
    });
    document.querySelectorAll('.number-btn').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('.number-btn').forEach(n => n.style.borderColor = 'rgba(255,255,255,0.05)');
            this.style.borderColor = 'var(--casino-gold)';
            rouletteState.selectedNumber = parseInt(this.dataset.number);
        });
    });
    document.getElementById('rouletteSpin').addEventListener('click', rouletteSpin);
}

async function rouletteSpin() {
    if (rouletteState.spinning) return;
    const amount = parseFloat(document.getElementById('rouletteBet').value);
    if (isNaN(amount) || amount <= 0) { showModal('❌ Введите сумму!'); return; }
    let payload = { session_id: sessionId, bet_type: rouletteState.betType, amount: amount };
    if (rouletteState.betType === 'number') {
        if (rouletteState.selectedNumber === null) { showModal('❌ Выберите число!'); return; }
        payload.number = rouletteState.selectedNumber;
    }
    rouletteState.spinning = true;
    document.getElementById('rouletteSpin').disabled = true;
    document.querySelector('.roulette-board').parentElement.classList.add('spinning');
    try {
        const response = await fetch('/api/roulette/spin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (data.success) {
            const result = document.getElementById('rouletteResult');
            result.className = 'game-result ' + (data.win ? 'win' : 'loss');
            result.innerHTML = 'Выпало: <strong style="color:' + (data.color === 'red' ? '#ff0040' : data.color === 'green' ? '#00cc44' : '#fff') + '">' + data.result + '</strong> (' + data.color.toUpperCase() + ')<br>' + (data.win ? '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽' : '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽');
            if (data.win) showWinAnimation(data.win_amount);
            else showLossAnimation(Math.abs(data.win_amount));
            updateUI(data.stats);
        } else {
            showModal('❌ ' + data.error);
        }
    } catch (error) {
        showModal('❌ Ошибка соединения!');
    }
    setTimeout(() => {
        rouletteState.spinning = false;
        document.getElementById('rouletteSpin').disabled = false;
        document.querySelector('.roulette-board').parentElement.classList.remove('spinning');
    }, 1500);
}
