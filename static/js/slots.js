// slots.js - Слоты

let slotsState = { spinning: false };

function loadSlots(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🎲 СЛОТЫ</h2>
            <div class="slots-machine">
                <div class="slots-reels" id="slotsReels">
                    <div class="slot-reel"><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div></div>
                    <div class="slot-reel"><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div></div>
                    <div class="slot-reel"><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div><div class="slot-symbol">🎰</div></div>
                </div>
                <div class="game-result info" id="slotsResult">Сделайте ставку!</div>
                <input type="number" id="slotsBet" class="game-input" value="10" min="1">
                <button class="spin-btn" id="slotsSpinBtn">🎰 КРУТИТЬ</button>
            </div>
        </div>
    `;
    document.getElementById('slotsSpinBtn').addEventListener('click', slotsSpin);
}

async function slotsSpin() {
    if (slotsState.spinning) return;
    const amount = parseFloat(document.getElementById('slotsBet').value);
    if (isNaN(amount) || amount <= 0) { showModal('❌ Введите сумму!'); return; }
    slotsState.spinning = true;
    document.getElementById('slotsSpinBtn').disabled = true;
    const reels = document.querySelectorAll('.slot-reel');
    reels.forEach((reel, i) => setTimeout(() => reel.classList.add('spinning'), i * 100));
    try {
        const response = await fetch('/api/slots/spin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, amount: amount })
        });
        const data = await response.json();
        if (data.success) {
            reels.forEach((reel, idx) => {
                setTimeout(() => {
                    reel.classList.remove('spinning');
                    reel.classList.add('stopping');
                    setTimeout(() => {
                        const symbols = reel.querySelectorAll('.slot-symbol');
                        symbols.forEach((sym, row) => {
                            const pos = idx * 3 + row;
                            if (data.reels && data.reels[pos]) sym.textContent = data.reels[pos];
                            sym.classList.remove('win-highlight');
                        });
                        reel.classList.remove('stopping');
                        if (data.win) setTimeout(() => symbols.forEach(s => s.classList.add('win-highlight')), 200);
                    }, 400);
                }, idx * 300 + 800);
            });
            setTimeout(() => {
                const result = document.getElementById('slotsResult');
                result.className = 'game-result ' + (data.win ? 'win' : 'loss');
                result.textContent = data.win ? '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽' : '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽';
                if (data.win) showWinAnimation(data.win_amount);
                else showLossAnimation(Math.abs(data.win_amount));
                updateUI(data.stats);
            }, 2500);
        } else {
            showModal('❌ ' + data.error);
        }
    } catch (error) {
        showModal('❌ Ошибка соединения!');
    }
    setTimeout(() => {
        slotsState.spinning = false;
        document.getElementById('slotsSpinBtn').disabled = false;
        document.querySelectorAll('.slot-reel').forEach(r => r.classList.remove('spinning', 'stopping'));
        document.querySelectorAll('.slot-symbol').forEach(s => s.classList.remove('win-highlight'));
    }, 4000);
}
