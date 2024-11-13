let credits = 1000;
let isBetting = false;
let multiplierHistory = [];
let currentBetAmount = 0;
let currentGameMultiplier = 1.00;
let gameInterval;
let plane;
let crashPoint = 0;
let hasGameEnded = false;
let canvas, ctx;
let backgroundOffset = 0;

// Add these constants at the top of the file
const STORAGE_KEYS = {
    CREDITS: 'aviator_credits',
    HISTORY: 'aviator_history',
    STATS: 'aviator_stats'
};

// Add this function to initialize the game data from localStorage
function initializeGameData() {
    // Load credits (default to 1000 if not found)
    credits = parseFloat(localStorage.getItem(STORAGE_KEYS.CREDITS)) || 1000;
    updateCredits(0); // Update display

    // Load game history
    try {
        const savedHistory = localStorage.getItem(STORAGE_KEYS.HISTORY);
        if (savedHistory) {
            gameHistory = JSON.parse(savedHistory);
            updateHistoryDisplay();
            updateHistoryStats();
        }
    } catch (error) {
        console.error('Error loading game history:', error);
        gameHistory = [];
    }
}

function generateRandomMultiplier() {
    // This creates a distribution that favors lower numbers but allows for occasional high multipliers
    const random = Math.random();
    return (0.99 + Math.pow(Math.random(), -0.143)) / 0.99;
}

function updateCredits(amount) {
    credits += amount;
    document.getElementById('credits').textContent = credits.toFixed(2);
    localStorage.setItem(STORAGE_KEYS.CREDITS, credits.toString());
}

function adjustBet(amount) {
    const betInput = document.getElementById('betAmount');
    let currentBet = parseInt(betInput.value);
    currentBet += amount;
    
    // Add minimum and maximum bet limits
    const minBet = 10;
    const maxBet = Math.min(10000, credits); // Maximum bet is either 10000 or current credits
    
    if (currentBet < minBet) currentBet = minBet;
    if (currentBet > maxBet) currentBet = maxBet;
    
    betInput.value = currentBet;
}

function addToHistory(multiplier) {
    const crashData = {
        multiplier: multiplier,
        timestamp: new Date().toISOString(), // Store as ISO string for better serialization
        id: Date.now()
    };
    
    gameHistory.unshift(crashData);
    
    // Limit history to last 100 games
    if (gameHistory.length > 100) {
        gameHistory = gameHistory.slice(0, 100);
    }
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(gameHistory));
    
    updateHistoryDisplay();
    updateHistoryStats();
}

function placeBet() {
    if (isBetting) return;
    
    currentBetAmount = parseInt(document.getElementById('betAmount').value);
    if (currentBetAmount > credits) {
        alert('Not enough credits!');
        return;
    }
    
    isBetting = true;
    hasGameEnded = false;
    updateCredits(-currentBetAmount);
    
    document.getElementById('betButton').disabled = true;
    document.getElementById('cashoutButton').disabled = false;
    
    // Reset cashout amount display
    const cashoutAmount = document.getElementById('cashoutAmount');
    cashoutAmount.classList.remove('active');
    
    currentGameMultiplier = 1.00;
    const crashPoint = generateRandomMultiplier();
    
    const multiplierDisplay = document.getElementById('multiplier-display');
    const plane = document.getElementById('plane');
    
    // Reset plane position and show it
    plane.style.transform = 'translate(0, 0) rotate(0deg)';
    plane.style.display = 'block';
    plane.classList.remove('crashed');
    
    backgroundOffset = 0;
    let phase = 'takeoff';
    let phaseProgress = 0;
    
    gameInterval = setInterval(() => {
        if (hasGameEnded) return;
        
        currentGameMultiplier += 0.01;
        multiplierDisplay.textContent = `${currentGameMultiplier.toFixed(2)}x`;
        
        // Update cashout amount
        updateCashoutAmount(currentGameMultiplier);
        
        // Update current multiplier in history
        updateCurrentMultiplier(currentGameMultiplier);
        
        phaseProgress += 0.02;
        let x, y, angle;
        
        if (phase === 'takeoff' && phaseProgress <= 1) {
            // Takeoff phase
            x = phaseProgress * 40;
            y = Math.pow(phaseProgress * 2.5, 2) * 30;
            angle = Math.min(phaseProgress * 45, 35);
            
            // Slower background movement during takeoff
            backgroundOffset += 2;
            
            if (phaseProgress >= 1) {
                phase = 'climb';
                phaseProgress = 0;
            }
        } else {
            // Climbing phase
            const climbProgress = Math.min(phaseProgress, 1);
            x = 40 + (climbProgress * 160);
            y = 80 + (climbProgress * 120);
            angle = Math.max(35 - (climbProgress * 25), 10);
            
            // Add slight wave motion
            const waveAmplitude = 5;
            const waveFrequency = 3;
            y += Math.sin(phaseProgress * waveFrequency * Math.PI) * waveAmplitude;
            
            // Faster background movement during climb
            backgroundOffset += 3;
        }
        
        // Draw background with current offset
        drawBackground(backgroundOffset);
        
        // Update plane position
        plane.style.transform = `
            translate(${x}%, ${-y}px) 
            rotate(${angle}deg)
        `;
        
        if (currentGameMultiplier >= crashPoint) {
            crashGame();
        }
    }, 50);
}

