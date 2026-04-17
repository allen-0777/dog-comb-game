// Get references to elements
const dogContainer = document.getElementById('dog-container');
const dogImage = document.getElementById('dog-image');
const combImage = document.getElementById('comb-image');
const counterElement = document.getElementById('counter');
const resetBtn = document.getElementById('reset-btn');
const particlesContainer = document.getElementById('particles'); // ADDED THIS BACK!

let isCombing = false;
let lastY = 0;
let lastX = 0;
let strokeCount = 0;

let isCurrentlyCombingDown = false;
let downwardDistance = 0;
let hairDistanceTracker = 0;
const minSwipeDistance = 60; // 往下滑動 60px 算作一次有效的梳毛

let state = 0; // 0: back, 1: turn, 2: happy, 3: bald

// Thresholds for state changes
let turnThreshold = 40;
let happyThreshold = 100;

function randomizeThresholds() {
    // 轉頭：隨機 15 ~ 35 下
    turnThreshold = Math.floor(Math.random() * 21) + 15;
    // 吐舌頭/禿頭：轉頭後再梳 25 ~ 55 下
    happyThreshold = turnThreshold + Math.floor(Math.random() * 31) + 25;
}

// 初始化隨機閾值
randomizeThresholds();

function handleStart(e) {
    if (strokeCount >= happyThreshold) return;
    isCombing = true;
    
    if (e.touches && e.touches.length > 0) {
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
    } else {
        lastX = e.clientX;
        lastY = e.clientY;
    }
    
    isCurrentlyCombingDown = false;
    downwardDistance = 0;
    hairDistanceTracker = 0;
}

function handleMove(e) {
    // Prevent default scrolling to ensure full mobile app feel
    if(e.cancelable) {
        e.preventDefault();
    }
    
    // 讓梳子跟隨游標（無論是否按下）
    const rect = dogContainer.getBoundingClientRect();
    
    let currentX, currentY;
    if (e.touches && e.touches.length > 0) {
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
    } else {
        currentX = e.clientX;
        currentY = e.clientY;
    }
    
    // 將游標位置轉換為相對於容器的座標
    const relX = currentX - rect.left;
    const relY = currentY - rect.top;
    
    // 更新梳子位置，只在容器內顯示
    if (relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height) {
        combImage.classList.remove('hidden');
        combImage.style.left = `${relX}px`;
        combImage.style.top = `${relY}px`;
    } else {
        combImage.classList.add('hidden');
    }

    if (!isCombing || strokeCount >= happyThreshold) return;
    
    const deltaY = currentY - lastY;
    const deltaX = currentX - lastX;
    
    // 限制梳子旋轉角度 (依照游標移動方向微微傾斜)
    let tilt = deltaX;
    if (tilt > 25) tilt = 25;
    if (tilt < -25) tilt = -25;
    combImage.style.transform = `translate(-50%, -50%) rotate(${tilt}deg)`;

    // 判斷是否為順向（往下）梳毛 (Y軸正向移動，且垂直移動大於水平移動)
    const isDownward = deltaY > 0 && deltaY > Math.abs(deltaX) * 0.5;
    
    if (isDownward) {
        if (!isCurrentlyCombingDown) {
            isCurrentlyCombingDown = true;
            downwardDistance = 0;
            hairDistanceTracker = 0;
        }
        downwardDistance += deltaY;
        hairDistanceTracker += deltaY;
        
        // 持續飄毛：每往下移動 15px 左右就掉落毛髮
        if (hairDistanceTracker >= 15) {
            hairDistanceTracker = 0;
            const hairCount = Math.floor(Math.random() * 2) + 1; // 1~2 根
            for (let i = 0; i < hairCount; i++) {
                spawnHair(currentX, currentY);
            }
        }
        
        if (downwardDistance >= minSwipeDistance) {
            strokeCount++;
            downwardDistance = -9999; // 設為極小值，防止單次滑動重複計分，直到玩家往上提才會重置
            
            if (strokeCount > happyThreshold) strokeCount = happyThreshold;
            updateGame();
            
            // 梳到底的時候稍微多掉一點毛增加回饋感
            const extraHair = Math.floor(Math.random() * 3) + 2; // 2~4 根
            for (let i = 0; i < extraHair; i++) {
                spawnHair(currentX, currentY);
            }
        }
    } else if (deltaY < -5) {
        // 如果有明顯的向上移動，表示玩家正在「回手」或提梳子，準備下一次往下梳
        isCurrentlyCombingDown = false;
        downwardDistance = 0;
        hairDistanceTracker = 0;
    }
    
    lastY = currentY;
    lastX = currentX;
}

