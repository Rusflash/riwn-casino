from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import random
import secrets
import sqlite3
from datetime import datetime
import threading
import hashlib
import re

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# ===== НАСТРОЙКИ БАЗЫ ДАННЫХ =====
DATABASE = 'ruwin.db'

def get_db():
    conn = sqlite3.connect(DATABASE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT UNIQUE,
                  username TEXT UNIQUE,
                  password TEXT,
                  email TEXT,
                  ip_address TEXT,
                  balance INTEGER DEFAULT 10000,
                  total_bets INTEGER DEFAULT 0,
                  wins INTEGER DEFAULT 0,
                  level INTEGER DEFAULT 1,
                  xp INTEGER DEFAULT 0,
                  created_at TEXT,
                  last_login TEXT,
                  is_verified INTEGER DEFAULT 0)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS game_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  game TEXT,
                  bet_amount INTEGER,
                  win_amount INTEGER,
                  result TEXT,
                  timestamp TEXT,
                  FOREIGN KEY (user_id) REFERENCES users(user_id))''')
    
    conn.commit()
    conn.close()

init_db()

# ===== КЛАСС ПОЛЬЗОВАТЕЛЯ =====
class User:
    def __init__(self, user_id):
        self.user_id = user_id
        self.username = ""
        self.balance = 10000
        self.total_bets = 0
        self.wins = 0
        self.level = 1
        self.xp = 0
        self.load_from_db()
    
    def load_from_db(self):
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute("""SELECT username, balance, total_bets, wins, level, xp 
                         FROM users WHERE user_id = ?""", (self.user_id,))
            data = c.fetchone()
            conn.close()
            
            if data:
                self.username = data[0]
                self.balance = data[1]
                self.total_bets = data[2]
                self.wins = data[3]
                self.level = data[4]
                self.xp = data[5]
                return True
            return False
        except Exception as e:
            print(f"Ошибка загрузки: {e}")
            return False
    
    def save_to_db(self):
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute('''UPDATE users 
                         SET balance=?, total_bets=?, wins=?, level=?, xp=?, last_login=?
                         WHERE user_id=?''',
                      (self.balance, self.total_bets, self.wins, self.level, 
                       self.xp, datetime.now().isoformat(), self.user_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Ошибка сохранения: {e}")
            return False
    
    def change_balance(self, amount):
        old = self.balance
        self.balance += amount
        self.save_to_db()
        return self.balance
    
    def get_stats(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'balance': self.balance,
            'total_bets': self.total_bets,
            'wins': self.wins,
            'losses': self.total_bets - self.wins,
            'winrate': round((self.wins / self.total_bets * 100), 1) if self.total_bets > 0 else 0,
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
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute('''INSERT INTO game_history 
                         (user_id, game, bet_amount, win_amount, result, timestamp)
                         VALUES (?, ?, ?, ?, ?, ?)''',
                      (self.user_id, game, bet_amount, win_amount, result, datetime.now().isoformat()))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Ошибка истории: {e}")
    
    def get_history(self, limit=50):
        try:
            conn = get_db()
            c = conn.cursor()
            c.execute('''SELECT game, bet_amount, win_amount, result, timestamp 
                         FROM game_history 
                         WHERE user_id = ? 
                         ORDER BY id DESC LIMIT ?''', (self.user_id, limit))
            history = [{'game': row[0], 'bet_amount': row[1], 'win_amount': row[2], 
                        'result': row[3], 'timestamp': row[4]} for row in c.fetchall()]
            conn.close()
            return history
        except Exception as e:
            return []

# ===== ХРАНИЛИЩЕ ПОЛЬЗОВАТЕЛЕЙ =====
users = {}
user_lock = threading.Lock()

def get_user(user_id):
    with user_lock:
        if user_id not in users:
            users[user_id] = User(user_id)
        return users[user_id]

# ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_user_id():
    return f"user_{secrets.token_hex(8)}"

def validate_username(username):
    return re.match(r'^[a-zA-Z0-9_-]{3,20}$', username) is not None

def validate_password(password):
    return len(password) >= 6

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        ip = request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        ip = request.headers.get('X-Real-IP')
    else:
        ip = request.remote_addr
    return ip

def is_vpn_user(ip_address):
    vpn_ips = ['147.90.14.196']
    return ip_address in vpn_ips

def require_auth():
    """Проверяет, передан ли user_id в запросе"""
    data = request.get_json(force=True) or {}
    user_id = data.get('user_id')
    if not user_id:
        return None, jsonify({'success': False, 'error': 'Не авторизован'}), 401
    return user_id, None, None

# ===== МАРШРУТЫ АВТОРИЗАЦИИ =====
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json(force=True)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '')
        
        if not validate_username(username):
            return jsonify({'success': False, 'error': 'Имя пользователя должно содержать 3-20 символов (буквы, цифры, _, -)'})
        
        if not validate_password(password):
            return jsonify({'success': False, 'error': 'Пароль должен содержать минимум 6 символов'})
        
        conn = get_db()
        c = conn.cursor()
        
        c.execute("SELECT username FROM users WHERE username = ?", (username,))
        if c.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь с таким именем уже существует'})
        
        user_id = generate_user_id()
        hashed_password = hash_password(password)
        ip_address = get_client_ip()
        
        c.execute('''INSERT INTO users 
                     (user_id, username, password, email, ip_address, balance, created_at, last_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (user_id, username, hashed_password, email, ip_address, 10000, 
                   datetime.now().isoformat(), datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Регистрация успешна!',
            'user_id': user_id,
            'username': username
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        conn = get_db()
        c = conn.cursor()
        
        c.execute("SELECT user_id, password FROM users WHERE username = ?", (username,))
        user = c.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'success': False, 'error': 'Пользователь не найден'})
        
        if user[1] != hash_password(password):
            return jsonify({'success': False, 'error': 'Неверный пароль'})
        
        conn = get_db()
        c = conn.cursor()
        c.execute("UPDATE users SET last_login = ? WHERE user_id = ?", 
                  (datetime.now().isoformat(), user[0]))
        conn.commit()
        conn.close()
        
        game = get_user(user[0])
        
        return jsonify({
            'success': True,
            'message': 'Вход выполнен!',
            'user_id': user[0],
            'username': username,
            'stats': game.get_stats()
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/init', methods=['POST'])
def init_game():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        ip_address = get_client_ip()
        is_vpn = is_vpn_user(ip_address)
        
        return jsonify({
            'success': True,
            'user_id': game.user_id,
            'username': game.username,
            'stats': game.get_stats(),
            'history': game.get_history(10),
            'is_vpn': is_vpn
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        conn = get_db()
        c = conn.cursor()
        c.execute('''SELECT username, balance, level, wins, total_bets 
                     FROM users 
                     ORDER BY balance DESC 
                     LIMIT 10''')
        
        leaders = []
        for idx, row in enumerate(c.fetchall(), 1):
            leaders.append({
                'rank': idx,
                'username': row[0],
                'balance': row[1],
                'level': row[2],
                'wins': row[3],
                'total_bets': row[4]
            })
        
        conn.close()
        return jsonify({'success': True, 'leaders': leaders})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ ИГРЫ ============

@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        
        bet_type = data.get('bet_type')
        amount = float(data.get('amount', 0))
        number = data.get('number')
        
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

@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        
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

@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        
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
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        deck = data.get('deck')
        player_hand = data.get('player_hand')
        amount = float(data.get('amount', 0))
        
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
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        deck = data.get('deck')
        player_hand = data.get('player_hand')
        dealer_hand = data.get('dealer_hand')
        amount = float(data.get('amount', 0))
        
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

@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    try:
        data = request.get_json(force=True)
        if data is None:
            return jsonify({'success': False, 'error': 'Неверный формат JSON'}), 400
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        
        if amount > game.balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств'})
        
        crash_point = random.uniform(1.0, 100.0)
        if crash_point > 2.0:
            crash_point = 2.0 + random.uniform(0, 1.5)
        
        game.balance -= amount
        game.save_to_db()
        
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
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        multiplier = float(data.get('multiplier', 1))
        
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
        
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        
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