function crashGame() {
    if (hasGameEnded) return;
    
    hasGameEnded = true;
    const plane = document.getElementById('plane');
    
    // Get current position
    const currentTransform = plane.style.transform.split('translate');
    const currentPosition = currentTransform[1].split('rotate')[0];
    
    // Add dramatic crash sequence
    plane.style.transition = 'transform 0.5s cubic-bezier(.36,.07,.19,.97)';
    plane.style.transform = `translate${currentPosition} rotate(160deg)`;
    plane.classList.add('crashed');
    
    showMessage(`CRASHED @ ${currentGameMultiplier.toFixed(2)}x`, 'crash');
    endGame(false);
}

function endGame(cashoutSuccess) {
    clearInterval(gameInterval);
    isBetting = false;
    
    document.getElementById('betButton').disabled = false;
    document.getElementById('cashoutButton').disabled = true;
    
    // Hide cashout amount
    const cashoutAmount = document.getElementById('cashoutAmount');
    cashoutAmount.classList.remove('active');
    
    // Remove current multiplier from history
    const currentMultiplier = document.getElementById('currentMultiplier');
    if (currentMultiplier) {
        currentMultiplier.remove();
    }
    
    addToHistory(parseFloat(currentGameMultiplier.toFixed(2)));
    
    // Reset background and plane after delay
    setTimeout(() => {
        const plane = document.getElementById('plane');
        plane.style.display = 'none';
        plane.style.transform = 'translate(0, 0)';
        document.getElementById('multiplier-display').textContent = '1.00x';
        backgroundOffset = 0;
        drawBackground(0);
    }, 2000);
}

