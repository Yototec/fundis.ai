const canvas = document.getElementById('officeCanvas');
const ctx = canvas.getContext('2d');

const GRID_SIZE = 30;
const COLS = Math.floor(canvas.width / GRID_SIZE);
const ROWS = Math.floor(canvas.height / GRID_SIZE);
const ANIMATION_SPEED = 500;
const REASONING_DISPLAY_TIME = 5000;

const CHAIN_LENGTH_API = "https://api.sentichain.com/blockchain/get_chain_length?network=mainnet";
const REASONING_API_BASE = "https://api.sentichain.com/agent/get_reasoning_match_chunk_end?summary_type=observation_public&user_chunk_end=";

const OBJECTS = {
    EMPTY: 0,
    WALL: 1,
    DESK: 3,
    COMPUTER: 4,
    COFFEE: 5,
    CARPET: 7,
    WINDOW: 8,
    TABLE: 11,
    BAR_TABLE: 12
};

const COLORS = {
    floor: '#ffffff',
    carpet: '#f8f8f8',
    wall: '#cccccc',
    desk: '#8B4513',
    table: '#6d4c41',
    computer: '#333333',
    screen: '#87CEEB',
    skin: '#FFD700',
    body: '#2c3e50',
    eventUniform: '#F7931A',
    sentimentUniform: '#627EEA',
    marketUniform: '#00FFA3',
    quantUniform: '#C3A634',
    window: '#add8e6',
    sky: '#87CEEB',
    cloud: '#ffffff'
};

// OBJECTS constant has been moved to office.js

let apiConnected = false;
let chainLength = 0;
let lastFetchTime = 0;
let currentFetchingTicker = null;
let fetchQueue = [];
let reasoningData = {
    event: null,
    sentiment: null,
    market: null,
    quant: null
};

const DEBUG = true;
function debugLog(message) {
    if (DEBUG) {
        console.log(message);
        const debugDiv = document.getElementById('debug-info');
        if (debugDiv) {
            debugDiv.textContent = message;
            setTimeout(() => {
                debugDiv.textContent = '';
            }, 5000);
        }
    }
}

let office = [];
let people = [];
let animationTimer;
let taskScheduleTimer;
let taskInterval = 10000;
let isTaskInProgress = false;

// Add this near the top with other global variable declarations
let combinedAnalysisResults = null;
let analysisCompleted = false; // Track if the combined analysis is completed

function updateCanvasSize() {
    const gridWidthPx = COLS * GRID_SIZE;
    const gridHeightPx = ROWS * GRID_SIZE;

    canvas.width = gridWidthPx;
    canvas.height = gridHeightPx;
}

function initOffice() {
    updateCanvasSize();

    office = Array(ROWS).fill().map(() => Array(COLS).fill(OBJECTS.EMPTY));
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            office[y][x] = OBJECTS.CARPET;
        }
    }
    for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
            if (x === 0 || y === 0 || x === COLS - 1 || y === ROWS - 1) {
                office[y][x] = OBJECTS.WALL;
            }
        }
    }

    for (let x = 3; x < COLS - 3; x += 3) {
        office[0][x] = OBJECTS.WINDOW;
        office[0][x + 1] = OBJECTS.WINDOW;
    }

    for (let y = 3; y < ROWS - 6; y += 3) {
        office[y][COLS - 1] = OBJECTS.WINDOW;
        office[y + 1][COLS - 1] = OBJECTS.WINDOW;
    }

    for (let x = 0; x < COLS; x++) {
        office[ROWS - 1][x] = OBJECTS.WALL;
    }

    createWorkstation(6, 5);          // Event
    createWorkstation(6, 15);         // Sentiment
    createWorkstation(COLS - 10, 5);    // Market
    createWorkstation(COLS - 10, 15);   // Quant

    // Create a rectangular table in the middle of the office
    const tableWidth = 4;
    const tableHeight = 2;
    const tableCenterX = Math.floor(COLS / 2);
    const tableCenterY = Math.floor(ROWS / 2);

    for (let dx = -Math.floor(tableWidth / 2); dx < Math.ceil(tableWidth / 2); dx++) {
        for (let dy = -Math.floor(tableHeight / 2); dy < Math.ceil(tableHeight / 2); dy++) {
            office[tableCenterY + dy][tableCenterX + dx] = OBJECTS.BAR_TABLE;
        }
    }

    // Create a coffee area (2x2 grid) slightly to the right of center
    const coffeeX = Math.floor(COLS / 2) + 3; // Moved right by 3 spaces
    const coffeeY = Math.floor(ROWS / 2) - 1;
    office[coffeeY][coffeeX] = OBJECTS.COFFEE;
    office[coffeeY][coffeeX + 1] = OBJECTS.COFFEE;
    office[coffeeY + 1][coffeeX] = OBJECTS.COFFEE;
    office[coffeeY + 1][coffeeX + 1] = OBJECTS.COFFEE;

    const deskPositions = {
        event: { x: 6, y: 6 },
        sentiment: { x: 6, y: 16 },
        market: { x: COLS - 10, y: 6 },
        quant: { x: COLS - 10, y: 16 }
    };

    people = [
        new Person(deskPositions.event.x, deskPositions.event.y, 'Event Analyst', 'event'),
        new Person(deskPositions.sentiment.x, deskPositions.sentiment.y, 'Sentiment Analyst', 'sentiment'),
        new Person(deskPositions.market.x, deskPositions.market.y, 'Market Analyst', 'market'),
        new Person(deskPositions.quant.x, deskPositions.quant.y, 'Quant Analyst', 'quant')
    ];

    // Add tab switching functionality for mobile
    const tabButtons = document.querySelectorAll('.tab-button');

    // Set initial state - terminal is active by default on mobile
    if (window.innerWidth <= 767) {
        document.body.classList.remove('office-active');
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Update active tab button
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // Switch view based on selected tab
            if (tabName === 'office') {
                document.body.classList.add('office-active');
            } else {
                document.body.classList.remove('office-active');
            }
        });
    });

    canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const clickX = Math.floor((e.clientX - rect.left) / GRID_SIZE);
        const clickY = Math.floor((e.clientY - rect.top) / GRID_SIZE);

        let clickedOnAnalyst = false;
        
        // Check if clicked on an analyst
        for (const person of people) {
            if (person.x === clickX && person.y === clickY) {
                clickedOnAnalyst = true;
                
                // Only show analyst data if analysis is completed
                if (analysisCompleted) {
                    const ticker = person.ticker.toLowerCase();
                    const full = reasoningData[ticker];
                    const terminalContent = document.getElementById('terminalContent');
                    if (terminalContent) {
                        if (full) {
                            terminalContent.innerHTML = `<strong>=== ${person.name} Analysis ===</strong>\n\n${full}\n`;
                        } else {
                            terminalContent.innerHTML = `<strong>=== ${person.name} Analysis ===</strong>\n\n<em>No data available</em>\n`;
                        }
                    }
                }
                break;
            }
        }
        
        // If clicked elsewhere and we have combined results, show them
        if (!clickedOnAnalyst && combinedAnalysisResults && analysisCompleted) {
            const terminalContent = document.getElementById('terminalContent');
            if (terminalContent) {
                terminalContent.innerHTML = combinedAnalysisResults;
            }
        }
    });
}

function createWorkstation(x, y) {
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = 0; dy <= 0; dy++) {
            office[y + dy][x + dx] = OBJECTS.DESK;
        }
    }

    office[y - 1][x] = OBJECTS.COMPUTER;
}

function isWalkable(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    if (
        office[y][x] === OBJECTS.WALL ||
        office[y][x] === OBJECTS.DESK ||
        office[y][x] === OBJECTS.COMPUTER ||
        office[y][x] === OBJECTS.TABLE ||
        office[y][x] === OBJECTS.BAR_TABLE ||
        office[y][x] === OBJECTS.COFFEE
    ) {
        return false;
    }
    for (const p of people) {
        if (p.x === x && p.y === y) {
            return false;
        }
    }
    return true;
}

function findDeskForTicker(ticker) {
    const deskPositions = {
        event: { x: 6, y: 6 },
        sentiment: { x: 6, y: 16 },
        market: { x: COLS - 10, y: 6 },
        quant: { x: COLS - 10, y: 16 }
    };
    if (deskPositions[ticker.toLowerCase()]) {
        return deskPositions[ticker.toLowerCase()];
    }
    return { x: 10, y: 10 };
}

function findPath(startX, startY, endX, endY) {
    const openSet = [{ x: startX, y: startY, g: 0, h: 0, f: 0, parent: null }];
    const closedSet = [];
    while (openSet.length > 0) {
        let currentIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
            if (openSet[i].f < openSet[currentIndex].f) {
                currentIndex = i;
            }
        }
        const current = openSet[currentIndex];
        if (current.x === endX && current.y === endY) {
            const path = [];
            let temp = current;
            while (temp.parent) {
                path.push({ x: temp.x, y: temp.y });
                temp = temp.parent;
            }
            return path.reverse();
        }
        openSet.splice(currentIndex, 1);
        closedSet.push(current);

        const neighbors = [
            { x: current.x - 1, y: current.y },
            { x: current.x + 1, y: current.y },
            { x: current.x, y: current.y - 1 },
            { x: current.x, y: current.y + 1 }
        ];
        for (const n of neighbors) {
            if (!isWalkable(n.x, n.y) ||
                closedSet.some(cl => cl.x === n.x && cl.y === n.y)) {
                continue;
            }
            const g = current.g + 1;
            const h = Math.abs(n.x - endX) + Math.abs(n.y - endY);
            const f = g + h;
            const existing = openSet.find(o => o.x === n.x && o.y === n.y);
            if (existing && g >= existing.g) {
                continue;
            }
            if (existing) {
                existing.g = g;
                existing.f = f;
                existing.parent = current;
            } else {
                openSet.push({ x: n.x, y: n.y, g, h, f, parent: current });
            }
        }
        if (closedSet.length > 200) {
            return [];
        }
    }
    return [];
}

function drawSpeechBubble(x, y, text) {
    const maxWidth = 120;
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];
    ctx.font = '12px Arial';

    for (let i = 1; i < words.length; i++) {
        const w = words[i];
        const width = ctx.measureText(currentLine + ' ' + w).width;
        if (width < maxWidth) {
            currentLine += ' ' + w;
        } else {
            lines.push(currentLine);
            currentLine = w;
        }
    }
    lines.push(currentLine);

    const lineHeight = 14;
    const bubbleWidth = maxWidth + 10;
    const bubbleHeight = (lines.length * lineHeight) + 10;

    const bubbleX = x;
    const bubbleY = y - bubbleHeight;

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bubbleX - bubbleWidth / 2, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY);
    ctx.lineTo(bubbleX + bubbleWidth / 2, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX + 5, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX, bubbleY + bubbleHeight + 10);
    ctx.lineTo(bubbleX - 5, bubbleY + bubbleHeight);
    ctx.lineTo(bubbleX - bubbleWidth / 2, bubbleY + bubbleHeight);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    for (let i = 0; i < lines.length; i++) {
        ctx.fillText(
            lines[i],
            bubbleX,
            bubbleY + 15 + (i * lineHeight)
        );
    }
}

