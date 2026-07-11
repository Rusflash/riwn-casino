let sessionId = null;
let currentGame = 'lobby';
let gameData = {};

document.addEventListener('DOMContentLoaded', function() {
    initGame();
    setupNavigation();
    setupGameCards();
});

async function initGame() {
    try {
        const response = await fetch('/api/init', { method: 'POST' });
        const data = await response.json();
        sessionId = data.session_id;
        updateUI(data.stats);
    } catch (error) {
        console.error('Ошибка инициализации:', error);
    }
}

function updateUI(stats) {
    if (stats) {
        document.getElementById('balance').textContent = `$${stats.balance.toLocaleString()}`;
        document.getElementById('level').textContent = stats.level;
    }
}

function setupNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const game = this.dataset.game;
            currentGame = game;
            
            document.querySelectorAll('.game-section').forEach(s => s.classList.remove('active'));
            
            if (game === 'lobby') {
                document.getElementById('lobby').classList.add('active');
                document.getElementById('game-container').innerHTML = '';
            } else {
                document.getElementById('lobby').classList.remove('active');
                loadGame(game);
            }
        });
    });
}

function setupGameCards() {
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', function() {
            const game = this.dataset.game;
            document.querySelector(`.nav-btn[data-game="${game}"]`).click();
        });
    });
}

function loadGame(game) {
    const container = document.getElementById('game-container');
    
    switch(game) {
        case 'roulette':
            loadRoulette(container);
            break;
        case 'slots':
            loadSlots(container);
            break;
        case 'blackjack':
            loadBlackjack(container);
            break;
        case 'crash':
            loadCrash(container);
            break;
    }
}

function showModal(content) {
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('modal').style.display = 'none';
}

window.onclick = function(event) {
    if (event.target == document.getElementById('modal')) {
        closeModal();
    }
}