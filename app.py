from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime
import hashlib
import re
import random
import secrets
from functools import wraps

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

# ===== КОНФИГ =====
DATABASE = 'ruwin.db'
HOUSE_EDGE = 0.05
START_BALANCE = 10000
POOL_START = 1000000

# ===== БАЗА ДАННЫХ =====
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        c = conn.cursor()
        
        c.execute('''CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            balance INTEGER DEFAULT 10000,
            total_bets INTEGER DEFAULT 0,
            wins INTEGER DEFAULT 0,
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            created_at TEXT,
            last_login TEXT
        )''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS game_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            game TEXT NOT NULL,
            bet INTEGER NOT NULL,
            win INTEGER NOT NULL,
            result TEXT NOT NULL,
            created_at TEXT
        )''')
        
        c.execute('''CREATE TABLE IF NOT EXISTS casino_pool (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            balance INTEGER DEFAULT 1000000,
            updated_at TEXT
        )''')
        
        c.execute("SELECT * FROM users WHERE username = 'test'")
        if not c.fetchone():
            c.execute('''INSERT INTO users (user_id, username, password, email, balance, created_at, last_login)
                VALUES (?, ?, ?, ?, ?, ?, ?)''',
                ('test_001', 'test', hashlib.sha256('test'.encode()).hexdigest(), 
                 'test@test.com', 10000, datetime.now().isoformat(), datetime.now().isoformat()))
        
        c.execute("SELECT * FROM casino_pool")
        if not c.fetchone():
            c.execute('''INSERT INTO casino_pool (balance, updated_at)
                VALUES (?, ?)''', (POOL_START, datetime.now().isoformat()))
        
        conn.commit()
        
        print("✅ База данных инициализирована")
        print("💰 Тестовый пользователь: test / test (баланс: 10000)")

init_db()

# ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====
def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

def generate_user_id():
    return f"user_{secrets.token_hex(8)}"

def validate_username(username):
    return bool(re.match(r'^[a-zA-Z0-9_-]{3,20}$', username))

def validate_email(email):
    return bool(re.match(r'^[^\s@]+@[^\s@]+\.[^\s@]+$', email))

def get_user(user_id):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
        return c.fetchone()

def get_user_by_username(username):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT * FROM users WHERE username = ?", (username,))
        return c.fetchone()

def get_balance(user_id):
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute("SELECT balance FROM users WHERE user_id = ?", (user_id,))
            row = c.fetchone()
            return row[0] if row else START_BALANCE
    except Exception as e:
        print(f"❌ Ошибка получения баланса: {e}")
        return START_BALANCE

def update_balance(user_id, amount):
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute("UPDATE users SET balance = balance + ? WHERE user_id = ?", (amount, user_id))
            if amount > 0:
                c.execute("UPDATE users SET wins = wins + 1 WHERE user_id = ?", (user_id,))
            c.execute("UPDATE users SET total_bets = total_bets + 1 WHERE user_id = ?", (user_id,))
            conn.commit()
            
            c.execute("SELECT balance FROM users WHERE user_id = ?", (user_id,))
            row = c.fetchone()
            new_balance = row[0] if row else START_BALANCE
            return new_balance
    except Exception as e:
        print(f"❌ Ошибка обновления баланса: {e}")
        return get_balance(user_id)

def add_history(user_id, game, bet, win, result):
    try:
        with get_db() as conn:
            c = conn.cursor()
            c.execute('''INSERT INTO game_history (user_id, game, bet, win, result, created_at)
                VALUES (?, ?, ?, ?, ?, ?)''',
                (user_id, game, bet, win, result, datetime.now().isoformat()))
            conn.commit()
    except Exception as e:
        print(f"❌ Ошибка записи истории: {e}")

def get_pool():
    with get_db() as conn:
        c = conn.cursor()
        c.execute("SELECT balance FROM casino_pool ORDER BY id DESC LIMIT 1")
        row = c.fetchone()
        return row[0] if row else POOL_START

def update_pool(amount):
    with get_db() as conn:
        c = conn.cursor()
        c.execute("UPDATE casino_pool SET balance = balance + ?, updated_at = ?", 
                 (amount, datetime.now().isoformat()))
        conn.commit()

def calculate_win(bet, multiplier):
    win = bet * multiplier
    commission = int(win * HOUSE_EDGE)
    return int(win - commission)