function showMessage(message, type) {
    const existingMessage = document.querySelector('.game-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `game-message ${type}`;
    messageDiv.textContent = message;
    document.querySelector('.graph-container').appendChild(messageDiv);

    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

function cashOut() {
    if (!isBetting || hasGameEnded) return;
    
    hasGameEnded = true;
    const winnings = Math.floor(currentBetAmount * currentGameMultiplier);
    updateCredits(winnings);
    
    // Show final cashout amount briefly
    const cashoutAmount = document.getElementById('cashoutAmount');
    cashoutAmount.style.color = '#4CAF50';
    cashoutAmount.textContent = `+${winnings}`;
    
    // Show win message
    showMessage(`CASHED OUT ${currentGameMultiplier.toFixed(2)}x (${winnings} credits)`, 'success');
    
    endGame(true);
}

// Initialize with some fake history
for (let i = 0; i < 10; i++) {
    addToHistory(generateRandomMultiplier());
}

// Add a function to reset game data
function resetGameData() {
    if (confirm('Are you sure you want to reset your game data? This will set your credits back to 1000 and clear history.')) {
        localStorage.clear();
        credits = 1000;
        gameHistory = [];
        updateCredits(0);
        updateHistoryDisplay();
        updateHistoryStats();
    }
}

// Modify the updateHistoryDisplay function to handle dates properly
function updateHistoryDisplay() {
    const historyList = document.getElementById('fullHistory');
    
    historyList.innerHTML = gameHistory.map(crash => `
        <div class="history-item" style="border-left: 3px solid ${getMultiplierColor(crash.multiplier)}">
            <span class="multiplier">${crash.multiplier.toFixed(2)}x</span>
            <span class="timestamp">${formatTime(new Date(crash.timestamp))}</span>
        </div>
    `).join('');
    
    document.querySelector('.history-toggle').innerHTML = 
        `History ${isHistoryOpen ? '▲' : '▼'} ${getLatestCrashesHTML()}`;
}

// Add these event listeners to prevent keyboard input
document.addEventListener('DOMContentLoaded', () => {
    const betInput = document.getElementById('betAmount');
    
    betInput.addEventListener('keydown', (e) => {
        e.preventDefault();
    });
    
    betInput.addEventListener('paste', (e) => {
        e.preventDefault();
    });
    
    // Prevent mobile keyboard from showing up
    betInput.addEventListener('focus', (e) => {
        e.target.blur();
    });
});

// Add crash effects
function addCrashEffects(plane) {
    // Create explosion effect
    const explosion = document.createElement('div');
    explosion.className = 'explosion';
    plane.appendChild(explosion);
    
    // Create smoke particles
    for (let i = 0; i < 5; i++) {
        const smoke = document.createElement('div');
        smoke.className = 'smoke';
        smoke.style.animationDelay = `${i * 0.1}s`;
        plane.appendChild(smoke);
    }
}

// Add this function to initialize the canvas
function initCanvas() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    
    // Set canvas size
    function resizeCanvas() {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

// Add this function to draw the background with lighter colors
function drawBackground(offset) {
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw sky gradient with lighter colors
    const skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, '#2c3e50');  // Lighter blue-gray
    skyGradient.addColorStop(1, '#3498db');  // Soft blue
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Draw ground with perspective (lighter color)
    const groundY = height - 40;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(width, groundY);
    ctx.strokeStyle = '#95a5a6';  // Lighter gray
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw grid lines with lighter color
    const gridSize = 50;
    const numLines = Math.ceil(width / gridSize) + 1;
    
    ctx.strokeStyle = 'rgba(236, 240, 241, 0.3)';  // Very light gray with transparency
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let i = 0; i < numLines; i++) {
        const x = (i * gridSize - offset % gridSize);
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x - width * 0.5, height);
        ctx.stroke();
    }
    
    // Draw runway when plane is taking off
    if (offset < width * 0.2) {
        ctx.fillStyle = '#bdc3c7';  // Light gray for runway
        ctx.fillRect(0, groundY - 2, width * 0.2 - offset, 4);
    }
}

// Add this function to update the current multiplier in history
function updateCurrentMultiplier(multiplier) {
    const historyToggle = document.querySelector('.history-toggle');
    const latestCrashes = document.querySelector('.latest-crashes');
    
    // Update or create current multiplier element
    let currentMultiplier = document.getElementById('currentMultiplier');
    if (!currentMultiplier) {
        currentMultiplier = document.createElement('span');
        currentMultiplier.id = 'currentMultiplier';
        currentMultiplier.className = 'current-multiplier';
        latestCrashes.insertBefore(currentMultiplier, latestCrashes.firstChild);
    }
    
    // Update the multiplier value and color
    currentMultiplier.textContent = `${multiplier.toFixed(2)}x`;
    currentMultiplier.style.backgroundColor = getMultiplierColor(multiplier);
}

// Add this function to update the cashout amount
function updateCashoutAmount(multiplier) {
    const cashoutAmount = document.getElementById('cashoutAmount');
    const amount = (currentBetAmount * multiplier).toFixed(2);
    cashoutAmount.textContent = `${amount}`;
    
    if (multiplier > 1) {
        cashoutAmount.classList.add('active');
        // Change color based on profit
        if (multiplier >= 2) {
            cashoutAmount.style.color = '#4CAF50'; // Green for good profit
        } else {
            cashoutAmount.style.color = '#FFA726'; // Orange for small profit
        }
    } else {
        cashoutAmount.classList.remove('active');
    }
}

// Initialize canvas when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initCanvas();
    drawBackground(0);
    // ... other initialization code ...
});
