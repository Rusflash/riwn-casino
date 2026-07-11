// static/js/slots.js
// Логика игры Слоты

let slotsState = {
    spinning: false
};

// Загрузка слотов
function loadSlots(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎲 СЛОТЫ</h2>
            
            <div class="slots-machine">
                <div class="slots-reels" id="slotsReels">
                    <div class="slot-reel" data-reel="0">
                        <div class="slot-symbol" data-row="0">🎰</div>
                        <div class="slot-symbol" data-row="1">🎰</div>
                        <div class="slot-symbol" data-row="2">🎰</div>
                    </div>
                    <div class="slot-reel" data-reel="1">
                        <div class="slot-symbol" data-row="0">🎰</div>
                        <div class="slot-symbol" data-row="1">🎰</div>
                        <div class="slot-symbol" data-row="2">🎰</div>
                    </div>
                    <div class="slot-reel" data-reel="2">
                        <div class="slot-symbol" data-row="0">🎰</div>
                        <div class="slot-symbol" data-row="1">🎰</div>
                        <div class="slot-symbol" data-row="2">🎰</div>
                    </div>
                </div>
                
                <div class="game-result" id="slotsResult"></div>
                
                <input type="number" id="slotsBet" class="game-input" value="10" min="1">
                <button class="spin-btn" id="slotsSpinBtn">🎰 КРУТИТЬ</button>
            </div>
        </div>
    `;
    
    setupSlotsEvents();
}

// Настройка событий слотов
function setupSlotsEvents() {
    document.getElementById('slotsSpinBtn').addEventListener('click', slotsSpin);
}

// Вращение слотов
async function slotsSpin() {
    if (slotsState.spinning) return;
    
    const amount = parseFloat(document.getElementById('slotsBet').value);
    if (isNaN(amount) || amount <= 0) {
        showModal('❌ Введите корректную сумму ставки!');
        return;
    }
    
    slotsState.spinning = true;
    document.getElementById('slotsSpinBtn').disabled = true;
    
    const reels = document.querySelectorAll('.slot-reel');
    
    // Запускаем вращение
    reels.forEach((reel, i) => {
        setTimeout(() => {
            reel.classList.add('spinning');
        }, i * 100);
    });
    
    try {
        const response = await fetch('/api/slots/spin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                session_id: sessionId,
                amount: amount
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            console.log('Данные слотов:', data);
            
            // Останавливаем барабаны по очереди
            reels.forEach((reel, reelIndex) => {
                setTimeout(() => {
                    reel.classList.remove('spinning');
                    reel.classList.add('stopping');
                    
                    // Обновляем символы после остановки
                    setTimeout(() => {
                        const symbols = reel.querySelectorAll('.slot-symbol');
                        symbols.forEach((symbol, rowIndex) => {
                            const idx = reelIndex * 3 + rowIndex;
                            if (data.reels && data.reels[idx]) {
                                symbol.textContent = data.reels[idx];
                            } else {
                                symbol.textContent = '🎰';
                            }
                            symbol.classList.remove('win-highlight');
                        });
                        reel.classList.remove('stopping');
                        
                        // Подсветка выигрышных линий
                        if (data.win) {
                            setTimeout(() => {
                                symbols.forEach(s => s.classList.add('win-highlight'));
                                reel.classList.add('win-reel');
                            }, 200);
                        }
                    }, 400);
                }, reelIndex * 300 + 800);
            });
            
            // Показываем результат
            setTimeout(() => {
                const result = document.getElementById('slotsResult');
                result.className = `game-result ${data.win ? 'win' : 'loss'}`;
                result.textContent = data.win ? 
                    `🎉 ВЫИГРЫШ +$${data.win_amount}` : 
                    `😞 ПРОИГРЫШ $${Math.abs(data.win_amount)}`;
                updateUI(data.stats);
            }, 2500);
            
        } else {
            showModal(`❌ ${data.error}`);
            reels.forEach(reel => {
                reel.classList.remove('spinning', 'stopping');
            });
        }
    } catch (error) {
        console.error('Ошибка:', error);
        showModal('❌ Ошибка соединения!');
        reels.forEach(reel => {
            reel.classList.remove('spinning', 'stopping');
        });
    }
    
    // Полный сброс
    setTimeout(() => {
        slotsState.spinning = false;
        document.getElementById('slotsSpinBtn').disabled = false;
        document.querySelectorAll('.slot-reel').forEach(r => {
            r.classList.remove('spinning', 'stopping', 'win-reel');
        });
        document.querySelectorAll('.slot-symbol').forEach(s => {
            s.classList.remove('win-highlight');
        });
    }, 4000);
}