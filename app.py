from flask import Flask, render_template, request, jsonify
import random

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/slots/spin', methods=['POST'])
def slots_spin():
    data = request.get_json(force=True)
    amount = float(data.get('amount', 10))
    win = random.choice([True, False])
    win_amount = amount * 2 if win else -amount
    return jsonify({
        'success': True,
        'win': win,
        'win_amount': win_amount,
        'stats': {'balance': 10000 + win_amount}
    })

@app.route('/api/roulette/spin', methods=['POST'])
def roulette_spin():
    data = request.get_json(force=True)
    amount = float(data.get('amount', 10))
    win = random.choice([True, False])
    win_amount = amount * 2 if win else -amount
    return jsonify({
        'success': True,
        'win': win,
        'win_amount': win_amount,
        'stats': {'balance': 10000 + win_amount}
    })

@app.route('/api/blackjack/start', methods=['POST'])
def blackjack_start():
    return jsonify({
        'success': True,
        'game_over': True,
        'win': True,
        'win_amount': 20,
        'stats': {'balance': 10020}
    })

@app.route('/api/crash/start', methods=['POST'])
def crash_start():
    return jsonify({
        'success': True,
        'crash_point': 2.5,
        'amount': 10
    })

@app.route('/api/crash/cashout', methods=['POST'])
def crash_cashout():
    return jsonify({
        'success': True,
        'win_amount': 25,
        'stats': {'balance': 10025}
    })

@app.route('/api/crash/result', methods=['POST'])
def crash_result():
    return jsonify({
        'success': True,
        'stats': {'balance': 9990}
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)
