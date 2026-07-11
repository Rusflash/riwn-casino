from flask import Flask, render_template, request, jsonify
import random
import secrets
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

class RuWinCasino:
    def __init__(self):
        self.balance = 10000
        self.total_bets = 0
        self.wins = 0
        
    def get_stats(self):
        return {
            'balance': self.balance,
            'total_bets': self.total_bets,
            'wins': self.wins,
            'losses': self.total_bets - self.wins,
            'winrate': round((self.wins / self.total_bets * 100), 1) if self.total_bets > 0 else 0,
            'level': 1,
            'xp': 0,
            'xp_next': 100
        }

games = {}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/init', methods=['POST'])
def init_game():
    session_id = secrets.token_hex(16)
    games[session_id] = RuWinCasino()
    return jsonify({
        'session_id': session_id,
        'stats': games[session_id].get_stats()
    })

@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    data = request.json
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
    
    for row in range(3):
        if reels[row*3] == reels[row*3+1] and reels[row*3+1] == reels[row*3+2]:
            win = True
            win_amount += amount * 5
    
    for col in range(3):
        if reels[col] == reels[col+3] and reels[col+3] == reels[col+6]:
            win = True
            win_amount += amount * 5
    
    if reels[0] == reels[4] and reels[4] == reels[8]:
        win = True
        win_amount += amount * 10
    
    if reels[2] == reels[4] and reels[4] == reels[6]:
        win = True
        win_amount += amount * 10
    
    if win:
        game.balance += win_amount
        game.wins += 1
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

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
