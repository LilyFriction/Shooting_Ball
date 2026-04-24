/* =========================================================================
   [전역 변수 및 캔버스 초기화]
   게임의 전반적인 상태와 환경 설정을 관리합니다.
========================================================================= */

// 게임 상태 정의
const GAME_STATE = {
  START: 'START',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER'
};
let currentState = GAME_STATE.START; // 현재 게임 상태
let winner = null;                    // 승리자 정보 저장

// 캔버스 엘리먼트 및 렌더링 컨텍스트 설정
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 게임 밸런스 및 시스템 설정값 (상수화)
const SETTINGS = {
  PLAYER_SPEED: 6,        // 최대 이동 속도 제한
  PLAYER_ACCEL: 0.5,      // 이동 시 가속되는 정도
  PLAYER_FRICTION: 0.92,  // 매 프레임 속도가 줄어드는 비율 (관성 효과)
  BULLET_SPEED: 24,       // 발사된 총알의 속도
  SHOOT_COOLDOWN: 15,     // 다음 발사까지 필요한 프레임 간격
  RELOAD_SPEED_MULTIPLIER: 0.5, // 재장전 시 속도 배율 (50%)
  MAX_HP: 5,              // 플레이어 최대 체력
  MAX_AMMO: 10,           // 한 탄창에 들어가는 탄약 수
  RELOAD_TIME: 150,       // 재장전 완료까지 걸리는 프레임 (약 2.5초)
  NORMAL_FONT_COLOR: 'rgba(0, 0, 0, 0.6)' // 기본 UI 텍스트 투명도 및 색상
};

// FPS 고정
const TARGET_FPS = 61; // 목적은 60fps이나, 60으로 설정했을 때 잔렉이 많이 발생하는 것으로 보여 여유를 둠.
const FPS_INTERVAL = 1000 / TARGET_FPS;
let lastTime = 0;

// 캔버스 크기 지정
canvas.width = 1500;
canvas.height = 900;

/* =========================================================================
   [화면 렌더링 함수 모음]
   게임 화면의 각 상태에 따라 시각적인 요소를 그리는 함수들입니다.
========================================================================= */

// 게임 시작 대기 화면 (Press Any Key 메시지 깜빡임)
function drawStartScreen() {
  const blink = Math.floor(Date.now() / 500) % 2; // 0.5초 주기로 깜빡임 계산
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  
  if (blink) {
    ctx.font = "60px Arial";
    ctx.fillText("Press Any Key", canvas.width / 2, canvas.height / 2);
  }
  ctx.font = "20px Arial";
  ctx.fillText("2 Player Shooting Game", canvas.width / 2, canvas.height / 2 + 50);
}

// 게임 종료 화면 (승리자 표시 및 재시작 안내)
function drawGameOver() {
  ctx.fillStyle = SETTINGS.NORMAL_FONT_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.fillStyle = "white";
  ctx.font = "60px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${winner} WIN!`, canvas.width / 2, canvas.height / 2);

  ctx.font = "25px Arial";
  ctx.fillText("Press R to Restart", canvas.width / 2, canvas.height / 2 + 50);
}

