from flask import Flask, render_template, request, jsonify
import random
import secrets

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

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
    return render_template('index.html')

@app.route('/api/init', methods=['POST'])
def init_game():
    session_id = secrets.token_hex(16)
    games[session_id] = RuWinCasino()
    return jsonify({
        'session_id': session_id,
        'stats': games[session_id].get_stats()
    })

# ============ РУЛЕТКА ============
@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    data = request.json
    session_id = data.get('session_id')
    bet_type = data.get('bet_type')
    amount = float(data.get('amount', 0))
    number = data.get('number')
    
    game = games.get(session_id)
    if not game:
        return jsonify({'success': False, 'error': 'Сессия не найдена'})
    
    if amount > game.balance:
        return jsonify({'success': False, 'error': 'Недостаточно средств'})
    
    result = random.randint(0, 36)
    color = 'red' if result in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if result != 0 else 'green'
    
    win = False
    win_amount = 0
    
    if bet_type == 'number' and result == number:
        win = True
        win_amount = amount * 35
    elif bet_type == 'red' and color == 'red':
        win = True
        win_amount = amount * 2
    elif bet_type == 'black' and color == 'black':
        win = True
        win_amount = amount * 2
    elif bet_type == 'even' and result != 0 and result % 2 == 0:
        win = True
        win_amount = amount * 2
    elif bet_type == 'odd' and result != 0 and result % 2 == 1:
        win = True
        win_amount = amount * 2
    elif bet_type == 'half1' and 1 <= result <= 18:
        win = True
        win_amount = amount * 2
    elif bet_type == 'half2' and 19 <= result <= 36:
        win = True
        win_amount = amount * 2
    elif bet_type == 'dozen' and ((number == 1 and 1 <= result <= 12) or (number == 2 and 13 <= result <= 24) or (number == 3 and 25 <= result <= 36)):
        win = True
        win_amount = amount * 3
    
    if win:
        game.balance += win_amount - amount
        game.wins += 1
        game.add_xp(int(abs(win_amount) / 10))
    else:
        game.balance -= amount
    
    game.total_bets += 1
    
    return jsonify({
        'success': True,
        'result': result,
        'color': color,
        'win': win,
        'win_amount': win_amount - amount if win else -amount,
        'balance': game.balance,
        'stats': game.get_stats()
    })

# ============ СЛОТЫ ============
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

# ============ БЛЭКДЖЕК ============
@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    data = request.json
    session_id = data.get('session_id')
    amount = float(data.get('amount', 0))
    
    game = games.get(session_id)
    if not game:
        return jsonify({'success': False, 'error': 'Сессия не найдена'})
    
    if amount > game.balance:
        return jsonify({'success': False, 'error': 'Недостаточно средств'})
    
    deck = [2,3,4,5,6,7,8,9,10,10,10,10,11] * 4
    random.shuffle(deck)
    
    player_hand = [deck.pop(), deck.pop()]
    dealer_hand = [deck.pop(), deck.pop()]
    
    player_blackjack = sum(player_hand) == 21
    dealer_blackjack = sum(dealer_hand) == 21
    
    if player_blackjack or dealer_blackjack:
        if player_blackjack and not dealer_blackjack:
            game.balance += amount * 1.5
            game.wins += 1
            win = True
            win_amount = amount * 1.5
            game.add_xp(int(amount / 5))
        elif dealer_blackjack and not player_blackjack:
            game.balance -= amount
            win = False
            win_amount = -amount
        else:
            win = None
            win_amount = 0
        
        game.total_bets += 1
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'dealer_hand': dealer_hand,
            'game_over': True,
            'win': win,
            'win_amount': win_amount,
            'balance': game.balance,
            'stats': game.get_stats()
        })
    
    return jsonify({
        'success': True,
        'player_hand': player_hand,
        'dealer_hand': [dealer_hand[0], '?'],
        'deck': deck,
        'amount': amount,
        'game_over': False,
        'balance': game.balance
    })

