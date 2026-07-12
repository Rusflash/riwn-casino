# app.py - ОБНОВЛЕННАЯ ВЕРСИЯ

from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import secrets
import sqlite3
from datetime import datetime
import hashlib
import re
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
CORS(app)

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
                  balance INTEGER DEFAULT 10000,
                  total_bets INTEGER DEFAULT 0,
                  wins INTEGER DEFAULT 0,
                  level INTEGER DEFAULT 1,
                  xp INTEGER DEFAULT 0,
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
                  updated_at TEXT)''')
    
    # Добавляем тестового пользователя
    c.execute("SELECT * FROM users WHERE username = 'test'")
    if not c.fetchone():
        c.execute('''INSERT INTO users (user_id, username, password, email, balance, created_at, last_login)
                     VALUES (?, ?, ?, ?, ?, ?, ?)''',
                  ('test_user', 'test', hashlib.sha256('test'.encode()).hexdigest(), 'test@test.com', 10000, datetime.now().isoformat(), datetime.now().isoformat()))
    
    conn.commit()
    conn.close()

init_db()

# ===== МАРШРУТЫ =====
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/init', methods=['POST'])
def init_game():
    try:
        # Создаем тестовую сессию
        session_id = 'test_session_' + secrets.token_hex(4)
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'stats': {
                'balance': 10000,
                'level': 1,
                'total_bets': 0,
                'wins': 0,
                'winrate': 0
            },
            'pool_balance': 1000000
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# ===== API ДЛЯ ИГР (ТЕСТОВЫЕ) =====
@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    try:
        data = request.get_json(force=True)
        amount = float(data.get('amount', 10))
        
        # Генерируем результат
        result = random.randint(0, 36)
        color = 'red' if result in [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36] else 'black' if result != 0 else 'green'
        
        # Простая логика выигрыша (50% шанс)
        win = random.choice([True, False])
        win_amount = int(amount * 2) if win else -int(amount)
        
        return jsonify({
            'success': True,
            'result': result,
            'color': color,
            'win': win,
            'win_amount': win_amount,
            'stats': {
                'balance': 10000 + win_amount,
                'level': 1,
                'total_bets': 1,
                'wins': 1 if win else 0,
                'winrate': 100 if win else 0
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    try:
        data = request.get_json(force=True)
        amount = float(data.get('amount', 10))
        
        symbols = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣', '🎰']
        reels = [random.choice(symbols) for _ in range(9)]
        
        win = random.choice([True, False])
        win_amount = int(amount * 3) if win else -int(amount)
        
        return jsonify({
            'success': True,
            'reels': reels,
            'win': win,
            'win_amount': win_amount,
            'stats': {
                'balance': 10000 + win_amount,
                'level': 1,
                'total_bets': 1,
                'wins': 1 if win else 0,
                'winrate': 100 if win else 0
            }
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# Другие игры (заглушки)
@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    return jsonify({
        'success': True,
        'player_hand': [10, 11],
        'dealer_hand': [7, '?'],
        'game_over': False,
        'deck': [2,3,4,5,6,7,8,9,10,10,10,10,11] * 4
    })

@app.route('/api/blackjack/hit', methods=['POST'])
def blackjack_hit():
    return jsonify({
        'success': True,
        'player_hand': [10, 11, 5],
        'game_over': False
    })

@app.route('/api/blackjack/stand', methods=['POST'])
def blackjack_stand():
    return jsonify({
        'success': True,
        'player_hand': [10, 11],
        'dealer_hand': [7, 10],
        'game_over': True,
        'win': True,
        'win_amount': 20,
        'stats': {
            'balance': 10020,
            'level': 1,
            'total_bets': 1,
            'wins': 1,
            'winrate': 100
        }
    })

@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    return jsonify({
        'success': True,
        'crash_point': 2.5,
        'amount': 10,
        'balance': 9990
    })

@app.route('/api/crash/cashout', methods=['POST'])
def crash_cashout():
    return jsonify({
        'success': True,
        'win_amount': 25,
        'stats': {
            'balance': 10025,
            'level': 1,
            'total_bets': 1,
            'wins': 1,
            'winrate': 100
        }
    })

@app.route('/api/crash/result', methods=['POST'])
def crash_result():
    return jsonify({
        'success': True,
        'stats': {
            'balance': 9990,
            'level': 1,
            'total_bets': 1,
            'wins': 0,
            'winrate': 0
        }
    })

# Добавляем random для тестов
import random

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
