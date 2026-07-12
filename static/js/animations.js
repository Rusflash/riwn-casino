// animations.js - Анимации и эффекты

function createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    for (let i = 0; i < 40; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        const size = Math.random() * 3 + 1;
        particle.style.width = size + 'px';
        particle.style.height = size + 'px';
        particle.style.animationDuration = (Math.random() * 20 + 10) + 's';
        particle.style.animationDelay = (Math.random() * 15) + 's';
        container.appendChild(particle);
    }
}

function createConfetti(count = 80) {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);
    const colors = ['#ffd700', '#ff0040', '#00ff88', '#00d4ff', '#8b00ff', '#ff6b00', '#ff1493', '#00ff00'];
    for (let i = 0; i < count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        const size = Math.random() * 8 + 4;
        piece.style.left = Math.random() * 100 + '%';
        piece.style.top = '-10px';
        piece.style.width = size + 'px';
        piece.style.height = size * (Math.random() * 2 + 0.5) + 'px';
        piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        piece.style.animationDuration = (Math.random() * 2 + 1.5) + 's';
        piece.style.animationDelay = (Math.random() * 1.5) + 's';
        piece.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
        container.appendChild(piece);
    }
    setTimeout(() => container.remove(), 4000);
}

function showWinAnimation(amount) {
    createConfetti(100);
    showNotification('🎉 ВЫИГРЫШ +' + amount.toLocaleString() + ' ₽!', 'success');
}

function showLossAnimation(amount) {
    showNotification('😞 ПРОИГРЫШ ' + amount.toLocaleString() + ' ₽', 'error');
}

function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        if (show) overlay.classList.add('active');
        else overlay.classList.remove('active');
    }
}

function playSound(type) {
    console.log('🔊 Sound:', type);
}

document.addEventListener('DOMContentLoaded', function() {
    createParticles();
});