/* =========================================================================
   [전역 변수 및 캔버스 초기화]
   게임 상태 관리 및 화면(Canvas) 설정 담당
========================================================================= */

// 게임 상태
const GAME_STATE = {
  START: 'START',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};
let currentState = GAME_STATE.START;
let winner = null;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
  
// 플레이어 속도 등 기본값
const SETTINGS = {
  PLAYER_SPEED: 3,
  PLAYER_ACCEL: 0.5,
  PLAYER_FRICTION: 0.92,
  BULLET_SPEED: 12,
  SHOOT_COOLDOWN: 50,
  MAX_HP: 5
};

// 화면 해상도 설정
canvas.width = 1500;
canvas.height = 900;

/* =========================================================================
   [화면 렌더링 함수 모음]
   시작 화면, 게임 오버 화면, 인게임 UI 등 화면에 텍스트를 그리는 함수
========================================================================= */

// 시작 화면(타이틀) 그리기
function drawStartScreen() {
  const blink = Math.floor(Date.now() / 500) % 2;

  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";

  // 깜빡이는 안내 문구
  if (blink) {
    ctx.font = "60px Arial";
    ctx.fillText("Press Any Key", canvas.width / 2, canvas.height / 2);
  }

  ctx.font = "20px Arial";
  ctx.fillText("2 Player Shooting Game", canvas.width / 2, canvas.height / 2 + 50);
}

// 게임 오버 화면 그리기
function drawGameOver() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "white";
  ctx.font = "60px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${winner} WIN!`, canvas.width / 2, canvas.height / 2);

  ctx.font = "25px Arial";
  ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
}

// 게임 내 UI (조작법 등) 그리기
function drawUI() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // 반투명한 검정색
  ctx.font = "bold 18px Arial";
  
  // P1 조작법 (좌측 상단)
  ctx.textAlign = "left";
  ctx.fillText("P1 (Blue)", 20, 30);
  ctx.font = "14px Arial";
  ctx.fillText("Move: W, A, S, D", 20, 55);
  ctx.fillText("Shoot: F", 20, 75);

  // P2 조작법 (우측 상단)
  ctx.textAlign = "right";
  ctx.font = "bold 18px Arial";
  ctx.fillText("P2 (Red)", canvas.width - 20, 30);
  ctx.font = "14px Arial";
  ctx.fillText("Move: Arrow Keys", canvas.width - 20, 55);
  ctx.fillText("Shoot: Num 9", canvas.width - 20, 75);
}

// 게임 상태 및 플레이어 위치 초기화 (재시작 시 호출)
function resetGame() {
  p1.x = 100;
  p1.y = 300;
  p1.vx = 0;
  p1.vy = 0;
  p1.hp = 5;

  p2.x = 1400;
  p2.y = 600;
  p2.vx = 0;
  p2.vy = 0;
  p2.hp = 5;

  bullets.length = 0;
  currentState = GAME_STATE.START;
  winner = null;
}

/* =========================================================================
   [유틸리티 함수 모음]
   수학적 계산이나 색상 처리 등 공통으로 사용되는 기능
========================================================================= */

// 원형 객체 간의 충돌 판정 (두 점 사이의 거리가 두 반지름의 합보다 작으면 충돌)
function isColliding(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) < (a.radius + b.radius);
}

// 피격 시 깜빡임 효과를 위한 색상 반전 처리
function invertColor(c) {
  return {
    r: 255 - c.r,
    g: 255 - c.g,
    b: 255 - c.b
  };
}

