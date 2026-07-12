// blackjack.js - Блэкджек

let blackjackState = { deck: [], playerHand: [], dealerHand: [], amount: 0, gameOver: false };

function loadBlackjack(container) {
    container.innerHTML = `
        <div class="game-wrapper">
            <h2 class="game-title">🃏 БЛЭКДЖЕК</h2>
            <div class="blackjack-table">
                <div class="blackjack-hand"><h4>👤 Ваши карты</h4><div class="blackjack-cards" id="playerCards"><div class="blackjack-card">?</div><div class="blackjack-card">?</div></div><div style="margin-top:8px;font-size:18px;font-weight:700;color:var(--text-secondary);" id="playerSum">Сумма: 0</div></div>
                <div class="blackjack-hand"><h4>🤖 Карты дилера</h4><div class="blackjack-cards" id="dealerCards"><div class="blackjack-card">?</div><div class="blackjack-card">?</div></div><div style="margin-top:8px;font-size:18px;font-weight:700;color:var(--text-secondary);" id="dealerSum">Сумма: 0</div></div>
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

async function blackjackStart() {
    const amount = parseFloat(document.getElementById('blackjackBet').value);
    if (isNaN(amount) || amount <= 0) { showModal('❌ Введите сумму!'); return; }
    blackjackState.amount = amount;
    try {
        const response = await fetch('/api/blackjack/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, amount: amount })
        });
        const data = await response.json();
        if (data.success) {
            blackjackState.deck = data.deck;
            blackjackState.playerHand = data.player_hand;
            blackjackState.dealerHand = data.dealer_hand;
            blackjackState.gameOver = data.game_over || false;
            updateBlackjackUI(data);
            if (data.game_over) updateUI(data.stats);
        } else {
            showModal('❌ ' + data.error);
        }
    } catch (error) { showModal('❌ Ошибка!'); }
}

async function blackjackHit() {
    if (blackjackState.gameOver) return;
    try {
        const response = await fetch('/api/blackjack/hit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, deck: blackjackState.deck, player_hand: blackjackState.playerHand, amount: blackjackState.amount })
        });
        const data = await response.json();
        if (data.success) {
            blackjackState.deck = data.deck;
            blackjackState.playerHand = data.player_hand;
            blackjackState.gameOver = data.game_over || false;
            updateBlackjackUI(data);
            if (data.game_over) updateUI(data.stats);
        }
    } catch (error) { showModal('❌ Ошибка!'); }
}

async function blackjackStand() {
    if (blackjackState.gameOver) return;
    try {
        const response = await fetch('/api/blackjack/stand', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, deck: blackjackState.deck, player_hand: blackjackState.playerHand, dealer_hand: blackjackState.dealerHand, amount: blackjackState.amount })
        });
        const data = await response.json();
        if (data.success) {
            blackjackState.gameOver = true;
            updateBlackjackUI(data);
            updateUI(data.stats);
        }
    } catch (error) { showModal('❌ Ошибка!'); }
}

function updateBlackjackUI(data) {
    const playerCards = document.getElementById('playerCards');
    const dealerCards = document.getElementById('dealerCards');
    playerCards.innerHTML = data.player_hand.map(c => {
        const color = c > 10 ? 'red' : 'black';
        const value = c === 11 ? 'A' : c === 10 ? '10' : c;
        return '<div class="blackjack-card ' + color + '">' + value + '</div>';
    }).join('');
    document.getElementById('playerSum').textContent = 'Сумма: ' + sumHand(data.player_hand);
    if (data.game_over || data.dealer_hand.every(c => c !== '?')) {
        dealerCards.innerHTML = data.dealer_hand.filter(c => c !== '?').map(c => {
            const color = c > 10 ? 'red' : 'black';
            const value = c === 11 ? 'A' : c === 10 ? '10' : c;
            return '<div class="blackjack-card ' + color + '">' + value + '</div>';
        }).join('');
        document.getElementById('dealerSum').textContent = 'Сумма: ' + sumHand(data.dealer_hand.filter(c => c !== '?'));
    }
    document.getElementById('blackjackHit').disabled = data.game_over;
    document.getElementById('blackjackStand').disabled = data.game_over;
    const result = document.getElementById('blackjackResult');
    if (data.game_over) {
        if (data.win === true) { result.className = 'game-result win';
            result.textContent = '🎉 ВЫИГРЫШ +' + data.win_amount + ' ₽'; if (data.win_amount > 0) showWinAnimation(data.win_amount); }
        else if (data.win === false) { result.className = 'game-result loss';
            result.textContent = '😞 ПРОИГРЫШ ' + Math.abs(data.win_amount) + ' ₽'; showLossAnimation(Math.abs(data.win_amount)); }
        else { result.className = 'game-result info';
            result.textContent = '🤝 НИЧЬЯ'; }
    } else {
        result.className = 'game-result info';
        result.textContent = 'Игра продолжается...';
    }
}

function sumHand(hand) {
    let sum = hand.reduce((a, b) => a + b, 0);
    let aces = hand.filter(c => c === 11).length;
    while (sum > 21 && aces > 0) { sum -= 10;
        aces--; }
    return sum;
}