// 상단 정보 창 (조작법, 탄약 상태, 재장전 안내)
function drawUI() {
  ctx.fillStyle = SETTINGS.NORMAL_FONT_COLOR;
  
  // Player 1 UI (좌측 상단)
  ctx.textAlign = "left";
  ctx.font = "bold 18px Arial";
  ctx.fillText("P1 (Blue)", 20, 30);
  ctx.font = "14px Arial";
  ctx.fillText("Move: W, A, S, D | Shoot: F | Reload: R", 20, 55);
  
  ctx.font = "bold 16px Arial";
  // 재장전 중일 때는 주황색으로 상태 표시
  ctx.fillStyle = p1.isReloading ? "orange" : SETTINGS.NORMAL_FONT_COLOR;
  ctx.fillText(`Ammo: ${p1.isReloading ? "RELOADING..." : p1.ammo + " / " + SETTINGS.MAX_AMMO}`, 20, 80);

  // Player 2 UI (우측 상단)
  ctx.textAlign = "right";
  ctx.fillStyle = SETTINGS.NORMAL_FONT_COLOR;
  ctx.font = "bold 18px Arial";
  ctx.fillText("P2 (Red)", canvas.width - 20, 30);
  ctx.font = "14px Arial";
  ctx.fillText("Move: I, J, K, L | Shoot: ; | Reload: P", canvas.width - 20, 55);
  
  ctx.font = "bold 16px Arial";
  ctx.fillStyle = p2.isReloading ? "orange" : SETTINGS.NORMAL_FONT_COLOR;
  ctx.fillText(`Ammo: ${p2.isReloading ? "RELOADING..." : p2.ammo + " / " + SETTINGS.MAX_AMMO}`, canvas.width - 20, 80);
}

// 게임 재시작 시 플레이어 및 총알 상태 초기화
function resetGame() {
  p1.x = 100; p1.y = 300; p1.vx = 0; p1.vy = 0;
  p1.hp = SETTINGS.MAX_HP; p1.ammo = SETTINGS.MAX_AMMO; p1.isReloading = false;
  
  p2.x = 1400; p2.y = 600; p2.vx = 0; p2.vy = 0;
  p2.hp = SETTINGS.MAX_HP; p2.ammo = SETTINGS.MAX_AMMO; p2.isReloading = false;

  bullets.length = 0; // 화면상의 모든 총알 제거
  currentState = GAME_STATE.START;
  winner = null;
}

/* =========================================================================
   [유틸리티 함수 모음]
   계산 및 시각 효과를 돕는 보조 함수들입니다.
========================================================================= */

// 두 원형 객체 사이의 거리를 계산하여 충돌 여부 확인
function isColliding(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy) < (a.radius + b.radius);
}

// 피격 시 플레이어의 색상을 순간적으로 반전시키는 기능
function invertColor(c) {
  return { r: 255 - c.r, g: 255 - c.g, b: 255 - c.b };
}

/* =========================================================================
   [클래스 모음]
   게임 내 모든 물리 객체의 설계도입니다.
========================================================================= */

// 모든 게임 객체의 기본이 되는 클래스
class GameObject {
  constructor(x, y, color) {
    this.x = x; this.y = y;           // 위치 좌표
    this.vx = 0; this.vy = 0;         // 현재 속도 (Vector X, Y)
    this.accel = SETTINGS.PLAYER_ACCEL;
    this.friction = SETTINGS.PLAYER_FRICTION;
    this.maxSpeed = SETTINGS.PLAYER_SPEED;
    this.color = color;
    this.radius = 15;
    this.dir = { x: 0, y: -1 };       // 현재 바라보고 있는 방향 (발사 방향)
  }

  // 매 프레임 위치 및 속도 업데이트
  update(canvasWidth, canvasHeight) {
    // 마찰력 적용
    this.vx *= this.friction;
    this.vy *= this.friction;

    // 미세한 속도는 0으로 처리하여 떨림 방지
    if (Math.abs(this.vx) < 0.01) this.vx = 0;
    if (Math.abs(this.vy) < 0.01) this.vy = 0;

    // 위치 갱신
    this.x += this.vx;
    this.y += this.vy;

    this.checkBoundary(canvasWidth, canvasHeight);
  }

  // 화면 밖으로 나가지 못하게 벽과 충돌 처리
  checkBoundary(width, height) {
    if (this.x < this.radius) { this.x = this.radius; this.vx *= -1; }
    else if (this.x > width - this.radius) { this.x = width - this.radius; this.vx *= -1; }

    if (this.y < this.radius) { this.y = this.radius; this.vy *= -1; }
    else if (this.y > height - this.radius) { this.y = height - this.radius; this.vy *= -1; }
  }