def get_stats(user_id):
    user = get_user(user_id)
    if not user:
        return {
            'balance': START_BALANCE,
            'total_bets': 0,
            'wins': 0,
            'level': 1,
            'winrate': 0,
            'username': 'Игрок',
            'email': '',
            'user_id': user_id
        }
    
    winrate = round((user['wins'] / user['total_bets'] * 100), 1) if user['total_bets'] > 0 else 0
    
    return {
        'balance': user['balance'],
        'total_bets': user['total_bets'],
        'wins': user['wins'],
        'level': user['level'],
        'winrate': winrate,
        'username': user['username'],
        'email': user['email'] or '',
        'user_id': user['user_id']
    }

# ===== ДЕКОРАТОР =====
def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        data = request.get_json(force=True)
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'success': False, 'error': 'Не авторизован'}), 401
        
        user = get_user(user_id)
        if not user:
            return jsonify({'success': False, 'error': 'Пользователь не найден'}), 401
        
        return f(user, *args, **kwargs)
    return decorated

# ===== МАРШРУТЫ =====
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    email = data.get('email', '').strip()
    
    if not validate_username(username):
        return jsonify({'success': False, 'error': 'Имя 3-20 символов'})
    if len(password) < 6:
        return jsonify({'success': False, 'error': 'Пароль минимум 6 символов'})
    if not validate_email(email):
        return jsonify({'success': False, 'error': 'Неверный email'})
    
    with get_db() as conn:
        c = conn.cursor()
        
        c.execute("SELECT id FROM users WHERE username = ?", (username,))
        if c.fetchone():
            return jsonify({'success': False, 'error': 'Имя уже занято'})
        
        c.execute("SELECT id FROM users WHERE email = ?", (email,))
        if c.fetchone():
            return jsonify({'success': False, 'error': 'Email уже зарегистрирован'})
        
        user_id = generate_user_id()
        hashed = hash_password(password)
        
        c.execute('''INSERT INTO users (user_id, username, password, email, balance, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?)''',
            (user_id, username, hashed, email, START_BALANCE, datetime.now().isoformat(), datetime.now().isoformat()))
        conn.commit()
    
    return jsonify({'success': True, 'message': 'Регистрация успешна', 'user_id': user_id})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    user = get_user_by_username(username)
    if not user:
        return jsonify({'success': False, 'error': 'Пользователь не найден'})
    
    if user['password'] != hash_password(password):
        return jsonify({'success': False, 'error': 'Неверный пароль'})
    
    with get_db() as conn:
        c = conn.cursor()
        c.execute("UPDATE users SET last_login = ? WHERE user_id = ?", 
                 (datetime.now().isoformat(), user['user_id']))
        conn.commit()
    
    stats = get_stats(user['user_id'])
    
    return jsonify({
        'success': True,
        'user_id': user['user_id'],
        'username': user['username'],
        'stats': stats
    })

@app.route('/api/init', methods=['POST'])
def init():
    data = request.json
    user_id = data.get('user_id', 'test_001')
    
    stats = get_stats(user_id)
    pool = get_pool()
    
    return jsonify({
        'success': True,
        'stats': stats,
        'pool': pool,
        'house_edge': HOUSE_EDGE
    })

@app.route('/api/balance', methods=['POST'])
def get_balance_api():
    data = request.json
    user_id = data.get('user_id', 'test_001')
    
    balance = get_balance(user_id)
    return jsonify({
        'success': True,
        'balance': balance
    })

# ============================================================
# ===== ИГРА: РУЛЕТКА =====
# ============================================================
@app.route('/api/game/roulette', methods=['POST'])
@require_auth
def game_roulette(user):
    data = request.json
    bet = int(data.get('bet', 0))
    bet_type = data.get('type', 'number')
    number = data.get('number')
    
    if bet <= 0:
        return jsonify({'success': False, 'error': 'Неверная ставка'})
    
    current_balance = get_balance(user['user_id'])
    if bet > current_balance:
        return jsonify({
            'success': False, 
            'error': f'Недостаточно средств. Баланс: {current_balance} ₽',
            'balance': current_balance
        })
    
    result = random.randint(0, 36)
    color = 'green' if result == 0 else 'red' if result in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black'
    
    win = False
    win_amount = 0
    
    if bet_type == 'number' and result == number:
        win = True
        win_amount = calculate_win(bet, 35)
    elif bet_type == 'red' and color == 'red':
        win = True
        win_amount = calculate_win(bet, 2)
    elif bet_type == 'black' and color == 'black':
        win = True
        win_amount = calculate_win(bet, 2)
    elif bet_type == 'even' and result > 0 and result % 2 == 0:
        win = True
        win_amount = calculate_win(bet, 2)
    elif bet_type == 'odd' and result > 0 and result % 2 == 1:
        win = True
        win_amount = calculate_win(bet, 2)
    elif bet_type == 'half1' and 1 <= result <= 18:
        win = True
        win_amount = calculate_win(bet, 2)
    elif bet_type == 'half2' and 19 <= result <= 36:
        win = True
        win_amount = calculate_win(bet, 2)
    
    pool = get_pool()
    
    if win:
        if pool < win_amount:
            win_amount = int(pool * 0.9)
        new_balance = update_balance(user['user_id'], win_amount)
        update_pool(-win_amount)
        add_history(user['user_id'], 'roulette', bet, win_amount, 'win')
    else:
        new_balance = update_balance(user['user_id'], -bet)
        update_pool(bet)
        add_history(user['user_id'], 'roulette', bet, -bet, 'loss')
    
    stats = get_stats(user['user_id'])
    stats['balance'] = new_balance
    
    return jsonify({
        'success': True,
        'result': result,
        'color': color,
        'win': win,
        'win_amount': win_amount if win else -bet,
        'stats': stats,
        'balance': new_balance
    })