/* =========================================================================
   [클래스: GameObject]
   게임 내 모든 물리적 객체의 최상위 부모 클래스
   좌표, 속도, 가속도, 마찰력 등 공통 물리 로직을 정의
========================================================================= */
class GameObject {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.vx = 0;          // x축 속도
    this.vy = 0;          // y축 속도
    this.accel = SETTINGS.PLAYER_ACCEL;     // 가속도 (이동할 때 더해지는 힘)
    this.friction = SETTINGS.PLAYER_FRICTION; // 마찰력 (미끄러짐 제어)
    this.maxSpeed = SETTINGS.PLAYER_SPEED;    // 최대 속도 제한
    this.color = color;
    this.radius = 15;     // 충돌 판정용 반지름 (크기)
    this.dir = { x: 0, y: -1 }; // 객체가 바라보는 기본 방향
  }

  // 매 프레임 호출되는 물리 연산 업데이트
  update(canvasWidth, canvasHeight) {
    // 1. 마찰력 적용 (속도를 서서히 줄임)
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 2. 아주 미세한 움직임은 0으로 강제 변환하여 완전 정지 처리
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;

    // 3. 현재 속도를 위치에 반영
    this.x += this.vx;
    this.y += this.vy;

    // 4. 캔버스 화면 밖으로 나가지 못하게 경계 체크
    this.checkBoundary(canvasWidth, canvasHeight);
  }

  // 화면 경계 충돌 처리 (벽에 부딪히면 튕겨 나옴)
  checkBoundary(width, height) {
    // X축 경계
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx *= -1; // 반대 방향으로 튕기기
    } else if (this.x > width - this.radius) {
      this.x = width - this.radius;
      this.vx *= -1;
    }

    // Y축 경계
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy *= -1;
    } else if (this.y > height - this.radius) {
      this.y = height - this.radius;
      this.vy *= -1;
    }
  }

  // 화면에 객체를 그리는 기본 로직 (원형)
  draw(ctx) {
    let c = this.color;

    // 피격 당했을 때 색상 반전 효과
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

/* =========================================================================
   [클래스: Player]
   GameObject를 상속받는 플레이어 클래스
   키보드 입력 처리, 총알 발사, 체력(HP) 시각화 기능을 포함
========================================================================= */
class Player extends GameObject {
  constructor(x, y, color, controls) {
    super(x, y, color);
    this.controls = controls; // 할당된 키보드 조작키 객체
    this.hp = SETTINGS.MAX_HP;
    this.cooldown = 0;        // 총알 발사 쿨타임
    this.hitTimer = 0;        // 피격 시 무적/깜빡임 지속 시간
  }

  // 키보드 입력에 따른 가속도 및 방향 업데이트
  handleInput(keys) {
    let dx = 0;
    let dy = 0;

    // 이동 키 입력 시 속도(vx, vy)와 방향(dx, dy) 변경
    if (keys[this.controls.up]) { this.vy -= this.accel; dy -= 1; }
    if (keys[this.controls.down]) { this.vy += this.accel; dy += 1; }
    if (keys[this.controls.left]) { this.vx -= this.accel; dx -= 1; }
    if (keys[this.controls.right]) { this.vx += this.accel; dx += 1; }

    // 이동 방향 벡터 정규화 (대각선 이동 시에도 일정한 속도/방향 유지)
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.dir = { x: dx / len, y: dy / len };
    }

    // 최대 속도 제한 적용
    this.vx = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vx));
    this.vy = Math.max(-this.maxSpeed, Math.min(this.maxSpeed, this.vy));
  }

  // 총알 생성 및 배열에 추가
  shoot(bullets) {
    if (this.cooldown > 0) return; // 쿨타임 중이면 발사 불가
    
    this.cooldown = SETTINGS.SHOOT_COOLDOWN; // 발사 후 쿨타임 초기화
    const speed = SETTINGS.BULLET_SPEED;   // 총알 속도
    
    bullets.push(
      new Bullet(
        this.x, this.y, 
        this.dir.x * speed, 
        this.dir.y * speed, 
        this.color, 
        this // 총알의 주인을 자신(this)으로 설정
      )
    );
  }
  
  // 플레이어 상태 업데이트
  update(canvasWidth, canvasHeight) {
    super.update(canvasWidth, canvasHeight); // 부모 클래스의 물리 로직 실행
    
    // 타이머 감소
    if (this.cooldown > 0) this.cooldown--;
    if (this.hitTimer > 0) this.hitTimer--;
  }
  
  // 플레이어 본체와 머리 위 체력바 그리기
  draw(ctx) {
    // 1. 부모 클래스의 원형 그리기 로직 호출
    super.draw(ctx);

    // 2. 머리 위 체력바 UI 설정
    const barWidth = 10;
    const barHeight = 6;
    const spacing = 3;
    const totalBarWidth = (barWidth * 5) + (spacing * 4);
    
    let startX = this.x - (totalBarWidth / 2);
    let startY = this.y - this.radius - 20;

    // 체력바 렌더링 (5칸 고정)
    for (let i = 0; i < 5; i++) {
      if (i < this.hp) {
        // 남은 체력: 칠해진 사각형
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.fillRect(startX + i * (barWidth + spacing), startY, barWidth, barHeight);
      } else {
        // 잃은 체력: 속이 빈 사각형 테두리
        ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
        ctx.strokeRect(startX + i * (barWidth + spacing), startY, barWidth, barHeight);
      }
    }
  }
}

