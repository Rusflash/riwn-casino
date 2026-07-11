from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import random
import secrets
import psycopg2
import psycopg2.extras
from datetime import datetime
import threading
import hashlib
import re
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# ===== ПОДКЛЮЧЕНИЕ К POSTGRESQL =====
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://localhost:5432/ruwin')

def get_db():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
        print(f"❌ Ошибка подключения к БД: {e}")
        return None

def init_db():
    try:
        conn = get_db()
        if not conn:
            print("❌ Не удалось подключиться к БД")
            return
        
        c = conn.cursor()
        
        # Таблица пользователей
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            user_id TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT,
            ip_address TEXT,
            balance INTEGER DEFAULT 10000,
            total_bets INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        # Таблица истории
        c.execute('''CREATE TABLE IF NOT EXISTS game_history (
            id SERIAL PRIMARY KEY,
            user_id TEXT REFERENCES users(user_id),
            game TEXT,
            bet_amount INTEGER,
            win_amount INTEGER,
            result TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )''')
        
        conn.commit()
        conn.close()
        print("✅ База данных PostgreSQL инициализирована")
    except Exception as e:
        print(f"❌ Ошибка инициализации БД: {e}")

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
            if not conn:
                return False
            c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            c.execute("""
                SELECT username, balance, total_bets, wins, level, xp 
                FROM users WHERE user_id = %s
            """, (self.user_id,))
            data = c.fetchone()
            conn.close()
            
            if data:
                self.username = data['username']
                self.balance = data['balance']
                self.total_bets = data['total_bets']
                self.wins = data['wins']
                self.level = data['level']
                self.xp = data['xp']
                print(f"✅ Загружен {self.username}: баланс {self.balance}")
                return True
            return False
        except Exception as e:
            print(f"❌ Ошибка загрузки: {e}")
            return False
    
    def save_to_db(self):
        try:
            conn = get_db()
            if not conn:
                return False
            c = conn.cursor()
            c.execute('''
                UPDATE users 
                SET balance=%s, total_bets=%s, wins=%s, level=%s, xp=%s, last_login=CURRENT_TIMESTAMP
                WHERE user_id=%s
            ''', (self.balance, self.total_bets, self.wins, self.level, self.xp, self.user_id))
            conn.commit()
            conn.close()
            print(f"💾 Сохранен {self.username}: баланс {self.balance}")
            return True
        except Exception as e:
            print(f"❌ Ошибка сохранения: {e}")
            return False
    
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
            if not conn:
                return
            c = conn.cursor()
            c.execute('''
                INSERT INTO game_history (user_id, game, bet_amount, win_amount, result)
                VALUES (%s, %s, %s, %s, %s)
            ''', (self.user_id, game, bet_amount, win_amount, result))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"❌ Ошибка истории: {e}")
    
    def get_history(self, limit=50):
        try:
            conn = get_db()
            if not conn:
                return []
            c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
            c.execute('''
                SELECT game, bet_amount, win_amount, result, created_at 
                FROM game_history 
                WHERE user_id = %s 
                ORDER BY id DESC LIMIT %s
            ''', (self.user_id, limit))
            history = [{'game': row['game'], 'bet_amount': row['bet_amount'], 
                        'win_amount': row['win_amount'], 'result': row['result'],
                        'timestamp': row['created_at']} for row in c.fetchall()]
            conn.close()
            return history
        except Exception as e:
            print(f"❌ Ошибка истории: {e}")
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
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    elif request.headers.get('X-Real-IP'):
        return request.headers.get('X-Real-IP')
    return request.remote_addr

def is_vpn_user(ip_address):
    return ip_address in ['147.90.14.196']

# ===== МАРШРУТЫ =====
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
            return jsonify({'success': False, 'error': 'Имя пользователя 3-20 символов (буквы, цифры, _, -)'})
        
        if not validate_password(password):
            return jsonify({'success': False, 'error': 'Пароль минимум 6 символов'})
        
        conn = get_db()
        if not conn:
            return jsonify({'success': False, 'error': 'Ошибка подключения к БД'}), 500
        
        c = conn.cursor()
        c.execute("SELECT username FROM users WHERE username = %s", (username,))
        if c.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Пользователь уже существует'})
        
        user_id = generate_user_id()
        hashed_password = hash_password(password)
        ip_address = get_client_ip()
        
        c.execute('''
            INSERT INTO users (user_id, username, password, email, ip_address)
            VALUES (%s, %s, %s, %s, %s)
        ''', (user_id, username, hashed_password, email, ip_address))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True,
            'message': 'Регистрация успешна!',
            'user_id': user_id,
            'username': username
        })
    except Exception as e:
        print(f"❌ Ошибка регистрации: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        conn = get_db()
        if not conn:
            return jsonify({'success': False, 'error': 'Ошибка подключения к БД'}), 500
        
        c = conn.cursor()
        c.execute("SELECT user_id, password FROM users WHERE username = %s", (username,))
        user = c.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'success': False, 'error': 'Пользователь не найден'})
        
        if user[1] != hash_password(password):
            return jsonify({'success': False, 'error': 'Неверный пароль'})
        
        # Обновляем время входа
        conn = get_db()
        if conn:
            c = conn.cursor()
            c.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE user_id = %s", (user[0],))
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
        print(f"❌ Ошибка входа: {e}")
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
        print(f"❌ Ошибка init: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        conn = get_db()
        if not conn:
            return jsonify({'success': False, 'error': 'Ошибка БД'}), 500
        
        c = conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        c.execute('''
            SELECT username, balance, level, wins, total_bets 
            FROM users 
            ORDER BY balance DESC 
            LIMIT 10
        ''')
        
        leaders = [{'rank': idx+1, 'username': row['username'], 'balance': row['balance'], 
                    'level': row['level'], 'wins': row['wins'], 'total_bets': row['total_bets']} 
                   for idx, row in enumerate(c.fetchall())]
        
        conn.close()
        return jsonify({'success': True, 'leaders': leaders})
    except Exception as e:
        print(f"❌ Ошибка лидерборда: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ============ ИГРЫ ============
# ===== РУЛЕТКА =====
@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    try:
        data = request.get_json(force=True)
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
        print(f"❌ Ошибка рулетки: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== СЛОТЫ =====
@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json(force=True)
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
        print(f"❌ Ошибка слотов: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== БЛЭКДЖЕК =====
@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    try:
        data = request.get_json(force=True)
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

# ===== AVIATOR =====
@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    try:
        data = request.get_json(force=True)
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
