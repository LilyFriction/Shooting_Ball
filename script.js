/*
 환경 설정 및 캔버스 초기화
 */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.width = 1500;
canvas.height = 900;

/*
 게임 객체 최상위 클래스
 */
class GameObject {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = 0;           // x축 속도
    this.vy = 0;           // y축 속도
    this.accel = 0.5;      // 가속도 힘
    this.friction = 0.92;  // 마찰력 (1에 가까울수록 미끄러짐)
    this.maxSpeed = 6;     // 최대 이동 속도
    this.color = color;
    this.radius = 15;      // 충돌 판정용 반지름
    this.dir = { x: 0, y: -1 }; // 방향
  }


  // 물리 시뮬레이션 업데이트
  update(canvasWidth, canvasHeight) {
    // 마찰력 적용 (매 프레임 속도 점진적 감소)
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 미세 움직임 멈추기 (정지 상태에서 떨림 방지)
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;

    // 위치 업데이트
    this.x += this.vx;
    this.y += this.vy;

    // 화면 경계 체크 및 반사 (벽 튕기기 효과)
    this.checkBoundary(canvasWidth, canvasHeight);
  }

  checkBoundary(width, height) {
    // 좌우 벽 충돌
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx *= -0.5;
    } else if (this.x > width - this.radius) {
      this.x = width - this.radius;
      this.vx *= -0.5;
    }

    // 상하 벽 충돌
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy *= -0.5;
    } else if (this.y > height - this.radius) {
      this.y = height - this.radius;
      this.vy *= -0.5;
    }
  }

  // 화면에 그리기
  draw(ctx) {
   let c = this.color;
   
   if (this.hitTimer > 0) {
    c = invertColor(this.color);
   }
   
   ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
   ctx.beginPath();
   ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
   ctx.fill();
   ctx.closePath();
  }
}

// 물체 간 충돌
function isColliding(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  
  return Math.hypot(dx, dy) < a.radius + b.radius;
}

// UI 그리기
function drawUI() {
  ctx.fillStyle = 'black';
  ctx.fillText(`P1 HP: ${p1.hp}`, 20, 30);
  ctx.fillText(`P2 HP: ${p2.hp}`, 20, 60);
}

// 색상 반전
function invertColor(c) {
 return {
  r: 255 - c.r,
  g: 255 - c.g,
  b: 255 - c.b
 };
}

/*
 플레이어 클래스 (GameObject 상속)
 */
class Player extends GameObject {
  constructor(x, y, color, controls) {
    super(x, y, color);
    this.controls = controls; // 조작키 설정 { up, down, left, right, shoot }
    this.hp = 5; // 체력
    this.cooldown = 0; // 쿨타임
    this.hitTimer = 0; // 피격
  }

  handleInput(keys) {
    // 방향키 입력에 따른 가속, 방향 설정
    let dx = 0;
    let dy = 0;
    if (keys[this.controls.up])    { this.vy -= this.accel; dy -= 1;}
    if (keys[this.controls.down])  { this.vy += this.accel; dy += 1;}
    if (keys[this.controls.left])  { this.vx -= this.accel; dx -= 1;}
    if (keys[this.controls.right]) { this.vx += this.accel; dx += 1;}

    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.dir = { x: dx / len, y: dy / len };
    }
    

    // 최대 속도 제한
    this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
    this.vy = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vy));
  }

  shoot(bullets) {
    if (this.cooldown > 0) return;
    this.cooldown = 10; // 프레임 기준
    const speed = 24;
    bullets.push(
      new Bullet(this.x, this.y,
      this.dir.x * speed,
      this.dir.y * speed,
      this.color,
      this
      )
    );
  }

  update(canvasWidth, canvasHeight) {
    super.update(canvasWidth, canvasHeight);
    if (this.cooldown > 0) this.cooldown--;
    if (this.hitTimer > 0) this.hitTimer--;
  }
}

/*
 불렛 클래스 (GameObject 상속)
 */

class Bullet extends GameObject {
  constructor(x, y, vx, vy, color, owner) {
    super(x, y, color);
    this.vx = vx;
    this.vy = vy;
    this.radius = 5;
    this.life = 100; // 수명 (프레임 기준)
    this.friction = 0.985
    this.owner = owner;
  }

  update(canvasWidth, canvasHeight) {
    super.update(canvasWidth, canvasHeight);
    this.life--;
  }
  
  isAlive() {
    return this.life > 0;
  }
}

/*
 인스턴스 생성 및 상태 관리
 */
const p1 = new Player(100, 300, { r: 0, g: 0, b: 255 }, { 
  up: 'w', down: 's', left: 'a', right: 'd', shoot: 'f'
});

const p2 = new Player(1400, 600, { r: 255, g: 0, b: 0 }, { 
  up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: '9' 
});

const keys = {}; // 눌린 키 상태 저장 객체
const bullets = [];

/*
 메인 게임 루프
 */
function gameLoop() {
  // 1) 화면 초기화
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 2) 플레이어 업데이트 (입력 -> 물리)
  p1.handleInput(keys);
  p1.update(canvas.width, canvas.height);

  p2.handleInput(keys);
  p2.update(canvas.width, canvas.height);

  // 3) 총알 업데이트
  bullets.forEach(b => b.update(canvas.width, canvas.height));

  // 총알 발사
  if (keys[p1.controls.shoot]) {
    p1.shoot(bullets);
  }
  
  if (keys[p2.controls.shoot]) {
    p2.shoot(bullets);
  }
 
  // 💥 충돌 체크
  for (let i = bullets.length - 1; i >= 0; i--) {
  const b = bullets[i];

  for (const player of [p1, p2]) {
    if (b.owner === player) continue;

    if (isColliding(b, player)) {
      player.hp--;

      //넉백
      player.vx += b.vx * 0.2;
      player.vy += b.vy * 0.2;

      
      //충돌시 히트타이머
      player.hitTimer = 10;
      
      bullets.splice(i, 1);
      break;
    }
  }
    
}
  
  // 죽은 총알 제거
  for (let i = bullets.length - 1; i >= 0; i--) {
    if (!bullets[i].isAlive()) {
      bullets.splice(i, 1);
    }
  }

  // 4) 렌더링
  p1.draw(ctx);
  p2.draw(ctx);

  bullets.forEach(b => b.draw(ctx));

  drawUI();
  // 5) 게임오버
  if (p1.hp <= 0 || p2.hp <= 0) {
    ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2);
    return;
  }
  
  // 다음 프레임 예약
  requestAnimationFrame(gameLoop);

  
}

/*
 이벤트 리스너 등록
 */
window.addEventListener('keydown', e => {keys[e.key.toLowerCase()] = true;});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

// 게임 시작
gameLoop();
