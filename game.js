'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle, delay = 0) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
    this.delay = delay;  // retardo de ráfaga: la bala espera quieta antes de partir
  }

  update(dt) {
    if (this.delay > 0) {
      this.delay -= dt;
      return;
    }
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

const SHOOTING_RADIUS = 24;       // radio de la estrella fugaz
const SHOOTING_SPEED  = 340;      // px/s
const SHOOTING_TTL    = 4;        // s de vida
const SHOOTING_POINTS = 150;      // puntos al destruirla

class Asteroid {
  constructor(x, y, size = 3, opts = {}) {
    this.x       = x;
    this.y       = y;
    this.size    = size;
    this.dead    = false;
    this.shooting = !!opts.shooting;

    if (this.shooting) {
      this.radius = SHOOTING_RADIUS;
      this.points = SHOOTING_POINTS;
      this.ttl    = SHOOTING_TTL + rand(-0.5, 0.5);
      const angle = Math.atan2(opts.ty - this.y, opts.tx - this.x);
      const speed = rand(SHOOTING_SPEED - 40, SHOOTING_SPEED + 40);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.rotSpeed = rand(-0.8, 0.8);
    } else {
      this.radius = RADII[size];
      this.points = POINTS[size];
      const angle = rand(0, Math.PI * 2);
      const speed = SPEEDS[size] + rand(-15, 15);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.rotSpeed = rand(-1.2, 1.2);
    }
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    if (this.shooting) {
      this.ttl -= dt;
      if (this.ttl <= 0) this.dead = true;
    }
  }

  split() {
    if (this.shooting) {
      const pieces = [];
      const n = randInt(1, 2);
      for (let i = 0; i < n; i++) pieces.push(new Asteroid(this.x, this.y, 1));
      return pieces;
    }
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    if (this.shooting) {
      if (this.ttl < 1 && Math.floor(this.ttl * 8) % 2 === 0) return;

      const spd = Math.hypot(this.vx, this.vy) || 1;
      const dx  = this.vx / spd;
      const dy  = this.vy / spd;
      for (let i = 0; i < 7; i++) {
        const f = 1 - i / 7;
        ctx.strokeStyle = `rgba(255, 150, 60, ${(f * 0.45).toFixed(2)})`;
        ctx.lineWidth = 1 + f * 2;
        ctx.beginPath();
        ctx.moveTo(this.x - dx * i * 7, this.y - dy * i * 7);
        ctx.lineTo(this.x - dx * (i + 1) * 7, this.y - dy * (i + 1) * 7);
        ctx.stroke();
      }
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = this.shooting ? '#ffb84d' : '#fff';
    ctx.lineWidth   = this.shooting ? 2 : 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins (apariencia de la nave) ─────────────────────────────────────────────
// Cada skin define el color de trazo, el color de llama y su silueta.
// El perfil se expresa en coordenadas locales con la nariz apuntando a +X.
const SKINS = [
  {
    nombre: 'CLÁSICA',
    color: '#ffffff',
    llama: 'rgba(255, 130, 0, 0.85)',
    escape: -8,
    perfil: [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
  },
  {
    nombre: 'CAZA',
    color: '#00ffcc',
    llama: 'rgba(255, 255, 255, 0.8)',
    escape: -9,
    perfil: [[22, 0], [-3, -6], [-17, -12], [-9, 0], [-17, 12], [-3, 6]],
  },
  {
    nombre: 'CUCHILLA',
    color: '#ff4d9e',
    llama: 'rgba(255, 170, 205, 0.85)',
    escape: -8,
    perfil: [[26, 0], [6, -3], [-12, -5], [-8, 0], [-12, 5], [6, 3]],
  },
  {
    nombre: 'TITÁN',
    color: '#ffc53d',
    llama: 'rgba(255, 120, 40, 0.85)',
    escape: -15,
    perfil: [[16, 0], [3, -11], [-15, -4], [-15, 4], [3, 11]],
  },
];

function trazarPerfil(perfil, escala) {
  ctx.beginPath();
  ctx.moveTo(perfil[0][0] * escala, perfil[0][1] * escala);
  for (let i = 1; i < perfil.length; i++)
    ctx.lineTo(perfil[i][0] * escala, perfil[i][1] * escala);
  ctx.closePath();
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.boostTime     = 0;
    this.tripleTime    = 0;
    this.shieldTime    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.boostTime     > 0) this.boostTime     -= dt;
    if (this.tripleTime    > 0) this.tripleTime    -= dt;
    if (this.shieldTime    > 0) this.shieldTime    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;
    const BOOST  = this.boostTime > 0 ? 2 : 1;  // power-up velocidad

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * BOOST * dt;
      this.vy += Math.sin(this.angle) * THRUST * BOOST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Triple shot: ráfaga de 3 disparos en línea recta
    if (this.tripleTime > 0) {
      const GAP = 0.06;  // s entre balas de la ráfaga
      return [
        new Bullet(ox, oy, this.angle, 0),
        new Bullet(ox, oy, this.angle, GAP),
        new Bullet(ox, oy, this.angle, GAP * 2),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    trazarPerfil(skin.perfil, 1);
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(skin.escape, -4);
      ctx.lineTo(skin.escape - rand(6, 14), 0);
      ctx.lineTo(skin.escape,  4);
      ctx.strokeStyle = skin.llama;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up (velocidad / escudo) ─────────────────────────────────────────────
const SHIELD_TIME = 5;  // s de duración del escudo

class PowerUp {
  constructor(x, y, kind = 'speed') {
    this.x = x;
    this.y = y;
    this.kind = kind;
    this.radius = 11;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 45);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.ttl  = 10;
    this.blinkFrom = 2.5;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    if (this.ttl < this.blinkFrom && Math.floor(this.ttl * 8) % 2 === 0) return;

    const isShield = this.kind === 'shield';
    const isTriple = this.kind === 'triple';
    const main = isShield ? '#8ecbff' : isTriple ? '#ff4de0' : '#00ffff';
    const ring = isShield
      ? 'rgba(142, 203, 255, 0.5)'
      : isTriple ? 'rgba(255, 77, 224, 0.5)' : 'rgba(0, 255, 255, 0.5)';

    const pulse = 1 + 0.15 * Math.sin(performance.now() / 200);
    ctx.save();
    ctx.translate(this.x, this.y);

    ctx.strokeStyle = ring;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = main;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    if (isTriple) {
      // Triple shot: tres balas en línea (ráfaga)
      ctx.lineWidth   = 1.5;
      for (let k = 0; k < 3; k++) {
        const bx = 2 - k * 5;
        const by = -2 + k * 5;
        ctx.beginPath();
        ctx.moveTo(bx - 2, by + 2);
        ctx.lineTo(bx + 2, by - 2);
        ctx.stroke();
        ctx.fillStyle = main;
        ctx.beginPath();
        ctx.arc(bx, by, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (this.kind === 'shield') {
      // Silueta de escudo
      ctx.lineWidth   = 2.5;
      ctx.beginPath();
      ctx.moveTo( 0, -6);
      ctx.lineTo( 5, -4);
      ctx.lineTo( 5,  2);
      ctx.lineTo( 0,  6);
      ctx.lineTo(-5,  2);
      ctx.lineTo(-5, -4);
      ctx.closePath();
      ctx.stroke();
    } else {
      // Chevrones de velocidad
      ctx.lineWidth   = 2.5;
      for (let i = -1; i <= 1; i++) {
        const y = i * 4;
        ctx.beginPath();
        ctx.moveTo(-3, y - 3);
        ctx.lineTo( 2, y);
        ctx.lineTo(-3, y + 3);
        ctx.stroke();
      }
    }

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;  // cuenta regresiva para la próxima estrella fugaz
let skinIndex = 0;  // skin activa (índice en SKINS)

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnPowerUp(x, y) {
  const kinds = ['speed', 'triple', 'shield'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  powerUps.push(new PowerUp(x, y, kind));
}

function spawnShootingStar() {
  const MARGIN = 40;
  let x, y;
  const edge = randInt(0, 3);
  if (edge === 0)      { x = rand(0, W);    y = -MARGIN; }
  else if (edge === 1) { x = rand(0, W);    y = H + MARGIN; }
  else if (edge === 2) { x = -MARGIN;       y = rand(0, H); }
  else                 { x = W + MARGIN;    y = rand(0, H); }
  asteroids.push(new Asteroid(x, y, 3, {
    shooting: true,
    tx: rand(0, W),
    ty: rand(0, H),
  }));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  starTimer = rand(5, 9);
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  starTimer = rand(5, 9);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  ship.boostTime  = 0;
  ship.tripleTime = 0;
  ship.shieldTime = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyQ')) skinIndex = (skinIndex + 1) % SKINS.length;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Estrella fugaz: intrusión periódica desde un borde
  starTimer -= dt;
  if (starTimer <= 0) {
    const active = asteroids.filter(a => a.shooting).length;
    if (active < 2) spawnShootingStar();
    starTimer = active < 2 ? rand(7, 12) : 2;
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerUps  = powerUps.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += a.points;
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.14 && powerUps.length < 3) spawnPowerUp(a.x, a.y);
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs power-up
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.kind === 'triple')         ship.tripleTime = 5;
      else if (p.kind === 'shield')    ship.shieldTime = SHIELD_TIME;
      else                             ship.boostTime  = 5;
      explode(ship.x, ship.y, 6);
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.shieldTime > 0) {
    // Con escudo activo el impacto destruye el asteroide, no a la nave
    const newAsteroids = [];
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        a.dead = true;
        score += a.points;
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.14 && powerUps.length < 3) spawnPowerUp(a.x, a.y);
        newAsteroids.push(...a.split());
      }
    }
    asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  } else if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  const skin = SKINS[skinIndex];
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = skin.color;
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  trazarPerfil(skin.perfil, 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawShieldRing() {
  if (ship.shieldTime <= 0) return;
  // Parpadeo cuando está por agotarse
  if (ship.shieldTime < 1 && Math.floor(ship.shieldTime * 8) % 2 === 0) return;

  const R = ship.radius + 9;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(performance.now() / 800);
  ctx.lineCap = 'round';

  // Anillo difuso de fondo
  ctx.strokeStyle = 'rgba(142, 203, 255, 0.3)';
  ctx.lineWidth   = 5;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, Math.PI * 2);
  ctx.stroke();

  // Segmentos brillantes girando
  ctx.strokeStyle = '#8ecbff';
  ctx.lineWidth   = 2;
  for (let k = 0; k < 3; k++) {
    const start = (k / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(0, 0, R, start, start + 0.9);
    ctx.stroke();
  }

  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);
  ctx.fillStyle = SKINS[skinIndex].color;
  ctx.fillText(`NAVE ${SKINS[skinIndex].nombre}   [Q]`, 14, 46);
  ctx.fillStyle = '#fff';

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Mensajes de power-ups activos
  const powerMsgs = [];
  if (ship.boostTime > 0)  powerMsgs.push(['VELOCIDAD', ship.boostTime.toFixed(1), '#00ffff']);
  if (ship.tripleTime > 0) powerMsgs.push(['TRIPLE',    ship.tripleTime.toFixed(1), '#ff4de0']);
  if (ship.shieldTime > 0) powerMsgs.push(['ESCUDO',    ship.shieldTime.toFixed(1), '#8ecbff']);
  powerMsgs.forEach((m, i) => {
    ctx.fillStyle = m[2];
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${m[0]} ${m[1]}s`, W / 2, 48 + i * 20);
  });

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerUps.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();
  drawShieldRing();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
