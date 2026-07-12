// casino-bank.js - Система банка

class CasinoBank {
    constructor() {
        this.balance = 1000000;
        this.reserve = 200000;
        this.houseEdge = 0.05;
        this.totalBets = 0;
        this.totalWins = 0;
        this.totalLosses = 0;
        this.currentProfit = 0;
        this.dailyProfit = 0;
        this.isLocked = false;
        this.lockReason = '';
        this.minBalance = 100000;
        this.maxBalance = 10000000;
        this.lossLimit = 100000;
        this.profitTarget = 0;
        this.autoBalance = true;
        this.lastReset = new Date();
    }

    canPay(amount) {
        if (this.isLocked) return false;
        if (this.balance < amount + this.reserve) return false;
        return true;
    }

    processBet(amount, playerWin) {
        if (this.isLocked) throw new Error('Банк казино временно заблокирован');
        const edge = this.calculateHouseEdge();
        let result;
        if (playerWin) {
            const winAmount = Math.round(amount * (1 - edge));
            if (!this.canPay(winAmount)) throw new Error('Недостаточно средств в банке для выплаты');
            this.balance -= winAmount;
            this.totalLosses += winAmount;
            this.currentProfit -= winAmount;
            this.dailyProfit -= winAmount;
            result = { type: 'payout', amount: winAmount, balance: this.balance, edge: edge };
        } else {
            const winAmount = Math.round(amount * (1 + edge));
            this.balance += winAmount;
            this.totalWins += winAmount;
            this.currentProfit += winAmount;
            this.dailyProfit += winAmount;
            result = { type: 'income', amount: winAmount, balance: this.balance, edge: edge };
        }
        this.totalBets++;
        if (this.autoBalance) this.autoBalanceBank();
        this.checkLimits();
        return result;
    }

    calculateHouseEdge() {
        let edge = this.houseEdge;
        if (this.balance < this.minBalance * 1.5) edge += 0.02;
        if (this.balance > this.maxBalance * 0.5) edge -= 0.01;
        return Math.max(0.02, Math.min(0.1, edge));
    }

    autoBalanceBank() {
        if (this.balance < this.minBalance) {
            const needed = this.minBalance - this.balance;
            const fromReserve = Math.min(needed, this.reserve);
            this.balance += fromReserve;
            this.reserve -= fromReserve;
        }
        if (this.balance > this.maxBalance) {
            const excess = this.balance - this.maxBalance;
            this.reserve += excess;
            this.balance -= excess;
        }
        if (this.reserve < 50000 && this.currentProfit > 0) {
            const toReserve = Math.min(this.currentProfit * 0.5, 100000);
            this.reserve += toReserve;
            this.currentProfit -= toReserve;
        }
    }

    checkLimits() {
        const now = new Date();
        if (now.getDate() !== this.lastReset.getDate()) {
            this.dailyProfit = 0;
            this.lastReset = now;
        }
        if (this.dailyProfit < -this.lossLimit) {
            this.isLocked = true;
            this.lockReason = 'Достигнут лимит убытков за день';
        }
        if (this.profitTarget > 0 && this.currentProfit >= this.profitTarget) {
            this.isLocked = true;
            this.lockReason = 'Достигнута цель прибыли';
        }
    }

    getStats() {
        return {
            balance: this.balance,
            reserve: this.reserve,
            totalBets: this.totalBets,
            totalWins: this.totalWins,
            totalLosses: this.totalLosses,
            currentProfit: this.currentProfit,
            dailyProfit: this.dailyProfit,
            houseEdge: this.houseEdge,
            isLocked: this.isLocked,
            lockReason: this.lockReason,
            canPayout: this.canPay(1000)
        };
    }
}

const casinoBank = new CasinoBank();

function updateBankUI() {
    const balanceEl = document.getElementById('bankBalance');
    const profitEl = document.getElementById('bankProfit');
    const edgeEl = document.getElementById('houseEdge');
    if (balanceEl) balanceEl.textContent = casinoBank.balance.toLocaleString() + ' ₽';
    if (profitEl) {
        const profit = casinoBank.currentProfit;
        profitEl.textContent = (profit >= 0 ? '+' : '') + profit.toLocaleString() + ' ₽';
        profitEl.className = 'value ' + (profit >= 0 ? 'green' : 'red');
    }
    if (edgeEl) edgeEl.textContent = (casinoBank.houseEdge * 100).toFixed(1) + '%';
}

setInterval(updateBankUI, 5000);
