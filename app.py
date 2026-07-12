from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
from flask_mail import Mail, Message
import random
import secrets
import sqlite3
from datetime import datetime
import threading
import hashlib
import re
import os
import base64
from PIL import Image
import io
import subprocess

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# ===== КОНФИГУРАЦИЯ ПОЧТЫ (ДЛЯ 2FA) =====
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'your_email@gmail.com'
app.config['MAIL_PASSWORD'] = 'your_app_password'
mail = Mail(app)

# ===== ИНИЦИАЛИЗАЦИЯ БАЗЫ ДАННЫХ =====
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
                  updated_at TEXT)''')
    
    conn.commit()
    conn.close()

init_db()

# ===== ПУЛ КАЗИНО =====
def get_pool_balance():
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT balance FROM casino_pool ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    return row[0] if row else 1000000

def update_pool(amount):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT id, balance FROM casino_pool ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    if row:
        c.execute("UPDATE casino_pool SET balance = ?, updated_at = datetime('now') WHERE id = ?", (row[1] + amount, row[0]))
    else:
        c.execute("INSERT INTO casino_pool (balance, updated_at) VALUES (?, datetime('now'))", (1000000 + amount,))
    conn.commit()
    conn.close()

def check_pool_can_pay(amount):
    return get_pool_balance() >= amount

def get_pool_stats():
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT balance, total_in, total_out, commission FROM casino_pool ORDER BY id DESC LIMIT 1")
    row = c.fetchone()
    conn.close()
    if row:
        return {'balance': row[0], 'total_in': row[1], 'total_out': row[2], 'commission': row[3]}
    return {'balance': 1000000, 'total_in': 0, 'total_out': 0, 'commission': 0}

# ===== КЛАСС ПОЛЬЗОВАТЕЛЯ =====
class User:
    def __init__(self, user_id):
        self.user_id = user_id
        self.username = ""
        self.email = ""
        self.avatar = ""
        self.balance = 10000
        self.total_bets = 0
        self.wins = 0
        self.level = 1
        self.xp = 0
        self.twofa_enabled = 0
        self.load_from_db()
    
    def load_from_db(self):
        try:
            conn = sqlite3.connect('ruwin.db')
            c = conn.cursor()
            c.execute("SELECT username, email, avatar, balance, total_bets, wins, level, xp, twofa_enabled FROM users WHERE user_id = ?", (self.user_id,))
            data = c.fetchone()
            conn.close()
            if data:
                self.username = data[0]
                self.email = data[1] or ""
                self.avatar = data[2] or ""
                self.balance = data[3]
                self.total_bets = data[4]
                self.wins = data[5]
                self.level = data[6]
                self.xp = data[7]
                self.twofa_enabled = data[8] or 0
                return True
            return False
        except Exception as e:
            print(f"Ошибка загрузки: {e}")
            return False
    
    def save_to_db(self):
        try:
            conn = sqlite3.connect('ruwin.db')
            c = conn.cursor()
            c.execute('''UPDATE users 
                         SET username=?, email=?, avatar=?, balance=?, total_bets=?, wins=?, level=?, xp=?, twofa_enabled=?, last_login=?
                         WHERE user_id=?''',
                      (self.username, self.email, self.avatar, self.balance, self.total_bets, self.wins, self.level, self.xp, self.twofa_enabled, datetime.now().isoformat(), self.user_id))
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            print(f"Ошибка сохранения: {e}")
            return False
    
    def get_stats(self):
        return {
            'user_id': self.user_id,
            'username': self.username,
            'email': self.email,
            'avatar': self.avatar,
            'balance': self.balance,
            'total_bets': self.total_bets,
            'wins': self.wins,
            'losses': self.total_bets - self.wins,
            'winrate': round((self.wins / self.total_bets * 100), 1) if self.total_bets > 0 else 0,
            'level': self.level,
            'xp': self.xp,
            'xp_next': self.level * 100,
            'twofa_enabled': bool(self.twofa_enabled)
        }
    
    def add_xp(self, amount):
        self.xp += amount
        while self.xp >= self.level * 100:
            self.xp -= self.level * 100
            self.level += 1
        self.save_to_db()
    
    def add_history(self, game, bet_amount, win_amount, result):
        try:
            conn = sqlite3.connect('ruwin.db')
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
            conn = sqlite3.connect('ruwin.db')
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

def generate_2fa_code():
    return str(random.randint(100000, 999999))

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

def is_admin(user_id):
    conn = sqlite3.connect('ruwin.db')
    c = conn.cursor()
    c.execute("SELECT username FROM users WHERE user_id = ?", (user_id,))
    row = c.fetchone()
    conn.close()
    return row and row[0] == 'mrdante'

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
        email = data.get('email', '').strip()
        
        if not validate_username(username):
            return jsonify({'success': False, 'error': 'Имя пользователя 3-20 символов (буквы, цифры, _, -)'})
        if not validate_password(password):
            return jsonify({'success': False, 'error': 'Пароль минимум 6 символов'})
        if not re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email):
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
            try:
                msg = Message('Код подтверждения RuWin', sender=app.config['MAIL_USERNAME'], recipients=[user[3]])
                msg.body = f'Ваш код для входа: {code}'
                mail.send(msg)
            except Exception as e:
                print(f"Ошибка отправки email: {e}")
            return jsonify({'success': True, 'need_2fa': True, 'user_id': user[0]})
        
        game = get_user(user[0])
        return jsonify({'success': True, 'user_id': user[0], 'username': username, 'stats': game.get_stats()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/verify_2fa', methods=['POST'])
def verify_2fa():
    try:
        data = request.get_json(force=True)
        code = data.get('code', '')
        user_id = session.get('2fa_user_id')
        if not user_id or code != session.get('2fa_code'):
            return jsonify({'success': False, 'error': 'Неверный код'})
        game = get_user(user_id)
        session.pop('2fa_code', None)
        session.pop('2fa_user_id', None)
        return jsonify({'success': True, 'user_id': user_id, 'username': game.username, 'stats': game.get_stats()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== ПРОФИЛЬ =====
@app.route('/api/profile', methods=['GET', 'POST'])
def profile():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        game = get_user(user_id)
        if request.method == 'POST':
            new_username = data.get('username', '').strip()
            new_email = data.get('email', '').strip()
            if new_username and validate_username(new_username):
                game.username = new_username
            if new_email and re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', new_email):
                game.email = new_email
            game.save_to_db()
            return jsonify({'success': True, 'stats': game.get_stats()})
        return jsonify({'success': True, 'stats': game.get_stats()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/avatar', methods=['POST'])
def upload_avatar():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        avatar_data = data.get('avatar', '')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        game = get_user(user_id)
        game.avatar = avatar_data
        game.save_to_db()
        return jsonify({'success': True, 'avatar': avatar_data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/settings/2fa', methods=['POST'])
def toggle_2fa():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        enabled = data.get('enabled', False)
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        game = get_user(user_id)
        game.twofa_enabled = 1 if enabled else 0
        game.save_to_db()
        return jsonify({'success': True, 'twofa_enabled': bool(game.twofa_enabled)})
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
        pool_stats = get_pool_stats()
        return jsonify({
            'success': True,
            'user_id': game.user_id,
            'username': game.username,
            'stats': game.get_stats(),
            'history': game.get_history(10),
            'is_vpn': is_vpn,
            'pool_balance': pool_stats['balance'],
            'pool_total_in': pool_stats['total_in'],
            'pool_total_out': pool_stats['total_out'],
            'pool_commission': pool_stats['commission']
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute('''SELECT username, balance, level, wins, total_bets FROM users ORDER BY balance DESC LIMIT 10''')
        leaders = []
        for idx, row in enumerate(c.fetchall(), 1):
            leaders.append({'rank': idx, 'username': row[0], 'balance': row[1], 'level': row[2], 'wins': row[3], 'total_bets': row[4]})
        conn.close()
        return jsonify({'success': True, 'leaders': leaders})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== АДМИН-ПАНЕЛЬ =====
@app.route('/api/admin/users', methods=['POST'])
def admin_get_users():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        if not is_admin(user_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'}), 403
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("SELECT user_id, username, email, balance, total_bets, wins, level, xp, created_at, last_login FROM users ORDER BY balance DESC")
        users_list = []
        for row in c.fetchall():
            users_list.append({
                'user_id': row[0],
                'username': row[1],
                'email': row[2],
                'balance': row[3],
                'total_bets': row[4],
                'wins': row[5],
                'level': row[6],
                'xp': row[7],
                'created_at': row[8],
                'last_login': row[9]
            })
        conn.close()
        return jsonify({'success': True, 'users': users_list})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/reset_balance', methods=['POST'])
def admin_reset_balance():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        target_user_id = data.get('target_user_id')
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'}), 403
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("UPDATE users SET balance = 10000 WHERE user_id = ?", (target_user_id,))
        conn.commit()
        conn.close()
        if target_user_id in users:
            users[target_user_id].balance = 10000
            users[target_user_id].save_to_db()
        return jsonify({'success': True, 'message': 'Баланс обнулён до 10 000 ₽'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/ban_user', methods=['POST'])
def admin_ban_user():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        target_user_id = data.get('target_user_id')
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'}), 403
        if target_user_id == admin_id:
            return jsonify({'success': False, 'error': 'Нельзя забанить самого себя'}), 400
        conn = sqlite3.connect('ruwin.db')
        c = conn.cursor()
        c.execute("DELETE FROM users WHERE user_id = ?", (target_user_id,))
        c.execute("DELETE FROM game_history WHERE user_id = ?", (target_user_id,))
        conn.commit()
        conn.close()
        if target_user_id in users:
            del users[target_user_id]
        return jsonify({'success': True, 'message': 'Игрок забанен'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/restart', methods=['POST'])
def admin_restart():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'}), 403
        subprocess.Popen(['sudo', 'systemctl', 'restart', 'ruwin'])
        return jsonify({'success': True, 'message': 'Сайт перезагружается...'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/pool_stats', methods=['POST'])
def admin_pool_stats():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'}), 403
        pool_stats = get_pool_stats()
        return jsonify({'success': True, 'pool': pool_stats})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/admin/add_to_pool', methods=['POST'])
def admin_add_to_pool():
    try:
        data = request.get_json(force=True)
        admin_id = data.get('admin_id')
        amount = int(data.get('amount', 0))
        if not is_admin(admin_id):
            return jsonify({'success': False, 'error': 'Доступ запрещён'}), 403
        if amount <= 0:
            return jsonify({'success': False, 'error': 'Сумма должна быть положительной'}), 400
        update_pool(amount)
        return jsonify({'success': True, 'message': f'Пул пополнен на {amount} ₽', 'pool_balance': get_pool_balance()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== ИГРЫ =====
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
        
        pool_balance = get_pool_balance()
        if pool_balance < amount * 10:
            return jsonify({'success': False, 'error': 'Временно недоступно, попробуйте позже'})
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
            commission = int(win_amount * 0.05)
            payout = win_amount - commission
            if get_pool_balance() < payout:
                return jsonify({'success': False, 'error': 'Недостаточно средств в пуле'})
            game.balance += payout
            game.wins += 1
            game.add_xp(int(abs(payout) / 10))
            game.add_history('roulette', amount, payout, 'win')
            update_pool(-payout)
        else:
            game.balance -= amount
            game.add_history('roulette', amount, -amount, 'loss')
            update_pool(amount)
        
        game.total_bets += 1
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'result': result,
            'color': color,
            'win': win,
            'win_amount': payout if win else -amount,
            'balance': game.balance,
            'pool_balance': get_pool_balance(),
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        
        pool_balance = get_pool_balance()
        if pool_balance < amount * 5:
            return jsonify({'success': False, 'error': 'Временно недоступно, попробуйте позже'})
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
            commission = int(win_amount * 0.05)
            payout = win_amount - commission
            if get_pool_balance() < payout:
                return jsonify({'success': False, 'error': 'Недостаточно средств в пуле'})
            game.balance += payout
            game.wins += 1
            game.add_xp(int(payout / 5))
            game.add_history('slots', amount, payout, 'win')
            update_pool(-payout)
        else:
            game.balance -= amount
            game.add_history('slots', amount, -amount, 'loss')
            update_pool(amount)
        
        game.total_bets += 1
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'reels': reels,
            'win': win,
            'win_amount': payout if win else -amount,
            'balance': game.balance,
            'pool_balance': get_pool_balance(),
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        
        pool_balance = get_pool_balance()
        if pool_balance < amount * 2:
            return jsonify({'success': False, 'error': 'Временно недоступно, попробуйте позже'})
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
                win_amount = int(amount * 1.5)
                commission = int(win_amount * 0.05)
                payout = win_amount - commission
                if get_pool_balance() < payout:
                    return jsonify({'success': False, 'error': 'Недостаточно средств в пуле'})
                game.balance += payout
                game.wins += 1
                win = True
                win_amount_display = payout
                game.add_xp(int(amount / 5))
                game.add_history('blackjack', amount, payout, 'win')
                update_pool(-payout)
            elif dealer_blackjack and not player_blackjack:
                game.balance -= amount
                win = False
                win_amount_display = -amount
                game.add_history('blackjack', amount, -amount, 'loss')
                update_pool(amount)
            else:
                win = None
                win_amount_display = 0
                game.add_history('blackjack', amount, 0, 'draw')
            game.total_bets += 1
            game.save_to_db()
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': win,
                'win_amount': win_amount_display,
                'balance': game.balance,
                'pool_balance': get_pool_balance(),
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
            update_pool(amount)
            game.save_to_db()
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'game_over': True,
                'win': False,
                'win_amount': -amount,
                'balance': game.balance,
                'pool_balance': get_pool_balance(),
                'stats': game.get_stats(),
                'history': game.get_history(10)
            })
        return jsonify({'success': True, 'player_hand': player_hand, 'deck': deck, 'game_over': False})
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
            win_amount = int(amount * 2)
            commission = int(win_amount * 0.05)
            payout = win_amount - commission
            if get_pool_balance() < payout:
                return jsonify({'success': False, 'error': 'Недостаточно средств в пуле'})
            game.balance += payout
            game.wins += 1
            win = True
            win_amount_display = payout
            game.add_xp(int(amount / 5))
            game.add_history('blackjack', amount, payout, 'win')
            update_pool(-payout)
        elif player_sum == dealer_sum:
            win = None
            win_amount_display = 0
            game.add_history('blackjack', amount, 0, 'draw')
        else:
            win = False
            win_amount_display = -amount
            game.balance -= amount
            game.add_history('blackjack', amount, -amount, 'loss')
            update_pool(amount)
        game.total_bets += 1
        game.save_to_db()
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'dealer_hand': dealer_hand,
            'game_over': True,
            'win': win,
            'win_amount': win_amount_display,
            'balance': game.balance,
            'pool_balance': get_pool_balance(),
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    try:
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        game = get_user(user_id)
        amount = float(data.get('amount', 0))
        
        pool_balance = get_pool_balance()
        if pool_balance < amount * 2:
            return jsonify({'success': False, 'error': 'Временно недоступно, попробуйте позже'})
        if amount > game.balance:
            return jsonify({'success': False, 'error': 'Недостаточно средств'})
        
        crash_point = random.uniform(1.0, 100.0)
        if crash_point > 2.0:
            crash_point = 2.0 + random.uniform(0, 1.5)
        game.balance -= amount
        game.save_to_db()
        return jsonify({'success': True, 'crash_point': crash_point, 'amount': amount, 'balance': game.balance})
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
        
        win_amount = int(amount * multiplier)
        commission = int(win_amount * 0.05)
        payout = win_amount - commission
        
        if get_pool_balance() < payout:
            return jsonify({'success': False, 'error': 'Недостаточно средств в пуле'})
        
        game.balance += payout
        game.wins += 1
        game.total_bets += 1
        game.add_xp(int(payout / 5))
        game.add_history('crash', amount, payout, 'win')
        update_pool(-payout)
        game.save_to_db()
        
        return jsonify({
            'success': True,
            'win_amount': payout,
            'balance': game.balance,
            'pool_balance': get_pool_balance(),
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
        update_pool(amount)
        game.save_to_db()
        return jsonify({
            'success': True,
            'balance': game.balance,
            'pool_balance': get_pool_balance(),
            'stats': game.get_stats(),
            'history': game.get_history(10)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