function drawOffice() {
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, -GRID_SIZE, canvas.width, GRID_SIZE);

    drawClouds();

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const cellX = x * GRID_SIZE;
            const cellY = y * GRID_SIZE;
            switch (office[y][x]) {
                case OBJECTS.CARPET:
                    // Base carpet color
                    ctx.fillStyle = COLORS.carpet;
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    // Add carpet texture and pattern
                    const patternType = (x + Math.floor(y / 2)) % 3; // Create different pattern sections

                    // Draw carpet fibers and texture
                    ctx.strokeStyle = ((x + y) % 2 === 0) ? '#e5e0da' : '#d8d4ce';
                    ctx.lineWidth = 0.4;

                    if (patternType === 0) {
                        // Diagonal texture pattern
                        ctx.beginPath();
                        for (let i = 0; i < GRID_SIZE; i += 3) {
                            ctx.moveTo(cellX, cellY + i);
                            ctx.lineTo(cellX + i, cellY);

                            ctx.moveTo(cellX + GRID_SIZE, cellY + i);
                            ctx.lineTo(cellX + GRID_SIZE - i, cellY);

                            ctx.moveTo(cellX + i, cellY + GRID_SIZE);
                            ctx.lineTo(cellX, cellY + GRID_SIZE - i);

                            ctx.moveTo(cellX + GRID_SIZE - i, cellY + GRID_SIZE);
                            ctx.lineTo(cellX + GRID_SIZE, cellY + GRID_SIZE - i);
                        }
                        ctx.stroke();
                    } else if (patternType === 1) {
                        // Square pattern with subtle details
                        ctx.beginPath();
                        ctx.rect(cellX + 4, cellY + 4, GRID_SIZE - 8, GRID_SIZE - 8);
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.rect(cellX + 8, cellY + 8, GRID_SIZE - 16, GRID_SIZE - 16);
                        ctx.stroke();
                    } else {
                        // Dotted texture effect
                        for (let i = 4; i < GRID_SIZE; i += 6) {
                            for (let j = 4; j < GRID_SIZE; j += 6) {
                                ctx.beginPath();
                                ctx.arc(cellX + i, cellY + j, 0.5, 0, Math.PI * 2);
                                ctx.stroke();
                            }
                        }
                    }

                    // Add subtle color variation to create depth
                    if ((x * y) % 5 === 0) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
                        ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);
                    }

                    // Add occasional "wear" marks on the carpet
                    if ((x * y) % 31 === 0) {
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                        const wearSize = 3 + Math.random() * 4;
                        ctx.beginPath();
                        ctx.arc(
                            cellX + GRID_SIZE / 2 + (Math.random() * 6 - 3),
                            cellY + GRID_SIZE / 2 + (Math.random() * 6 - 3),
                            wearSize, 0, Math.PI * 2
                        );
                        ctx.fill();
                    }
                    break;

                case OBJECTS.WALL:
                    ctx.fillStyle = COLORS.wall;
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);
                    ctx.strokeStyle = '#bbb';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(cellX, cellY, GRID_SIZE, GRID_SIZE);
                    break;

                case OBJECTS.WINDOW:
                    // Check if this is part of a larger window
                    let isPartOfLargerWindow = false;
                    let windowWidth = GRID_SIZE;
                    let windowHeight = GRID_SIZE;

                    // Check if it's part of a horizontal window on top wall
                    if (y === 0) {
                        // Look left to find start of window
                        let windowStart = x;
                        while (windowStart > 0 && office[y][windowStart - 1] === OBJECTS.WINDOW) {
                            windowStart--;
                        }

                        // Look right to find end of window
                        let windowEnd = x;
                        while (windowEnd < COLS - 1 && office[y][windowEnd + 1] === OBJECTS.WINDOW) {
                            windowEnd++;
                        }

                        windowWidth = (windowEnd - windowStart + 1) * GRID_SIZE;

                        // Only draw at the leftmost cell of the window
                        if (x === windowStart) {
                            // Wall around the window frame
                            ctx.fillStyle = COLORS.wall;
                            ctx.fillRect(cellX, cellY, windowWidth, GRID_SIZE);

                            // Sky visible through the window
                            ctx.fillStyle = COLORS.sky;
                            ctx.fillRect(cellX + 4, cellY + 4, windowWidth - 8, GRID_SIZE - 8);

                            // Draw clouds visible through the window
                            drawWindowClouds(cellX + 4, cellY + 4, windowWidth - 8, GRID_SIZE - 8);

                            // Window frame (vertical dividers)
                            ctx.fillStyle = COLORS.wall;
                            for (let i = 1; i < (windowEnd - windowStart + 1); i++) {
                                ctx.fillRect(cellX + i * GRID_SIZE - 1, cellY + 4, 2, GRID_SIZE - 8);
                            }

                            // Frame edge details
                            ctx.strokeStyle = '#555';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(cellX + 4, cellY + 4, windowWidth - 8, GRID_SIZE - 8);

                            // Window reflection/light effect
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                            ctx.beginPath();
                            ctx.moveTo(cellX + 6, cellY + 6);
                            ctx.lineTo(cellX + windowWidth / 4, cellY + 6);
                            ctx.lineTo(cellX + 6, cellY + GRID_SIZE / 2);
                            ctx.closePath();
                            ctx.fill();
                        }

                        isPartOfLargerWindow = true;
                    }

                    // Check if it's part of a vertical window on right wall
                    if (x === COLS - 1) {
                        // Look up to find start of window
                        let windowStart = y;
                        while (windowStart > 0 && office[windowStart - 1][x] === OBJECTS.WINDOW) {
                            windowStart--;
                        }

                        // Look down to find end of window
                        let windowEnd = y;
                        while (windowEnd < ROWS - 1 && office[windowEnd + 1][x] === OBJECTS.WINDOW) {
                            windowEnd++;
                        }

                        windowHeight = (windowEnd - windowStart + 1) * GRID_SIZE;

                        // Only draw at the topmost cell of the window
                        if (y === windowStart) {
                            // Wall around the window frame
                            ctx.fillStyle = COLORS.wall;
                            ctx.fillRect(cellX, cellY, GRID_SIZE, windowHeight);

                            // Sky visible through the window
                            ctx.fillStyle = COLORS.sky;
                            ctx.fillRect(cellX + 4, cellY + 4, GRID_SIZE - 8, windowHeight - 8);

                            // Draw clouds visible through the window
                            drawWindowClouds(cellX + 4, cellY + 4, GRID_SIZE - 8, windowHeight - 8);

                            // Window frame (horizontal dividers)
                            ctx.fillStyle = COLORS.wall;
                            for (let i = 1; i < (windowEnd - windowStart + 1); i++) {
                                ctx.fillRect(cellX + 4, cellY + i * GRID_SIZE - 1, GRID_SIZE - 8, 2);
                            }

                            // Frame edge details
                            ctx.strokeStyle = '#555';
                            ctx.lineWidth = 1;
                            ctx.strokeRect(cellX + 4, cellY + 4, GRID_SIZE - 8, windowHeight - 8);

                            // Window reflection/light effect
                            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                            ctx.beginPath();
                            ctx.moveTo(cellX + 6, cellY + 6);
                            ctx.lineTo(cellX + GRID_SIZE / 2, cellY + 6);
                            ctx.lineTo(cellX + 6, cellY + windowHeight / 4);
                            ctx.closePath();
                            ctx.fill();
                        }

                        isPartOfLargerWindow = true;
                    }

                    // If not part of a larger window or not the start cell, don't draw anything
                    if (!isPartOfLargerWindow) {
                        // Original single window code for windows not on the edges
                        ctx.fillStyle = COLORS.wall;
                        ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                        ctx.fillStyle = COLORS.sky;
                        ctx.fillRect(cellX + 4, cellY + 4, GRID_SIZE - 8, GRID_SIZE - 8);

                        drawWindowClouds(cellX + 4, cellY + 4, GRID_SIZE - 8, GRID_SIZE - 8);

                        ctx.fillStyle = COLORS.wall;
                        ctx.fillRect(cellX + GRID_SIZE / 2 - 1, cellY + 4, 2, GRID_SIZE - 8);
                        ctx.fillRect(cellX + 4, cellY + GRID_SIZE / 2 - 1, GRID_SIZE - 8, 2);

                        ctx.strokeStyle = '#555';
                        ctx.lineWidth = 1;
                        ctx.strokeRect(cellX + 4, cellY + 4, GRID_SIZE - 8, GRID_SIZE - 8);

                        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                        ctx.beginPath();
                        ctx.moveTo(cellX + 6, cellY + 6);
                        ctx.lineTo(cellX + GRID_SIZE / 3, cellY + 6);
                        ctx.lineTo(cellX + 6, cellY + GRID_SIZE / 3);
                        ctx.closePath();
                        ctx.fill();
                    }
                    break;

                case OBJECTS.DESK:
                    ctx.fillStyle = COLORS.desk;
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    ctx.fillStyle = '#7a3b11';
                    ctx.fillRect(cellX + 2, cellY + 2, GRID_SIZE - 4, GRID_SIZE - 4);

                    ctx.strokeStyle = '#5d2906';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();

                    for (let i = 1; i < 8; i++) {
                        const yOffset = cellY + 2 + i * (GRID_SIZE - 4) / 8;
                        ctx.moveTo(cellX + 2, yOffset);
                        ctx.lineTo(cellX + GRID_SIZE - 2, yOffset);

                        if (i % 2 === 0) {
                            ctx.moveTo(cellX + 2, yOffset - 1);
                            ctx.bezierCurveTo(
                                cellX + GRID_SIZE / 3, yOffset - 3,
                                cellX + GRID_SIZE * 2 / 3, yOffset + 3,
                                cellX + GRID_SIZE - 2, yOffset - 1
                            );
                        }
                    }

                    for (let i = 1; i < 4; i++) {
                        const xOffset = cellX + 2 + i * (GRID_SIZE - 4) / 4;
                        ctx.moveTo(xOffset, cellY + 2);
                        ctx.lineTo(xOffset, cellY + GRID_SIZE - 2);
                    }

                    ctx.stroke();

                    ctx.strokeStyle = '#8B4513';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(cellX + 2, cellY + 2, GRID_SIZE - 4, GRID_SIZE - 4);
                    break;

                case OBJECTS.COMPUTER:
                    // Draw desk surface under computer
                    ctx.fillStyle = '#f5f5f5';
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    // Monitor stand - more elegant design
                    ctx.fillStyle = '#222222';
                    ctx.beginPath();
                    ctx.moveTo(cellX + GRID_SIZE * 0.4, cellY + GRID_SIZE * 0.75);
                    ctx.lineTo(cellX + GRID_SIZE * 0.6, cellY + GRID_SIZE * 0.75);
                    ctx.lineTo(cellX + GRID_SIZE * 0.55, cellY + GRID_SIZE * 0.85);
                    ctx.lineTo(cellX + GRID_SIZE * 0.45, cellY + GRID_SIZE * 0.85);
                    ctx.closePath();
                    ctx.fill();

                    // Stand base
                    ctx.fillStyle = '#333333';
                    ctx.beginPath();
                    ctx.ellipse(
                        cellX + GRID_SIZE / 2,
                        cellY + GRID_SIZE * 0.85,
                        GRID_SIZE * 0.2,
                        GRID_SIZE * 0.06,
                        0, 0, Math.PI * 2
                    );
                    ctx.fill();

                    // Neck of the stand
                    ctx.fillStyle = '#222222';
                    ctx.fillRect(
                        cellX + GRID_SIZE * 0.47,
                        cellY + GRID_SIZE * 0.55,
                        GRID_SIZE * 0.06,
                        GRID_SIZE * 0.2
                    );

                    // Monitor frame - outside bezel
                    ctx.fillStyle = COLORS.computer;
                    roundedRect(
                        ctx,
                        cellX + GRID_SIZE * 0.15,
                        cellY + GRID_SIZE * 0.1,
                        GRID_SIZE * 0.7,
                        GRID_SIZE * 0.45,
                        4
                    );

                    // Screen - inside of bezel
                    ctx.fillStyle = COLORS.screen;
                    roundedRect(
                        ctx,
                        cellX + GRID_SIZE * 0.17,
                        cellY + GRID_SIZE * 0.12,
                        GRID_SIZE * 0.66,
                        GRID_SIZE * 0.41,
                        2
                    );

                    // Determine what ticker to show based on location
                    let ticker = '';
                    const deskX = Math.floor(cellX / GRID_SIZE);
                    const deskY = Math.floor(cellY / GRID_SIZE);

                    if (deskX < COLS / 2 && deskY < ROWS / 2) ticker = 'event';
                    else if (deskX < COLS / 2) ticker = 'sentiment';
                    else if (deskY < ROWS / 2) ticker = 'market';
                    else ticker = 'quant';

                    // Chart data based on ticker
                    const chartColor = ticker === 'event' ? '#F7931A' :
                        ticker === 'sentiment' ? '#627EEA' :
                            ticker === 'market' ? '#00FFA3' : '#C3A634';

                    // Draw screen content - price chart
                    ctx.strokeStyle = chartColor;
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.moveTo(cellX + GRID_SIZE * 0.18, cellY + GRID_SIZE * 0.32);

                    // Create a price chart specific to the ticker
                    const points = 8;
                    const volatility = ticker === 'event' ? 0.05 :
                        ticker === 'sentiment' ? 0.07 :
                            ticker === 'market' ? 0.09 : 0.11;

                    // Generate the chart line
                    let prevY = cellY + GRID_SIZE * (0.32 - Math.random() * 0.1);
                    for (let i = 1; i <= points; i++) {
                        const x = cellX + GRID_SIZE * (0.18 + (i * 0.64 / points));
                        const direction = Math.random() > 0.5 ? 1 : -1;
                        const change = Math.random() * volatility * direction;
                        const y = prevY + change * GRID_SIZE;
                        // Keep the chart within the screen bounds
                        const yBounded = Math.max(cellY + GRID_SIZE * 0.13,
                            Math.min(cellY + GRID_SIZE * 0.52, y));
                        ctx.lineTo(x, yBounded);
                        prevY = yBounded;
                    }
                    ctx.stroke();

                    // Screen horizontal lines (data rows)
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 0.5;
                    ctx.globalAlpha = 0.2;
                    for (let i = 0; i < 4; i++) {
                        ctx.beginPath();
                        ctx.moveTo(cellX + GRID_SIZE * 0.17, cellY + GRID_SIZE * (0.18 + i * 0.09));
                        ctx.lineTo(cellX + GRID_SIZE * 0.83, cellY + GRID_SIZE * (0.18 + i * 0.09));
                        ctx.stroke();
                    }
                    ctx.globalAlpha = 1.0;

                    // Small indicator light
                    ctx.fillStyle = '#00ff00';
                    ctx.beginPath();
                    ctx.arc(
                        cellX + GRID_SIZE * 0.15 + 3,
                        cellY + GRID_SIZE * 0.1 + 3,
                        2,
                        0, Math.PI * 2
                    );
                    ctx.fill();

                    // Add logo/ticker to the screen
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '6px Arial';
                    ctx.textAlign = 'left';
                    ctx.fillText(
                        ticker.toUpperCase(),
                        cellX + GRID_SIZE * 0.19,
                        cellY + GRID_SIZE * 0.17
                    );

                    // Price indicators
                    ctx.font = '6px Arial';
                    ctx.fillText(
                        `$${Math.floor(1000 + Math.random() * 9000)}`,
                        cellX + GRID_SIZE * 0.72,
                        cellY + GRID_SIZE * 0.17
                    );

                    // Screen reflection
                    ctx.fillStyle = '#ffffff';
                    ctx.globalAlpha = 0.05;
                    ctx.beginPath();
                    ctx.moveTo(cellX + GRID_SIZE * 0.17, cellY + GRID_SIZE * 0.12);
                    ctx.lineTo(cellX + GRID_SIZE * 0.6, cellY + GRID_SIZE * 0.12);
                    ctx.lineTo(cellX + GRID_SIZE * 0.35, cellY + GRID_SIZE * 0.25);
                    ctx.lineTo(cellX + GRID_SIZE * 0.17, cellY + GRID_SIZE * 0.25);
                    ctx.closePath();
                    ctx.fill();
                    ctx.globalAlpha = 1.0;

                    // Draw keyboard
                    ctx.fillStyle = '#222222';
                    roundedRect(
                        ctx,
                        cellX + GRID_SIZE * 0.25,
                        cellY + GRID_SIZE * 0.65,
                        GRID_SIZE * 0.5,
                        GRID_SIZE * 0.1,
                        2
                    );

                    // Keyboard keys
                    ctx.fillStyle = '#444444';
                    for (let i = 0; i < 3; i++) {
                        for (let j = 0; j < 8; j++) {
                            ctx.fillRect(
                                cellX + GRID_SIZE * (0.26 + j * 0.06),
                                cellY + GRID_SIZE * (0.66 + i * 0.03),
                                GRID_SIZE * 0.05,
                                GRID_SIZE * 0.02
                            );
                        }
                    }
                    break;

                case OBJECTS.COFFEE:
                    // Enhanced coffee machine rendering
                    const centerX = Math.floor(COLS / 2) + 3; // Moved right by 3 spaces
                    const centerY = Math.floor(ROWS / 2) - 0.5;
                    const isCenterPiece = (x === Math.floor(centerX) && y === Math.floor(centerY));

                    // Base/counter
                    ctx.fillStyle = '#8B4513';
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    ctx.fillStyle = '#D2B48C';
                    ctx.fillRect(cellX + 2, cellY + 2, GRID_SIZE - 4, GRID_SIZE - 4);

                    // Draw different parts of the coffee machine based on position
                    if (x === Math.floor(centerX) && y === Math.floor(centerY)) {
                        // Main coffee machine body in top-left cell
                        ctx.fillStyle = '#333';
                        ctx.fillRect(cellX + 5, cellY + 5, GRID_SIZE - 10, GRID_SIZE - 15);

                        // Control panel
                        ctx.fillStyle = '#222';
                        ctx.fillRect(cellX + 5, cellY + GRID_SIZE - 15, GRID_SIZE - 10, 10);

                        // Buttons
                        ctx.fillStyle = '#f00';
                        ctx.beginPath();
                        ctx.arc(cellX + 15, cellY + GRID_SIZE - 10, 3, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#0f0';
                        ctx.beginPath();
                        ctx.arc(cellX + 25, cellY + GRID_SIZE - 10, 3, 0, Math.PI * 2);
                        ctx.fill();

                        // Screen
                        ctx.fillStyle = '#336699';
                        ctx.fillRect(cellX + GRID_SIZE / 2 - 10, cellY + GRID_SIZE - 14, 20, 8);

                    } else if (x === Math.floor(centerX) + 1 && y === Math.floor(centerY)) {
                        // Top-right: Coffee grinder
                        ctx.fillStyle = '#444';
                        ctx.fillRect(cellX + 5, cellY + 5, GRID_SIZE - 15, GRID_SIZE - 10);

                        // Bean container
                        ctx.fillStyle = '#222';
                        ctx.beginPath();
                        ctx.arc(cellX + 12, cellY + GRID_SIZE / 3, GRID_SIZE / 4, 0, Math.PI * 2);
                        ctx.fill();

                        // Coffee beans
                        ctx.fillStyle = '#654321';
                        for (let i = 0; i < 5; i++) {
                            ctx.beginPath();
                            ctx.ellipse(
                                cellX + 12 + (Math.random() * 10 - 5),
                                cellY + GRID_SIZE / 3 + (Math.random() * 10 - 5),
                                3, 2, Math.random() * Math.PI, 0, Math.PI * 2
                            );
                            ctx.fill();
                        }
                    } else if (x === Math.floor(centerX) && y === Math.floor(centerY) + 1) {
                        // Bottom-left: Coffee dispensing area
                        ctx.fillStyle = '#222';
                        ctx.fillRect(cellX + 5, cellY + 5, GRID_SIZE - 10, GRID_SIZE / 3);

                        // Drip area
                        ctx.fillStyle = '#111';
                        ctx.fillRect(cellX + GRID_SIZE / 2 - 8, cellY + GRID_SIZE / 3, 16, 2);

                        // Coffee spouts
                        ctx.fillStyle = '#222';
                        ctx.fillRect(cellX + GRID_SIZE / 2 - 5, cellY + GRID_SIZE / 3 + 2, 2, 5);
                        ctx.fillRect(cellX + GRID_SIZE / 2 + 3, cellY + GRID_SIZE / 3 + 2, 2, 5);

                        // Coffee cup
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(cellX + GRID_SIZE / 2 - 7, cellY + GRID_SIZE / 2, 14, 10);
                        ctx.fillStyle = '#6F4E37';
                        ctx.fillRect(cellX + GRID_SIZE / 2 - 5, cellY + GRID_SIZE / 2 + 2, 10, 6);
                    } else if (x === Math.floor(centerX) + 1 && y === Math.floor(centerY) + 1) {
                        // Bottom-right: Supplies and cups
                        const cupColors = ['#fff', '#e0e0e0', '#f0f0f0'];
                        const cupCount = 5;

                        // Stack of cups
                        for (let i = 0; i < cupCount; i++) {
                            ctx.fillStyle = cupColors[i % cupColors.length];
                            ctx.beginPath();
                            ctx.arc(cellX + GRID_SIZE / 3, cellY + GRID_SIZE / 3 - i * 3, 8, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.beginPath();
                            ctx.ellipse(cellX + GRID_SIZE / 3, cellY + GRID_SIZE / 3 - i * 3, 8, 3, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }

                        // Coffee packets
                        ctx.fillStyle = '#A52A2A';
                        ctx.fillRect(cellX + GRID_SIZE / 2 + 2, cellY + 10, 12, 8);
                        ctx.fillRect(cellX + GRID_SIZE / 2 + 5, cellY + 18, 12, 8);

                        // Sugar packets
                        ctx.fillStyle = '#fff';
                        ctx.fillRect(cellX + GRID_SIZE / 2, cellY + GRID_SIZE / 2, 10, 5);
                        ctx.fillRect(cellX + GRID_SIZE / 2 + 3, cellY + GRID_SIZE / 2 + 5, 10, 5);
                    }
                    break;

                case OBJECTS.TABLE:
                    // Draw table
                    ctx.fillStyle = COLORS.table;
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    // Table surface with wood grain
                    ctx.fillStyle = '#8B5A2B';
                    ctx.fillRect(cellX + 2, cellY + 2, GRID_SIZE - 4, GRID_SIZE - 4);

                    // Wood grain effect
                    ctx.strokeStyle = '#7C4A2A';
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();

                    // Add wood grain lines
                    for (let i = 1; i < 5; i++) {
                        const lineY = cellY + 2 + i * (GRID_SIZE - 4) / 5;
                        ctx.moveTo(cellX + 2, lineY);
                        ctx.lineTo(cellX + GRID_SIZE - 2, lineY);

                        // Add some wavy grain pattern
                        const waveY = cellY + 2 + (i - 0.5) * (GRID_SIZE - 4) / 5;
                        ctx.moveTo(cellX + 2, waveY);
                        ctx.bezierCurveTo(
                            cellX + GRID_SIZE / 3, waveY - 1,
                            cellX + GRID_SIZE * 2 / 3, waveY + 1,
                            cellX + GRID_SIZE - 2, waveY
                        );
                    }

                    ctx.stroke();

                    // Add border to make the table appear more polished
                    ctx.strokeStyle = '#6B4226';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(cellX + 2, cellY + 2, GRID_SIZE - 4, GRID_SIZE - 4);
                    break;

                case OBJECTS.BAR_TABLE:
                    // Check if this is part of a larger bar table
                    let isTopEdge = y > 0 ? office[y - 1][x] !== OBJECTS.BAR_TABLE : true;
                    let isBottomEdge = y < ROWS - 1 ? office[y + 1][x] !== OBJECTS.BAR_TABLE : true;
                    let isLeftEdge = x > 0 ? office[y][x - 1] !== OBJECTS.BAR_TABLE : true;
                    let isRightEdge = x < COLS - 1 ? office[y][x + 1] !== OBJECTS.BAR_TABLE : true;

                    // Corner pieces (where to draw legs)
                    let isTopLeftCorner = isTopEdge && isLeftEdge;
                    let isTopRightCorner = isTopEdge && isRightEdge;
                    let isBottomLeftCorner = isBottomEdge && isLeftEdge;
                    let isBottomRightCorner = isBottomEdge && isRightEdge;

                    // Always draw the table top surface
                    // Dark wood top with consistent coloring
                    ctx.fillStyle = '#3A2313';

                    // Draw the top surface with seamless connections
                    ctx.fillRect(
                        cellX + (isLeftEdge ? 2 : 0),
                        cellY + (isTopEdge ? 2 : 0),
                        GRID_SIZE - (isLeftEdge ? 2 : 0) - (isRightEdge ? 2 : 0),
                        GRID_SIZE / 2 - (isTopEdge ? 2 : 0)
                    );

                    // Add glossy finish to the top only on top edge
                    if (isTopEdge) {
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                        ctx.fillRect(
                            cellX + (isLeftEdge ? 4 : 0),
                            cellY + 4,
                            GRID_SIZE - (isLeftEdge ? 4 : 0) - (isRightEdge ? 4 : 0),
                            2
                        );
                    }

                    // Draw table frame/supports to fill the gap between tabletop and legs
                    ctx.fillStyle = '#2A1A0A'; // Darker wood for the frame

                    // Left support
                    if (isLeftEdge) {
                        ctx.fillRect(
                            cellX + 2,
                            cellY + GRID_SIZE / 2,
                            GRID_SIZE / 4 - 3,
                            GRID_SIZE / 8
                        );
                    }

                    // Right support
                    if (isRightEdge) {
                        ctx.fillRect(
                            cellX + GRID_SIZE * 3 / 4,
                            cellY + GRID_SIZE / 2,
                            GRID_SIZE / 4 - 2,
                            GRID_SIZE / 8
                        );
                    }

                    // Center support that spans the width if not at the edge
                    if (!isLeftEdge || !isRightEdge) {
                        ctx.fillRect(
                            cellX + (isLeftEdge ? GRID_SIZE / 4 : 0),
                            cellY + GRID_SIZE / 2,
                            GRID_SIZE - (isLeftEdge ? GRID_SIZE / 4 : 0) - (isRightEdge ? GRID_SIZE / 4 : 0),
                            GRID_SIZE / 8
                        );
                    }

                    // Draw the metal legs only at corners
                    ctx.fillStyle = '#B8B8B8';
                    if (isTopLeftCorner && isBottomEdge) {
                        // Top-left leg
                        ctx.fillRect(cellX + GRID_SIZE / 4 - 1, cellY + GRID_SIZE / 2 + GRID_SIZE / 8, 2, GRID_SIZE / 2 - GRID_SIZE / 8);
                    }

                    if (isTopRightCorner && isBottomEdge) {
                        // Top-right leg
                        ctx.fillRect(cellX + GRID_SIZE * 3 / 4 - 1, cellY + GRID_SIZE / 2 + GRID_SIZE / 8, 2, GRID_SIZE / 2 - GRID_SIZE / 8);
                    }

                    if (isBottomLeftCorner) {
                        // Bottom-left leg
                        ctx.fillRect(cellX + GRID_SIZE / 4 - 1, cellY + GRID_SIZE / 2 + GRID_SIZE / 8, 2, GRID_SIZE / 2 - GRID_SIZE / 8);
                    }

                    if (isBottomRightCorner) {
                        // Bottom-right leg
                        ctx.fillRect(cellX + GRID_SIZE * 3 / 4 - 1, cellY + GRID_SIZE / 2 + GRID_SIZE / 8, 2, GRID_SIZE / 2 - GRID_SIZE / 8);
                    }

                    // Draw foot rest bar only on bottom edge
                    if (isBottomEdge) {
                        ctx.strokeStyle = '#B8B8B8';
                        ctx.lineWidth = 2;
                        ctx.beginPath();

                        // Adjust the starting and ending points to connect between table legs
                        let startX = isLeftEdge ? cellX + GRID_SIZE / 4 : cellX;
                        let endX = isRightEdge ? cellX + GRID_SIZE * 3 / 4 : cellX + GRID_SIZE;

                        ctx.moveTo(startX, cellY + GRID_SIZE * 3 / 4);
                        ctx.lineTo(endX, cellY + GRID_SIZE * 3 / 4);
                        ctx.stroke();
                    }

                    // Add border/outline but only on edges
                    ctx.strokeStyle = '#222';
                    ctx.lineWidth = 1;

                    // Top edge
                    if (isTopEdge) {
                        ctx.beginPath();
                        ctx.moveTo(cellX + (isLeftEdge ? 2 : 0), cellY + 2);
                        ctx.lineTo(cellX + GRID_SIZE - (isRightEdge ? 2 : 0), cellY + 2);
                        ctx.stroke();
                    }

                    // Left edge
                    if (isLeftEdge) {
                        ctx.beginPath();
                        ctx.moveTo(cellX + 2, cellY + (isTopEdge ? 2 : 0));
                        ctx.lineTo(cellX + 2, cellY + GRID_SIZE / 2);
                        ctx.stroke();
                    }

                    // Right edge
                    if (isRightEdge) {
                        ctx.beginPath();
                        ctx.moveTo(cellX + GRID_SIZE - 2, cellY + (isTopEdge ? 2 : 0));
                        ctx.lineTo(cellX + GRID_SIZE - 2, cellY + GRID_SIZE / 2);
                        ctx.stroke();
                    }

                    // Bottom edge of tabletop
                    ctx.beginPath();
                    ctx.moveTo(cellX + (isLeftEdge ? 2 : 0), cellY + GRID_SIZE / 2);
                    ctx.lineTo(cellX + GRID_SIZE - (isRightEdge ? 2 : 0), cellY + GRID_SIZE / 2);
                    ctx.stroke();
                    break;

                default:
                    ctx.fillStyle = COLORS.floor;
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);
            }
        }
    }
}