  // 화면에 원 형태로 객체 그리기
  draw(ctx) {
    let c = this.hitTimer > 0 ? invertColor(this.color) : this.color;
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  }
}

// 플레이어 클래스 (조작 및 전투 로직 포함)
class Player extends GameObject {
  constructor(x, y, color, controls) {
    super(x, y, color);
    this.controls = controls;         // 지정된 키 매핑
    this.hp = SETTINGS.MAX_HP;
    this.cooldown = 0;                // 발사 대기 시간 타이머
    this.hitTimer = 0;                // 피격 이펙트 타이머
    
    // 탄창 시스템 관련 속성
    this.ammo = SETTINGS.MAX_AMMO;
    this.reloadTimer = 0;
    this.isReloading = false;
  }

  // 키 입력에 따른 가속도 및 방향 설정
  handleInput(keys) {
    let dx = 0; let dy = 0;
    
    // 재장전 중이면 속도를 절반으로 줄임
    const currentAccel = this.isReloading ? this.accel * SETTINGS.RELOAD_SPEED_MULTIPLIER : this.accel;
    const currentMaxSpeed = this.isReloading ? this.maxSpeed * SETTINGS.RELOAD_SPEED_MULTIPLIER : this.maxSpeed;

    if (keys[this.controls.up]) { this.vy -= currentAccel; dy -= 1; }
    if (keys[this.controls.down]) { this.vy += currentAccel; dy += 1; }
    if (keys[this.controls.left]) { this.vx -= currentAccel; dx -= 1; }
    if (keys[this.controls.right]) { this.vx += currentAccel; dx += 1; }

    //이동 중일 때만 총구 방향(dir)을 갱신
    if (dx !== 0 || dy !== 0) {
      const len = Math.hypot(dx, dy);
      this.dir = { x: dx / len, y: dy / len };
    }

    // 속도 제한(최대 속도 이상 가속 방지)
    this.vx = Math.max(-currentMaxSpeed, Math.min(currentMaxSpeed, this.vx));
    this.vy = Math.max(-currentMaxSpeed, Math.min(currentMaxSpeed, this.vy));
  }

  // 총알 생성 및 탄약 차감 로직
  shoot(bullets) {
    if (this.cooldown > 0 || this.isReloading) return; // 쿨타임 중이거나 재장전 중이면 발사 불가

    if (this.ammo > 0) {
      this.ammo--;
      this.cooldown = SETTINGS.SHOOT_COOLDOWN;
      
      bullets.push(new Bullet(
        this.x, this.y, 
        this.dir.x * SETTINGS.BULLET_SPEED, 
        this.dir.y * SETTINGS.BULLET_SPEED, 
        this.color, this
      ));

      // 마지막 탄환 발사 시 자동 재장전 시작
      if (this.ammo === 0) {
        this.startReload();
      }
    }
  }

  // 재장전 프로세스 시작
  startReload() {
    if (!this.isReloading && this.ammo < SETTINGS.MAX_AMMO) {
      this.isReloading = true;
      this.reloadTimer = SETTINGS.RELOAD_TIME;
    }
  }

  // 플레이어 전용 업데이트 (물리 + 각종 타이머)
  update(canvasWidth, canvasHeight) {
    super.update(canvasWidth, canvasHeight);
    
    if (this.cooldown > 0) this.cooldown--;
    if (this.hitTimer > 0) this.hitTimer--;

    // 재장전 시간 카운트다운
    if (this.isReloading) {
      this.reloadTimer--;
      if (this.reloadTimer <= 0) {
        this.ammo = SETTINGS.MAX_AMMO;
        this.isReloading = false;
      }
    }
  }

