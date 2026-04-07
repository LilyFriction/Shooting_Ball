const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 캐릭터 속성
let player = {
    x: 225,
    y: 175,
    width: 50,
    height: 50,
    color: '#0095DD',
    speed: 5
};

// 키 입력 상태 저장
let keys = {};

window.addEventListener('keydown', (e) => { keys[e.code] = true; });
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

function update() {
    // 이동 로직
    if (keys['ArrowUp'] && player.y > 0) player.y -= player.speed;
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) player.y += player.speed;
    if (keys['ArrowLeft'] && player.x > 0) player.x -= player.speed;
    if (keys['ArrowRight'] && player.x < canvas.width - player.width) player.x += player.speed;
}

function draw() {
    // 배경 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 캐릭터 그리기
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
}

function gameLoop() {
    update(); // 데이터 변경
    draw();   // 화면 갱신
    requestAnimationFrame(gameLoop); // 다음 프레임 요청
}

// 게임 시작
gameLoop();