# ============================================================
# ===== ИГРА: СЛОТЫ =====
# ============================================================
@app.route('/api/game/slots', methods=['POST'])
@require_auth
def game_slots(user):
    data = request.json
    bet = int(data.get('bet', 0))
    
    if bet <= 0:
        return jsonify({'success': False, 'error': 'Неверная ставка'})
    
    current_balance = get_balance(user['user_id'])
    if bet > current_balance:
        return jsonify({
            'success': False, 
            'error': f'Недостаточно средств. Баланс: {current_balance} ₽',
            'balance': current_balance
        })
    
    symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣', '🎰']
    reels = [random.choice(symbols) for _ in range(9)]
    
    win = False
    win_amount = 0
    
    lines = [
        [0,1,2], [3,4,5], [6,7,8],
        [0,3,6], [1,4,7], [2,5,8],
        [0,4,8], [2,4,6]
    ]
    
    for line in lines:
        if reels[line[0]] == reels[line[1]] == reels[line[2]]:
            win = True
            win_amount += calculate_win(bet, 5)
            break
    
    pool = get_pool()
    
    if win:
        if pool < win_amount:
            win_amount = int(pool * 0.9)
        new_balance = update_balance(user['user_id'], win_amount)
        update_pool(-win_amount)
        add_history(user['user_id'], 'slots', bet, win_amount, 'win')
    else:
        new_balance = update_balance(user['user_id'], -bet)
        update_pool(bet)
        add_history(user['user_id'], 'slots', bet, -bet, 'loss')
    
    stats = get_stats(user['user_id'])
    stats['balance'] = new_balance
    
    return jsonify({
        'success': True,
        'reels': reels,
        'win': win,
        'win_amount': win_amount if win else -bet,
        'stats': stats,
        'balance': new_balance
    })

# ============================================================
# ===== ИГРА: БЛЭКДЖЕК =====
# ============================================================
def sum_hand(hand):
    total = sum(hand)
    aces = hand.count(11)
    while total > 21 and aces > 0:
        total -= 10
        aces -= 1
    return total