  // 플레이어 본체와 상단 체력바 렌더링
  draw(ctx) {
    super.draw(ctx);

    const barWidth = 10;
    const barHeight = 6;
    const spacing = 3;
    const totalBarWidth = (barWidth * SETTINGS.MAX_HP) + (spacing * (SETTINGS.MAX_HP - 1));
    
    let startX = this.x - (totalBarWidth / 2);
    let startY = this.y - this.radius - 20;

    // 체력 칸 그리기
    for (let i = 0; i < SETTINGS.MAX_HP; i++) {
      if (i < this.hp) {
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.fillRect(startX + i * (barWidth + spacing), startY, barWidth, barHeight);
      } else {
        ctx.strokeStyle = "rgba(100, 100, 100, 0.5)";
        ctx.strokeRect(startX + i * (barWidth + spacing), startY, barWidth, barHeight);
      }
    }

    // 조준기(삼각형) 그리기
    const triangleSize = 8;     // 삼각형의 크기 (높이)
    const offsetFromPlayer = this.radius + 10; // 플레이어 중심에서 삼각형까지의 거리

    // 플레이어의 고유 색상을 반투명하게 사용
    ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, 0.7)`; 

    // 현재 바라보는 방향(this.dir)의 라디안 각도 계산
    const angle = Math.atan2(this.dir.y, this.dir.x);

    ctx.save(); // 현재 캔버스 상태(회전, 평행이동 등) 저장

    // 캔버스의 원점을 플레이어의 중심(this.x, this.y)으로 평행 이동
    ctx.translate(this.x, this.y);
    // 계산된 각도만큼 캔버스 자체를 회전
    ctx.rotate(angle);

    // 이제 캔버스가 플레이어 중심으로 회전했으므로, 
    // 정면(오른쪽 방향)으로 offsetFromPlayer 만큼 떨어진 곳에 삼각형을 그리면 됩니다.
    ctx.beginPath();
    // 삼각형의 정점 (조준 방향 끝)
    ctx.moveTo(offsetFromPlayer + triangleSize, 0); 
    // 왼쪽 아래 점
    ctx.lineTo(offsetFromPlayer, -triangleSize / 2); 
    // 오른쪽 아래 점
    ctx.lineTo(offsetFromPlayer, triangleSize / 2); 
    ctx.fill(); // 채우기
    ctx.closePath();

    ctx.restore(); // 저장했던 캔버스 상태로 복구 (다른 그리기 작업에 영향 주지 않기 위해)

  }
}

// 총알 클래스
class Bullet extends GameObject {
  constructor(x, y, vx, vy, color, owner) {
    super(x, y, color);
    this.vx = vx; this.vy = vy;
    this.radius = 5;
    this.life = 100;    // 총알이 사라지기 전까지 유지되는 시간(프레임)
    this.friction = 1;  // 총알은 감속되지 않음
    this.owner = owner; // 총알을 쏜 주인 정보 (자폭 방지용)
  }

  update(canvasWidth, canvasHeight) {
    super.update(canvasWidth, canvasHeight);
    this.life--; // 매 프레임 수명 감소
  }

  isAlive() {
    return this.life > 0;
  }
}

/* =========================================================================
   [인스턴스 생성 및 데이터 배열 초기화]
========================================================================= */
const keys = {};     // 현재 눌려있는 키 상태를 저장하는 객체
const bullets = [];   // 화면에 존재하는 모든 총알 인스턴스 저장 배열

// Player 1 설정 (파란색, WASD & F, 수동재장전 R)
const p1 = new Player(100, 300, { r: 0, g: 0, b: 255 }, {
  up: 'w', down: 's', left: 'a', right: 'd', shoot: 'f', reload: 'r'
});

// Player 2 설정 (빨간색, IJKL & ;, 수동재장전 P)
const p2 = new Player(1400, 600, { r: 255, g: 0, b: 0 }, {
  up: 'i', down: 'k', left: 'j', right: 'l', shoot: ';', reload: 'p'
});

/* =========================================================================
   [메인 게임 루프]
   매 초 60회 가량 실행되며 물리 연산과 화면 그리기를 반복합니다.
========================================================================= */
function gameLoop(timestamp) {

  // 처음 실행될 때 timestamp가 없다면 초기화
  if (!lastTime) lastTime = timestamp;

  // 현재 시간과 마지막 실행 시간의 차이 계산
  const elapsed = timestamp - lastTime;

  // 경과 시간이 16.67ms (60fps 기준)를 넘었을 때만 게임 로직 실행
  if (elapsed > FPS_INTERVAL) {
    // 다음 프레임 계산이 밀리지 않도록 초과된 자투리 시간을 보정 (매우 중요!)
    lastTime = timestamp - (elapsed % FPS_INTERVAL);

    // 1. 시작 화면 처리
    if (currentState === GAME_STATE.START) {
      drawStartScreen();
    } else {
      // 2. 화면 지우기 (잔상 제거)
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 3. 게임 플레이 로직
      if (currentState === GAME_STATE.PLAYING) {
        // 플레이어 이동 업데이트
        p1.handleInput(keys);
        p1.update(canvas.width, canvas.height);

        p2.handleInput(keys);
        p2.update(canvas.width, canvas.height);

        // 공격 처리 (키를 누르고 있으면 shoot 메서드 반복 호출)
        if (keys[p1.controls.shoot]) p1.shoot(bullets);
        if (keys[p2.controls.shoot]) p2.shoot(bullets);

        // 수동 재장전 입력 처리
        if (keys[p1.controls.reload]) p1.startReload();
        if (keys[p2.controls.reload]) p2.startReload();

        // 총알 물리 업데이트 및 충돌 검사
        for (let i = bullets.length - 1; i >= 0; i--) {
          const b = bullets[i];
          b.update(canvas.width, canvas.height);

          // 수명이 다한 총알 제거
          if (!b.isAlive()) {
            bullets.splice(i, 1);
            continue;
          }

          // 상대 플레이어와의 충돌 판정
          for (const player of [p1, p2]) {
            if (b.owner === player) continue; // 자신이 쏜 총알은 무시

            if (isColliding(b, player)) {
              player.hp--;                // 체력 감소
              player.vx += b.vx * 0.4;    // 피격 시 넉백 효과 적용
              player.vy += b.vy * 0.4;
              player.hitTimer = 10;       // 색상 반전 이펙트 활성화
              
              bullets.splice(i, 1);       // 충돌한 총알 제거
              break;
            }
          }
        }

        // 승패 체크 (누군가의 HP가 0 이하가 되면 종료)
        if (p1.hp <= 0 || p2.hp <= 0) {
          winner = p1.hp <= 0 ? "P2" : "P1";
          currentState = GAME_STATE.GAMEOVER;
        }
      }

      // 4. 객체 렌더링 순서 (플레이어 -> 총알 -> UI)
      p1.draw(ctx);
      p2.draw(ctx);
      bullets.forEach(b => b.draw(ctx));
      drawUI();

      // 5. 게임 종료 화면 오버레이
      if (currentState === GAME_STATE.GAMEOVER) {
        drawGameOver();
      }
    }
  }

  // 다음 프레임 요청은 항상 수행
  requestAnimationFrame(gameLoop);
}

/* =========================================================================
   [이벤트 리스너 등록]
   키보드 입력을 감지하고 게임 상태를 전환합니다.
========================================================================= */

// 키를 눌렀을 때 실행
window.addEventListener('keydown', e => {
  const key = e.key.toLowerCase();
  keys[key] = true;

  // 어떤 키든 누르면 대기 화면에서 시작
  if (currentState === GAME_STATE.START) {
    currentState = GAME_STATE.PLAYING;
  }

  // 종료 화면에서 R을 누르면 게임 리셋
  if (currentState === GAME_STATE.GAMEOVER && key === 'r') {
    resetGame();
    currentState = GAME_STATE.PLAYING;
  }
});

// 키에서 손을 뗐을 때 실행
window.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();
  keys[key] = false; 
});

// 모든 준비가 끝나면 루프 시작
requestAnimationFrame(gameLoop);
