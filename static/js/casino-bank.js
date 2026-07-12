// casino-bank.js - Умная система банка

class CasinoBank {
    constructor() {
        this.balance = 1000000; // Начальный баланс
        this.reserve = 200000; // Резервный фонд
        this.edge = 0.05; // Преимущество казино 5%
        this.maxPayout = 100000; // Максимальная выплата
        this.totalBets = 0;
        this.totalWins = 0;
        this.totalLosses = 0;
        this.houseEdge = 0.05; // 5% преимущество казино
        this.transactions = [];
        this.riskLevel = 'medium';
        this.autoBalance = true;
        this.minBalance = 100000;
        this.maxBalance = 10000000;
        this.profitTarget = 0;
        this.lossLimit = 100000;
        this.currentProfit = 0;
        this.dailyProfit = 0;
        this.weeklyProfit = 0;
        this.monthlyProfit = 0;
        this.lastReset = new Date();
        this.isLocked = false;
        this.lockReason = '';
        this.auditLog = [];
    }

    // Проверка может ли казино выплатить
    canPay(amount) {
        if (this.isLocked) return false;
        if (amount > this.maxPayout) return false;
        if (this.balance < amount + this.reserve) return false;
        return true;
    }

    // Обработка ставки
    processBet(amount, playerWin) {
        if (this.isLocked) {
            throw new Error('Банк казино временно заблокирован');
        }

        const houseEdge = this.calculateHouseEdge();
        let result = {};

        if (playerWin) {
            // Игрок выиграл - казино платит
            const winAmount = amount * (1 - houseEdge);
            if (!this.canPay(winAmount)) {
                throw new Error('Недостаточно средств в банке для выплаты');
            }
            this.balance -= winAmount;
            this.totalLosses += winAmount;
            this.currentProfit -= winAmount;
            this.dailyProfit -= winAmount;
            
            result = {
                type: 'payout',
                amount: winAmount,
                balance: this.balance,
                houseEdge: houseEdge
            };
        } else {
            // Игрок проиграл - казино забирает
            const winAmount = amount * (1 + houseEdge);
            this.balance += winAmount;
            this.totalWins += winAmount;
            this.currentProfit += winAmount;
            this.dailyProfit += winAmount;
            
            result = {
                type: 'income',
                amount: winAmount,
                balance: this.balance,
                houseEdge: houseEdge
            };
        }

        this.totalBets++;
        this.transactions.push({
            ...result,
            timestamp: new Date(),
            betAmount: amount,
            playerWin: playerWin
        });

        // Автоматический баланс
        if (this.autoBalance) {
            this.autoBalanceBank();
        }

        // Проверка лимитов
        this.checkLimits();

        return result;
    }

    // Расчет преимущества казино
    calculateHouseEdge() {
        // Динамическое преимущество в зависимости от риска
        let baseEdge = this.houseEdge;
        
        // Если баланс низкий - увеличиваем преимущество
        if (this.balance < this.minBalance * 1.5) {
            baseEdge += 0.02;
        }
        
        // Если баланс высокий - уменьшаем преимущество
        if (this.balance > this.maxBalance * 0.5) {
            baseEdge -= 0.01;
        }
        
        // Ограничиваем
        return Math.max(0.02, Math.min(0.1, baseEdge));
    }

    // Автоматический баланс банка
    autoBalanceBank() {
        // Если баланс слишком низкий - пополняем из резерва
        if (this.balance < this.minBalance) {
            const needed = this.minBalance - this.balance;
            const fromReserve = Math.min(needed, this.reserve);
            this.balance += fromReserve;
            this.reserve -= fromReserve;
            this.logAudit('auto_balance', `Пополнено из резерва: ${fromReserve}`);
        }
        
        // Если баланс слишком высокий - пополняем резерв
        if (this.balance > this.maxBalance) {
            const excess = this.balance - this.maxBalance;
            this.reserve += excess;
            this.balance -= excess;
            this.logAudit('auto_balance', `Переведено в резерв: ${excess}`);
        }

        // Если резерв низкий - пополняем из прибыли
        if (this.reserve < 50000 && this.currentProfit > 0) {
            const toReserve = Math.min(this.currentProfit * 0.5, 100000);
            this.reserve += toReserve;
            this.currentProfit -= toReserve;
            this.logAudit('auto_balance', `Пополнен резерв: ${toReserve}`);
        }
    }

    // Проверка лимитов
    checkLimits() {
        // Проверка дневной прибыли
        const now = new Date();
        if (now.getDate() !== this.lastReset.getDate()) {
            this.dailyProfit = 0;
            this.lastReset = now;
        }

        // Если убыток превышает лимит - блокируем
        if (this.dailyProfit < -this.lossLimit) {
            this.isLocked = true;
            this.lockReason = 'Достигнут лимит убытков за день';
            this.logAudit('lock', this.lockReason);
        }

        // Если прибыль достигла цели - блокируем
        if (this.profitTarget > 0 && this.currentProfit >= this.profitTarget) {
            this.isLocked = true;
            this.lockReason = 'Достигнута цель прибыли';
            this.logAudit('lock', this.lockReason);
        }
    }

    // Разблокировка банка
    unlockBank() {
        this.isLocked = false;
        this.lockReason = '';
        this.logAudit('unlock', 'Банк разблокирован');
    }

    // Получение статистики
    getStats() {
        return {
            balance: this.balance,
            reserve: this.reserve,
            totalBets: this.totalBets,
            totalWins: this.totalWins,
            totalLosses: this.totalLosses,
            currentProfit: this.currentProfit,
            dailyProfit: this.dailyProfit,
            weeklyProfit: this.weeklyProfit,
            monthlyProfit: this.monthlyProfit,
            houseEdge: this.houseEdge,
            riskLevel: this.riskLevel,
            isLocked: this.isLocked,
            lockReason: this.lockReason,
            canPayout: this.canPay(1000),
            winRate: this.totalBets > 0 ? (this.totalWins / this.totalBets * 100) : 0,
            lossRate: this.totalBets > 0 ? (this.totalLosses / this.totalBets * 100) : 0
        };
    }

    // Логирование
    logAudit(action, details) {
        this.auditLog.push({
            timestamp: new Date(),
            action: action,
            details: details,
            balance: this.balance,
            reserve: this.reserve,
            profit: this.currentProfit
        });
    }

    // Получение истории транзакций
    getHistory(limit = 100) {
        return this.transactions.slice(-limit).reverse();
    }

    // Установка уровня риска
    setRiskLevel(level) {
        const levels = {
            low: 0.03,
            medium: 0.05,
            high: 0.08,
            extreme: 0.12
        };
        if (levels[level]) {
            this.riskLevel = level;
            this.houseEdge = levels[level];
            this.logAudit('risk_change', `Уровень риска изменен на: ${level}`);
        }
    }
}

// Создаем глобальный экземпляр
const casinoBank = new CasinoBank();