@app.route('/api/game/blackjack', methods=['POST'])
@require_auth
def game_blackjack(user):
    data = request.json
    bet = int(data.get('bet', 0))
    action = data.get('action', 'start')
    
    if bet <= 0:
        return jsonify({'success': False, 'error': 'Неверная ставка'})
    
    current_balance = get_balance(user['user_id'])
    if bet > current_balance:
        return jsonify({
            'success': False, 
            'error': f'Недостаточно средств. Баланс: {current_balance} ₽',
            'balance': current_balance
        })
    
    deck = [2,3,4,5,6,7,8,9,10,10,10,10,11] * 4
    random.shuffle(deck)
    
    if action == 'start':
        player_hand = [deck.pop(), deck.pop()]
        dealer_hand = [deck.pop(), deck.pop()]
        
        player_sum = sum_hand(player_hand)
        
        if player_sum == 21:
            win_amount = calculate_win(bet, 1.5)
            pool = get_pool()
            if pool < win_amount:
                win_amount = int(pool * 0.9)
            
            new_balance = update_balance(user['user_id'], win_amount)
            update_pool(-win_amount)
            add_history(user['user_id'], 'blackjack', bet, win_amount, 'win')
            
            stats = get_stats(user['user_id'])
            stats['balance'] = new_balance
            
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': True,
                'win_amount': win_amount,
                'stats': stats,
                'balance': new_balance
            })
        
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'dealer_hand': [dealer_hand[0], '?'],
            'deck': deck,
            'game_over': False,
            'balance': current_balance
        })
    
    elif action == 'hit':
        player_hand = data.get('player_hand', [])
        player_hand.append(deck.pop())
        player_sum = sum_hand(player_hand)
        
        if player_sum > 21:
            new_balance = update_balance(user['user_id'], -bet)
            update_pool(bet)
            add_history(user['user_id'], 'blackjack', bet, -bet, 'loss')
            
            stats = get_stats(user['user_id'])
            stats['balance'] = new_balance
            
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'game_over': True,
                'win': False,
                'win_amount': -bet,
                'stats': stats,
                'balance': new_balance
            })
        
        return jsonify({
            'success': True,
            'player_hand': player_hand,
            'deck': deck,
            'game_over': False
        })
    
    elif action == 'stand':
        player_hand = data.get('player_hand', [])
        dealer_hand = data.get('dealer_hand', [])
        
        while sum_hand(dealer_hand) < 17:
            dealer_hand.append(deck.pop())
        
        player_sum = sum_hand(player_hand)
        dealer_sum = sum_hand(dealer_hand)
        
        pool = get_pool()
        
        if dealer_sum > 21 or player_sum > dealer_sum:
            win_amount = calculate_win(bet, 2)
            if pool < win_amount:
                win_amount = int(pool * 0.9)
            
            new_balance = update_balance(user['user_id'], win_amount)
            update_pool(-win_amount)
            add_history(user['user_id'], 'blackjack', bet, win_amount, 'win')
            
            stats = get_stats(user['user_id'])
            stats['balance'] = new_balance
            
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': True,
                'win_amount': win_amount,
                'stats': stats,
                'balance': new_balance
            })
        elif player_sum == dealer_sum:
            stats = get_stats(user['user_id'])
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': None,
                'win_amount': 0,
                'stats': stats,
                'balance': get_balance(user['user_id'])
            })
        else:
            new_balance = update_balance(user['user_id'], -bet)
            update_pool(bet)
            add_history(user['user_id'], 'blackjack', bet, -bet, 'loss')
            
            stats = get_stats(user['user_id'])
            stats['balance'] = new_balance
            
            return jsonify({
                'success': True,
                'player_hand': player_hand,
                'dealer_hand': dealer_hand,
                'game_over': True,
                'win': False,
                'win_amount': -bet,
                'stats': stats,
                'balance': new_balance
            })
    
    return jsonify({'success': False, 'error': 'Неверное действие'})

# ============================================================
# ===== ИГРА: AVIATOR =====
# ============================================================
@app.route('/api/game/crash', methods=['POST'])
@require_auth
def game_crash(user):
    data = request.json
    action = data.get('action', 'start')
    bet = int(data.get('bet', 0))
    
    if action == 'start':
        if bet <= 0:
            return jsonify({'success': False, 'error': 'Неверная ставка'})
        
        current_balance = get_balance(user['user_id'])
        if bet > current_balance:
            return jsonify({
                'success': False, 
                'error': f'Недостаточно средств. Баланс: {current_balance} ₽',
                'balance': current_balance
            })
        
        crash_point = round(random.uniform(1.3, 3.5), 2)
        
        if bet > 100:
            crash_point *= 0.85
        elif bet < 50:
            crash_point *= 1.15
        
        if user['balance'] > 50000:
            crash_point *= 0.9
        
        crash_point = max(1.3, min(3.5, crash_point))
        crash_point = round(crash_point, 2)
        
        return jsonify({
            'success': True,
            'crash_point': crash_point,
            'balance': current_balance
        })
    
    elif action == 'cashout':
        multiplier = float(data.get('multiplier', 1))
        win_amount = calculate_win(bet, multiplier)
        
        pool = get_pool()
        if pool < win_amount:
            win_amount = int(pool * 0.9)
        
        new_balance = update_balance(user['user_id'], win_amount)
        update_pool(-win_amount)
        add_history(user['user_id'], 'crash', bet, win_amount, 'win')
        
        stats = get_stats(user['user_id'])
        stats['balance'] = new_balance
        
        return jsonify({
            'success': True,
            'win_amount': win_amount,
            'stats': stats,
            'balance': new_balance
        })
    
    elif action == 'crash':
        new_balance = update_balance(user['user_id'], -bet)
        update_pool(bet)
        add_history(user['user_id'], 'crash', bet, -bet, 'loss')
        
        stats = get_stats(user['user_id'])
        stats['balance'] = new_balance
        
        return jsonify({
            'success': True,
            'stats': stats,
            'balance': new_balance
        })
    
    return jsonify({'success': False, 'error': 'Неверное действие'})

