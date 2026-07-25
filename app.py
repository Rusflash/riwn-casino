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
import math

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
                  is_admin INTEGER DEFAULT 0,
                  is_banned INTEGER DEFAULT 0,
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
    
    c.execute('''CREATE TABLE IF NOT EXISTS transactions
                 (id INTEGER PRIMARY KEY AUTOINCREMENT,
                  user_id TEXT,
                  type TEXT,
                  amount INTEGER,
                  description TEXT,
                  timestamp TEXT)''')
    
    try:
        c.execute("ALTER TABLE casino_pool ADD COLUMN house_edge REAL DEFAULT 0.05")
    except sqlite3.OperationalError:
        pass
    
    try:
        c.execute("ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    
    try:
        c.execute("ALTER TABLE users ADD COLUMN is_banned INTEGER DEFAULT 0")
    except sqlite3.OperationalError:
        pass
    
    c.execute("SELECT COUNT(*) FROM casino_pool")
    if c.fetchone()[0] == 0:
        c.execute('''INSERT INTO casino_pool (balance, house_edge, updated_at)
                     VALUES (?, ?, datetime('now'))''', (1000000, 0.05))
    
    # Админ: mrdante / пароль: 1816275
    c.execute("SELECT * FROM users WHERE username = 'mrdante'")
    if not c.fetchone():
        c.execute('''INSERT INTO users (user_id, username, password, email, balance, is_admin, created_at, last_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  ('admin_mrdante', 'mrdante', hashlib.sha256('1816275'.encode()).hexdigest(), 'admin@ruwin.com', 9999999, 1, datetime.now().isoformat(), datetime.now().isoformat()))
    
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
    c.execute("SELECT balance, total_bets, wins, level, username, email, is_admin, is_banned FROM users WHERE user_id = ?", (user_id,))
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
            'is_admin': row[6] or 0,
            'is_banned': row[7] or 0,
            'winrate': round((row[2] / row[1] * 100), 1) if row[1] > 0 else 0
        }
    return {'balance': 10000, 'total_bets': 0, 'wins': 0, 'level': 1, 'username': 'Игрок', 'email': '', 'is_admin': 0, 'is_banned': 0, 'winrate': 0}

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

def add_transaction(user_id, type, amount, description):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute('''INSERT INTO transactions (user_id, type, amount, description, timestamp)
                 VALUES (?, ?, ?, ?, ?)''',
              (user_id, type, amount, description, datetime.now().isoformat()))
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
    win_amount = amount * multiplier
    house_edge = 0.05
    commission = int(win_amount * house_edge)
    return int(win_amount - commission)

def calculate_crash_point(amount, user_balance, pool_balance):
    base_crash = random.uniform(1.3, 3.5)
    if amount > 100:
        base_crash = base_crash * 0.85
    elif amount < 50:
        base_crash = base_crash * 1.15
    if user_balance > 50000:
        base_crash = base_crash * 0.9
    elif user_balance < 1000:
        base_crash = base_crash * 1.1
    if pool_balance > 2000000:
        base_crash = base_crash * 1.1
    crash_point = max(1.3, min(4.0, base_crash))
    return round(crash_point, 2)

def is_admin(user_id):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT is_admin FROM users WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return row and row[0] == 1

def is_banned(user_id):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT is_banned FROM users WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return row and row[0] == 1

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
        c.execute("SELECT user_id, password, twofa_enabled, email, is_banned FROM users WHERE username = ?", (username,))
        user = c.fetchone()
        conn.close()
        
        if not user:
            return jsonify({'success': False, 'error': 'Пользователь не найден'})
        if user[4] == 1:
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
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
        
        stats = get_user_stats(user[0])
        
        return jsonify({
            'success': True, 
            'user_id': user[0], 
            'username': username, 
            'stats': stats,
            'is_admin': stats.get('is_admin', 0)
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
        
        stats = get_user_stats(user_id)
        
        return jsonify({
            'success': True, 
            'user_id': user_id, 
            'username': stats.get('username', 'Игрок'),
            'stats': stats,
            'is_admin': stats.get('is_admin', 0)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/init', methods=['POST'])
def init_game():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id', 'test_user')
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        stats = get_user_stats(user_id)
        pool_balance, house_edge = get_pool_balance()
        
        return jsonify({
            'success': True,
            'session_id': user_id,
            'stats': stats,
            'pool_balance': pool_balance,
            'house_edge': house_edge,
            'is_admin': stats.get('is_admin', 0)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

# ============================================================
# ===== АДМИН-ПАНЕЛЬ =====
# ============================================================

@app.route('/api/admin/users', methods=['POST'])
def admin_get_users():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("SELECT user_id, username, email, balance, total_bets, wins, level, is_admin, is_banned, created_at, last_login FROM users ORDER BY balance DESC")
        users = []
        for row in c.fetchall():
            users.append({
                'user_id': row[0],
                'username': row[1],
                'email': row[2],
                'balance': row[3],
                'total_bets': row[4],
                'wins': row[5],
                'level': row[6],
                'is_admin': row[7] or 0,
                'is_banned': row[8] or 0,
                'created_at': row[9],
                'last_login': row[10]
            })
        conn.close()
        
        return jsonify({'success': True, 'users': users})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/ban_user', methods=['POST'])
def admin_ban_user():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        target_user_id = data.get('target_user_id')
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        if target_user_id == admin_id:
            return jsonify({'success': False, 'error': 'Нельзя забанить самого себя'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET is_banned = 1 WHERE user_id = ?", (target_user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Пользователь забанен'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/unban_user', methods=['POST'])
def admin_unban_user():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        target_user_id = data.get('target_user_id')
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET is_banned = 0 WHERE user_id = ?", (target_user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Пользователь разбанен'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/set_balance', methods=['POST'])
def admin_set_balance():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        target_user_id = data.get('target_user_id')
        amount = int(data.get('amount', 0))
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        if amount < 0:
            return jsonify({'success': False, 'error': 'Сумма не может быть отрицательной'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET balance = ? WHERE user_id = ?", (amount, target_user_id))
        conn.commit()
        conn.close()
        
        add_transaction(target_user_id, 'admin', amount, f'Админ установил баланс: {amount}')
        
        return jsonify({'success': True, 'message': f'Баланс установлен на {amount}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/add_balance', methods=['POST'])
def admin_add_balance():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        target_user_id = data.get('target_user_id')
        amount = int(data.get('amount', 0))
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        if amount < 0:
            return jsonify({'success': False, 'error': 'Сумма не может быть отрицательной'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET balance = balance + ? WHERE user_id = ?", (amount, target_user_id))
        conn.commit()
        conn.close()
        
        add_transaction(target_user_id, 'admin', amount, f'Админ добавил {amount}')
        
        return jsonify({'success': True, 'message': f'Добавлено {amount}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/make_admin', methods=['POST'])
def admin_make_admin():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        target_user_id = data.get('target_user_id')
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET is_admin = 1 WHERE user_id = ?", (target_user_id,))
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Пользователь назначен админом'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/pool_stats', methods=['POST'])
def admin_pool_stats():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        pool_balance, house_edge = get_pool_balance()
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("SELECT COUNT(*) FROM users")
        total_users = c.fetchone()[0]
        c.execute("SELECT COUNT(*) FROM users WHERE is_banned = 1")
        banned_users = c.fetchone()[0]
        c.execute("SELECT SUM(balance) FROM users")
        total_balance = c.fetchone()[0] or 0
        conn.close()
        
        return jsonify({
            'success': True,
            'pool': {
                'balance': pool_balance,
                'house_edge': house_edge,
                'total_users': total_users,
                'banned_users': banned_users,
                'total_balance': total_balance
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/add_to_pool', methods=['POST'])
def admin_add_to_pool():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        amount = int(data.get('amount', 0))
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        if amount < 0:
            return jsonify({'success': False, 'error': 'Сумма не может быть отрицательной'})
        
        update_pool(amount)
        
        return jsonify({'success': True, 'message': f'Добавлено в банк {amount}'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/transactions', methods=['POST'])
def admin_transactions():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'})
        
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("SELECT * FROM transactions ORDER BY id DESC LIMIT 100")
        transactions = []
        for row in c.fetchall():
            transactions.append({
                'id': row[0],
                'user_id': row[1],
                'type': row[2],
                'amount': row[3],
                'description': row[4],
                'timestamp': row[5]
            })
        conn.close()
        
        return jsonify({'success': True, 'transactions': transactions})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ============================================================
# ===== ВСЕ ИГРЫ (15+) =====
# ============================================================

# ===== 1. СЛОТЫ =====
@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣', '🎰']
        reels = [random.choice(symbols) for _ in range(9)]
        
        win = False
        win_amount = 0
        
        for row in range(3):
            if reels[row*3] == reels[row*3+1] and reels[row*3+1] == reels[row*3+2]:
                win = True
                win_amount += calculate_win(amount, 5)
        for col in range(3):
            if reels[col] == reels[col+3] and reels[col+3] == reels[col+6]:
                win = True
                win_amount += calculate_win(amount, 5)
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

# ===== 2. РУЛЕТКА =====
@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        bet_type = data.get('bet_type', 'red')
        amount = float(data.get('amount', 10))
        number = data.get('number')
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
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

# ===== 3. БЛЭКДЖЕК =====
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
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
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

# ===== 4. AVIATOR =====
@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        pool_balance, _ = get_pool_balance()
        crash_point = calculate_crash_point(amount, balance, pool_balance)
        
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

# ===== 5. КОСТИ =====
@app.route('/api/dice/roll', methods=['POST'])
def dice_roll():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        bet_type = data.get('bet_type', 'over')
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
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

# ===== 6. МЕГА СЛОТЫ =====
@app.route('/api/megaslots/spin', methods=['POST'])
def megaslots_spin():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣', '🎰', '👑', '💀']
        reels = [random.choice(symbols) for _ in range(15)]
        
        win = False
        win_amount = 0
        
        for row in range(3):
            start = row * 5
            if reels[start] == reels[start+1] == reels[start+2] == reels[start+3] == reels[start+4]:
                win = True
                win_amount += calculate_win(amount, 20)
            elif reels[start] == reels[start+1] == reels[start+2] == reels[start+3]:
                win = True
                win_amount += calculate_win(amount, 10)
            elif reels[start] == reels[start+1] == reels[start+2]:
                win = True
                win_amount += calculate_win(amount, 5)
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'megaslots', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'megaslots', amount, -loss_amount, 'loss')
        
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

# ===== 7. КОЛЕСО ФОРТУНЫ =====
@app.route('/api/wheel/spin', methods=['POST'])
def wheel_spin():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        sectors = [
            {'name': 'x0', 'multiplier': 0, 'weight': 20},
            {'name': 'x1', 'multiplier': 1, 'weight': 20},
            {'name': 'x2', 'multiplier': 2, 'weight': 15},
            {'name': 'x3', 'multiplier': 3, 'weight': 12},
            {'name': 'x5', 'multiplier': 5, 'weight': 10},
            {'name': 'x10', 'multiplier': 10, 'weight': 8},
            {'name': 'x20', 'multiplier': 20, 'weight': 5},
            {'name': 'x50', 'multiplier': 50, 'weight': 3},
        ]
        
        total_weight = sum(s['weight'] for s in sectors)
        rand = random.randint(0, total_weight - 1)
        cumulative = 0
        result = sectors[0]
        for sector in sectors:
            cumulative += sector['weight']
            if rand < cumulative:
                result = sector
                break
        
        win = result['multiplier'] > 0
        win_amount = calculate_win(amount, result['multiplier']) if win else 0
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'wheel', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'wheel', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'result': result['name'],
            'multiplier': result['multiplier'],
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 8. ПОКЕР =====
@app.route('/api/poker/deal', methods=['POST'])
def poker_deal():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        suits = ['♥', '♦', '♣', '♠']
        values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
        
        deck = [f"{v}{s}" for v in values for s in suits]
        random.shuffle(deck)
        
        hand = deck[:5]
        hand_values = [h[:-1] for h in hand]
        
        has_pair = len(set(hand_values)) < 5
        is_flush = len(set(h[-1] for h in hand)) == 1
        
        win = has_pair or is_flush
        win_amount = 0
        
        if is_flush:
            win_amount = calculate_win(amount, 5)
        elif has_pair:
            win_amount = calculate_win(amount, 2)
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'poker', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'poker', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'hand': hand,
            'has_pair': has_pair,
            'is_flush': is_flush,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 9. МАЙНС =====
@app.route('/api/mines/start', methods=['POST'])
def mines_start():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        bombs = data.get('bombs', 3)
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        total_cells = 25
        bomb_positions = random.sample(range(total_cells), bombs)
        
        return jsonify({
            'success': True,
            'bombs': bombs,
            'total_cells': total_cells,
            'bomb_positions': bomb_positions,
            'amount': amount
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mines/reveal', methods=['POST'])
def mines_reveal():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        cell_index = data.get('cell_index')
        bomb_positions = data.get('bomb_positions', [])
        revealed = data.get('revealed', [])
        bombs = data.get('bombs', 3)
        
        if cell_index in revealed:
            return jsonify({'success': False, 'error': 'Клетка уже открыта'})
        
        is_bomb = cell_index in bomb_positions
        
        if is_bomb:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'mines', amount, -loss_amount, 'loss')
            return jsonify({
                'success': True,
                'is_bomb': True,
                'stats': get_user_stats(user_id),
                'pool_balance': get_pool_balance()[0]
            })
        
        revealed.append(cell_index)
        safe_cells = 25 - bombs
        multiplier = 1 + (len(revealed) / safe_cells)
        win_amount = calculate_win(amount, multiplier)
        
        if len(revealed) == safe_cells:
            win_amount = int(win_amount)
            pool_balance, _ = get_pool_balance()
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'mines', amount, win_amount, 'win')
            return jsonify({
                'success': True,
                'is_bomb': False,
                'all_revealed': True,
                'win_amount': win_amount,
                'stats': get_user_stats(user_id),
                'pool_balance': get_pool_balance()[0]
            })
        
        return jsonify({
            'success': True,
            'is_bomb': False,
            'all_revealed': False,
            'revealed': revealed,
            'multiplier': round(multiplier, 2),
            'safe_cells': safe_cells - len(revealed),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/mines/cashout', methods=['POST'])
def mines_cashout():
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
        add_history(user_id, 'mines', amount, win_amount, 'win')
        
        return jsonify({
            'success': True,
            'win_amount': win_amount,
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 10. ДАРТС =====
@app.route('/api/darts/throw', methods=['POST'])
def darts_throw():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        target = random.randint(1, 20)
        hit = random.randint(1, 20)
        multiplier = random.choice([1, 2, 3])
        score = hit * multiplier
        
        win = score == target * multiplier
        win_amount = calculate_win(amount, 5) if win else 0
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'darts', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'darts', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'target': target,
            'hit': hit,
            'score': score,
            'multiplier': multiplier,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 11. ЛОТЕРЕЯ =====
@app.route('/api/lottery/play', methods=['POST'])
def lottery_play():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        number = data.get('number', random.randint(1, 100))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        drawn = random.randint(1, 100)
        win = drawn == number
        win_amount = calculate_win(amount, 100) if win else 0
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'lottery', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'lottery', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'drawn': drawn,
            'number': number,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 12. КЕНО =====
@app.route('/api/keno/play', methods=['POST'])
def keno_play():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        picks = data.get('picks', 5)
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        numbers = list(range(1, 81))
        drawn = random.sample(numbers, 10)
        chosen = random.sample(numbers, picks)
        
        matches = len(set(drawn) & set(chosen))
        
        multipliers = {0: 0, 1: 0, 2: 0, 3: 2, 4: 5, 5: 10}
        multiplier = multipliers.get(matches, 0)
        
        win = multiplier > 0
        win_amount = calculate_win(amount, multiplier) if win else 0
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'keno', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'keno', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'chosen': chosen,
            'drawn': drawn,
            'matches': matches,
            'multiplier': multiplier,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 13. СНАЙПЕР =====
@app.route('/api/sniper/shot', methods=['POST'])
def sniper_shot():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        target_x = random.uniform(-5, 5)
        target_y = random.uniform(-5, 5)
        shot_x = random.uniform(-5, 5)
        shot_y = random.uniform(-5, 5)
        
        distance = math.sqrt((shot_x - target_x)**2 + (shot_y - target_y)**2)
        
        multipliers = {0: 50, 1: 20, 2: 10, 3: 5, 4: 3, 5: 2}
        ring = min(int(distance), 5)
        multiplier = multipliers.get(ring, 0)
        
        win = multiplier > 0
        win_amount = calculate_win(amount, multiplier) if win else 0
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'sniper', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'sniper', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'distance': round(distance, 2),
            'ring': ring,
            'multiplier': multiplier,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 14. ОЧКО (21) =====
@app.route('/api/ochko/start', methods=['POST'])
def ochko_start():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        deck = [1,2,3,4,5,6,7,8,9,10,10,10,10] * 4
        random.shuffle(deck)
        
        player_hand = [deck.pop(), deck.pop()]
        dealer_hand = [deck.pop(), deck.pop()]
        
        player_sum = sum(player_hand)
        dealer_sum = sum(dealer_hand)
        
        if player_sum == 21 and dealer_sum != 21:
            win_amount = int(calculate_win(amount, 1.5))
            pool_balance, _ = get_pool_balance()
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'ochko', amount, win_amount, 'win')
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

@app.route('/api/ochko/hit', methods=['POST'])
def ochko_hit():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        deck = data.get('deck', [])
        player_hand = data.get('player_hand', [])
        amount = float(data.get('amount', 10))
        
        player_hand.append(deck.pop())
        player_sum = sum(player_hand)
        
        if player_sum > 21:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'ochko', amount, -loss_amount, 'loss')
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

@app.route('/api/ochko/stand', methods=['POST'])
def ochko_stand():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        deck = data.get('deck', [])
        player_hand = data.get('player_hand', [])
        dealer_hand = data.get('dealer_hand', [])
        amount = float(data.get('amount', 10))
        
        while sum(dealer_hand) < 17:
            dealer_hand.append(deck.pop())
        
        player_sum = sum(player_hand)
        dealer_sum = sum(dealer_hand)
        
        pool_balance, _ = get_pool_balance()
        
        if dealer_sum > 21 or player_sum > dealer_sum:
            win_amount = int(calculate_win(amount, 2))
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'ochko', amount, win_amount, 'win')
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
            add_history(user_id, 'ochko', amount, -loss_amount, 'loss')
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

# ===== 15. МОНЕТКА =====
@app.route('/api/coin/flip', methods=['POST'])
def coin_flip():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        side = data.get('side', 'heads')
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        result = random.choice(['heads', 'tails'])
        win = result == side
        win_amount = calculate_win(amount, 2) if win else 0
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'coin', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'coin', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'result': result,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== 16. БАККАРА =====
@app.route('/api/baccarat/play', methods=['POST'])
def baccarat_play():
    try:
        data = request.get_json(force=True)
        user_id = data.get('session_id', 'test_user')
        amount = float(data.get('amount', 10))
        bet = data.get('bet', 'player')  # player, banker, tie
        
        if is_banned(user_id):
            return jsonify({'success': False, 'error': 'Аккаунт заблокирован'})
        
        balance = get_user_balance(user_id)
        if amount > balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств', 'balance': balance})
        
        # Симуляция баккары
        player_total = random.randint(0, 9)
        banker_total = random.randint(0, 9)
        
        # Дополнительные карты
        if player_total <= 5:
            player_total = (player_total + random.randint(0, 9)) % 10
        if banker_total <= 5:
            banker_total = (banker_total + random.randint(0, 9)) % 10
        
        win = False
        win_amount = 0
        result_text = ''
        
        if player_total > banker_total:
            result_text = 'player'
            if bet == 'player':
                win = True
                win_amount = calculate_win(amount, 2)
        elif banker_total > player_total:
            result_text = 'banker'
            if bet == 'banker':
                win = True
                win_amount = calculate_win(amount, 1.95)
        else:
            result_text = 'tie'
            if bet == 'tie':
                win = True
                win_amount = calculate_win(amount, 8)
        
        pool_balance, _ = get_pool_balance()
        
        if win:
            win_amount = int(win_amount)
            if pool_balance < win_amount:
                win_amount = int(pool_balance * 0.9)
            update_user_balance(user_id, win_amount)
            update_pool(-win_amount)
            add_history(user_id, 'baccarat', amount, win_amount, 'win')
        else:
            loss_amount = int(amount)
            update_user_balance(user_id, -loss_amount)
            update_pool(loss_amount)
            add_history(user_id, 'baccarat', amount, -loss_amount, 'loss')
        
        return jsonify({
            'success': True,
            'player_total': player_total,
            'banker_total': banker_total,
            'result': result_text,
            'win': win,
            'win_amount': win_amount if win else -int(amount),
            'stats': get_user_stats(user_id),
            'pool_balance': get_pool_balance()[0]
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
