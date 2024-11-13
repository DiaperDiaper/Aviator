let credits = 1000;
let isBetting = false;
let multiplierHistory = [];
let currentBetAmount = 0;
let currentGameMultiplier = 1.00;
let gameInterval;
let plane;
let crashPoint = 0;
let hasGameEnded = false;

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
    
    // Enable cashout and disable bet button
    document.getElementById('betButton').disabled = true;
    document.getElementById('cashoutButton').disabled = false;
    
    currentGameMultiplier = 1.00;
    const crashPoint = generateRandomMultiplier();
    
    const multiplierDisplay = document.getElementById('multiplier-display');
    const plane = document.getElementById('plane');
    plane.style.display = 'block';
    plane.classList.remove('crashed');
    
    gameInterval = setInterval(() => {
        if (hasGameEnded) return;
        
        currentGameMultiplier += 0.01;
        multiplierDisplay.textContent = `${currentGameMultiplier.toFixed(2)}x`;
        
        // Update plane position
        const progress = (currentGameMultiplier - 1) / (crashPoint - 1);
        const x = progress * 100;
        const y = Math.pow(progress * 1.5, 2) * 70;
        plane.style.transform = `translate(${x}%, ${-y}px)`;
        
        if (currentGameMultiplier >= crashPoint) {
            crashGame();
        }
    }, 50);
}

function crashGame() {
    if (hasGameEnded) return;
    
    hasGameEnded = true;
    const plane = document.getElementById('plane');
    plane.classList.add('crashed');
    
    // Show crash message
    showMessage(`CRASHED @ ${currentGameMultiplier.toFixed(2)}x`, 'crash');
    
    endGame(false);
}

function endGame(cashoutSuccess) {
    clearInterval(gameInterval);
    isBetting = false;
    
    // Reset buttons
    document.getElementById('betButton').disabled = false;
    document.getElementById('cashoutButton').disabled = true;
    
    // Add to history
    addToHistory(parseFloat(currentGameMultiplier.toFixed(2)));
    
    // Hide plane after delay
    setTimeout(() => {
        const plane = document.getElementById('plane');
        plane.style.display = 'none';
        plane.style.transform = 'translate(0, 0)';
        document.getElementById('multiplier-display').textContent = '1.00x';
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
