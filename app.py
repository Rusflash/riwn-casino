from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from flask_mail import Mail, Message
import secrets
import sqlite3
from datetime import datetime
import hashlib
import re
import random
import json
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# ===== КОНФИГУРАЦИЯ ПОЧТЫ =====
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your_email@gmail.com'
app.config['MAIL_PASSWORD'] = 'your_app_password'
mail = Mail(app)

# ===== БАЗА ДАННЫХ =====
def init_db():
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    
    c.execute('''CREATE TABLE IF NOT EXISTS users
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT UNIQUE,
                  username TEXT UNIQUE,
                  password TEXT,
                  email TEXT UNIQUE,
                  avatar TEXT,
                  ip_address TEXT,
                  balance INTEGER DEFAULT 10000,
                  total_bets INTEGER DEFAULT 0,
                  wins INTEGER DEFAULT 0,
                  level INTEGER DEFAULT 1,
                  xp INTEGER DEFAULT 0,
                  twofa_enabled INTEGER DEFAULT 0,
                  twofa_secret TEXT,
                  created_at TEXT,
                  last_login TEXT)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS game_history
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  game TEXT,
                  bet_amount INTEGER,
                  win_amount INTEGER,
                  result TEXT,
                  timestamp TEXT)''')
    
    c.execute('''CREATE TABLE IF NOT EXISTS casino_pool
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  balance INTEGER DEFAULT 1000000,
                  total_in INTEGER DEFAULT 0,
                  total_out INTEGER DEFAULT 0,
                  commission INTEGER DEFAULT 0,
                  house_edge REAL DEFAULT 0.05,
                  updated_at TEXT)''')
    
    try:
        c.execute("ALTER TABLE casino_pool ADD COLUMN house_edge REAL DEFAULT 0.05")
    except sqlite3.OperationalError:
        pass
    
    c.execute("SELECT COUNT(*) FROM casino_pool")
    if c.fetchone()[0] == 0:
        c.execute('''INSERT INTO casino_pool (balance, house_edge, updated_at)
                     VALUES (?, ?, datetime('now'))''', (1000000, 0.05))
    
    c.execute("SELECT * FROM users WHERE username = 'test'")
    if not c.fetchone():
        c.execute('''INSERT INTO users (user_id, username, password, email, balance, created_at, last_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  ('test_user', 'test', hashlib.sha256('test'.encode()).hexdigest(), 'test@test.com', 10000, datetime.now().isoformat(), datetime.now().isoformat()))
    
    conn.commit()
    conn.close()

init_db()

# ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_user_id():
    return f"user_{secrets.token_hex(8)}"

def generate_2fa_code():
    return str(random.randint(100000, 999999))

def validate_username(username):
    return re.match(r'^[a-zA-Z0-9_-]{3,20}$', username) is not None

def validate_password(password):
    return len(password) >= 6

def validate_email(email):
    return re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email) is not None

def get_client_ip():
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr

def get_user_balance(user_id):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT balance FROM users WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else 10000

def get_user_stats(user_id):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT balance, total_bets, wins, level, username, email FROM users WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    if row:
        return {
            'balance': row[0],
            'total_bets': row[1],
            'wins': row[2],
            'level': row[3],
            'username': row[4],
            'email': row[5] or '',
            'winrate': round((row[2] / row[1] * 100), 1) if row[1] > 0 else 0
        }
    return {'balance': 10000, 'total_bets': 0, 'wins': 0, 'level': 1, 'username': 'Игрок', 'email': '', 'winrate': 0}

def update_user_balance(user_id, amount):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("UPDATE users SET balance = balance + ? WHERE user_id = ?", (amount, user_id))
    if amount > 0:
        c.execute("UPDATE users SET wins = wins + 1 WHERE user_id = ?", (user_id,))
    c.execute("UPDATE users SET total_bets = total_bets + 1 WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()

def add_history(user_id, game, bet_amount, win_amount, result):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute('''INSERT INTO game_history (user_id, game, bet_amount, win_amount, result, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?)''',
              (user_id, game, bet_amount, win_amount, result, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def get_pool_balance():
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT balance, house_edge FROM casino_pool ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return (row[0], row[1])
    return (1000000, 0.05)

def update_pool(amount):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT id, balance FROM casino_pool ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    if row:
        c.execute("UPDATE casino_pool SET balance = ?, updated_at = datetime('now') WHERE id = ?", (row[1] + amount, row[0]))
    else:
        c.execute("INSERT INTO casino_pool (balance, house_edge, updated_at) VALUES (?, ?, datetime('now'))", (1000000 + amount, 0.05))
    conn.commit()
    conn.close()

def send_2fa_email(email, code):
    try:
        msg = Message('🔐 Код подтверждения RuWin Casino', sender=app.config['MAIL_USERNAME'], recipients=[email])
        msg.body = f'''Ваш код для входа в RuWin Casino: {code}

Код действителен в течение 5 минут.

Если вы не запрашивали вход, проигнорируйте это сообщение.

С уважением,
Команда RuWin Casino'''
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Ошибка отправки email: {e}")
        return False

def calculate_win(amount, multiplier):
    """Расчет выигрыша с учетом комиссии казино (5%)"""
    win_amount = amount * multiplier
    house_edge = 0.05
    commission = int(win_amount * house_edge)
    return int(win_amount - commission)

# ============================================================
# ===== МАРШРУТЫ АВТОРИЗАЦИИ =====
# ============================================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json(force=True)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        email = data.get('email', '').strip()
        
        if not validate_username(username):
            return jsonify({'success': False, 'error': 'Имя 3-20 символов (буквы, цифры, _, -)'})
        if not validate_password(password):
            return jsonify({'success': False, 'error': 'Пароль минимум 6 символов'})
        if not validate_email(email):
            return jsonify({'success': False, 'error': 'Введите корректный email'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        
        c.execute("SELECT username FROM users WHERE username = ?", (username,))
        if c.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Имя уже занято'})
        
        c.execute("SELECT email FROM users WHERE email = ?", (email,))
        if c.fetchone():
            conn.close()
            return jsonify({'success': False, 'error': 'Email уже зарегистрирован'})
        
        user_id = generate_user_id()
        hashed_password = hash_password(password)
        ip_address = get_client_ip()
        
        c.execute('''INSERT INTO users (user_id, username, password, email, ip_address, created_at, last_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  (user_id, username, hashed_password, email, ip_address, datetime.now().isoformat(), datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Регистрация успешна!', 'user_id': user_id, 'username': username})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        username = data.get('username', '').strip()
        password = data.get('password', '')
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("SELECT user_id, password, twofa_enabled, email FROM users WHERE username = ?", (username,))
        user = c.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'success': False, 'error': 'Пользователь не найден'})
        if user[1] != hash_password(password):
            return jsonify({'success': False, 'error': 'Неверный пароль'})
        
        if user[2] == 1:
            code = generate_2fa_code()
            session['2fa_code'] = code
            session['2fa_user_id'] = user[0]
            session['2fa_email'] = user[3]
            if send_2fa_email(user[3], code):
                return jsonify({'success': True, 'need_2fa': True, 'user_id': user[0]})
            else:
                return jsonify({'success': False, 'error': 'Ошибка отправки 2FA кода'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET last_login = datetime('now') WHERE user_id = ?", (user[0],))
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'user_id': user[0], 
            'username': username, 
            'stats': get_user_stats(user[0])
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verify_2fa', methods=['POST'])
def verify_2fa():
    try:
        data = request.get_json(force=True)
        code = data.get('code', '')
        
        user_id = session.get('2fa_user_id')
        expected_code = session.get('2fa_code')
        
        if not user_id or code != expected_code:
            return jsonify({'success': False, 'error': 'Неверный код'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET last_login = datetime('now') WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
        
        session.pop('2fa_code', None)
        session.pop('2fa_user_id', None)
        session.pop('2fa_email', None)
        
        game = get_user_stats(user_id)
        
        return jsonify({
            'success': True, 
            'user_id': user_id, 
            'username': game.get('username', 'Игрок'),
            'stats': game
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/init', methods=['POST'])
def init_game():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id', 'test_user')
        
        stats = get_user_stats(user_id)
        pool_balance, house_edge = get_pool_balance()
        
        return jsonify({
            'success': True,
            'session_id': user_id,
            'stats': stats,
            'pool_balance': pool_balance,
            'house_edge': house_edge
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

# ============================================================
# ===== РУЛЕТКА (ИСПРАВЛЕННАЯ) =====
# ============================================================

@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        bet_type = data.get('bet_type', 'number')
        amount = float(data.get('amount', 10))
        number = data.get('number')
        
        balance = get_user_balance(user_id)
        
        if amount > balance:
            return jsonify({
                'success': False,
                'error': 'Недостаточно средств',
                'balance': balance
            })
        
        result = random.randint(0, 36)
        color = 'red' if result in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if result != 0 else 'green'
        
        win = False
        win_amount = 0
        
        if bet_type == 'number' and result == number:
            win = True
            win_amount = calculate_win(amount, 35)
        elif bet_type == 'red' and color == 'red':
            win = True
            win_amount = calculate_win(amount, 2)
        elif bet_type == 'black' and color == 'black':
            win = True
            win_amount = calculate_win(amount, 2)
        elif bet_type == 'even' and result != 0 and result % 2 == 0:
            win = True
            win_amount = calculate_win(amount, 2)
        elif bet_type == 'odd' and result != 0 and result % 2 == 1:
            win = True
            win_amount = calculate_win(amount, 2)
        elif bet_type == 'half1' and 1 <= result <= 18:
            win = True
            win_amount = calculate_win(amount, 2)
        elif bet_type == 'half2' and 19 <= result <= 36:
            win = True
            win_amount = calculate_win(amount, 2)
        elif bet_type == 'dozen' and number:
            if (number == 1 and 1 <= result <= 12) or (number == 2 and 13 <= result <= 24) or (number == 3 and 25 <= result <= 36):
                win = True
                win_amount = calculate_win(amount, 3)
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'roulette', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'roulette', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'result': result,
            'color': color,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ===== СЛОТЫ (ИСПРАВЛЕННЫЕ) =====
# ============================================================

@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        balance = get_user_balance(user_id)
        
        if amount > balance:
            return jsonify({
                'success': False,
                'error': 'Недостаточно средств',
                'balance': balance
            })
        
        symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣', '🎰']
        reels = [random.choice(symbols) for _ in range(9)]
        
        win = False
        win_amount = 0
        
        # Горизонтальные линии
        for row in range(3):
            if reels[row*3] == reels[row*3+1] and reels[row*3+1] == reels[row*3+2]:
                win = True
                win_amount += calculate_win(amount, 5)
        # Вертикальные линии
        for col in range(3):
            if reels[col] == reels[col+3] and reels[col+3] == reels[col+6]:
                win = True
                win_amount += calculate_win(amount, 5)
        # Диагонали
        if reels[0] == reels[4] and reels[4] == reels[8]:
            win = True
            win_amount += calculate_win(amount, 10)
        if reels[2] == reels[4] and reels[4] == reels[6]:
            win = True
            win_amount += calculate_win(amount, 10)
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'slots', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'slots', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'reels': reels,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ===== БЛЭКДЖЕК (ИСПРАВЛЕННЫЙ) =====
# ============================================================

def sum_hand(hand):
    total = sum(hand)
    aces = hand.count(11)
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return total

@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        balance = get_user_balance(user_id)
        
        if amount > balance:
            return jsonify({
                'success': False,
                'error': 'Недостаточно средств',
                'balance': balance
            })
        
        deck = [2,3,4,5,6,7,8,9,10,10,10,10,11] * 4
        random.shuffle(deck)
        
        player_hand = [deck.pop(), deck.pop()]
        dealer_hand = [deck.pop(), deck.pop()]
        
        player_sum = sum_hand(player_hand)
        dealer_sum = sum_hand(dealer_hand)
        
        if player_sum == 21 and dealer_sum != 21:
            win_amount = int(calculate_win(amount, 1.5))
            pool_balance, _ = get_pool_balance()
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'blackjack', amount, win_amount, 'win')
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': True,
                'win_amount': win_amount,
                'stats': get_user_stats(user_id),
                'pool_balance': get_pool_balance()[0]
            })
        
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'dealer_hand': [dealer_hand[0], '?'],
            'deck': deck,
            'amount': amount,
            'game_over': False,
            'balance': get_user_balance(user_id)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/blackjack/hit', methods=['POST'])
def blackjack_hit():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        deck = data.get('deck', [])
        player_hand = data.get('player_hand', [])
        amount = float(data.get('amount', 10))
        
        player_hand.append(deck.pop())
        player_sum = sum_hand(player_hand)
        
        if player_sum > 21:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'blackjack', amount, -loss_amount, 'loss')
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'game_over': True,
                'win': False,
                'win_amount': -loss_amount,
                'stats': get_user_stats(user_id),
                'pool_balance': get_pool_balance()[0]
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
        user_id = data.get('session_id', 'test_user')
        deck = data.get('deck', [])
        player_hand = data.get('player_hand', [])
        dealer_hand = data.get('dealer_hand', [])
        amount = float(data.get('amount', 10))
        
        while sum_hand(dealer_hand) < 17:
            dealer_hand.append(deck.pop())
        
        player_sum = sum_hand(player_hand)
        dealer_sum = sum_hand(dealer_hand)
        
        pool_balance, _ = get_pool_balance()
        
        if dealer_sum > 21 or player_sum > dealer_sum:
            win_amount = int(calculate_win(amount, 2))
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'blackjack', amount, win_amount, 'win')
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': True,
                'win_amount': win_amount,
                'stats': get_user_stats(user_id),
                'pool_balance': get_pool_balance()[0]
            })
        elif player_sum == dealer_sum:
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': None,
                'win_amount': 0,
                'stats': get_user_stats(user_id),
                'pool_balance': get_pool_balance()[0]
            })
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'blackjack', amount, -loss_amount, 'loss')
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': False,
                'win_amount': -loss_amount,
                'stats': get_user_stats(user_id),
                'pool_balance': get_pool_balance()[0]
            })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ===== AVIATOR (ИСПРАВЛЕННЫЙ) =====
