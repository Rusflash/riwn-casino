let rouletteState = {
    betType: 'number',
    selectedNumber: null,
    selectedDozen: null,
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
                    <div class="game-result" id="rouletteResult"></div>
                    
                    <div class="bet-grid">
                        <button class="bet-btn active" data-type="number">🎯 Число</button>
                        <button class="bet-btn red" data-type="red">🔴 Красное</button>
                        <button class="bet-btn black" data-type="black">⚫ Чёрное</button>
                        <button class="bet-btn" data-type="even">2️⃣ Чётное</button>
                        <button class="bet-btn" data-type="odd">1️⃣ Нечётное</button>
                        <button class="bet-btn" data-type="half1">⬆ 1-18</button>
                        <button class="bet-btn" data-type="half2">⬇ 19-36</button>
                        <button class="bet-btn" data-type="dozen">📊 Дюжина</button>
                    </div>
                    
                    <div id="numberSelector" style="display: none;">
                        <label>Выберите число:</label>
                        <div class="number-grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin:10px 0;">
                            ${generateNumberSelector()}
                        </div>
                    </div>
                    
                    <div id="dozenSelector" style="display: none;">
                        <label>Выберите дюжину:</label>
                        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:10px 0;">
                            <button class="dozen-btn" data-dozen="1">1-12</button>
                            <button class="dozen-btn" data-dozen="2">13-24</button>
                            <button class="dozen-btn" data-dozen="3">25-36</button>
                        </div>
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
    const numbers = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
    return numbers.map(num => {
        const color = num === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(num) ? 'red' : 'black';
        return `<div class="roulette-number ${color}" data-number="${num}">${num}</div>`;
    }).join('');
}

function generateNumberSelector() {
    return Array.from({length: 37}, (_, i) => {
        const color = i === 0 ? 'green' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(i) ? 'red' : 'black';
        return `<button class="number-btn ${color}" data-number="${i}">${i}</button>`;
    }).join('');
}

function setupRouletteEvents() {
    const board = document.getElementById('rouletteBoard');
    const result = document.getElementById('rouletteResult');
    
    // Выбор типа ставки
    document.querySelectorAll('.bet-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.bet-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            rouletteState.betType = this.dataset.type;
            
            document.getElementById('numberSelector').style.display = rouletteState.betType === 'number' ? 'block' : 'none';
            document.getElementById('dozenSelector').style.display = rouletteState.betType === 'dozen' ? 'block' : 'none';
        });
    });
    
    // Выбор номера
    document.querySelectorAll('.roulette-number').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('.roulette-number').forEach(n => n.classList.remove('selected'));
            this.classList.add('selected');
            rouletteState.selectedNumber = parseInt(this.dataset.number);
        });
    });
    
    document.querySelectorAll('.number-btn').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('.number-btn').forEach(n => n.classList.remove('selected'));
            this.classList.add('selected');
            rouletteState.selectedNumber = parseInt(this.dataset.number);
        });
    });
    
    document.querySelectorAll('.dozen-btn').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('.dozen-btn').forEach(n => n.classList.remove('selected'));
            this.classList.add('selected');
            rouletteState.selectedDozen = parseInt(this.dataset.dozen);
        });
    });
    
    // Спин
    document.getElementById('rouletteSpin').addEventListener('click', rouletteSpin);
}

async function rouletteSpin() {
    if (rouletteState.spinning) return;
    
    const amount = parseFloat(document.getElementById('rouletteBet').value);
    if (isNaN(amount) || amount <= 0) {
        showModal('❌ Введите корректную сумму ставки!');
        return;
    }
    
    let payload = {
        session_id: sessionId,
        bet_type: rouletteState.betType,
        amount: amount
    };
    
    if (rouletteState.betType === 'number') {
        if (rouletteState.selectedNumber === null) {
            showModal('❌ Выберите число!');
            return;
        }
        payload.number = rouletteState.selectedNumber;
    } else if (rouletteState.betType === 'dozen') {
        if (rouletteState.selectedDozen === null) {
            showModal('❌ Выберите дюжину!');
            return;
        }
        payload.number = rouletteState.selectedDozen;
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
            result.className = `game-result ${data.win ? 'win' : 'loss'}`;
            result.innerHTML = `
                Выпало: <strong style="color: ${data.color === 'red' ? '#ff0040' : data.color === 'green' ? '#00cc44' : '#fff'}">${data.result}</strong> (${data.color.toUpperCase()})
                <br>${data.win ? `🎉 ВЫИГРЫШ +$${data.win_amount}` : `😞 ПРОИГРЫШ $${Math.abs(data.win_amount)}`}
            `;
            
            updateUI(data.stats);
        } else {
            showModal(`❌ ${data.error}`);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showModal('❌ Ошибка соединения!');
    }
    
    setTimeout(() => {
        rouletteState.spinning = false;
        document.getElementById('rouletteSpin').disabled = false;
        document.querySelector('.roulette-board').parentElement.classList.remove('spinning');
    }, 1500);
}