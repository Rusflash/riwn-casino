from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import random
import secrets
import sqlite3
from datetime import datetime

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# ===== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ =====
def init_db():
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS players
                 (player_id TEXT PRIMARY KEY,
                  ip_address TEXT,
                  username TEXT,
                  balance INTEGER DEFAULT 10000,
                  total_bets INTEGER DEFAULT 0,
                  wins INTEGER DEFAULT 0,
                  level INTEGER DEFAULT 1,
                  xp INTEGER DEFAULT 0,
                  created_at TEXT,
                  last_login TEXT)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS game_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  player_id TEXT,
                  game TEXT,
                  bet_amount INTEGER,
                  win_amount INTEGER,
                  result TEXT,
                  timestamp TEXT,
                  FOREIGN KEY (player_id) REFERENCES players(player_id))''')
    
    conn.commit()
    conn.close()

init_db()

# ===== КЛАСС ИГРОКА =====
class RuWinCasino:
    def __init__(self, player_id, ip_address, username="Игрок"):
        self.player_id = player_id
        self.ip_address = ip_address
        self.username = username
        self.load_data()
    
    def load_data(self):
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        
        c.execute("SELECT balance, total_bets, wins, level, xp FROM players WHERE player_id = ?", (self.player_id,))
        data = c.fetchone()
        conn.close()
        
        if data:
            self.balance = data[0]
            self.total_bets = data[1]
            self.wins = data[2]
            self.level = data[3]
            self.xp = data[4]
        else:
            self.balance = 10000
            self.total_bets = 0
            self.wins = 0
            self.level = 1
            self.xp = 0
            self.save_to_db()
    
    def save_to_db(self):
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        
        c.execute('''INSERT OR REPLACE INTO players 
                     (player_id, ip_address, username, balance, total_bets, wins, level, xp, last_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                  (self.player_id, self.ip_address, self.username, self.balance, self.total_bets, 
                   self.wins, self.level, self.xp, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def get_stats(self):
        total = self.total_bets
        wins = self.wins
        losses = total - wins
        winrate = (wins / total * 100) if total > 0 else 0
        
        return {
            'player_id': self.player_id,
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
        self.save_to_db()
    
    def add_history(self, game, bet_amount, win_amount, result):
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        
        c.execute('''INSERT INTO game_history 
                     (player_id, game, bet_amount, win_amount, result, timestamp)
                     VALUES (?, ?, ?, ?, ?, ?)''',
                  (self.player_id, game, bet_amount, win_amount, result, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
    
    def get_history(self, limit=50):
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        
        c.execute('''SELECT game, bet_amount, win_amount, result, timestamp 
                     FROM game_history 
                     WHERE player_id = ? 
                     ORDER BY id DESC LIMIT ?''', (self.player_id, limit))
        
        history = [{'game': row[0], 'bet_amount': row[1], 'win_amount': row[2], 
                    'result': row[3], 'timestamp': row[4]} for row in c.fetchall()]
        conn.close()
        return history

# ===== ХРАНИЛИЩЕ ИГРОКОВ =====
players = {}

def get_player(player_id, ip_address):
    if player_id not in players:
        players[player_id] = RuWinCasino(player_id, ip_address)
    return players[player_id]

# ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
def get_client_ip():
    """Получает реальный IP клиента"""
    if request.headers.get('X-Forwarded-For'):
        ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        ip = request.headers.get('X-Real-IP')
    else:
        ip = request.remote_addr
    return ip

def is_vpn_user(ip_address):
    """Проверяет, является ли IP адресом VPN"""
    vpn_ips = [
        '147.90.14.196',
        '147.90.14.197',  # Добавьте другие IP при необходимости
    ]
    return ip_address in vpn_ips

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/init', methods=['POST'])
def init_game():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
        
        ip_address = get_client_ip()
        is_vpn = is_vpn_user(ip_address)
        
        salt = secrets.token_hex(4)
        player_id = f"{ip_address.replace('.', '_')}_{salt}"
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("SELECT player_id FROM players WHERE ip_address = ?", (ip_address,))
        existing = c.fetchone()
        conn.close()
        
        if existing:
            player_id = existing[0]
        
        username = data.get('username', f'Игрок_{ip_address.split(".")[-1]}')
        
        game = get_player(player_id, ip_address)
        game.username = username
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'player_id': player_id,
            'ip_address': ip_address,
            'username': username,
            'stats': game.get_stats(),
            'history': game.get_history(10),
            'is_new': not existing,
            'is_vpn': is_vpn  # <-- Добавляем флаг VPN
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/load', methods=['POST'])
def load_game():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
        
        player_id = data.get('player_id')
        ip_address = get_client_ip()
        is_vpn = is_vpn_user(ip_address)
        
        if player_id in players:
            game = players[player_id]
        else:
            game = RuWinCasino(player_id, ip_address)
            players[player_id] = game
        
        return jsonify({
            'success': True,
            'stats': game.get_stats(),
            'history': game.get_history(10),
            'is_vpn': is_vpn
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ ВСЕ ИГРЫ (РУЛЕТКА, СЛОТЫ, БЛЭКДЖЕК, AVIATOR) ============
# ... (весь код игр остаётся без изменений, 
# только заменяем session_id на player_id в payload)

# ============ РУЛЕТКА ============
@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        bet_type = data.get('bet_type')
        amount = float(data.get('amount', 0))
        number = data.get('number')
        
        game = get_player(player_id, get_client_ip())
        
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
            game.add_history('roulette', amount, win_amount - amount, 'win')
        else:
            game.balance -= amount
            game.add_history('roulette', amount, -amount, 'loss')
        
        game.total_bets += 1
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'result': result,
            'color': color,
            'win': win,
            'win_amount': win_amount - amount if win else -amount,
            'balance': game.balance,
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ СЛОТЫ ============
@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        amount = float(data.get('amount', 0))
        
        game = get_player(player_id, get_client_ip())
        
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
            game.add_xp(int(win_amount / 5))
            game.add_history('slots', amount, win_amount, 'win')
        else:
            game.balance -= amount
            win_amount = -amount
            game.add_history('slots', amount, -amount, 'loss')
        
        game.total_bets += 1
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'reels': reels,
            'win': win,
            'win_amount': win_amount,
            'balance': game.balance,
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ БЛЭКДЖЕК ============
@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        amount = float(data.get('amount', 0))
        
        game = get_player(player_id, get_client_ip())
        
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
                game.add_history('blackjack', amount, win_amount, 'win')
            elif dealer_blackjack and not player_blackjack:
                game.balance -= amount
                win = False
                win_amount = -amount
                game.add_history('blackjack', amount, -amount, 'loss')
            else:
                win = None
                win_amount = 0
                game.add_history('blackjack', amount, 0, 'draw')
            
            game.total_bets += 1
            game.save_to_db()
            
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': win,
                'win_amount': win_amount,
                'balance': game.balance,
                'stats': game.get_stats(),
                'history': game.get_history(10)
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
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/blackjack/hit', methods=['POST'])
def blackjack_hit():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        deck = data.get('deck')
        player_hand = data.get('player_hand')
        amount = float(data.get('amount', 0))
        
        game = get_player(player_id, get_client_ip())
        
        player_hand.append(deck.pop())
        
        if sum(player_hand) > 21:
            game.balance -= amount
            game.total_bets += 1
            game.add_history('blackjack', amount, -amount, 'loss')
            game.save_to_db()
            
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'game_over': True,
                'win': False,
                'win_amount': -amount,
                'balance': game.balance,
                'stats': game.get_stats(),
                'history': game.get_history(10)
            })
        
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'deck': deck,
            'game_over': False
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/blackjack/stand', methods=['POST'])
def blackjack_stand():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        deck = data.get('deck')
        player_hand = data.get('player_hand')
        dealer_hand = data.get('dealer_hand')
        amount = float(data.get('amount', 0))
        
        game = get_player(player_id, get_client_ip())
        
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
            game.add_history('blackjack', amount, win_amount - amount, 'win')
        elif player_sum == dealer_sum:
            win = None
            win_amount = 0
            game.add_history('blackjack', amount, 0, 'draw')
        else:
            win = False
            win_amount = -amount
            game.balance -= amount
            game.add_history('blackjack', amount, -amount, 'loss')
        
        game.total_bets += 1
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'dealer_hand': dealer_hand,
            'game_over': True,
            'win': win,
            'win_amount': win_amount,
            'balance': game.balance,
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ AVIATOR ============
@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        amount = float(data.get('amount', 0))
        
        game = get_player(player_id, get_client_ip())
        
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
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/crash/cashout', methods=['POST'])
def crash_cashout():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        amount = float(data.get('amount', 0))
        multiplier = float(data.get('multiplier', 1))
        
        game = get_player(player_id, get_client_ip())
        
        win_amount = amount * multiplier
        game.balance += win_amount
        game.wins += 1
        game.total_bets += 1
        game.add_xp(int(win_amount / 5))
        game.add_history('crash', amount, win_amount, 'win')
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'win_amount': win_amount,
            'balance': game.balance,
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/crash/result', methods=['POST'])
def crash_result():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
            
        player_id = data.get('player_id')
        amount = float(data.get('amount', 0))
        
        game = get_player(player_id, get_client_ip())
        
        game.total_bets += 1
        game.add_history('crash', amount, -amount, 'loss')
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'balance': game.balance,
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
