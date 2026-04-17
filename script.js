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

let isCurrentlyCombingUp = false;
let upwardDistance = 0;

let state = 0; // 0: back, 1: turn, 2: happy, 3: bald, 4: unhappy, 5: very_unhappy
let lastCombingTime = 0;
let decayInterval = null;

let upwardTolerance = 0; // 新增：狗狗對逆向梳毛的容忍度計數器
const maxUpwardTolerance = 3; // 容忍 3 次不小心的上滑 -> unhappy
const extremeUpwardTolerance = 5; // 繼續白目逆向梳 5 次 -> very unhappy

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

// 啟動舒服值消退機制
function startDecay() {
    if (decayInterval) clearInterval(decayInterval);
    decayInterval = setInterval(() => {
        // 如果超過 2 秒沒梳毛，且遊戲還沒結束，且有舒服值可以扣
        if (Date.now() - lastCombingTime > 2000 && state !== 2 && state !== 3 && strokeCount > 0) {
            strokeCount--;
            updateGame();
        }
    }, 500); // 每 0.5 秒扣 1 下
}

startDecay();

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
    isCurrentlyCombingUp = false;
    upwardDistance = 0;
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
    // 判斷是否為逆向（往上）梳毛 (Y軸負向移動，且垂直移動遠大於水平移動)
    const isUpward = deltaY < 0 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5;
    
    if (isDownward) {
        lastCombingTime = Date.now(); // 更新最後梳毛時間
        isCurrentlyCombingUp = false; // 取消逆向狀態
        upwardDistance = 0;
        
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
            
            // 順向梳毛可以安撫狗狗，降低不爽計數
            upwardTolerance = Math.max(0, upwardTolerance - 1);
            
            // 如果原本是不爽狀態，順向梳毛可以解除
            if (state === 4 || state === 5) {
                state = strokeCount >= turnThreshold ? 1 : 0;
                dogImage.src = state === 1 ? 'assets/dog_turn_v4.png' : 'assets/dog_back_v4.png';
            }
            
            if (strokeCount > happyThreshold) strokeCount = happyThreshold;
            updateGame();
            
            // 梳到底的時候稍微多掉一點毛增加回饋感
            const extraHair = Math.floor(Math.random() * 3) + 2; // 2~4 根
            for (let i = 0; i < extraHair; i++) {
                spawnHair(currentX, currentY);
            }
        }
    } else if (isUpward) {
        lastCombingTime = Date.now(); // 更新時間防止倒扣
        isCurrentlyCombingDown = false; // 取消順向狀態
        downwardDistance = 0;
        hairDistanceTracker = 0;
        
        if (!isCurrentlyCombingUp) {
            isCurrentlyCombingUp = true;
            upwardDistance = 0;
        }
        
        upwardDistance += Math.abs(deltaY); // 累積向上滑動的距離
        
        // 當向上滑動累積超過閾值 (例如 60px) 時觸發懲罰
        if (upwardDistance >= minSwipeDistance) {
            upwardDistance = -9999; // 防止單次上滑連續觸發
            
            upwardTolerance++; // 增加不爽計數
            
            // 逆向梳毛的懲罰機制 (固定扣分)
            strokeCount = Math.max(0, strokeCount - 1);
            
            // 只有當不爽計數累積超過容忍度時，才進入不爽狀態
            if (upwardTolerance >= extremeUpwardTolerance && state !== 2 && state !== 3) {
                if (state !== 5) {
                    state = 5; // very unhappy
                    dogImage.src = 'assets/dog_very_unhappy_v4.png';
                }
                
                // 更強烈且急促的震動與低吼抖動效果
                if (navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 100]);
                
                dogImage.style.transform = 'translate(-4px, -4px) scale(1.02)';
                setTimeout(() => dogImage.style.transform = 'translate(4px, 4px) scale(1.02)', 40);
                setTimeout(() => dogImage.style.transform = 'translate(-4px, 4px) scale(1.02)', 80);
                setTimeout(() => dogImage.style.transform = 'translate(4px, -4px) scale(1.02)', 120);
                setTimeout(() => dogImage.style.transform = 'translate(-4px, -4px) scale(1.02)', 160);
                setTimeout(() => dogImage.style.transform = 'translate(0, 0) scale(1)', 200);
            } else if (upwardTolerance >= maxUpwardTolerance && state !== 2 && state !== 3 && state !== 5) {
                if (state !== 4) {
                    state = 4; // unhappy
                    dogImage.src = 'assets/dog_unhappy_v4.png';
                }
                
                // 震動回饋提示惹毛狗狗了
                if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
                
                // 短暫的抖動動畫
                dogImage.style.transform = 'translate(-2px, -2px)';
                setTimeout(() => dogImage.style.transform = 'translate(2px, 2px)', 50);
                setTimeout(() => dogImage.style.transform = 'translate(-2px, 2px)', 100);
                setTimeout(() => dogImage.style.transform = 'translate(2px, -2px)', 150);
                setTimeout(() => dogImage.style.transform = 'translate(0, 0)', 200);
            } else if (state !== 2 && state !== 3 && state !== 4 && state !== 5) {
                // 還在容忍範圍內，只給予微弱警告
                if (navigator.vibrate) navigator.vibrate([20]); // 輕微短震動
                dogImage.style.transform = 'translate(-1px, 0)';
                setTimeout(() => dogImage.style.transform = 'translate(1px, 0)', 30);
                setTimeout(() => dogImage.style.transform = 'translate(0, 0)', 60);
            }
            
            updateGame();
        }
    } else {
        // 未構成有效上下滑動時（例如提梳子回手或微小移動），重置所有狀態與距離
        isCurrentlyCombingDown = false;
        isCurrentlyCombingUp = false;
        downwardDistance = 0;
        upwardDistance = 0;
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
    } else if (strokeCount >= turnThreshold && strokeCount < happyThreshold && state !== 1 && state !== 4 && state !== 5) {
        state = 1;
        dogImage.src = 'assets/dog_turn_v4.png';
    } else if (strokeCount < turnThreshold && state !== 0 && state !== 4 && state !== 5) {
        // 如果因為倒扣掉出了轉頭的閾值，或者重新開始，並且沒有處於不爽狀態
        state = 0;
        dogImage.src = 'assets/dog_back_v4.png';
    }
}

function resetGame() {
    strokeCount = 0;
    isCurrentlyCombingDown = false;
    downwardDistance = 0;
    isCurrentlyCombingUp = false;
    upwardDistance = 0;
    hairDistanceTracker = 0;
    state = 0;
    upwardTolerance = 0; // 重置容忍度
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