function drawClouds() {
    const time = Date.now() / 10000;
    ctx.fillStyle = COLORS.cloud;

    for (let i = 0; i < 5; i++) {
        const x = ((i * 100) + time * 20) % canvas.width;
        const y = -GRID_SIZE / 2;
        const size = GRID_SIZE * (0.8 + Math.sin(i) * 0.3);

        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.arc(x + size / 3, y - size / 3, size / 3, 0, Math.PI * 2);
        ctx.arc(x - size / 3, y - size / 4, size / 3, 0, Math.PI * 2);
        ctx.arc(x + size / 2, y, size / 4, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPeople() {
    for (const person of people) {
        person.draw();
    }
}

function update() {
    for (const person of people) {
        person.update();
    }

    // Update the dog
    dog.update();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    if (isMobileView) {
        ctx.translate(canvasOffset.x + 50, canvasOffset.y);
    }

    drawOffice();
    drawPeople();

    // Draw the dog
    dog.draw();

    ctx.restore();
}

function animate() {
    update();
    requestAnimationFrame(draw);
}

function connectToApi() {
    if (!apiConnected) {
        // Get API key and symbol from form
        const apiKey = document.getElementById('apiKey').value;
        const selectedSymbol = document.getElementById('symbolSelect').value;

        if (!apiKey) {
            updateSyncStatus("Error: API Key is required");
            return;
        }

        debugLog(`Connecting with API key and symbol: ${selectedSymbol}`);

        apiConnected = true;
        updateConnectionStatus(true);

        // Update terminal content to show analyst is in action
        const terminalContent = document.getElementById('terminalContent');
        if (terminalContent) {
            terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>
<div class="terminal-instructions">Event Analyst is analyzing ${selectedSymbol}...</div>`;
        }

        // Disable random tasks for all agents
        isTaskInProgress = true;
        clearTimeout(taskScheduleTimer);

        // Reset any ongoing tasks
        fetchQueue = [];
        currentFetchingTicker = null;

        // Start animation
        if (!animationTimer) {
            animationTimer = setInterval(animate, ANIMATION_SPEED);
        }

        // Find the Event and Sentiment Analysts
        const eventAnalyst = people.find(p => p.ticker.toLowerCase() === 'event');
        const sentimentAnalyst = people.find(p => p.ticker.toLowerCase() === 'sentiment');
        const marketAnalyst = people.find(p => p.ticker.toLowerCase() === 'market');
        const quantAnalyst = people.find(p => p.ticker.toLowerCase() === 'quant');

        // Global variable to store combined results
        window.combinedAnalysisResults = '';

        // Force all analysts to be at their desks
        if (eventAnalyst && sentimentAnalyst && marketAnalyst && quantAnalyst) {
            // Start the sequential analysis process with Event Agent
            // Pass a callback that will start Sentiment Agent when Event Agent finishes
            setTimeout(() => {
                startSequentialAnalysis(
                    eventAnalyst,
                    selectedSymbol,
                    apiKey,
                    'initial_market_analysis',
                    'events',
                    () => {
                        // After Event Agent finishes, start Sentiment Agent
                        // Update terminal message for Sentiment Analyst
                        if (terminalContent) {
                            terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>
<div class="terminal-instructions">Sentiment Analyst is analyzing ${selectedSymbol}...</div>`;
                            terminalContent.innerHTML += `\n\n${window.combinedAnalysisResults}`;
                        }

                        startSequentialAnalysis(
                            sentimentAnalyst,
                            selectedSymbol,
                            apiKey,
                            'initial_sentiment_analysis',
                            'sentiments',
                            () => {
                                // After Sentiment Agent finishes, start Market Agent
                                // Update terminal message for Market Analyst
                                if (terminalContent) {
                                    terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>
<div class="terminal-instructions">Market Analyst is analyzing ${selectedSymbol}...</div>`;
                                    terminalContent.innerHTML += `\n\n${window.combinedAnalysisResults}`;
                                }

                                startSequentialAnalysis(
                                    marketAnalyst,
                                    selectedSymbol,
                                    apiKey,
                                    'initial_market_analysis',
                                    'markets',
                                    () => {
                                        // After Market Agent finishes, start Quant Agent
                                        // Update terminal message for Quant Analyst
                                        if (terminalContent) {
                                            terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>
<div class="terminal-instructions">Quant Analyst is analyzing ${selectedSymbol}...</div>`;
                                            terminalContent.innerHTML += `\n\n${window.combinedAnalysisResults}`;
                                        }

                                        startSequentialAnalysis(
                                            quantAnalyst,
                                            selectedSymbol,
                                            apiKey,
                                            'initial_quant_analysis',
                                            'quants',
                                            () => {
                                                // After all analysts have completed their individual analyses
                                                // Start the combined analysis
                                                performCombinedAnalysis(selectedSymbol, apiKey);
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }, 1000);
        }

        // Disable other analysts from speaking except those who are analyzing
        for (const person of people) {
            // Allow all four analysts to speak
            if (person.ticker.toLowerCase() !== 'event' &&
                person.ticker.toLowerCase() !== 'sentiment' &&
                person.ticker.toLowerCase() !== 'market' &&
                person.ticker.toLowerCase() !== 'quant') {
                // Override speak method for other analysts
                person.originalSpeak = person.speak;
                person.speak = function () { }; // Empty function to prevent speaking
                person.state = 'idle';
            }
        }

        debugLog(`Started sequential analysis for ${selectedSymbol}`);
    }
}

function formatAsTable(data) {
    try {
        // Parse the data if it's a string
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;

        if (!Array.isArray(jsonData)) {
            return data; // Return original if not an array
        }

        // Set a maximum width for the summary column to prevent table from extending too far
        // Use different widths for mobile and desktop
        const MAX_SUMMARY_WIDTH = isMobileView ? 25 : 50;

        // Find the maximum length of timestamp
        let maxTimestampLength = 'TIMESTAMP'.length;

        jsonData.forEach(item => {
            if (item.timestamp && item.timestamp.length > maxTimestampLength) {
                maxTimestampLength = item.timestamp.length;
            }
        });

        // Create header row with padding
        let table = '┌' + '─'.repeat(maxTimestampLength + 2) + '┬' + '─'.repeat(MAX_SUMMARY_WIDTH + 2) + '┐\n';
        table += '│ ' + 'TIMESTAMP'.padEnd(maxTimestampLength) + ' │ ' + 'SUMMARY'.padEnd(MAX_SUMMARY_WIDTH) + ' │\n';
        table += '├' + '─'.repeat(maxTimestampLength + 2) + '┼' + '─'.repeat(MAX_SUMMARY_WIDTH + 2) + '┤\n';

        // Add data rows with text wrapping for summary
        jsonData.forEach(item => {
            if (item.timestamp && item.summary) {
                const timestamp = item.timestamp;
                const summary = item.summary;

                // Wrap the summary text if it's longer than MAX_SUMMARY_WIDTH
                const wrappedSummary = wrapText(summary, MAX_SUMMARY_WIDTH);
                const lines = wrappedSummary.split('\n');

                // First line includes both timestamp and summary
                table += '│ ' + timestamp.padEnd(maxTimestampLength) + ' │ ' + lines[0].padEnd(MAX_SUMMARY_WIDTH) + ' │\n';

                // Remaining lines (if any) only include summary, with timestamp area blank
                for (let i = 1; i < lines.length; i++) {
                    table += '│ ' + ' '.repeat(maxTimestampLength) + ' │ ' + lines[i].padEnd(MAX_SUMMARY_WIDTH) + ' │\n';
                }
            }
        });

        // Add bottom border
        table += '└' + '─'.repeat(maxTimestampLength + 2) + '┴' + '─'.repeat(MAX_SUMMARY_WIDTH + 2) + '┘\n';

        return table;
    } catch (error) {
        console.error("Error formatting data as table:", error);
        return data; // Return original on error
    }
}

// Helper function to wrap text to a specified width
function wrapText(text, maxWidth) {
    if (!text || text.length <= maxWidth) {
        return text;
    }

    const words = text.split(' ');
    let wrappedText = '';
    let line = '';

    for (const word of words) {
        const testLine = line ? line + ' ' + word : word;

        if (testLine.length <= maxWidth) {
            line = testLine;
        } else {
            // If the current line plus the next word would exceed maxWidth,
            // add the current line to the result and start a new line
            wrappedText += (wrappedText ? '\n' : '') + line;
            line = word;
        }
    }

    // Add the last line
    if (line) {
        wrappedText += (wrappedText ? '\n' : '') + line;
    }

    return wrappedText;
}

// Modified version that handles the specific format of Event Analyst data
function formatAnalystData(data) {
    try {
        // Check if this is Event Analyst data by looking for typical block headers
        if (typeof data === 'string' &&
            (data.includes("Block 0-49:") ||
                data.includes("Block 50-99:") ||
                data.includes("Block 100-149:") ||
                data.includes("Block 150-199:"))) {

            // Split the string by block sections
            const blocks = data.split(/Block \d+-\d+:/g).filter(block => block.trim());
            let formattedData = "";

            // Get the original block headers
            const blockHeaders = [];
            let tempData = data;
            const blockRegex = /Block \d+-\d+:/g;
            let match;
            while ((match = blockRegex.exec(tempData)) !== null) {
                blockHeaders.push(match[0]);
            }

            // Process each block
            blocks.forEach((block, index) => {
                if (index < blockHeaders.length) {
                    formattedData += `\n${blockHeaders[index]}\n`;
                }

                try {
                    // Extract the JSON array from the block
                    const jsonMatch = block.match(/\[\s*\{[\s\S]*\}\s*\]/);
                    if (jsonMatch) {
                        const jsonData = JSON.parse(jsonMatch[0]);
                        formattedData += formatAsTable(jsonData);
                    } else {
                        formattedData += block; // If no JSON found, keep original
                    }
                } catch (e) {
                    console.error("Error parsing block JSON:", e);
                    formattedData += block; // On error, keep original
                }
            });

            return formattedData;
        }

        return data; // Return original if not Event Analyst data
    } catch (error) {
        console.error("Error formatting Event Analyst data:", error);
        return data; // Return original on error
    }
}

// Updated function to handle sequential analysis with callback
function startSequentialAnalysis(analyst, symbol, apiKey, summaryType, analysisType, onCompleteCallback) {
    // Define the chunks to analyze
    const chunks = [
        { start: 0, end: 49 },
        { start: 50, end: 99 },
        { start: 100, end: 149 },
        { start: 150, end: 199 }
    ];

    let agentResults = '';
    let currentChunk = 0;

    // Get analyst name for display purposes
    const analystName = analyst.name;

    // Process chunks sequentially
    function processNextChunk() {
        if (currentChunk >= chunks.length) {
            // All chunks processed
            updateSyncStatus(`${analystName} analysis complete!`);

            // Format the results as a table for all analysts
            let formattedResults = agentResults;
            if (['event', 'sentiment', 'market', 'quant'].includes(analyst.ticker.toLowerCase())) {
                formattedResults = formatAnalystData(agentResults);
            }

            // Store results in reasoningData for individual analyst access
            reasoningData[analyst.ticker.toLowerCase()] = formattedResults;

            // Store results in the combined results
            if (window.combinedAnalysisResults) {
                window.combinedAnalysisResults += '\n\n';
            }
            window.combinedAnalysisResults += `<strong>=== ${analystName} Analysis Results ===</strong>\n\n${formattedResults}`;

            // Display combined results
            const terminalContent = document.getElementById('terminalContent');
            if (terminalContent) {
                terminalContent.innerHTML = window.combinedAnalysisResults;
            }

            // Reset the analyst state
            analyst.isFetching = false;
            analyst.state = 'idle';

            // If there's a callback, execute it
            if (onCompleteCallback) {
                setTimeout(() => {
                    // If starting next analyst, don't set isTaskInProgress to false yet
                    onCompleteCallback();
                }, 1000);
            } else {
                // If this is the last analyst, set isTaskInProgress to false
                isTaskInProgress = false;
            }

            return;
        }

        const chunk = chunks[currentChunk];
        const message = `Analyzing ${symbol} ${analysisType} from block ${chunk.start} to block ${chunk.end}...`;

        // Show the message in the terminal
        updateSyncStatus(message);
        analyst.speak(message);
        analyst.isFetching = true;
        analyst.state = 'working';

        // Update terminal to show progress
        const terminalContent = document.getElementById('terminalContent');
        if (terminalContent) {
            let content = `<strong>=== ${analystName} Analysis ===</strong>\n\n`;
            content += `<span style="color: #0f0">[${new Date().toLocaleTimeString()}] ${message}</span>\n\n`;

            // Show previous agent's results if any
            if (window.combinedAnalysisResults) {
                content += `<strong>Previous Results:</strong>\n${window.combinedAnalysisResults}\n\n`;
            }

            // Show current agent's progress
            if (agentResults) {
                // Format the results as a table for all analysts
                let formattedResults = agentResults;
                if (['event', 'sentiment', 'market', 'quant'].includes(analyst.ticker.toLowerCase())) {
                    formattedResults = formatAnalystData(agentResults);
                }
                content += `<strong>Current Progress:</strong>\n${formattedResults}\n`;
            }

            terminalContent.innerHTML = content;
        }

        // Simulate API call with setTimeout
        setTimeout(() => {
            // Construct the API URL
            const apiUrl = `https://api.sentichain.com/agent/get_reasoning?ticker=${symbol}&summary_type=${summaryType}&chunk_start=${chunk.start}&chunk_end=${chunk.end}&api_key=${apiKey}`;

            // Make the API call
            fetchDataFromApi(apiUrl, symbol, chunk.start, chunk.end)
                .then(result => {
                    // Append result to all results
                    if (result) {
                        if (agentResults) agentResults += '\n\n';
                        agentResults += `Block ${chunk.start}-${chunk.end}:\n${result}`;
                    }

                    // Move to next chunk
                    currentChunk++;
                    processNextChunk();
                })
                .catch(error => {
                    console.error("Error fetching data:", error);
                    updateSyncStatus(`Error analyzing blocks ${chunk.start}-${chunk.end}: ${error.message}`);

                    // Move to next chunk despite error
                    currentChunk++;
                    processNextChunk();
                });
        }, 3000); // 3 second delay to simulate processing time
    }

    // Start processing the first chunk
    processNextChunk();
}

// Function to fetch data from API
async function fetchDataFromApi(apiUrl, symbol, chunkStart, chunkEnd) {
    try {
        debugLog(`Fetching data from: ${apiUrl}`);
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.reasoning) {
            return data.reasoning;
        } else {
            return `No reasoning data found for ${symbol} blocks ${chunkStart}-${chunkEnd}`;
        }
    } catch (error) {
        console.error("API call failed:", error);
        return `Error: Failed to fetch data for ${symbol} blocks ${chunkStart}-${chunkEnd}`;
    }
}

function disconnectFromApi() {
    if (apiConnected) {
        apiConnected = false;
        updateConnectionStatus(false);
        stopTaskScheduler();
        currentFetchingTicker = null;
        fetchQueue = [];
        isTaskInProgress = false;
        combinedAnalysisResults = null;
        analysisCompleted = false; // Reset the analysis completion flag
        
        for (const p of people) {
            p.isFetching = false;

            // Restore original speak functionality if it was overridden
            if (p.originalSpeak) {
                p.speak = p.originalSpeak;
                p.originalSpeak = null;
            }
        }

        // Reset the connect button text
        const connectBtn = document.getElementById('connectBtn');
        if (connectBtn) {
            connectBtn.textContent = 'Connect';
        }

        // Reset API form
        updateTerminalDisplay();

        debugLog("API Disconnected");
    }
}

function updateConnectionStatus(status) {
    const statusDot = document.getElementById('api-status-dot');
    if (!statusDot) return;

    statusDot.classList.remove('connected-dot', 'disconnected-dot', 'connecting-dot');

    if (status === true || status === 'connected') {
        statusDot.classList.add('connected-dot');
        apiConnected = true;
    } else if (status === 'connecting') {
        statusDot.classList.add('connecting-dot');
        // Leave apiConnected as is (should be false)
    } else {
        statusDot.classList.add('disconnected-dot');
        apiConnected = false;
    }
}

async function fetchChainData() {
    if (!apiConnected) return;
    try {
        debugLog("Fetching chain data...");
        updateSyncStatus("Checking blockchain for new data...");
        const response = await fetch(CHAIN_LENGTH_API);
        const data = await response.json();
        if (data && data.chain_length) {
            chainLength = data.chain_length;
            const chainInfoElement = document.getElementById('chain-info');
            chainInfoElement.innerHTML = `Block Height: <a href="https://sentichain.com/app?tab=BlockExplorer&block=last#" target="_blank">${chainLength}</a> (SentiChain ${data.network})`;
            if (chainLength > lastFetchTime) {
                updateSyncStatus("Blockchain data sync complete.");
                queueReasoningFetches(true);
                lastFetchTime = chainLength;
            } else {
                updateSyncStatus("No new blockchain data.");
                queueReasoningFetches(false);
            }
        }
    } catch (err) {
        console.error("Error fetching blockchain data", err);
        debugLog("Error fetching blockchain data");
        updateSyncStatus("Error checking blockchain data");
    }
}

function queueReasoningFetches(hasNewData) {
    fetchQueue = [];
    if (currentFetchingTicker) {
        const p = people.find(x => x.ticker.toLowerCase() === currentFetchingTicker);
        if (p) p.isFetching = false;
    }
    currentFetchingTicker = null;

    const tickers = ['event', 'sentiment', 'market', 'quant'];
    const shuffledTickers = [...tickers].sort(() => Math.random() - 0.5);

    shuffledTickers.forEach(ticker => {
        fetchQueue.push({ ticker, hasNewData });
    });

    debugLog(`Queue: ${fetchQueue.map(item => item.ticker).join(', ')} (hasNewData: ${hasNewData})`);

    if (!isTaskInProgress) {
        scheduleNextTask();
    }
}

function processQueue() {
    if (!apiConnected || fetchQueue.length === 0 || currentFetchingTicker || isTaskInProgress) {
        debugLog(`Skipping queue: connected=${apiConnected}, length=${fetchQueue.length}, current=${currentFetchingTicker}, taskInProgress=${isTaskInProgress}`);
        return;
    }

    isTaskInProgress = true;

    const queueItem = fetchQueue.shift();
    const ticker = queueItem.ticker;
    const hasNewData = queueItem.hasNewData;
    const symbol = queueItem.symbol || document.getElementById('symbolSelect').value || 'BTC';

    currentFetchingTicker = ticker;
    debugLog(`Processing: ${ticker} for ${symbol} (newData: ${hasNewData})`);

    const person = people.find(p => p.ticker.toLowerCase() === ticker);
    if (person) {
        person.startFetching();
        fetchReasoningData(ticker, hasNewData, symbol);
    } else {
        debugLog(`No person for ticker: ${ticker}`);
        currentFetchingTicker = null;
        isTaskInProgress = false;
        scheduleNextTask();
    }
}

async function fetchReasoningData(ticker, hasNewData, symbol) {
    if (!apiConnected || !chainLength) {
        currentFetchingTicker = null;
        isTaskInProgress = false;
        debugLog("Abort fetch: Not connected or no block information");
        scheduleNextTask();
        return;
    }

    const person = people.find(p => p.ticker.toLowerCase() === ticker);
    const observerName = person ? person.name : `${ticker.toUpperCase()} Observer`;

    const displayInterval = setInterval(() => {
        updateTerminalDisplay();
    }, 200);

    if (!hasNewData) {
        debugLog(`Simulating analysis for ${ticker} on ${symbol} (no new data)...`);

        const analysisTime = 5000 + Math.random() * 3000;

        setTimeout(() => {
            updateSyncStatus(`${observerName} revised ${symbol} analysis and found nothing new.`);

            if (person) {
                person.speak(`${symbol} analysis revision complete`);
                person.isFetching = false;

                setTimeout(() => {
                    if (person.isFetching === false) {
                        person.wander();
                        person.state = 'walking';
                        person.speak('Taking a break');
                    }
                }, 1000);
            }

            currentFetchingTicker = null;
            isTaskInProgress = false;

            clearInterval(displayInterval);

            addToTerminalHistory(`${observerName} completed ${symbol} analysis - no changes detected`);
            updateTerminalDisplay();

            setTimeout(() => {
                if (document.getElementById('fetch-status').textContent.includes("revised analysis")) {
                    updateSyncStatus("");
                }
            }, 3000);

            scheduleNextTask();
        }, analysisTime);

        return;
    }

    try {
        debugLog(`Fetching reasoning for ${ticker} on ${symbol}...`);

        const apiKey = document.getElementById('apiKey').value;
        const url = `${REASONING_API_BASE}${chainLength}&ticker=${ticker.toUpperCase()}&symbol=${symbol}&api_key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data && data.reasoning) {
            reasoningData[ticker] = data.reasoning;
            if (person) {
                clearInterval(displayInterval);
                person.displayReasoning(data.reasoning);

                setTimeout(() => {
                    if (person.isFetching === false) {
                        person.wander();
                        person.state = 'walking';
                        person.speak('Taking a break');
                    }
                }, 3000);
            } else {
                debugLog(`No person found for ticker after fetch: ${ticker}`);
                updateSyncStatus(`${observerName} finished ${symbol} analysis and found something new!`);
                clearInterval(displayInterval);
                currentFetchingTicker = null;
                isTaskInProgress = false;
                scheduleNextTask();
            }
        } else {
            debugLog(`No reasoning data for ${ticker} on ${symbol}`);
            updateSyncStatus(`${observerName} finished ${symbol} analysis and found nothing new.`);
            if (person) {
                person.isFetching = false;

                setTimeout(() => {
                    if (person.isFetching === false) {
                        person.wander();
                        person.state = 'walking';
                        person.speak('Taking a break');
                    }
                }, 1000);
            }
            clearInterval(displayInterval);
            currentFetchingTicker = null;
            isTaskInProgress = false;
            scheduleNextTask();
        }

        setTimeout(() => {
            if (document.getElementById('fetch-status').textContent.includes("finished analysis")) {
                updateSyncStatus("");
            }
        }, 3000);
    } catch (err) {
        console.error(`Error fetching reasoning for ${ticker} on ${symbol}`, err);
        debugLog(`Error fetching reasoning for ${ticker} on ${symbol}`);
        updateSyncStatus(`Error during ${observerName}'s ${symbol} analysis`);
        if (person) {
            person.isFetching = false;

            setTimeout(() => {
                person.wander();
                person.state = 'walking';
                person.speak('Something went wrong');
            }, 1000);
        }
        clearInterval(displayInterval);
        currentFetchingTicker = null;
        isTaskInProgress = false;
        scheduleNextTask();
    }
}

function updateSyncStatus(msg) {
    const el = document.getElementById('fetch-status');
    if (el) {
        el.textContent = msg;
    }

    if (msg && (msg.includes("performing analysis") || msg.includes("finished analysis") || msg.includes("revised analysis"))) {
        addToTerminalHistory(msg);
    }
}

let terminalHistory = [];
const MAX_HISTORY = 50;

function addToTerminalHistory(msg) {
    const timestamp = new Date().toLocaleTimeString();
    terminalHistory.push(`[${timestamp}] ${msg}`);
    if (terminalHistory.length > MAX_HISTORY) {
        terminalHistory.shift();
    }
    updateTerminalDisplay();
}

function getAnalysisSteps(ticker) {
    return [
        "Pulling market data",
        "Performing market analysis",
        "Building quantitative and risk models",
        "Pulling sentiment data",
        "Analyzing market sentiment (bullish/bearish indicators)",
        "Identifying major market events"
    ];
}

function getDetailedAnalysisContent(ticker) {
    const person = people.find(p => p.ticker.toLowerCase() === ticker);
    const observerName = person ? person.name : `${ticker.toUpperCase()} Observer`;
    const timestamp = new Date().toLocaleTimeString();

    const steps = getAnalysisSteps(ticker);
    const currentStep = Math.floor(Math.random() * steps.length);

    let content = `<strong>=== ${observerName} Live Analysis ===</strong>\n`;
    content += `<span style="color: #888;">[${timestamp}] Analysis in progress...</span>\n\n`;

    steps.forEach((step, index) => {
        if (index < currentStep) {
            content += `<span style="color: #0f0">✓</span> ${step}\n`;
        } else if (index === currentStep) {
            content += `<span style="color: #ff0">▶</span> ${step} <span class="blink">...</span>\n`;
        } else {
            content += `<span style="color: #888">○</span> ${step}\n`;
        }
    });

    return content;
}

function updateTerminalDisplay() {
    const terminalContent = document.getElementById('terminalContent');
    if (!terminalContent) return;

    if (currentFetchingTicker) {
        const person = people.find(p => p.ticker.toLowerCase() === currentFetchingTicker);
        if (person && person.isFetching) {
            if (person.reasoningText) {
                const timestamp = new Date().toLocaleTimeString();
            } else {
                const analysisContent = getDetailedAnalysisContent(currentFetchingTicker);
                terminalContent.innerHTML = analysisContent;
            }
            return;
        }
    }

    // If we have combined analysis results, show them
    if (combinedAnalysisResults) {
        terminalContent.innerHTML = combinedAnalysisResults;
        return;
    }

    // If not connected, show the API form
    if (!apiConnected) {
        // Get any existing values to preserve them
        const apiKey = document.getElementById('apiKey')?.value || '';
        const selectedSymbol = document.getElementById('symbolSelect')?.value || 'BTC';

        terminalContent.innerHTML = `
            <div id="branding">Welcome to Fundis.AI</div>
            <div class="terminal-form">
                <div class="form-group">
                    <label for="apiKey">Please input your API Key:</label>
                    <input type="text" id="apiKey" class="terminal-input" value="${apiKey}" placeholder="Paste or type your API key here">
                </div>
                <div class="form-group">
                    <label for="symbolSelect">Please select a Symbol:</label>
                    <select id="symbolSelect" class="terminal-select">
                        <option value="BTC" ${selectedSymbol === 'BTC' ? 'selected' : ''}>BTC</option>
                        <option value="ETH" ${selectedSymbol === 'ETH' ? 'selected' : ''}>ETH</option>
                        <option value="DOGE" ${selectedSymbol === 'DOGE' ? 'selected' : ''}>DOGE</option>
                    </select>
                </div>
            </div>`;
    } else {
        // Show terminal history when connected
        terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>\n=== Terminal History ===\n\n${terminalHistory.join('\n')}\n`;
    }
}

function startTaskScheduler() {
    if (apiConnected) {
        debugLog("Starting task scheduler");
        checkForTasks();
    }
}

function stopTaskScheduler() {
    debugLog("Stopping task scheduler");
    clearTimeout(taskScheduleTimer);
}

function scheduleNextTask() {
    if (!apiConnected) return;

    if (fetchQueue.length > 0) {
        debugLog(`Scheduling next task in ${taskInterval / 1000} seconds`);
        taskScheduleTimer = setTimeout(() => {
            processQueue();
        }, taskInterval);
    } else {
        debugLog("No tasks in queue, will check for new data");
        taskScheduleTimer = setTimeout(() => {
            checkForTasks();
        }, taskInterval);
    }
}

function checkForTasks() {
    if (apiConnected) {
        if (!isTaskInProgress && fetchQueue.length === 0) {
            fetchChainData();
        } else {
            scheduleNextTask();
        }
    }
}

function start() {
    initOffice();
    if (animationTimer) clearInterval(animationTimer);
    if (taskScheduleTimer) clearTimeout(taskScheduleTimer);
    currentFetchingTicker = null;
    fetchQueue = [];
    isTaskInProgress = false;
    animationTimer = setInterval(animate, ANIMATION_SPEED);
    updateConnectionStatus(false);
    debugLog("Simulation started");
}

let canvasOffset = { x: 0, y: 0 };
let isDragging = false;
let startDragX = 0;
let isMobileView = window.innerWidth < 768;

function setupMobileScrolling() {
    if (!canvas) return;

    // Reset canvas offset when switching between mobile and desktop modes
    window.addEventListener('resize', () => {
        const newIsMobileView = window.innerWidth < 768;

        // Reset offset when switching view modes
        if (isMobileView !== newIsMobileView) {
            canvasOffset = { x: 0, y: 0 };
            // Force a redraw
            requestAnimationFrame(draw);
        }

        isMobileView = newIsMobileView;
    });

    canvas.addEventListener('touchstart', (e) => {
        if (isMobileView) {
            isDragging = true;
            startDragX = e.touches[0].clientX;
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (isMobileView && isDragging) {
            const currentX = e.touches[0].clientX;
            const deltaX = currentX - startDragX;

            canvasOffset.x += deltaX;

            // Get actual canvas dimensions
            const canvasRect = canvas.getBoundingClientRect();

            // Asymmetric scrolling - more to the right, less to the left
            const leftPadding = canvasRect.width * -0.35;  // Less padding on left
            const rightPadding = canvasRect.width * 0.25;  // More padding on right
            const maxScroll = Math.max(0, canvas.width - canvasRect.width + rightPadding);

            // Allow scrolling with asymmetric limits
            canvasOffset.x = Math.min(rightPadding, Math.max(-maxScroll + leftPadding, canvasOffset.x));

            startDragX = currentX;

            // Force an immediate redraw
            requestAnimationFrame(draw);

            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        isDragging = false;
    });

    canvas.addEventListener('mousedown', (e) => {
        if (isMobileView) {
            isDragging = true;
            startDragX = e.clientX;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (isMobileView && isDragging) {
            const deltaX = e.clientX - startDragX;
            canvasOffset.x += deltaX;

            // Get actual canvas dimensions
            const canvasRect = canvas.getBoundingClientRect();

            // Asymmetric scrolling - more to the right, less to the left
            const leftPadding = canvasRect.width * 0.1;  // Less padding on left
            const rightPadding = canvasRect.width * 0.8;  // More padding on right
            const maxScroll = Math.max(0, canvas.width - canvasRect.width + rightPadding);

            // Allow scrolling with asymmetric limits
            canvasOffset.x = Math.min(rightPadding, Math.max(-maxScroll + leftPadding, canvasOffset.x));

            startDragX = e.clientX;

            // Force an immediate redraw
            requestAnimationFrame(draw);
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Also handle mouse leaving the canvas
    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
    });
}

start();

setupMobileScrolling();

// Make sure all analysts are at their desks initially
people.forEach(person => {
    person.x = person.desk.x;
    person.y = person.desk.y;
    person.state = 'idle';
    person.facingDirection = 'up';
});

// Override the speak method for all analysts to use emojis/symbols when not analyzing
people.forEach(person => {
    // Store the original speak method
    person.originalTaskSpeak = person.speak;

    // Replace with a version that uses symbols/emojis for non-task communication
    person.speak = function (message) {
        // If the message contains analysis-related content, use the actual message
        if (message.includes('Analyzing') || message.includes('analysis') ||
            this.isFetching || this.state === 'working') {
            person.originalTaskSpeak.call(this, message);
        } else {
            // For non-task communication, use symbols/emojis instead
            const symbolMessages = [
                "✨ 📊 💹",
                "📈 🔍 ⚡",
                "🚀 ⭐ 📊",
                "💯 📉 🔄",
                "⚙️ 🔢 #@!",
                "💻 🔮 📝",
                "🧮 %$#@!",
                "👀 💹 ⁉️",
                "🤔 📊 ⁉️",
                "@#$%!",
                "?!&*@",
                "!?...",
                "$$$ 📊 ⚡"
            ];

            const randomSymbols = symbolMessages[Math.floor(Math.random() * symbolMessages.length)];
            person.originalTaskSpeak.call(this, randomSymbols);
        }
    };
});

// Assign symbolic starting activities for all analysts at desk
people[0].speak('📊 💹 🔍');
people[1].speak('📈 ⭐ 🔮');
people[2].speak('💯 📉 🔄');
people[3].speak('🧮 🔢 💹');

// Still delay starting the task scheduler to give analysts time to initialize
// setTimeout(startTaskScheduler, 5000);

// Helper function for drawing rounded rectangles
function roundedRect(context, x, y, width, height, radius) {
    context.beginPath();
    context.moveTo(x + radius, y);
    context.lineTo(x + width - radius, y);
    context.quadraticCurveTo(x + width, y, x + width, y + radius);
    context.lineTo(x + width, y + height - radius);
    context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    context.lineTo(x + radius, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - radius);
    context.lineTo(x, y + radius);
    context.quadraticCurveTo(x, y, x + radius, y);
    context.closePath();
    context.fill();
}

// Add click event listener to the API status dot
document.getElementById('api-status-dot').addEventListener('click', () => {
    if (apiConnected) {
        disconnectFromApi();
    } else {
        const apiKey = document.getElementById('apiKey').value;
        if (!apiKey) {
            updateSyncStatus("Error: API Key is required");
            return;
        }

        // First show connecting state
        updateConnectionStatus('connecting');
        connectToApi();
    }
});

// Add event listener for the API key input to allow pressing Enter to connect
document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const connectBtn = document.getElementById('connectBtn');

    if (apiKeyInput) {
        apiKeyInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter' && !apiConnected) {
                const apiKey = apiKeyInput.value;
                if (apiKey) {
                    updateConnectionStatus('connecting');
                    connectToApi();
                } else {
                    updateSyncStatus("Error: API Key is required");
                }
            }
        });
    }

    // Make Connect button visible and add event listener
    if (connectBtn) {
        connectBtn.style.display = 'block';
        connectBtn.addEventListener('click', () => {
            if (apiConnected) {
                disconnectFromApi();
                connectBtn.textContent = 'Connect';
            } else {
                const apiKey = document.getElementById('apiKey').value;
                if (apiKey) {
                    updateConnectionStatus('connecting');
                    connectToApi();
                    connectBtn.textContent = 'Disconnect';
                } else {
                    updateSyncStatus("Error: API Key is required");
                }
            }
        });
    }
});

// Add this new function for drawing clouds in windows
function drawWindowClouds(x, y, width, height) {
    const time = Date.now() / 10000; // Same timing as main clouds for consistency
    ctx.fillStyle = COLORS.cloud;

    // Save context to clip clouds to window area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, width, height);
    ctx.clip();

    // Draw 3 smaller clouds visible through window
    for (let i = 0; i < 3; i++) {
        const cloudX = x + ((i * width / 2) + time * 15) % (width * 2) - width / 4;
        const cloudY = y + height / 3 + Math.sin(time + i) * (height / 6);
        const size = width * (0.3 + Math.sin(i + time) * 0.1);

        ctx.beginPath();
        ctx.arc(cloudX, cloudY, size / 2, 0, Math.PI * 2);
        ctx.arc(cloudX + size / 4, cloudY - size / 4, size / 3, 0, Math.PI * 2);
        ctx.arc(cloudX - size / 4, cloudY - size / 5, size / 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// Create a dog instance
let dog = new Dog();

// Make the dog only speak in emojis/symbols
if (dog.speak) {
    dog.originalSpeak = dog.speak;
    dog.speak = function (message) {
        // Only use emoji messages for the dog
        const dogEmojis = [
            "🐶 !!",
            "🐕 ❤️ 🦮",
            "🐾 🐾 🐾",
            "🦴 🐶 !",
            "🐕‍🦺 💫 ✨",
            "🐩 💭 💤",
            "🐕 #!?",
            "✨ 🦮 !!",
            "🐶 ??? 🐾"
        ];
        const randomEmoji = dogEmojis[Math.floor(Math.random() * dogEmojis.length)];
        dog.originalSpeak.call(this, randomEmoji);
    };
}

// Modify the update function to include the dog
function update() {
    for (const person of people) {
        person.update();
    }

    // Update the dog
    dog.update();
}

// Modify the draw function to include the dog
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();

    if (isMobileView) {
        ctx.translate(canvasOffset.x + 50, canvasOffset.y);
    }

    drawOffice();
    drawPeople();

    // Draw the dog
    dog.draw();

    ctx.restore();
}

// Add dog petting ability to Person class
Person.prototype.petDog = function () {
    if (dog.isPettable(this)) {
        if (dog.getPetBy(this)) {
            this.state = 'pettingDog';
            this.stateTime = 0;
            this.speak("🐶 ❤️ !");
            return true;
        }
    }
    return false;
};

// Add a dog petting state to the Person update function
const originalUpdate = Person.prototype.update;
Person.prototype.update = function () {
    // Add new dog petting state
    if (this.state === 'pettingDog') {
        this.stateTime++;
        if (this.stateTime > 8) {
            this.state = 'idle';
            this.stateTime = 0;

            // Say something nice about the dog using emojis
            const dogComments = [
                "🐶 ❤️ !",
                "🐕 👍 ✨",
                "🐾 😊 ✨",
                "🐶 🌟 !",
                "🐕 🦴 🎉"
            ];
            this.speak(dogComments[Math.floor(Math.random() * dogComments.length)]);
        }
        return;
    }

    // Call the original update
    originalUpdate.call(this);

    // Add dog interaction logic at the end
    if (this.state === 'idle' && Math.random() < 0.01) {
        if (dog.isPettable(this)) {
            this.petDog();
        }
    }
};

// Add optional dog finding to idle behavior
const originalIdle = people[0].constructor.prototype.wander;
Person.prototype.wander = function () {
    // 20% chance to try to find the dog instead of random wandering
    if (Math.random() < 0.2) {
        this.setDestination(dog.x, dog.y);
        this.speak("🐶 👀 ?");
    } else {
        originalIdle.call(this);
    }
};

const originalFindInteraction = Person.prototype.findInteraction;
if (originalFindInteraction) {
    Person.prototype.findInteraction = function () {
        // Instead of moving to interact with words, just use symbols/emojis
        const possiblePartners = people.filter(p => p !== this && !p.isFetching);
        if (possiblePartners.length > 0) {
            const partner = possiblePartners[Math.floor(Math.random() * possiblePartners.length)];
            this.speak(`👋 📊 ?`);

            // Set a timer for them to respond
            setTimeout(() => {
                if (!partner.isFetching) {
                    partner.speak(`📈 👍 ✨`);
                }
            }, 1500);
        } else {
            // Just talk to the office in general
            this.speak("📊 📈 ❓");
        }
    };
}

// Override any methods that would use English phrases
if (Person.prototype.wander) {
    const originalBaseWander = Person.prototype.wander;
    Person.prototype.wander = function () {
        // Just speak a random emoji message 
        if (Math.random() < 0.3) {
            const wanderEmojis = [
                "💹 📊 🔍",
                "📈 🧮 ⚡",
                "💻 ⚙️ 👀",
                "🔢 💯 !",
                "@# 💼 ?"
            ];
            this.speak(wanderEmojis[Math.floor(Math.random() * wanderEmojis.length)]);
        }
    };
}

// Override other methods that might use speech
if (Person.prototype.goToTable) {
    const originalGoToTable = Person.prototype.goToTable;
    Person.prototype.goToTable = function () {
        originalGoToTable.call(this);
        this.speak("🪑 🍽️ ⏱️");
    };
}

if (Person.prototype.goToCoffee) {
    const originalGoToCoffee = Person.prototype.goToCoffee;
    Person.prototype.goToCoffee = function () {
        originalGoToCoffee.call(this);
        this.speak("☕ 🎯 👍");
    };
}

if (Person.prototype.goToWindow) {
    const originalGoToWindow = Person.prototype.goToWindow;
    Person.prototype.goToWindow = function () {
        originalGoToWindow.call(this);
        this.speak("🪟 👀 ✨");
    };
}

if (Person.prototype.goToDesk) {
    const originalGoToDesk = Person.prototype.goToDesk;
    Person.prototype.goToDesk = function () {
        originalGoToDesk.call(this);

        // Only speak symbols if not doing analysis
        if (!this.isFetching && this.state !== 'working') {
            this.speak("💻 📊 !");
        }
    };
}

// Add this new function after fetchDataFromApi function
// Function to perform combined analysis after all individual analyses
function performCombinedAnalysis(symbol, apiKey) {
    debugLog("Starting combined analysis");
    updateSyncStatus("All analysts are putting together their analysis...");
    
    // Have all analysts speak the same message and prepare for collaboration
    for (const person of people) {
        person.startCollaborativeAnalysis();
    }
    
    // Update terminal to show combined analysis is starting
    const terminalContent = document.getElementById('terminalContent');
    if (terminalContent) {
        terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>
<div class="terminal-instructions">All analysts are collaborating on the final BTC analysis...</div>
<div style="color: #0f0">[${new Date().toLocaleTimeString()}] Gathering comprehensive insights across all analysis dimensions...</div>`;
        
        if (window.combinedAnalysisResults) {
            terminalContent.innerHTML += `\n\n${window.combinedAnalysisResults}`;
        }
    }
    
    // Make the two API calls in parallel
    const observationUrl = `https://api.sentichain.com/agent/get_reasoning?ticker=${symbol}&summary_type=observation_public&chunk_start=0&chunk_end=199&api_key=${apiKey}`;
    const considerationUrl = `https://api.sentichain.com/agent/get_reasoning?ticker=${symbol}&summary_type=consideration_public&chunk_start=0&chunk_end=199&api_key=${apiKey}`;
    
    // Show progress in terminal
    updateSyncStatus("Fetching comprehensive observation data...");
    
    // First fetch the observation data
    fetchDataFromApi(observationUrl, symbol, 0, 199)
        .then(observationResult => {
            updateSyncStatus("Fetching strategic consideration data...");
            
            // Then fetch the consideration data
            return fetchDataFromApi(considerationUrl, symbol, 0, 199)
                .then(considerationResult => {
                    return { observation: observationResult, consideration: considerationResult };
                });
        })
        .then(results => {
            // Format and display the combined results
            debugLog("Combined analysis complete");
            updateSyncStatus("Combined analysis completed successfully!");
            
            // Format the results nicely
            let formattedResults = `<strong>=== COMPREHENSIVE ${symbol} ANALYSIS ===</strong>\n\n`;
            
            if (results.observation) {
                formattedResults += `<strong>Market Observations (Blocks 0-199):</strong>\n${formatAnalystData(results.observation)}\n\n`;
            } else {
                formattedResults += `<strong>Market Observations:</strong> No data available\n\n`;
            }
            
            if (results.consideration) {
                formattedResults += `<strong>Strategic Considerations (Blocks 0-199):</strong>\n${formatAnalystData(results.consideration)}`;
            } else {
                formattedResults += `<strong>Strategic Considerations:</strong> No data available`;
            }
            
            // Store the formatted results in the global variable
            combinedAnalysisResults = `<strong>=== FINAL COLLABORATIVE ANALYSIS ===</strong>\n\n`;
            combinedAnalysisResults += `<span style="color: #0f0">[${new Date().toLocaleTimeString()}] Analysis integration complete!</span>\n\n`;
            combinedAnalysisResults += formattedResults;
            
            // Set the flag to indicate analysis is complete
            analysisCompleted = true;
            
            // Add to the terminal
            if (terminalContent) {
                terminalContent.innerHTML = combinedAnalysisResults;
            }
            
            // Add to terminal history
            addToTerminalHistory("All analysts completed comprehensive BTC analysis");
            
            // Have all analysts celebrate success
            for (const person of people) {
                person.isFetching = false;
                person.state = 'idle';
                if (Math.random() > 0.5) {
                    person.speak("📊 💹 🚀");
                } else {
                    person.speak("📈 💯 ⭐");
                }
            }
            
            // Reset task status
            isTaskInProgress = false;
            scheduleNextTask();
        })
        .catch(error => {
            console.error("Error during combined analysis:", error);
            updateSyncStatus("Error during combined analysis: " + error.message);
            
            // Handle error - reset analyst states
            for (const person of people) {
                person.isFetching = false;
                person.state = 'idle';
                person.speak("❌ 📊 ❓");
            }
            
            // Reset task status
            isTaskInProgress = false;
            scheduleNextTask();
        });
}