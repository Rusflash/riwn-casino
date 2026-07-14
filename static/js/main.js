<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🎰 RuWin Casino</title>
    <style>
        /* ============================================================
           ROOT ПЕРЕМЕННЫЕ
           ============================================================ */
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #0d0d1a;
            --bg-card: rgba(20, 20, 40, 0.85);
            --neon-cyan: #00f0ff;
            --neon-purple: #8b00ff;
            --neon-pink: #ff0080;
            --neon-gold: #ffd700;
            --neon-green: #00ff88;
            --neon-red: #ff0040;
            --text-primary: #ffffff;
            --text-secondary: #aabbcc;
        }

        /* ============================================================
           БАЗА
           ============================================================ */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            overflow-x: hidden;
            position: relative;
        }

        /* ============================================================
           ФОН - АНИМИРОВАННЫЙ (CSS, БЕЗ ЛАГОВ)
           ============================================================ */
        body::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            background: 
                radial-gradient(ellipse at 20% 50%, rgba(0,240,255,0.04) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 50%, rgba(139,0,255,0.04) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 20%, rgba(255,0,128,0.02) 0%, transparent 50%);
            animation: bgShift 20s ease-in-out infinite;
        }
        @keyframes bgShift {
            0%, 100% { transform: scale(1) rotate(0deg); }
            25% { transform: scale(1.05) rotate(1deg); }
            75% { transform: scale(0.95) rotate(-1deg); }
        }

        /* ПАРТИКЛЫ - ЧЕРЕЗ CSS (ОПТИМАЛЬНО) */
        .particles {
            position: fixed;
            inset: 0;
            z-index: 0;
            pointer-events: none;
            overflow: hidden;
        }
        .particle {
            position: absolute;
            width: 3px;
            height: 3px;
            background: rgba(0, 240, 255, 0.3);
            border-radius: 50%;
            animation: particleFloat linear infinite;
        }
        .particle:nth-child(1) { left: 10%; animation-duration: 15s; animation-delay: 0s; }
        .particle:nth-child(2) { left: 20%; animation-duration: 18s; animation-delay: 2s; width: 4px; height: 4px; }
        .particle:nth-child(3) { left: 30%; animation-duration: 12s; animation-delay: 4s; }
        .particle:nth-child(4) { left: 40%; animation-duration: 20s; animation-delay: 1s; width: 2px; height: 2px; }
        .particle:nth-child(5) { left: 50%; animation-duration: 16s; animation-delay: 3s; }
        .particle:nth-child(6) { left: 60%; animation-duration: 14s; animation-delay: 5s; width: 4px; height: 4px; }
        .particle:nth-child(7) { left: 70%; animation-duration: 22s; animation-delay: 0.5s; }
        .particle:nth-child(8) { left: 80%; animation-duration: 17s; animation-delay: 2.5s; width: 2px; height: 2px; }
        .particle:nth-child(9) { left: 90%; animation-duration: 19s; animation-delay: 4.5s; }
        .particle:nth-child(10) { left: 15%; animation-duration: 13s; animation-delay: 6s; width: 4px; height: 4px; }
        .particle:nth-child(11) { left: 45%; animation-duration: 21s; animation-delay: 1.5s; }
        .particle:nth-child(12) { left: 75%; animation-duration: 16s; animation-delay: 3.5s; width: 2px; height: 2px; }
        @keyframes particleFloat {
            0% { transform: translateY(100vh) scale(0); opacity: 0; }
            10% { opacity: 0.8; }
            90% { opacity: 0.8; }
            100% { transform: translateY(-10vh) scale(1); opacity: 0; }
        }

        /* ============================================================
           ЗАГРУЗКА
           ============================================================ */
        #loading {
            position: fixed;
            inset: 0;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
            transition: opacity 0.8s;
        }
        #loading.hidden {
            opacity: 0;
            pointer-events: none;
        }
        .loader-ring {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 3px solid transparent;
            border-top-color: var(--neon-cyan);
            animation: spin 0.8s linear infinite;
            position: relative;
        }
        .loader-ring::after {
            content: '🎰';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 28px;
            animation: pulse 1s ease-in-out infinite;
        }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.2); } }
        .loader-text {
            margin-top: 16px;
            font-size: 14px;
            color: var(--text-secondary);
            letter-spacing: 4px;
            animation: pulseText 1.5s ease-in-out infinite;
        }
        @keyframes pulseText { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

        /* ============================================================
           ХЕДЕР
           ============================================================ */
        .header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: rgba(10, 10, 15, 0.92);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(0, 240, 255, 0.08);
            padding: 8px 0;
        }
        .header::after {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            width: 100%;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), transparent);
            animation: headerGlow 3s ease-in-out infinite;
        }
        @keyframes headerGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
        
        .container { max-width: 1400px; margin: 0 auto; padding: 0 16px; }
        .header .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 8px;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 900;
            background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple), var(--neon-pink));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: logoPulse 2s ease-in-out infinite;
            cursor: pointer;
        }
        @keyframes logoPulse { 0%, 100% { filter: drop-shadow(0 0 20px rgba(0,240,255,0.2)); } 50% { filter: drop-shadow(0 0 40px rgba(0,240,255,0.4)); } }
        .logo small { font-size: 10px; -webkit-text-fill-color: var(--text-secondary); font-weight: 400; }

        .nav-menu {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
        }
        .nav-btn {
            padding: 6px 14px;
            background: transparent;
            border: none;
            color: var(--text-secondary);
            border-radius: 6px;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.3s;
            position: relative;
        }
        .nav-btn::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 2px;
            background: var(--neon-cyan);
            transition: width 0.3s;
        }
        .nav-btn:hover { color: var(--text-primary); background: rgba(0,240,255,0.05); }
        .nav-btn:hover::before { width: 60%; }
        .nav-btn.active { color: var(--neon-cyan); background: rgba(0,240,255,0.08); }
        .nav-btn.active::before { width: 60%; }
        .nav-btn .badge {
            position: absolute;
            top: -2px;
            right: -2px;
            background: var(--neon-red);
            color: #fff;
            font-size: 7px;
            padding: 1px 5px;
            border-radius: 8px;
            animation: livePulse 1s infinite;
        }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        .header-right {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }
        .balance-box {
            padding: 2px 14px;
            background: rgba(0,255,136,0.05);
            border: 1px solid rgba(0,255,136,0.1);
            border-radius: 8px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        .balance-box::before {
            content: '';
            position: absolute;
            inset: -50%;
            background: radial-gradient(circle, rgba(0,255,136,0.03), transparent 70%);
            animation: balanceShine 3s ease-in-out infinite;
        }
        @keyframes balanceShine { 0%, 100% { transform: translate(-10%, -10%); } 50% { transform: translate(10%, 10%); } }
        .balance-box .label { font-size: 8px; color: var(--text-secondary); text-transform: uppercase; position: relative; z-index: 1; }
        .balance-box .amount { 
            font-size: 18px; 
            font-weight: 800; 
            color: var(--neon-green); 
            position: relative; 
            z-index: 1;
            text-shadow: 0 0 20px rgba(0,255,136,0.1);
        }
        .balance-box .amount.bump {
            animation: balanceBump 0.4s ease;
        }
        @keyframes balanceBump {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); color: var(--neon-gold); }
            100% { transform: scale(1); }
        }
        .header-btn {
            padding: 4px 12px;
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 6px;
            color: var(--text-primary);
            cursor: pointer;
            transition: all 0.3s;
            font-size: 14px;
        }
        .header-btn:hover { border-color: var(--neon-cyan); transform: scale(1.05); }
        .header-btn.danger:hover { border-color: var(--neon-red); }

        /* ============================================================
           СТАТИСТИКА
           ============================================================ */
        .main { padding: 16px 0; position: relative; z-index: 1; }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 12px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: var(--bg-card);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.03);
            border-radius: 12px;
            padding: 14px;
            text-align: center;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        .stat-card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(0,240,255,0.02), rgba(139,0,255,0.02));
            opacity: 0;
            transition: opacity 0.3s;
        }
        .stat-card:hover { transform: translateY(-3px); border-color: rgba(0,240,255,0.1); }
        .stat-card:hover::before { opacity: 1; }
        .stat-card .icon { font-size: 22px; display: block; position: relative; z-index: 1; }
        .stat-card .label { font-size: 9px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px; position: relative; z-index: 1; }
        .stat-card .value { 
            font-size: 20px; 
            font-weight: 800; 
            position: relative; 
            z-index: 1;
            background: linear-gradient(135deg, var(--text-primary), var(--text-secondary));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-card.green .value { background: linear-gradient(135deg, var(--neon-green), #00cc66); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stat-card.gold .value { background: linear-gradient(135deg, var(--neon-gold), #ffaa00); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stat-card.cyan .value { background: linear-gradient(135deg, var(--neon-cyan), #0066ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stat-card.purple .value { background: linear-gradient(135deg, var(--neon-purple), #cc00ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .stat-card.pink .value { background: linear-gradient(135deg, var(--neon-pink), #ff0040); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

        /* ============================================================
           ИГРЫ - НЕОНОВЫЕ КАРТЫ С АНИМАЦИЕЙ
           ============================================================ */
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
            flex-wrap: wrap;
            gap: 8px;
        }
        .section-title { font-size: 20px; font-weight: 700; }
        .section-title .highlight { background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        
        .filter-group { display: flex; gap: 4px; flex-wrap: wrap; }
        .filter-btn {
            padding: 3px 14px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 6px;
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 11px;
            transition: all 0.3s;
        }
        .filter-btn:hover { border-color: var(--neon-cyan); color: var(--text-primary); }
        .filter-btn.active { border-color: var(--neon-cyan); color: var(--neon-cyan); background: rgba(0,240,255,0.05); }

        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 14px;
            margin-bottom: 20px;
        }
        .game-card {
            position: relative;
            background: var(--bg-card);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.03);
            border-radius: 14px;
            padding: 22px 14px 18px;
            text-align: center;
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            overflow: hidden;
        }
        .game-card::before {
            content: '';
            position: absolute;
            inset: -50%;
            background: radial-gradient(circle at 50% 50%, rgba(0,240,255,0.04), transparent 70%);
            opacity: 0;
            transition: opacity 0.5s;
        }
        .game-card:hover {
            transform: translateY(-8px) scale(1.02);
            border-color: var(--neon-cyan);
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .game-card:hover::before { opacity: 1; }
        .game-card::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, var(--neon-cyan), var(--neon-purple), transparent);
            transform: scaleX(0);
            transition: transform 0.4s;
        }
        .game-card:hover::after { transform: scaleX(1); }
        .game-card .icon {
            font-size: 40px;
            display: block;
            margin-bottom: 8px;
            filter: drop-shadow(0 0 20px rgba(0,240,255,0.05));
            transition: all 0.4s;
        }
        .game-card:hover .icon { transform: scale(1.1) rotate(-5deg); filter: drop-shadow(0 0 40px rgba(0,240,255,0.1)); }
        .game-card .name { font-size: 15px; font-weight: 600; }
        .game-card .desc { font-size: 11px; color: var(--text-secondary); }
        .game-card .badge {
            position: absolute;
            top: 8px;
            right: 8px;
            padding: 1px 10px;
            border-radius: 12px;
            font-size: 8px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .badge.hot { background: rgba(255,0,64,0.15); color: var(--neon-red); animation: hotPulse 1.5s infinite; }
        @keyframes hotPulse { 0%, 100% { box-shadow: 0 0 10px rgba(255,0,64,0.1); } 50% { box-shadow: 0 0 30px rgba(255,0,64,0.2); } }
        .badge.new { background: rgba(0,240,255,0.1); color: var(--neon-cyan); animation: newPulse 2s infinite; }
        @keyframes newPulse { 0%, 100% { box-shadow: 0 0 10px rgba(0,240,255,0.1); } 50% { box-shadow: 0 0 30px rgba(0,240,255,0.2); } }
        .badge.live { background: rgba(255,0,64,0.15); color: var(--neon-red); animation: livePulse 1s infinite; }
        @keyframes livePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

        /* ============================================================
           ИГРОВОЙ КОНТЕЙНЕР
           ============================================================ */
        .game-container { display: none; }
        .game-container.active { display: block; animation: fadeIn 0.4s ease; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        
        .game-wrapper {
            background: var(--bg-card);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 24px;
            border: 1px solid rgba(255,255,255,0.03);
            position: relative;
            overflow: hidden;
        }
        .game-wrapper::before {
            content: '';
            position: absolute;
            inset: -50%;
            background: radial-gradient(ellipse at 30% 50%, rgba(0,240,255,0.01), transparent 60%),
                        radial-gradient(ellipse at 70% 50%, rgba(139,0,255,0.01), transparent 60%);
            pointer-events: none;
        }
        .game-title {
            text-align: center;
            font-size: 28px;
            font-weight: 900;
            margin-bottom: 16px;
            background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple), var(--neon-pink));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            position: relative;
            z-index: 1;
        }
        .game-result {
            text-align: center;
            padding: 12px;
            border-radius: 10px;
            margin: 12px 0;
            font-size: 18px;
            font-weight: 700;
            position: relative;
            z-index: 1;
        }
        .game-result.info { background: rgba(0,240,255,0.03); color: var(--neon-cyan); border: 1px solid rgba(0,240,255,0.05); }
        .game-result.win { 
            background: rgba(0,255,136,0.03); 
            color: var(--neon-green); 
            border: 1px solid rgba(0,255,136,0.1);
            animation: winPulse 0.6s ease;
        }
        @keyframes winPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        .game-result.loss { background: rgba(255,0,64,0.03); color: var(--neon-red); border: 1px solid rgba(255,0,64,0.05); }
        
        .game-input {
            width: 100%;
            padding: 10px 14px;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 15px;
            transition: all 0.3s;
            position: relative;
            z-index: 1;
        }
        .game-input:focus { outline: none; border-color: var(--neon-cyan); box-shadow: 0 0 30px rgba(0,240,255,0.02); }
        
        .spin-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 17px;
            font-weight: 800;
            cursor: pointer;
            transition: all 0.3s;
            margin-top: 10px;
            position: relative;
            z-index: 1;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .spin-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 40px rgba(0,240,255,0.1); }
        .spin-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* ============================================================
           AVIATOR - РАКЕТА
           ============================================================ */
        .crash-wrapper {
            position: relative;
            background: rgba(0,0,0,0.3);
            border-radius: 12px;
            overflow: hidden;
            height: 320px;
            border: 1px solid rgba(255,255,255,0.03);
        }
        .crash-chart { position: relative; width: 100%; height: 100%; overflow: hidden; }
        .crash-chart canvas { position: absolute; bottom: 0; left: 0; width: 100%; height: 100%; }
        
        .rocket {
            position: absolute;
            bottom: 20%;
            left: 10%;
            font-size: 44px;
            z-index: 3;
            transition: all 0.05s;
            filter: drop-shadow(0 0 30px rgba(255,165,0,0.3));
            will-change: transform, left, bottom;
        }
        .rocket.flying { animation: rocketFly 0.1s linear infinite; }
        .rocket.explode { animation: rocketExplode 0.6s ease forwards; }
        @keyframes rocketFly {
            0% { transform: translateY(0) rotate(-45deg); }
            50% { transform: translateY(-4px) rotate(-45deg); }
            100% { transform: translateY(0) rotate(-45deg); }
        }
        @keyframes rocketExplode {
            0% { transform: scale(1) rotate(-45deg); opacity: 1; }
            30% { transform: scale(2) rotate(0deg); opacity: 0.8; }
            100% { transform: scale(0) rotate(360deg); opacity: 0; }
        }
        
        .rocket-trail {
            position: absolute;
            bottom: 15%;
            left: 10%;
            width: 4px;
            height: 50px;
            background: linear-gradient(to top, transparent, rgba(255,165,0,0.3), rgba(255,69,0,0.5));
            border-radius: 2px;
            z-index: 1;
            will-change: transform, left, bottom;
        }
        .rocket-trail.flying { animation: trailPulse 0.1s linear infinite; }
        @keyframes trailPulse { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(1.5); } }
        
        .crash-multiplier {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 64px;
            font-weight: 900;
            color: var(--neon-cyan);
            text-shadow: 0 0 60px rgba(0,240,255,0.2);
            z-index: 2;
            pointer-events: none;
            transition: all 0.1s;
            will-change: transform;
        }
        .crash-multiplier.bump {
            animation: multiBump 0.15s ease;
        }
        @keyframes multiBump { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.05); } }
        .crash-multiplier.crashed { color: var(--neon-red); text-shadow: 0 0 60px rgba(255,0,64,0.3); }
        
        .crash-controls { display: flex; gap: 8px; margin-top: 10px; position: relative; z-index: 1; }
        .crash-btn {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 10px;
            font-weight: 700;
            font-size: 15px;
            cursor: pointer;
            transition: all 0.3s;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .crash-btn.bet { background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)); color: white; }
        .crash-btn.bet:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,240,255,0.1); }
        .crash-btn.cashout { background: linear-gradient(135deg, var(--neon-green), #00cc66); color: #000; }
        .crash-btn.cashout:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,255,136,0.1); }
        .crash-btn:disabled { opacity: 0.3; cursor: not-allowed; }
        
        .crash-history {
            display: flex;
            gap: 4px;
            flex-wrap: wrap;
            margin-top: 10px;
            justify-content: center;
            position: relative;
            z-index: 1;
        }
        .crash-history-item {
            padding: 2px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            background: rgba(255,255,255,0.02);
            border: 1px solid rgba(255,255,255,0.03);
            animation: historyIn 0.3s ease;
        }
        @keyframes historyIn { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .crash-history-item.win { color: var(--neon-green); border-color: rgba(0,255,136,0.05); }
        .crash-history-item.loss { color: var(--neon-red); border-color: rgba(255,0,64,0.05); }

        /* ============================================================
           БОНУСЫ
           ============================================================ */
        .bonus-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-top: 16px;
        }
        .bonus-card {
            background: var(--bg-card);
            border-radius: 12px;
            padding: 16px;
            border: 1px solid rgba(255,215,0,0.08);
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        .bonus-card::before {
            content: '';
            position: absolute;
            inset: -50%;
            background: radial-gradient(circle at 50% 50%, rgba(255,215,0,0.02), transparent 70%);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .bonus-card:hover { transform: translateY(-3px); border-color: rgba(255,215,0,0.15); }
        .bonus-card:hover::before { opacity: 1; }
        .bonus-card .icon { font-size: 28px; display: block; }
        .bonus-card .name { font-weight: 700; font-size: 15px; }
        .bonus-card .desc { font-size: 12px; color: var(--text-secondary); }
        .bonus-card .claim-btn {
            margin-top: 8px;
            padding: 4px 20px;
            border: none;
            border-radius: 6px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
            font-size: 13px;
        }
        .bonus-card .claim-btn:hover { transform: scale(1.05); }
        .bonus-card.gold .claim-btn { background: var(--neon-gold); color: #000; }
        .bonus-card.cyan .claim-btn { background: var(--neon-cyan); color: #000; }
        .bonus-card.pink .claim-btn { background: var(--neon-red); color: #fff; }

        /* ============================================================
           МОДАЛКИ
           ============================================================ */
        .modal {
            position: fixed;
            inset: 0;
            background: rgba(0,0,0,0.85);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(15px);
        }
        .modal.active { display: flex; }
        .modal-content {
            background: var(--bg-secondary);
            border: 1px solid rgba(0,240,255,0.1);
            border-radius: 16px;
            padding: 28px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 30px 80px rgba(0,0,0,0.5);
            animation: modalIn 0.3s ease;
        }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(20px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        
        .modal-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            background: var(--bg-primary);
            border-radius: 10px;
            padding: 4px;
        }
        .modal-tab {
            flex: 1;
            padding: 10px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            border-radius: 8px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: all 0.3s;
        }
        .modal-tab.active { background: var(--bg-card); color: var(--text-primary); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .modal-form { display: flex; flex-direction: column; gap: 10px; }
        .modal-form h2 { text-align: center; font-size: 22px; }
        .modal-input {
            padding: 12px 16px;
            background: var(--bg-primary);
            border: 1px solid rgba(255,255,255,0.05);
            border-radius: 8px;
            color: var(--text-primary);
            font-size: 14px;
            transition: all 0.3s;
        }
        .modal-input:focus { outline: none; border-color: var(--neon-cyan); box-shadow: 0 0 30px rgba(0,240,255,0.02); }
        .modal-btn {
            padding: 12px;
            background: linear-gradient(135deg, var(--neon-cyan), var(--neon-purple));
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 16px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.3s;
        }
        .modal-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(0,240,255,0.1); }
        .modal-error { color: var(--neon-red); font-size: 14px; text-align: center; }
        .modal-success { color: var(--neon-green); font-size: 14px; text-align: center; }

        /* ============================================================
           УВЕДОМЛЕНИЯ
           ============================================================ */
        #notifications {
            position: fixed;
            top: 80px;
            right: 16px;
            z-index: 999;
            display: flex;
            flex-direction: column;
            gap: 6px;
            max-width: 340px;
        }
        .notification {
            padding: 12px 20px;
            border-radius: 10px;
            font-weight: 500;
            animation: notifIn 0.3s ease;
            cursor: pointer;
            box-shadow: 0 10px 40px rgba(0,0,0,0.4);
            backdrop-filter: blur(10px);
        }
        .notification.info { background: rgba(0,240,255,0.05); border-left: 3px solid var(--neon-cyan); color: var(--text-primary); }
        .notification.success { background: rgba(0,255,136,0.05); border-left: 3px solid var(--neon-green); color: var(--neon-green); }
        .notification.error { background: rgba(255,0,64,0.05); border-left: 3px solid var(--neon-red); color: var(--neon-red); }
        .notification.warning { background: rgba(255,215,0,0.05); border-left: 3px solid var(--neon-gold); color: var(--neon-gold); }
        @keyframes notifIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* ============================================================
           АДАПТИВ
           ============================================================ */
        @media (max-width: 768px) {
            .header .container { flex-wrap: wrap; }
            .nav-menu { order: 3; width: 100%; justify-content: center; }
            .nav-btn { font-size: 12px; padding: 4px 10px; }
            .games-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
            .stats-grid { grid-template-columns: repeat(2, 1fr); }
            .crash-wrapper { height: 220px; }
            .crash-multiplier { font-size: 40px; }
            .modal-content { padding: 20px; margin: 12px; }
            .game-title { font-size: 22px; }
            .rocket { font-size: 28px; }
            .balance-box .amount { font-size: 16px; }
        }
        @media (max-width: 480px) {
            .games-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
            .game-card { padding: 14px 10px; }
            .game-card .icon { font-size: 30px; }
            .stats-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
            .stat-card { padding: 10px; }
            .stat-card .value { font-size: 16px; }
            .logo { font-size: 18px; }
        }
    </style>
</head>
<body>

    <!-- ====== ЗАГРУЗКА ====== -->
    <div id="loading">
        <div class="loader-ring"></div>
        <div class="loader-text">ЗАГРУЗКА</div>
    </div>

    <!-- ====== ЧАСТИЦЫ ====== -->
    <div class="particles">
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
    </div>

    <!-- ====== ОСНОВНОЕ ПРИЛОЖЕНИЕ ====== -->
    <div id="app" style="display:none;">
        
        <!-- ХЕДЕР -->
        <header class="header">
            <div class="container">
                <div class="logo">🎰 RuWin <small>CASINO</small></div>
                <nav class="nav-menu">
                    <button class="nav-btn active" data-game="lobby">🏠 Главная</button>
                    <button class="nav-btn" data-game="slots">🎰 Слоты</button>
                    <button class="nav-btn" data-game="roulette">🎡 Рулетка</button>
                    <button class="nav-btn" data-game="blackjack">🃏 Блэкджек</button>
                    <button class="nav-btn" data-game="crash">✈️ Aviator <span class="badge">LIVE</span></button>
                    <button class="nav-btn" data-game="dice">🎲 Кости</button>
                    <button class="nav-btn" data-game="mines">💣 Майнс</button>
                </nav>
                <div class="header-right">
                    <div class="balance-box">
                        <div class="label">Баланс</div>
                        <div class="amount" id="balance">10 000 ₽</div>
                    </div>
                    <button class="header-btn" onclick="toggleProfile()">👤</button>
                    <button class="header-btn" onclick="handleLogout()" style="color:var(--neon-red);">🚪</button>
                </div>
            </div>
        </header>

        <!-- ОСНОВНОЙ КОНТЕНТ -->
        <main class="main">
            <div class="container">
                
                <!-- ЛОББИ -->
                <div id="lobby">
                    <!-- СТАТИСТИКА -->
                    <div class="stats-grid">
                        <div class="stat-card green">
                            <span class="icon">💰</span>
                            <div class="label">Баланс</div>
                            <div class="value" id="balanceDisplay">10 000 ₽</div>
                        </div>
                        <div class="stat-card cyan">
                            <span class="icon">🎯</span>
                            <div class="label">Ставок</div>
                            <div class="value" id="totalBetsStat">0</div>
                        </div>
                        <div class="stat-card gold">
                            <span class="icon">🏆</span>
                            <div class="label">Побед</div>
                            <div class="value" id="winsStat">0</div>
                        </div>
                        <div class="stat-card purple">
                            <span class="icon">📊</span>
                            <div class="label">Винрейт</div>
                            <div class="value" id="winrateStat">0%</div>
                        </div>
                    </div>

                    <!-- ИГРЫ -->
                    <div class="section-header">
                        <div class="section-title">🎮 <span class="highlight">Игры</span></div>
                        <div class="filter-group">
                            <button class="filter-btn active" onclick="filterGames('all')">Все</button>
                            <button class="filter-btn" onclick="filterGames('hot')">🔥 Hot</button>
                            <button class="filter-btn" onclick="filterGames('new')">⭐ Новые</button>
                        </div>
                    </div>

                    <div class="games-grid" id="gamesGrid">
                        <div class="game-card" data-game="slots" data-tag="hot">
                            <span class="badge hot">🔥 HOT</span>
                            <span class="icon">🎰</span>
                            <div class="name">Слоты</div>
                            <div class="desc">Крути барабаны!</div>
                        </div>
                        <div class="game-card" data-game="roulette" data-tag="new">
                            <span class="badge new">⭐ NEW</span>
                            <span class="icon">🎡</span>
                            <div class="name">Рулетка</div>
                            <div class="desc">Угадай число</div>
                        </div>
                        <div class="game-card" data-game="blackjack">
                            <span class="icon">🃏</span>
                            <div class="name">Блэкджек</div>
                            <div class="desc">21 очко</div>
                        </div>
                        <div class="game-card" data-game="crash" data-tag="hot">
                            <span class="badge live">🔴 LIVE</span>
                            <span class="icon">✈️</span>
                            <div class="name">Aviator</div>
                            <div class="desc">Лети выше!</div>
                        </div>
                        <div class="game-card" data-game="dice">
                            <span class="icon">🎲</span>
                            <div class="name">Кости</div>
                            <div class="desc">Брось кубики</div>
                        </div>
                        <div class="game-card" data-game="mines" data-tag="new">
                            <span class="badge new">⭐ NEW</span>
                            <span class="icon">💣</span>
                            <div class="name">Майнс</div>
                            <div class="desc">Найди алмазы</div>
                        </div>
                    </div>

                    <!-- БОНУСЫ -->
                    <div class="bonus-grid">
                        <div class="bonus-card gold">
                            <span class="icon">🎉</span>
                            <div class="name">Приветственный</div>
                            <div class="desc">+100% до 10 000 ₽</div>
                            <button class="claim-btn" onclick="claimBonus('welcome')">Забрать</button>
                        </div>
                        <div class="bonus-card cyan">
                            <span class="icon">🔄</span>
                            <div class="name">Кешбэк 10%</div>
                            <div class="desc">Возврат проигрышей</div>
                            <button class="claim-btn" onclick="claimBonus('cashback')">Активировать</button>
                        </div>
                        <div class="bonus-card pink">
                            <span class="icon">🔥</span>
                            <div class="name">Ежедневный</div>
                            <div class="desc">Фриспины каждый день</div>
                            <button class="claim-btn" onclick="claimBonus('daily')">Забрать</button>
                        </div>
                    </div>
                </div>

                <!-- КОНТЕЙНЕР ДЛЯ ИГР -->
                <div id="gameContainer" class="game-container"></div>

            </div>
        </main>

    </div>

    <!-- ====== МОДАЛКИ ====== -->
    <div id="authModal" class="modal">
        <div class="modal-content">
            <div class="modal-tabs">
                <button class="modal-tab active" onclick="switchAuthTab('login')">🔐 Вход</button>
                <button class="modal-tab" onclick="switchAuthTab('register')">📝 Регистрация</button>
            </div>
            <div id="loginForm" class="modal-form">
                <h2>Добро пожаловать!</h2>
                <input type="text" id="loginUsername" placeholder="Имя пользователя" class="modal-input">
                <input type="password" id="loginPassword" placeholder="Пароль" class="modal-input">
                <div id="loginError" class="modal-error"></div>
                <button onclick="handleLogin(event)" class="modal-btn">🚀 Войти</button>
            </div>
            <div id="registerForm" class="modal-form" style="display:none;">
                <h2>Создай аккаунт!</h2>
                <input type="text" id="regUsername" placeholder="Имя пользователя" class="modal-input">
                <input type="email" id="regEmail" placeholder="Email" class="modal-input">
                <input type="password" id="regPassword" placeholder="Пароль (6+)" class="modal-input">
                <div id="registerError" class="modal-error"></div>
                <div id="registerSuccess" class="modal-success"></div>
                <button onclick="handleRegister(event)" class="modal-btn">🎉 Зарегистрироваться</button>
            </div>
        </div>
    </div>

    <div id="profileModal" class="modal">
        <div class="modal-content" style="max-width:320px;">
            <div id="profileBody"></div>
        </div>
    </div>

    <div id="notifications"></div>

    <!-- ============================================================
    JAVASCRIPT - ОПТИМИЗИРОВАННЫЙ
    ============================================================ -->
    <script>
        // ===== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ =====
        let userId = null;
        let userBalance = 10000;
        let userLevel = 1;
        let sessionId = null;
        let streakCount = 0;

        // ===== ЗАГРУЗКА =====
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                document.getElementById('loading').classList.add('hidden');
                document.getElementById('app').style.display = 'block';
            }, 800);

            const savedId = localStorage.getItem('ruwin_user_id');
            if (savedId) {
                userId = savedId;
                sessionId = savedId;
                document.getElementById('authModal').classList.remove('active');
                initGame();
            } else {
                document.getElementById('authModal').classList.add('active');
            }

            setupNavigation();
            setupGameCards();
            
            setInterval(() => { if (sessionId) refreshBalance(); }, 10000);
        });

        // ===== ОСНОВНЫЕ ФУНКЦИИ =====
        async function refreshBalance() {
            try {
                const response = await fetch('/api/balance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: sessionId || 'test_001' })
                });
                const data = await response.json();
                if (data.success && data.balance !== undefined) {
                    userBalance = data.balance;
                    updateBalanceDisplay();
                }
            } catch (e) {}
        }

        async function initGame() {
            try {
                await refreshBalance();
                const response = await fetch('/api/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId || 'test_001' })
                });
                const data = await response.json();
                if (data.success) {
                    sessionId = data.stats?.user_id || 'test_001';
                    if (data.stats) {
                        userBalance = data.stats.balance || 10000;
                        updateUI(data.stats);
                    }
                }
            } catch (e) {}
        }

        function updateUI(stats) {
            if (!stats) return;
            if (stats.balance !== undefined) userBalance = stats.balance;
            userLevel = stats.level || 1;
            updateBalanceDisplay();
            document.getElementById('totalBetsStat').textContent = stats.total_bets || 0;
            document.getElementById('winsStat').textContent = stats.wins || 0;
            document.getElementById('winrateStat').textContent = (stats.winrate || 0) + '%';
        }

        function updateBalanceDisplay() {
            const el = document.querySelector('.balance-box .amount');
            if (el) {
                el.textContent = userBalance.toLocaleString() + ' ₽';
                el.classList.remove('bump');
                void el.offsetWidth;
                el.classList.add('bump');
            }
            document.querySelectorAll('#balanceDisplay, #balance').forEach(el => {
                if (el) el.textContent = userBalance.toLocaleString() + ' ₽';
            });
        }

        function checkBalance(amount) {
            if (amount > userBalance) {
                showNotification('❌ Недостаточно средств!', 'error');
                return false;
            }
            return true;
        }

        // ===== НАВИГАЦИЯ =====
        function setupNavigation() {
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    const game = this.dataset.game;
                    const lobby = document.getElementById('lobby');
                    const container = document.getElementById('gameContainer');
                    if (game === 'lobby') {
                        lobby.style.display = 'block';
                        container.classList.remove('active');
                        container.innerHTML = '';
                    } else {
                        lobby.style.display = 'none';
                        container.classList.add('active');
                        loadGame(game);
                    }
                });
            });
        }

        function setupGameCards() {
            document.querySelectorAll('.game-card').forEach(card => {
                card.addEventListener('click', function() {
                    const game = this.dataset.game;
                    const navBtn = document.querySelector('.nav-btn[data-game="' + game + '"]');
                    if (navBtn) navBtn.click();
                });
            });
        }

        function filterGames(tag) {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            document.querySelector(`.filter-btn[onclick="filterGames('${tag}')"]`)?.classList.add('active');
            document.querySelectorAll('.game-card').forEach(card => {
                card.style.display = (tag === 'all' || card.dataset.tag === tag) ? '' : 'none';
            });
        }

        // ===== БОНУСЫ =====
        function claimBonus(type) {
            const bonuses = {
                welcome: { amount: 1000, msg: '🎉 Приветственный бонус +1000 ₽!' },
                cashback: { amount: 500, msg: '🔄 Кешбэк +500 ₽!' },
                daily: { amount: 200, msg: '🔥 Ежедневный бонус +200 ₽!' }
            };
            const bonus = bonuses[type];
            if (!bonus) return;
            if (localStorage.getItem('bonus_' + type)) {
                showNotification('❌ Бонус уже получен!', 'error');
                return;
            }
            userBalance += bonus.amount;
            updateBalanceDisplay();
            localStorage.setItem('bonus_' + type, 'true');
            showNotification(bonus.msg, 'success');
        }

        // ===== ЗАГРУЗКА ИГР =====
        function loadGame(game) {
            const container = document.getElementById('gameContainer');
            switch(game) {
                case 'slots': loadSlots(container); break;
                case 'roulette': loadRoulette(container); break;
                case 'blackjack': loadBlackjack(container); break;
                case 'crash': loadCrash(container); break;
                case 'dice': loadDice(container); break;
                case 'mines': loadMines(container); break;
                default: container.innerHTML = `<div class="game-wrapper"><h2 class="game-title">🎮 ${game.toUpperCase()}</h2><div class="game-result info">В разработке...</div></div>`;
            }
        }

        // ===== AVIATOR =====
        let crashState = { multiplier:1, isActive:false, isBetPlaced:false, crashPoint:0, bet:0, interval:null, startTime:0, isCrashed:false };

        function loadCrash(container) {
            container.innerHTML = `
                <div class="game-wrapper">
                    <h2 class="game-title">✈️ AVIATOR</h2>
                    <div class="crash-wrapper">
                        <div class="crash-chart">
                            <canvas id="crashCanvas"></canvas>
                            <div class="rocket" id="rocket">🚀</div>
                            <div class="rocket-trail" id="rocketTrail"></div>
                            <div class="crash-multiplier" id="crashMultiplier">1.00x</div>
                        </div>
                    </div>
                    <div class="game-result info" id="crashResult">Сделайте ставку!</div>
                    <input type="number" id="crashBet" class="game-input" value="10" min="1">
                    <div class="crash-controls">
                        <button class="crash-btn bet" id="crashStart">🚀 СТАВКА</button>
                        <button class="crash-btn cashout" id="crashCashout" disabled>💰 ЗАБРАТЬ</button>
                    </div>
                    <div class="crash-history" id="crashHistory"></div>
                </div>
            `;
            document.getElementById('crashStart').addEventListener('click', crashStart);
            document.getElementById('crashCashout').addEventListener('click', crashCashout);
            resetCrash();
            
            const canvas = document.getElementById('crashCanvas');
            if (canvas) {
                canvas.width = canvas.parentElement.clientWidth;
                canvas.height = canvas.parentElement.clientHeight;
                const ctx = canvas.getContext('2d');
                ctx.strokeStyle = 'rgba(255,255,255,0.03)';
                ctx.lineWidth = 1;
                for (let i = 0; i < 8; i++) {
                    const y = (i / 8) * canvas.height;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.lineTo(canvas.width, y);
                    ctx.stroke();
                }
            }
        }

        async function crashStart() {
            if (crashState.isActive || crashState.isBetPlaced) return;
            await refreshBalance();
            const bet = parseInt(document.getElementById('crashBet').value);
            if (isNaN(bet) || bet <= 0 || !checkBalance(bet)) return;
            
            crashState.bet = bet;
            crashState.isBetPlaced = true;
            crashState.isActive = true;
            crashState.isCrashed = false;
            crashState.multiplier = 1;
            crashState.startTime = Date.now();
            
            document.getElementById('crashStart').disabled = true;
            document.getElementById('crashCashout').disabled = false;
            document.getElementById('crashResult').className = 'game-result info';
            document.getElementById('crashResult').textContent = '✈️ Взлетает...';
            document.getElementById('crashMultiplier').classList.remove('crashed');
            document.getElementById('crashMultiplier').textContent = '1.00x';
            
            const rocket = document.getElementById('rocket');
            const trail = document.getElementById('rocketTrail');
            rocket.classList.add('flying');
            trail.classList.add('flying');
            
            try {
                const response = await fetch('/api/game/crash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: sessionId || 'test_001', action: 'start', bet })
                });
                const data = await response.json();
                if (data.success) {
                    crashState.crashPoint = data.crash_point;
                    let lastMultiplier = 1;
                    crashState.interval = setInterval(() => {
                        if (crashState.isCrashed) return;
                        const elapsed = (Date.now() - crashState.startTime) / 1000;
                        const progress = Math.min(elapsed / 4, 1);
                        if (progress < 1) {
                            crashState.multiplier = 1 + (1 - Math.pow(1 - progress, 1.5)) * (crashState.crashPoint - 1);
                        } else {
                            crashState.multiplier = crashState.crashPoint;
                        }
                        const dm = Math.round(crashState.multiplier * 100) / 100;
                        const el = document.getElementById('crashMultiplier');
                        el.textContent = dm.toFixed(2) + 'x';
                        const x = 10 + Math.min(elapsed / 2.5, 1) * 75;
                        const y = 20 + (dm - 1) * 12;
                        rocket.style.left = Math.min(x, 85) + '%';
                        rocket.style.bottom = Math.min(y, 85) + '%';
                        trail.style.left = (Math.min(x, 85) - 2) + '%';
                        trail.style.bottom = (Math.min(y, 85) - 8) + '%';
                        if (dm > lastMultiplier + 0.05) {
                            el.classList.remove('bump');
                            void el.offsetWidth;
                            el.classList.add('bump');
                            lastMultiplier = dm;
                        }
                        if (crashState.multiplier >= crashState.crashPoint - 0.005) {
                            clearInterval(crashState.interval);
                            crashCrash();
                        }
                    }, 50);
                } else {
                    showNotification('❌ ' + data.error, 'error');
                    resetCrash();
                }
            } catch (e) { showNotification('❌ Ошибка!', 'error'); resetCrash(); }
        }

        async function crashCashout() {
            if (!crashState.isActive || !crashState.isBetPlaced || crashState.isCrashed) return;
            clearInterval(crashState.interval);
            crashState.isActive = false;
            document.getElementById('crashCashout').disabled = true;
            const cm = Math.round(crashState.multiplier * 100) / 100;
            try {
                const response = await fetch('/api/game/crash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: sessionId || 'test_001', action: 'cashout', bet: crashState.bet, multiplier: cm })
                });
                const data = await response.json();
                if (data.success) {
                    if (data.balance !== undefined) userBalance = data.balance;
                    updateBalanceDisplay();
                    document.getElementById('crashResult').className = 'game-result win';
                    document.getElementById('crashResult').textContent = '🎉 +' + data.win_amount + ' ₽ (' + cm.toFixed(2) + 'x)';
                    showNotification('🎉 +' + data.win_amount + ' ₽!', 'success');
                    addCrashHistory(cm, true);
                    resetCrash();
                }
            } catch (e) { resetCrash(); }
        }

        async function crashCrash() {
            if (crashState.isCrashed) return;
            crashState.isCrashed = true;
            crashState.isActive = false;
            document.getElementById('crashCashout').disabled = true;
            document.getElementById('crashMultiplier').classList.add('crashed');
            const rocket = document.getElementById('rocket');
            const trail = document.getElementById('rocketTrail');
            rocket.classList.remove('flying');
            trail.classList.remove('flying');
            rocket.classList.add('explode');
            const fm = Math.round(crashState.multiplier * 100) / 100;
            document.getElementById('crashResult').className = 'game-result loss';
            document.getElementById('crashResult').textContent = '💥 КРАШ! (' + fm.toFixed(2) + 'x)';
            try {
                const response = await fetch('/api/game/crash', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: sessionId || 'test_001', action: 'crash', bet: crashState.bet })
                });
                const data = await response.json();
                if (data.success) {
                    if (data.balance !== undefined) userBalance = data.balance;
                    updateBalanceDisplay();
                    showNotification('💥 Проигрыш ' + crashState.bet + ' ₽', 'error');
                    addCrashHistory(fm, false);
                }
            } catch (e) {}
            setTimeout(resetCrash, 800);
        }

        function resetCrash() {
            crashState.isActive = false;
            crashState.isBetPlaced = false;
            crashState.isCrashed = false;
            if (crashState.interval) { clearInterval(crashState.interval); crashState.interval = null; }
            document.getElementById('crashStart').disabled = false;
            document.getElementById('crashCashout').disabled = true;
            document.getElementById('crashMultiplier').classList.remove('crashed');
            document.getElementById('crashMultiplier').textContent = '1.00x';
            const rocket = document.getElementById('rocket');
            const trail = document.getElementById('rocketTrail');
            rocket.classList.remove('flying', 'explode');
            trail.classList.remove('flying');
            rocket.style.left = '10%';
            rocket.style.bottom = '20%';
            trail.style.left = '8%';
            trail.style.bottom = '10%';
        }

        function addCrashHistory(point, win) {
            const history = document.getElementById('crashHistory');
            const item = document.createElement('span');
            item.className = 'crash-history-item ' + (win ? 'win' : 'loss');
            item.textContent = point.toFixed(2) + 'x';
            history.prepend(item);
            if (history.children.length > 12) history.removeChild(history.lastChild);
        }

        // ===== ПРОСТЫЕ ИГРЫ =====
        function loadSlots(container) {
            container.innerHTML = `
                <div class="game-wrapper">
                    <h2 class="game-title">🎰 СЛОТЫ</h2>
                    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:250px;margin:0 auto 12px;" id="slotsGrid">
                        ${Array(9).fill().map(() => `<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:14px;text-align:center;font-size:28px;border:1px solid rgba(255,255,255,0.03);">🎰</div>`).join('')}
                    </div>
                    <div class="game-result info" id="slotsResult">Сделайте ставку!</div>
                    <input type="number" id="slotsBet" class="game-input" value="10" min="1">
                    <button class="spin-btn" id="slotsSpin">🎰 КРУТИТЬ</button>
                </div>
            `;
            document.getElementById('slotsSpin').addEventListener('click', function() {
                const bet = parseInt(document.getElementById('slotsBet').value);
                if (isNaN(bet) || bet <= 0 || !checkBalance(bet)) return;
                const symbols = ['🍒','🍋','🍊','🍇','💎','⭐','7️⃣','🎰'];
                const reels = Array(9).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);
                const cells = document.querySelectorAll('#slotsGrid div');
                cells.forEach((el, i) => el.textContent = reels[i]);
                const win = reels[0] === reels[1] && reels[1] === reels[2];
                const winAmount = win ? bet * 5 : 0;
                if (win) { userBalance += winAmount;
                    document.getElementById('slotsResult').className = 'game-result win';
                    document.getElementById('slotsResult').textContent = '🎉 +' + winAmount + ' ₽!';
                    showNotification('🎉 +' + winAmount + ' ₽!', 'success'); } 
                else { userBalance -= bet;
                    document.getElementById('slotsResult').className = 'game-result loss';
                    document.getElementById('slotsResult').textContent = '😞 -' + bet + ' ₽';
                    showNotification('😞 -' + bet + ' ₽', 'error'); }
                updateBalanceDisplay();
            });
        }

        function loadRoulette(container) {
            let selected = null;
            container.innerHTML = `
                <div class="game-wrapper">
                    <h2 class="game-title">🎡 РУЛЕТКА</h2>
                    <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:3px;margin:8px 0;" id="rouletteGrid">
                        ${[0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26].map(n => {
                            const c = n === 0 ? '#00cc44' : [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36].includes(n) ? '#ff0040' : '#fff';
                            return `<div style="background:rgba(255,255,255,0.02);padding:6px 2px;text-align:center;border-radius:4px;color:${c};font-weight:700;font-size:12px;cursor:pointer;border:1px solid rgba(255,255,255,0.03);" data-num="${n}">${n}</div>`;
                        }).join('')}
                    </div>
                    <div class="game-result info" id="rouletteResult">Выберите число!</div>
                    <input type="number" id="rouletteBet" class="game-input" value="10" min="1">
                    <button class="spin-btn" id="rouletteSpin">🎡 СПИН</button>
                </div>
            `;
            document.querySelectorAll('#rouletteGrid div').forEach(el => {
                el.addEventListener('click', function() {
                    document.querySelectorAll('#rouletteGrid div').forEach(d => d.style.borderColor = 'rgba(255,255,255,0.03)');
                    this.style.borderColor = 'var(--neon-gold)';
                    selected = parseInt(this.dataset.num);
                    showNotification('✅ Выбрано ' + selected, 'info');
                });
            });
            document.getElementById('rouletteSpin').addEventListener('click', function() {
                if (selected === null) { showNotification('❌ Выберите число!', 'error'); return; }
                const bet = parseInt(document.getElementById('rouletteBet').value);
                if (isNaN(bet) || bet <= 0 || !checkBalance(bet)) return;
                const result = Math.floor(Math.random() * 37);
                const win = result === selected;
                const winAmount = win ? bet * 35 : 0;
                if (win) { userBalance += winAmount;
                    document.getElementById('rouletteResult').className = 'game-result win';
                    document.getElementById('rouletteResult').textContent = '🎉 +' + winAmount + ' ₽! Выпало ' + result;
                    showNotification('🎉 +' + winAmount + ' ₽!', 'success'); } 
                else { userBalance -= bet;
                    document.getElementById('rouletteResult').className = 'game-result loss';
                    document.getElementById('rouletteResult').textContent = '😞 -' + bet + ' ₽. Выпало ' + result;
                    showNotification('😞 -' + bet + ' ₽', 'error'); }
                updateBalanceDisplay();
            });
        }

        function loadBlackjack(container) {
            container.innerHTML = `
                <div class="game-wrapper">
                    <h2 class="game-title">🃏 БЛЭКДЖЕК</h2>
                    <div style="background:rgba(0,0,0,0.2);border-radius:8px;padding:12px;margin:8px 0;">
                        <div style="font-size:14px;color:var(--text-secondary);">🤖 Дилер: <span id="bjDealer">? ?</span></div>
                        <div style="font-size:14px;color:var(--text-secondary);">👤 Вы: <span id="bjPlayer">? ?</span></div>
                    </div>
                    <div class="game-result info" id="bjResult">Сделайте ставку!</div>
                    <input type="number" id="bjBet" class="game-input" value="10" min="1">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                        <button class="spin-btn" id="bjStart" style="font-size:13px;">🃏 СТАРТ</button>
                        <button class="spin-btn" id="bjHit" style="font-size:13px;background:var(--neon-green);color:#000;" disabled>✋ ВЗЯТЬ</button>
                        <button class="spin-btn" id="bjStand" style="font-size:13px;background:var(--neon-gold);color:#000;" disabled>✋ СТОП</button>
                        <button class="spin-btn" id="bjReset" style="font-size:13px;background:var(--neon-red);">🔄 СБРОС</button>
                    </div>
                </div>
            `;
            let deck=[], pHand=[], dHand=[], over=true;
            function createDeck() {
                const suits=['♠','♥','♦','♣'], vals=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
                return suits.flatMap(s => vals.map(v => ({suit:s,value:v})));
            }
            function shuffle(a) { for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }
            function cv(c) { if(c.value==='A') return 11; if(['J','Q','K'].includes(c.value)) return 10; return parseInt(c.value); }
            function hs(h) { let s=h.reduce((a,c)=>a+cv(c),0); let a=h.filter(c=>c.value==='A').length; while(s>21&&a>0){s-=10;a--;} return s; }
            function cd(c) { return c.value+c.suit; }
            
            document.getElementById('bjStart').addEventListener('click', function() {
                const bet=parseInt(document.getElementById('bjBet').value);
                if(isNaN(bet)||bet<=0||!checkBalance(bet)) return;
                deck=shuffle(createDeck()); pHand=[deck.pop(),deck.pop()]; dHand=[deck.pop(),deck.pop()]; over=false;
                document.getElementById('bjPlayer').textContent=pHand.map(cd).join(' ');
                document.getElementById('bjDealer').textContent=cd(dHand[0])+' ?';
                document.getElementById('bjResult').className='game-result info';
                document.getElementById('bjResult').textContent='Игра началась!';
                document.getElementById('bjHit').disabled=false;
                document.getElementById('bjStand').disabled=false;
                document.getElementById('bjStart').disabled=true;
                if(hs(pHand)===21){ userBalance+=bet*1.5; document.getElementById('bjResult').className='game-result win';
                    document.getElementById('bjResult').textContent='🎉 БЛЭКДЖЕК! +'+(bet*1.5)+' ₽'; over=true; document.getElementById('bjHit').disabled=true; document.getElementById('bjStand').disabled=true; updateBalanceDisplay(); }
            });
            document.getElementById('bjHit').addEventListener('click', function() {
                if(over) return;
                pHand.push(deck.pop());
                document.getElementById('bjPlayer').textContent=pHand.map(cd).join(' ');
                if(hs(pHand)>21){ const bet=parseInt(document.getElementById('bjBet').value); userBalance-=bet;
                    document.getElementById('bjResult').className='game-result loss';
                    document.getElementById('bjResult').textContent='😞 ПЕРЕБОР! -'+bet+' ₽'; over=true; document.getElementById('bjHit').disabled=true; document.getElementById('bjStand').disabled=true; updateBalanceDisplay(); }
            });
            document.getElementById('bjStand').addEventListener('click', function() {
                if(over) return;
                while(hs(dHand)<17) dHand.push(deck.pop());
                document.getElementById('bjDealer').textContent=dHand.map(cd).join(' ');
                const bet=parseInt(document.getElementById('bjBet').value);
                const ps=hs(pHand), ds=hs(dHand);
                if(ds>21||ps>ds){ userBalance+=bet*2; document.getElementById('bjResult').className='game-result win';
                    document.getElementById('bjResult').textContent='🎉 +'+(bet*2)+' ₽!'; } 
                else if(ps===ds){ document.getElementById('bjResult').className='game-result info';
                    document.getElementById('bjResult').textContent='🤝 НИЧЬЯ'; } 
                else { userBalance-=bet; document.getElementById('bjResult').className='game-result loss';
                    document.getElementById('bjResult').textContent='😞 -'+bet+' ₽'; }
                over=true; document.getElementById('bjHit').disabled=true; document.getElementById('bjStand').disabled=true; updateBalanceDisplay();
            });
            document.getElementById('bjReset').addEventListener('click', function() {
                deck=[]; pHand=[]; dHand=[]; over=true;
                document.getElementById('bjPlayer').textContent='? ?';
                document.getElementById('bjDealer').textContent='? ?';
                document.getElementById('bjResult').className='game-result info';
                document.getElementById('bjResult').textContent='Сделайте ставку!';
                document.getElementById('bjHit').disabled=true;
                document.getElementById('bjStand').disabled=true;
                document.getElementById('bjStart').disabled=false;
            });
        }

        function loadDice(container) {
            let type = 'over';
            container.innerHTML = `
                <div class="game-wrapper">
                    <h2 class="game-title">🎲 КОСТИ</h2>
                    <div style="display:flex;justify-content:center;gap:20px;font-size:56px;margin:10px 0;">
                        <div id="d1">⚀</div><div id="d2">⚀</div>
                    </div>
                    <div class="game-result info" id="diceResult">Бросьте кости!</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin:6px 0;">
                        <button class="filter-btn active" onclick="window.diceType='over'">⬆ >7</button>
                        <button class="filter-btn" onclick="window.diceType='under'">⬇ <7</button>
                        <button class="filter-btn" onclick="window.diceType='seven'">🎯 =7</button>
                    </div>
                    <input type="number" id="diceBet" class="game-input" value="10" min="1">
                    <button class="spin-btn" id="diceBtn">🎲 БРОСИТЬ</button>
                </div>
            `;
            window.diceType = 'over';
            document.getElementById('diceBtn').addEventListener('click', function() {
                const bet = parseInt(document.getElementById('diceBet').value);
                if (isNaN(bet) || bet <= 0 || !checkBalance(bet)) return;
                const d1 = Math.floor(Math.random() * 6) + 1, d2 = Math.floor(Math.random() * 6) + 1, t = d1 + d2;
                const sym = ['⚀','⚁','⚂','⚃','⚄','⚅'];
                document.getElementById('d1').textContent = sym[d1 - 1];
                document.getElementById('d2').textContent = sym[d2 - 1];
                let win = false;
                if (window.diceType === 'over' && t > 7) win = true;
                else if (window.diceType === 'under' && t < 7) win = true;
                else if (window.diceType === 'seven' && t === 7) win = true;
                const wa = win ? bet * 3 : 0;
                if (win) { userBalance += wa;
                    document.getElementById('diceResult').className = 'game-result win';
                    document.getElementById('diceResult').textContent = '🎉 +' + wa + ' ₽ (' + t + ')';
                    showNotification('🎉 +' + wa + ' ₽!', 'success'); }
                else { userBalance -= bet;
                    document.getElementById('diceResult').className = 'game-result loss';
                    document.getElementById('diceResult').textContent = '😞 -' + bet + ' ₽ (' + t + ')';
                    showNotification('😞 -' + bet + ' ₽', 'error'); }
                updateBalanceDisplay();
            });
        }

        function loadMines(container) {
            let mines=[], revealed=[], active=false, bet=0;
            container.innerHTML = `
                <div class="game-wrapper">
                    <h2 class="game-title">💣 МАЙНС</h2>
                    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;max-width:250px;margin:0 auto 10px;" id="minesGrid">
                        ${Array(25).fill().map((_,i) => `<div style="background:rgba(0,0,0,0.3);border-radius:6px;padding:12px;text-align:center;font-size:18px;cursor:pointer;border:1px solid rgba(255,255,255,0.03);" data-idx="${i}">❓</div>`).join('')}
                    </div>
                    <div class="game-result info" id="minesResult">Сделайте ставку!</div>
                    <input type="number" id="minesBet" class="game-input" value="10" min="1">
                    <button class="spin-btn" id="minesStart">💣 СТАРТ</button>
                </div>
            `;
            window.minesClick = function(idx) {
                if (!active) { showNotification('❌ Нажми СТАРТ!', 'error'); return; }
                if (revealed.includes(idx)) return;
                revealed.push(idx);
                const cell = document.querySelector(`[data-idx="${idx}"]`);
                if (mines.includes(idx)) {
                    cell.textContent = '💣';
                    cell.style.background = 'rgba(255,0,64,0.2)';
                    cell.style.borderColor = 'var(--neon-red)';
                    active = false;
                    userBalance -= bet;
                    document.getElementById('minesResult').className = 'game-result loss';
                    document.getElementById('minesResult').textContent = '💥 МИНА! -' + bet + ' ₽';
                    showNotification('💥 МИНА! -' + bet + ' ₽', 'error');
                    updateBalanceDisplay();
                } else {
                    cell.textContent = '💎';
                    cell.style.background = 'rgba(0,255,136,0.1)';
                    cell.style.borderColor = 'var(--neon-green)';
                    const wa = bet * 1.5;
                    userBalance += wa;
                    document.getElementById('minesResult').className = 'game-result win';
                    document.getElementById('minesResult').textContent = '💎 АЛМАЗ! +' + wa + ' ₽';
                    showNotification('💎 АЛМАЗ! +' + wa + ' ₽', 'success');
                    updateBalanceDisplay();
                    active = false;
                }
            };
            document.getElementById('minesStart').addEventListener('click', function() {
                bet = parseInt(document.getElementById('minesBet').value);
                if (isNaN(bet) || bet <= 0 || !checkBalance(bet)) return;
                mines = [];
                while (mines.length < 3) { const r = Math.floor(Math.random() * 25); if (!mines.includes(r)) mines.push(r); }
                revealed = [];
                active = true;
                document.querySelectorAll('#minesGrid div').forEach(el => {
                    el.textContent = '❓';
                    el.style.background = 'rgba(0,0,0,0.3)';
                    el.style.borderColor = 'rgba(255,255,255,0.03)';
                });
                document.getElementById('minesResult').className = 'game-result info';
                document.getElementById('minesResult').textContent = '🔍 Ищи алмазы!';
                showNotification('🔍 Игра началась!', 'info');
            });
        }

        // ===== АВТОРИЗАЦИЯ =====
        function switchAuthTab(tab) {
            document.querySelectorAll('.modal-tab').forEach((t, i) => {
                t.classList.toggle('active', i === (tab === 'login' ? 0 : 1));
                document.querySelectorAll('.modal-form')[i].style.display = i === (tab === 'login' ? 0 : 1) ? 'flex' : 'none';
            });
        }

        async function handleLogin(e) {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;
            const err = document.getElementById('loginError');
            err.textContent = '⏳...';
            try {
                const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
                const d = await r.json();
                if (d.success) {
                    userId = d.user_id;
                    sessionId = d.user_id;
                    localStorage.setItem('ruwin_user_id', userId);
                    localStorage.setItem('ruwin_username', d.username);
                    document.getElementById('authModal').classList.remove('active');
                    document.getElementById('app').style.display = 'block';
                    if (d.stats) { userBalance = d.stats.balance || 10000;
                        updateUI(d.stats); }
                    showNotification('✅ Добро пожаловать!', 'success');
                    await refreshBalance();
                } else err.textContent = '❌ ' + d.error;
            } catch (e) { err.textContent = '❌ Ошибка'; }
            return false;
        }

        async function handleRegister(e) {
            e.preventDefault();
            const username = document.getElementById('regUsername').value.trim();
            const password = document.getElementById('regPassword').value;
            const email = document.getElementById('regEmail').value.trim();
            const err = document.getElementById('registerError');
            const suc = document.getElementById('registerSuccess');
            err.textContent = '';
            suc.textContent = '⏳...';
            try {
                const r = await fetch('/api/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password, email }) });
                const d = await r.json();
                if (d.success) {
                    suc.textContent = '✅ ' + d.message + ' Теперь войдите!';
                    document.getElementById('regUsername').value = '';
                    document.getElementById('regPassword').value = '';
                    document.getElementById('regEmail').value = '';
                    setTimeout(() => switchAuthTab('login'), 1500);
                } else { err.textContent = '❌ ' + d.error;
                    suc.textContent = ''; }
            } catch (e) { err.textContent = '❌ Ошибка';
                suc.textContent = ''; }
            return false;
        }

        function handleLogout() {
            userId = null;
            sessionId = null;
            localStorage.removeItem('ruwin_user_id');
            localStorage.removeItem('ruwin_username');
            document.getElementById('app').style.display = 'none';
            document.getElementById('authModal').classList.add('active');
            showNotification('👋 Вы вышли', 'info');
        }

        function toggleProfile() {
            const modal = document.getElementById('profileModal');
            const body = document.getElementById('profileBody');
            body.innerHTML = `
                <div style="text-align:center;">
                    <div style="font-size:40px;margin-bottom:6px;">👤</div>
                    <h3 style="margin-bottom:4px;">${localStorage.getItem('ruwin_username') || 'Игрок'}</h3>
                    <p style="color:var(--text-secondary);">💰 ${userBalance.toLocaleString()} ₽</p>
                    <p style="color:var(--text-secondary);">🏆 Уровень: ${userLevel}</p>
                    <button onclick="document.getElementById('profileModal').classList.remove('active')" style="margin-top:10px;padding:8px 24px;background:var(--bg-card);border:1px solid var(--neon-cyan);border-radius:8px;color:var(--text-primary);cursor:pointer;">Закрыть</button>
                </div>
            `;
            modal.classList.add('active');
        }

        // ===== УВЕДОМЛЕНИЯ =====
        function showNotification(message, type = 'info', duration = 3000) {
            const container = document.getElementById('notifications');
            if (!container) return;
            const n = document.createElement('div');
            n.className = 'notification ' + type;
            n.textContent = message;
            container.appendChild(n);
            setTimeout(() => { n.style.opacity = '0';
                n.style.transform = 'translateX(100%)';
                setTimeout(() => n.remove(), 300); }, duration);
            n.addEventListener('click', () => n.remove());
        }

        // ===== ЗАКРЫТИЕ МОДАЛОК =====
        document.querySelectorAll('.modal').forEach(m => {
            m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('active'); });
        });

        // ===== ЭКСПОРТЫ =====
        window.filterGames = filterGames;
        window.toggleProfile = toggleProfile;
        window.handleLogout = handleLogout;
        window.handleLogin = handleLogin;
        window.handleRegister = handleRegister;
        window.switchAuthTab = switchAuthTab;
        window.refreshBalance = refreshBalance;
        window.claimBonus = claimBonus;
        window.diceType = window.diceType;
        window.minesClick = window.minesClick;

        console.log('🎰 RuWin Casino загружен!');
        console.log('💰 Баланс:', userBalance);
    </script>
</body>
</html>