# ============================================================

@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        balance = get_user_balance(user_id)
        
        if amount > balance:
            return jsonify({
                'success': False,
                'error': 'Недостаточно средств',
                'balance': balance
            })
        
        pool_balance, _ = get_pool_balance()
        
        # Исправленная логика: краш всегда между 1.3 и 3.5
        # Но с учётом ставки и баланса
        
        # Базовый краш (1.5 - 3.0)
        base_crash = random.uniform(1.5, 3.0)
        
        # Влияние ставки (но не убиваем игру)
        if amount > 100:
            # Большая ставка → краш чуть раньше
            base_crash = base_crash * 0.85
        elif amount < 50:
            # Маленькая ставка → краш чуть позже
            base_crash = base_crash * 1.15
        
        # Влияние баланса (но не убиваем игру)
        if balance > 50000:
            # Большой баланс → краш раньше
            base_crash = base_crash * 0.9
        elif balance < 1000:
            # Маленький баланс → краш позже
            base_crash = base_crash * 1.1
        
        # Влияние банка (но не убиваем игру)
        if pool_balance > 2000000:
            # Большой банк → краш позже (иллюзия удачи)
            base_crash = base_crash * 1.1
        
        # Ограничиваем краш
        crash_point = max(1.3, min(3.5, base_crash))
        crash_point = round(crash_point, 2)
        
        return jsonify({
            'success': True,
            'crash_point': crash_point,
            'amount': amount,
            'balance': get_user_balance(user_id)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/crash/cashout', methods=['POST'])
def crash_cashout():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        multiplier = float(data.get('multiplier', 1))
        
        win_amount = int(calculate_win(amount, multiplier))
        pool_balance, _ = get_pool_balance()
        
        if pool_balance < win_amount:
            win_amount = int(pool_balance * 0.9)
        
        update_user_balance(user_id, win_amount)
        update_pool(-win_amount)
        add_history(user_id, 'crash', amount, win_amount, 'win')
        
        return jsonify({
            'success': True,
            'win_amount': win_amount,
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/crash/result', methods=['POST'])
def crash_result():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        loss_amount = int(amount)
        current_balance = get_user_balance(user_id)
        
        if current_balance < loss_amount:
            loss_amount = current_balance
        
        update_user_balance(user_id, -loss_amount)
        update_pool(loss_amount)
        add_history(user_id, 'crash', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ===== КОСТИ (ИСПРАВЛЕННЫЕ) =====
# ============================================================

@app.route('/api/dice/roll', methods=['POST'])
def dice_roll():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        bet_type = data.get('bet_type', 'over')
        
        balance = get_user_balance(user_id)
        
        if amount > balance:
            return jsonify({
                'success': False,
                'error': 'Недостаточно средств',
                'balance': balance
            })
        
        d1 = random.randint(1, 6)
        d2 = random.randint(1, 6)
        total = d1 + d2
        
        win = False
        win_amount = 0
        
        if bet_type == 'over' and total > 7:
            win = True
            win_amount = calculate_win(amount, 3)
        elif bet_type == 'under' and total < 7:
            win = True
            win_amount = calculate_win(amount, 3)
        elif bet_type == 'seven' and total == 7:
            win = True
            win_amount = calculate_win(amount, 5)
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'dice', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'dice', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'd1': d1,
            'd2': d2,
            'total': total,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
