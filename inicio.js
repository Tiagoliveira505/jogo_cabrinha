(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const speedRange = document.getElementById('speed');

  // Grid settings
  const CELL = 20; // pixels per cell
  const COLS = Math.floor(canvas.width / CELL);
  const ROWS = Math.floor(canvas.height / CELL);

  // Game state
  let snake = [];
  let dir = {x: 1, y: 0};
  let nextDir = {x: 1, y: 0};
  let food = null;
  let running = false;
  let tickInterval = null;
  let speed = parseInt(speedRange.value, 10); // ticks per second
  let score = 0;
  const BEST_KEY = 'cobrinha_best';

  // Initialize / Reset
  function resetState() {
    snake = [{ x: Math.floor(COLS/2), y: Math.floor(ROWS/2) }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    scoreEl.textContent = score;
    placeFood();
    loadBest();
    draw();
  }

  function loadBest() {
    const v = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    bestEl.textContent = isNaN(v) ? 0 : v;
  }

  function saveBest() {
    const prev = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    if (score > prev) localStorage.setItem(BEST_KEY, String(score));
    loadBest();
  }

  // Place food on empty cell
  function placeFood() {
    while (true) {
      const p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
      if (!snake.some(s => s.x === p.x && s.y === p.y)) { food = p; break; }
    }
  }

  // Drawing helper
  function drawCell(x, y, fill) {
    const px = x * CELL, py = y * CELL;
    ctx.fillStyle = fill;
    ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2);
  }

  // Render
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) { ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, canvas.height); ctx.stroke(); }
    for (let j = 0; j <= ROWS; j++) { ctx.beginPath(); ctx.moveTo(0, j * CELL); ctx.lineTo(canvas.width, j * CELL); ctx.stroke(); }

    // food
    if (food) drawCell(food.x, food.y, '#ff6b6b');

    // snake
    for (let i = 0; i < snake.length; i++) {
      const s = snake[i];
      drawCell(s.x, s.y, i === 0 ? '#4ade80' : '#9ee7b7');
    }
  }

  // Game tick
  function step() {
    dir = nextDir; // apply buffered direction
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    // wrap-around world (cabeça sai de um lado e aparece no outro)
    if (head.x < 0) head.x = COLS - 1;
    if (head.x >= COLS) head.x = 0;
    if (head.y < 0) head.y = ROWS - 1;
    if (head.y >= ROWS) head.y = 0;

    // collision with self?
    if (snake.some(s => s.x === head.x && s.y === head.y)) {
      // game over
      running = false;
      clearInterval(tickInterval);
      saveBest();
      setTimeout(() => alert('Fim de jogo! Placar: ' + score), 20);
      return;
    }

    snake.unshift(head);

    // ate food?
    if (food && head.x === food.x && head.y === food.y) {
      score += 1;
      scoreEl.textContent = score;
      placeFood();
      // optional: speed up a bit each time
      // adjustSpeed(Math.min(18, speed + 0.3));
    } else {
      snake.pop();
    }

    draw();
  }

  // Start / Pause
  function start() {
    if (running) return;
    running = true;
    if (snake.length === 0) resetState();
    const ms = Math.round(1000 / speed);
    tickInterval = setInterval(step, ms);
  }

  function pause() {
    if (!running) return;
    running = false;
    clearInterval(tickInterval);
  }

  function adjustSpeed(newSpeed) {
    speed = newSpeed;
    if (running) {
      clearInterval(tickInterval);
      tickInterval = setInterval(step, Math.round(1000 / speed));
    }
  }

  // Input: keyboard
  document.addEventListener('keydown', e => {
    const key = e.key;
    if (key === 'ArrowUp' || key === 'w') { if (dir.y !== 1) nextDir = { x: 0, y: -1 }; }
    if (key === 'ArrowDown' || key === 's') { if (dir.y !== -1) nextDir = { x: 0, y: 1 }; }
    if (key === 'ArrowLeft' || key === 'a') { if (dir.x !== 1) nextDir = { x: -1, y: 0 }; }
    if (key === 'ArrowRight' || key === 'd') { if (dir.x !== -1) nextDir = { x: 1, y: 0 }; }
    if (key === ' ') { e.preventDefault(); if (running) pause(); else start(); }
  });

  // Touch controls (swipe)
  let touchStart = null;
  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStart = { x: t.clientX, y: t.clientY };
  }, {passive: true});

  canvas.addEventListener('touchend', e => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20 && dir.x !== -1) nextDir = { x: 1, y: 0 };
      else if (dx < -20 && dir.x !== 1) nextDir = { x: -1, y: 0 };
    } else {
      if (dy > 20 && dir.y !== -1) nextDir = { x: 0, y: 1 };
      else if (dy < -20 && dir.y !== 1) nextDir = { x: 0, y: -1 };
    }
    touchStart = null;
  }, {passive: true});

  // UI events
  startBtn.addEventListener('click', () => start());
  pauseBtn.addEventListener('click', () => { if (running) pause(); else start(); });
  resetBtn.addEventListener('click', () => { pause(); resetState(); });
  speedRange.addEventListener('input', () => adjustSpeed(parseInt(speedRange.value, 10)));

  // initial
  resetState();
})();
