from flask import Flask, render_template, request, jsonify
import random
import secrets
import os

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)

# Добавляем отладочный маршрут для проверки
@app.route('/test')
def test():
    return "Сервер работает! Если вы это видите, проблема в index.html"

@app.route('/')
def index():
    print("Пытаюсь найти index.html")
    print("Путь к папке templates:", os.path.join(app.root_path, 'templates'))
    try:
        return render_template('index.html')
    except Exception as e:
        print("Ошибка при рендеринге:", str(e))
        return f"Ошибка: {str(e)}", 500

# ... Остальной код (класс RuWinCasino и API) остается таким же, как в прошлом сообщении
# Убедитесь, что он есть, если нет - добавьте его сюда.
# Для краткости я опустил его, но он должен быть полностью.

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