function handleEnd() {
    isCombing = false;
}

function spawnHair(clientX, clientY) {
    const hair = document.createElement('div');
    hair.className = 'hair';
    
    // 增加彎曲的弧度深度與隨機性
    const length = 12 + Math.random() * 18; // 毛髮長度稍微拉長一點 (12~30px)
    const arcWidth = 4 + Math.random() * 10; // 彎曲的弧度寬度 (4~14px)，越寬看起來越彎
    const rotation = Math.random() * 360; // 初始角度
    const driftX = (Math.random() - 0.5) * 60; // 左右飄落幅度
    const spinDir = Math.random() > 0.5 ? 1 : -1; // 順時針或逆時針
    const duration = 1.2 + Math.random() * 1.5; // 飄落時間
    
    // 非常低調、有透明感的狗毛顏色
    const colors = [
        'rgba(218, 165, 32, 0.65)',
        'rgba(205, 133, 63, 0.55)',
        'rgba(238, 232, 170, 0.45)'
    ];
    const hairColor = colors[Math.floor(Math.random() * colors.length)];
    
    // 超級細的毛髮
    const thickness = 0.8 + Math.random() * 1.0; // 0.8px ~ 1.8px
    
    // 隨機左彎或右彎，透過只顯示單邊的 border 來達成半月形彎曲
    const isLeftBend = Math.random() > 0.5;
    if (isLeftBend) {
        hair.style.borderLeft = `${thickness}px solid ${hairColor}`;
    } else {
        hair.style.borderRight = `${thickness}px solid ${hairColor}`;
    }
    
    hair.style.setProperty('--hair-height', `${length}px`);
    hair.style.setProperty('--arc-width', `${arcWidth}px`);
    hair.style.setProperty('--start-rot', `${rotation}deg`);
    hair.style.setProperty('--drift-x', `${driftX}px`);
    hair.style.setProperty('--spin-dir', spinDir);
    hair.style.setProperty('--duration', `${duration}s`);
    
    let x, y;
    
    // 讓毛髮產生在梳子（游標）的附近
    if (clientX !== undefined && clientY !== undefined) {
        const rect = dogContainer.getBoundingClientRect();
        x = clientX - rect.left + (Math.random() * 70 - 35); 
        y = clientY - rect.top + (Math.random() * 30 - 15);
    } else {
        // Fallback
        x = Math.random() * dogContainer.clientWidth;
        y = Math.random() * dogContainer.clientHeight;
    }
    
    hair.style.left = `${x}px`;
    hair.style.top = `${y}px`;
    
    // 將毛髮加到容器中
    if (particlesContainer) {
        particlesContainer.appendChild(hair);
        
        // 動畫結束後移除元素
        setTimeout(() => {
            if (hair.parentNode) hair.remove();
        }, duration * 1000);
    }
}

function updateGame() {
    // Update counter
    counterElement.textContent = strokeCount;
    
    // Check state changes
    if (strokeCount >= happyThreshold && state !== 2 && state !== 3) {
        if (Math.random() < 0.2) { // 20% 機率梳到最後禿頭
             state = 3;
             dogImage.src = 'assets/dog_bald_v4.png';
             resetBtn.classList.remove('hidden');
             combImage.classList.add('hidden'); // 隱藏梳子
        } else {
             state = 2;
             dogImage.src = 'assets/dog_happy_v4.png';
             resetBtn.classList.remove('hidden');
        }
    } else if (strokeCount >= turnThreshold && strokeCount < happyThreshold && state !== 1) {
        state = 1;
        dogImage.src = 'assets/dog_turn_v4.png';
    }
}

function resetGame() {
    strokeCount = 0;
    isCurrentlyCombingDown = false;
    downwardDistance = 0;
    hairDistanceTracker = 0;
    state = 0;
    randomizeThresholds();
    dogImage.src = 'assets/dog_back_v4.png';
    counterElement.textContent = '0';
    resetBtn.classList.add('hidden');
    combImage.classList.remove('hidden');
}

// Event listeners for mouse
dogContainer.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove, {passive: false});
window.addEventListener('mouseup', handleEnd);

// Event listeners for touch
dogContainer.addEventListener('touchstart', handleStart, {passive: false});
window.addEventListener('touchmove', handleMove, {passive: false});
window.addEventListener('touchend', handleEnd);

resetBtn.addEventListener('click', resetGame);