# ============================================================
# ===== ИГРА: КОСТИ =====
# ============================================================
@app.route('/api/game/dice', methods=['POST'])
@require_auth
def game_dice(user):
    data = request.json
    bet = int(data.get('bet', 0))
    bet_type = data.get('type', 'over')
    
    if bet <= 0:
        return jsonify({'success': False, 'error': 'Неверная ставка'})
    
    current_balance = get_balance(user['user_id'])
    if bet > current_balance:
        return jsonify({
            'success': False, 
            'error': f'Недостаточно средств. Баланс: {current_balance} ₽',
            'balance': current_balance
        })
    
    d1 = random.randint(1, 6)
    d2 = random.randint(1, 6)
    total = d1 + d2
    
    win = False
    win_amount = 0
    
    if bet_type == 'over' and total > 7:
        win = True
        win_amount = calculate_win(bet, 3)
    elif bet_type == 'under' and total < 7:
        win = True
        win_amount = calculate_win(bet, 3)
    elif bet_type == 'seven' and total == 7:
        win = True
        win_amount = calculate_win(bet, 5)
    
    pool = get_pool()
    
    if win:
        if pool < win_amount:
            win_amount = int(pool * 0.9)
        new_balance = update_balance(user['user_id'], win_amount)
        update_pool(-win_amount)
        add_history(user['user_id'], 'dice', bet, win_amount, 'win')
    else:
        new_balance = update_balance(user['user_id'], -bet)
        update_pool(bet)
        add_history(user['user_id'], 'dice', bet, -bet, 'loss')
    
    stats = get_stats(user['user_id'])
    stats['balance'] = new_balance
    
    return jsonify({
        'success': True,
        'd1': d1,
        'd2': d2,
        'total': total,
        'win': win,
        'win_amount': win_amount if win else -bet,
        'stats': stats,
        'balance': new_balance
    })

# ============================================================
# ===== ИГРА: МАЙНС =====
# ============================================================
@app.route('/api/game/mines', methods=['POST'])
@require_auth
def game_mines(user):
    data = request.json
    bet = int(data.get('bet', 0))
    action = data.get('action', 'start')
    cell = data.get('cell', 0)
    
    if bet <= 0:
        return jsonify({'success': False, 'error': 'Неверная ставка'})
    
    current_balance = get_balance(user['user_id'])
    if bet > current_balance:
        return jsonify({
            'success': False, 
            'error': f'Недостаточно средств. Баланс: {current_balance} ₽',
            'balance': current_balance
        })
    
    if action == 'start':
        mines = random.sample(range(25), 3)
        return jsonify({
            'success': True,
            'mines': mines
        })
    
    elif action == 'click':
        mines = data.get('mines', [])
        if cell in mines:
            new_balance = update_balance(user['user_id'], -bet)
            update_pool(bet)
            add_history(user['user_id'], 'mines', bet, -bet, 'loss')
            
            stats = get_stats(user['user_id'])
            stats['balance'] = new_balance
            
            return jsonify({
                'success': True,
                'hit': True,
                'win_amount': -bet,
                'stats': stats,
                'balance': new_balance
            })
        else:
            win_amount = calculate_win(bet, 1.5)
            pool = get_pool()
            if pool < win_amount:
                win_amount = int(pool * 0.9)
            
            new_balance = update_balance(user['user_id'], win_amount)
            update_pool(-win_amount)
            add_history(user['user_id'], 'mines', bet, win_amount, 'win')
            
            stats = get_stats(user['user_id'])
            stats['balance'] = new_balance
            
            return jsonify({
                'success': True,
                'hit': False,
                'win_amount': win_amount,
                'stats': stats,
                'balance': new_balance
            })
    
    return jsonify({'success': False, 'error': 'Неверное действие'})

# ============================================================
# ===== ЗАПУСК =====
# ============================================================
if __name__ == '__main__':
    print("=" * 50)
    print("🎰 RuWin Casino Server")
    print("=" * 50)
    print(f"📁 База: {DATABASE}")
    print(f"💰 Стартовый баланс: {START_BALANCE} ₽")
    print(f"🏦 Банк казино: {POOL_START} ₽")
    print(f"📊 House Edge: {HOUSE_EDGE * 100}%")
    print("=" * 50)
    print("🔐 Тестовый аккаунт: test / test")
    print("=" * 50)
    app.run(debug=True, host='0.0.0.0', port=5000)
