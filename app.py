from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import random
import secrets
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# Проверяем, что папка templates существует
print("Путь к templates:", os.path.join(app.root_path, 'templates'))
print("Файлы в templates:", os.listdir(os.path.join(app.root_path, 'templates')) if os.path.exists(os.path.join(app.root_path, 'templates')) else "Папка не найдена")

class RuWinCasino:
    def __init__(self):
        self.balance = 10000
        self.total_bets = 0
        self.wins = 0
        self.level = 1
        self.xp = 0
        
    def get_stats(self):
        total = self.total_bets
        wins = self.wins
        losses = total - wins
        winrate = (wins / total * 100) if total > 0 else 0
        
        return {
            'balance': self.balance,
            'total_bets': total,
            'wins': wins,
            'losses': losses,
            'winrate': round(winrate, 1),
            'level': self.level,
            'xp': self.xp,
            'xp_next': self.level * 100
        }
    
    def add_xp(self, amount):
        self.xp += amount
        while self.xp >= self.level * 100:
            self.xp -= self.level * 100
            self.level += 1

games = {}

@app.route('/')
def index():
    try:
        return render_template('index.html')
    except Exception as e:
        return f"Ошибка загрузки index.html: {str(e)}", 500

@app.route('/test')
def test():
    return "Сервер работает! Если вы это видите, значит проблема в index.html"

@app.route('/api/init', methods=['POST'])
def init_game():
    try:
        session_id = secrets.token_hex(16)
        games[session_id] = RuWinCasino()
        return jsonify({
            'success': True,
            'session_id': session_id,
            'stats': games[session_id].get_stats()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ СЛОТЫ ============
@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'Нет данных'}), 400
            
        session_id = data.get('session_id')
        amount = float(data.get('amount', 0))
        
        game = games.get(session_id)
        if not game:
            return jsonify({'success': False, 'error': 'Сессия не найдена'})
        
        if amount > game.balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств'})
        
        symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣', '🎰']
        reels = [random.choice(symbols) for _ in range(9)]
        
        win = False
        win_amount = 0
        
        # Проверка строк
        for row in range(3):
            if reels[row*3] == reels[row*3+1] and reels[row*3+1] == reels[row*3+2]:
                win = True
                win_amount += amount * 5
        
        # Проверка столбцов
        for col in range(3):
            if reels[col] == reels[col+3] and reels[col+3] == reels[col+6]:
                win = True
                win_amount += amount * 5
        
        # Проверка диагоналей
        if reels[0] == reels[4] and reels[4] == reels[8]:
            win = True
            win_amount += amount * 10
        if reels[2] == reels[4] and reels[4] == reels[6]:
            win = True
            win_amount += amount * 10
        
        if win:
            game.balance += win_amount
            game.wins += 1
            game.add_xp(int(win_amount / 5))
        else:
            game.balance -= amount
            win_amount = -amount
        
        game.total_bets += 1
        
        return jsonify({
            'success': True,
            'reels': reels,
            'win': win,
            'win_amount': win_amount,
            'balance': game.balance,
            'stats': game.get_stats()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Добавьте остальные API (рулетка, блэкджек, aviator) по аналогии

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