/* =========================================================================
   [클래스: Bullet]
   GameObject를 상속받는 투사체(총알) 클래스입니다.
========================================================================= */
class Bullet extends GameObject {
  constructor(x, y, vx, vy, color, owner) {
    super(x, y, color);
    this.vx = vx;
    this.vy = vy;
    this.radius = 5;
    this.life = 200;    // 총알의 수명 (프레임 단위)
    this.friction = 1;  // 마찰력 없음 (일정 속도로 계속 날아감)
    this.owner = owner; // 자신을 쏜 플레이어 객체 참조
  }

  // 총알 수명 감소 로직 추가
  update(canvasWidth, canvasHeight) {
    super.update(canvasWidth, canvasHeight);
    this.life--;
  }

  // 총알이 화면에 존재하는지 여부 확인
  isAlive() {
    return this.life > 0;
  }
}

/* =========================================================================
   [인스턴스 생성 및 데이터 배열 초기화]
   실제로 게임에 등장할 객체들을 메모리에 올림
========================================================================= */
const keys = {};   // 현재 눌린 키보드 상태를 추적하는 딕셔너리
const bullets = []; // 발사된 총알들을 담아두는 배열

// Player 1 (파란색, WASD & F)
const p1 = new Player(100, 300, { r: 0, g: 0, b: 255 }, {
  up: 'w', down: 's', left: 'a', right: 'd', shoot: 'f'
});

// Player 2 (빨간색, 방향키 & Num9)
const p2 = new Player(1400, 600, { r: 255, g: 0, b: 0 }, {
  up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', shoot: '9'
});

/* =========================================================================
   [메인 게임 루프]
   requestAnimationFrame에 의해 매 프레임(보통 1초에 60번) 실행되는 핵심 엔진
========================================================================= */
function gameLoop() {
  // 게임이 아직 시작되지 않았다면 타이틀 화면만 띄움
  if (currentState == GAME_STATE.START) {
    drawStartScreen();
    requestAnimationFrame(gameLoop);
    return;
  }

  // 이전 프레임의 잔상을 지우기
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- 업데이트 파트 (데이터 연산) ---
  if (currentState == GAME_STATE.PLAYING) {
    // 1. 플레이어 조작 및 물리 연산
    p1.handleInput(keys);
    p1.update(canvas.width, canvas.height);

    p2.handleInput(keys);
    p2.update(canvas.width, canvas.height);

    // 2. 공격(발사) 처리
    if (keys[p1.controls.shoot]) p1.shoot(bullets);
    if (keys[p2.controls.shoot]) p2.shoot(bullets);

    // 3. 총알 업데이트 및 충돌 판정 (배열의 뒤에서부터 역순 순회)
    for (let i = bullets.length - 1; i >= 0; i--) {
      const b = bullets[i];
      b.update(canvas.width, canvas.height);

      // 수명이 다한 총알은 배열에서 제거
      if (!b.isAlive()) {
        bullets.splice(i, 1);
        continue;
      }

      // 두 명의 플레이어와 총알의 충돌 검사
      for (const player of [p1, p2]) {
        if (b.owner === player) continue; // 자신이 쏜 총알에는 맞지 않음

        if (isColliding(b, player)) {
          // 피격 처리
          player.hp--;
          player.vx += b.vx * 0.4; // 피격 시 넉백 밀림
          player.vy += b.vy * 0.4;
          player.hitTimer = 10;    // 시각적 깜빡임 타이머 세팅
          
          bullets.splice(i, 1);    // 맞춘 총알은 소멸
          break;                   // 현재 총알 판정 종료
        }
      }
    }

    // 4. 승패 체크
    if (p1.hp <= 0 || p2.hp <= 0) {
      winner = p1.hp <= 0 ? "P2" : "P1";
      currentState = GAME_STATE.GAMEOVER
    }
  }

  // 렌더링 파트 (화면에 그리기)
  p1.draw(ctx);
  p2.draw(ctx);
  bullets.forEach(b => b.draw(ctx));
  drawUI();

  if (currentState == GAME_STATE.GAMEOVER) {
    drawGameOver();
  }

  // 다음 프레임 예약
  requestAnimationFrame(gameLoop);
}

/* =========================================================================
   [이벤트 리스너 등록]
========================================================================= */
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  // 시작 화면에서 아무 키나 누르면 게임 시작
  if (currentState === GAME_STATE.START) {
    currentState = GAME_STATE.PLAYING;
  }

  // 게임 오버 상태에서 R을 누르면 재시작
  if (currentState === GAME_STATE.GAMEOVER && key === 'r') {
    resetGame();
    currentState = GAME_STATE.PLAYING;
  }
});

window.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  keys[key] = false; 
});

// 엔진 시동
gameLoop();

// 엔진 시동
gameLoop();