@app.route('/api/blackjack/hit', methods=['POST'])
def blackjack_hit():
    data = request.json
    session_id = data.get('session_id')
    deck = data.get('deck')
    player_hand = data.get('player_hand')
    amount = float(data.get('amount', 0))
    
    game = games.get(session_id)
    if not game:
        return jsonify({'success': False, 'error': 'Сессия не найдена'})
    
    player_hand.append(deck.pop())
    
    if sum(player_hand) > 21:
        game.balance -= amount
        game.total_bets += 1
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'game_over': True,
            'win': False,
            'win_amount': -amount,
            'balance': game.balance,
            'stats': game.get_stats()
        })
    
    return jsonify({
        'success': True,
        'player_hand': player_hand,
        'deck': deck,
        'game_over': False
    })

@app.route('/api/blackjack/stand', methods=['POST'])
def blackjack_stand():
    data = request.json
    session_id = data.get('session_id')
    deck = data.get('deck')
    player_hand = data.get('player_hand')
    dealer_hand = data.get('dealer_hand')
    amount = float(data.get('amount', 0))
    
    game = games.get(session_id)
    if not game:
        return jsonify({'success': False, 'error': 'Сессия не найдена'})
    
    while sum(dealer_hand) < 17:
        dealer_hand.append(deck.pop())
    
    player_sum = sum(player_hand)
    dealer_sum = sum(dealer_hand)
    
    win = False
    if dealer_sum > 21 or player_sum > dealer_sum:
        win = True
        win_amount = amount * 2
        game.balance += win_amount - amount
        game.wins += 1
        game.add_xp(int(amount / 5))
    elif player_sum == dealer_sum:
        win = None
        win_amount = 0
    else:
        win = False
        win_amount = -amount
        game.balance -= amount
    
    game.total_bets += 1
    
    return jsonify({
        'success': True,
        'player_hand': player_hand,
        'dealer_hand': dealer_hand,
        'game_over': True,
        'win': win,
        'win_amount': win_amount,
        'balance': game.balance,
        'stats': game.get_stats()
    })

# ============ AVIATOR ============
@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    data = request.json
    session_id = data.get('session_id')
    amount = float(data.get('amount', 0))
    
    game = games.get(session_id)
    if not game:
        return jsonify({'success': False, 'error': 'Сессия не найдена'})
    
    if amount > game.balance:
        return jsonify({'success': False, 'error': 'Недостаточно средств'})
    
    crash_point = random.uniform(1.0, 100.0)
    if crash_point > 2.0:
        crash_point = 2.0 + random.uniform(0, 1.5)
    
    game.balance -= amount
    
    return jsonify({
        'success': True,
        'crash_point': crash_point,
        'amount': amount,
        'balance': game.balance
    })

@app.route('/api/crash/cashout', methods=['POST'])
def crash_cashout():
    data = request.json
    session_id = data.get('session_id')
    amount = float(data.get('amount', 0))
    multiplier = float(data.get('multiplier', 1))
    
    game = games.get(session_id)
    if not game:
        return jsonify({'success': False, 'error': 'Сессия не найдена'})
    
    win_amount = amount * multiplier
    game.balance += win_amount
    game.wins += 1
    game.total_bets += 1
    game.add_xp(int(win_amount / 5))
    
    return jsonify({
        'success': True,
        'win_amount': win_amount,
        'balance': game.balance,
        'stats': game.get_stats()
    })

@app.route('/api/crash/result', methods=['POST'])
def crash_result():
    data = request.json
    session_id = data.get('session_id')
    amount = float(data.get('amount', 0))
    
    game = games.get(session_id)
    if not game:
        return jsonify({'success': False, 'error': 'Сессия не найдена'})
    
    game.total_bets += 1
    
    return jsonify({
        'success': True,
        'balance': game.balance,
        'stats': game.get_stats()
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
