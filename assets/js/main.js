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

// Add these variables near the top with other global variable declarations
let activeTimers = [];
let abortControllers = [];
let analysisInProgress = false;

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

function update() {
    for (const person of people) {
        person.update();
    }
    dog.update();
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
        const endBlock = parseInt(document.getElementById('endBlock').value);

        if (!apiKey) {
            updateSyncStatus("Error: API Key is required");
            return;
        }

        // Validate endBlock value
        if (isNaN(endBlock) || endBlock < 200 || endBlock % 50 !== 0) {
            updateSyncStatus("Error: End Block must be ≥ 200 and a multiple of 50");
            return;
        }

        debugLog(`Connecting with API key, symbol: ${selectedSymbol}, and endBlock: ${endBlock}`);

        // Clear any previous state first
        // Cancel all active timers
        while (activeTimers.length > 0) {
            const timer = activeTimers.pop();
            clearTimeout(timer);
        }

        // Abort any ongoing fetch requests
        while (abortControllers.length > 0) {
            const controller = abortControllers.pop();
            try {
                controller.abort();
            } catch (e) {
                console.error("Error aborting fetch:", e);
            }
        }

        // Reset analysis flags
        apiConnected = true;
        analysisInProgress = true;
        isTaskInProgress = true;
        combinedAnalysisResults = null;
        analysisCompleted = false;

        updateConnectionStatus(true);

        // Update terminal content to show analyst is in action
        const terminalContent = document.getElementById('terminalContent');
        if (terminalContent) {
            terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>
<div class="terminal-instructions">Event Analyst is analyzing ${selectedSymbol}...</div>`;
        }

        // Disable random tasks for all agents
        clearTimeout(taskScheduleTimer);

        // Reset any ongoing tasks
        fetchQueue = [];
        currentFetchingTicker = null;

        // Start animation
        if (animationTimer) {
            clearInterval(animationTimer);
        }
        animationTimer = setInterval(animate, ANIMATION_SPEED);

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
            const timer = setTimeout(() => {
                // Remove this timer from tracking when it fires
                const index = activeTimers.indexOf(timer);
                if (index !== -1) {
                    activeTimers.splice(index, 1);
                }

                // Only start if we're still connected
                if (!apiConnected) {
                    debugLog("Connection lost before starting analysis");
                    return;
                }

                startSequentialAnalysis(
                    eventAnalyst,
                    selectedSymbol,
                    apiKey,
                    'initial_market_analysis',
                    'events',
                    endBlock,
                    () => {
                        // After Event Agent finishes, start Sentiment Agent
                        // Update terminal message for Sentiment Analyst
                        if (terminalContent && apiConnected) {
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
                            endBlock,
                            () => {
                                // After Sentiment Agent finishes, start Market Agent
                                // Update terminal message for Market Analyst
                                if (terminalContent && apiConnected) {
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
                                    endBlock,
                                    () => {
                                        // After Market Agent finishes, start Quant Agent
                                        // Update terminal message for Quant Analyst
                                        if (terminalContent && apiConnected) {
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
                                            endBlock,
                                            () => {
                                                // After all analysts have completed their individual analyses
                                                // Start the combined analysis
                                                if (apiConnected) {
                                                    performCombinedAnalysis(selectedSymbol, apiKey, endBlock);
                                                }
                                            }
                                        );
                                    }
                                );
                            }
                        );
                    }
                );
            }, 1000);

            // Add to tracked timers
            activeTimers.push(timer);
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
        const MAX_SUMMARY_WIDTH = isMobileView ? 23 : 50;

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
        // Use a more general pattern to detect block headers with any numeric range
        const blockHeaderPattern = /Block \d+-\d+:/;

        // Check if this is analyst data by looking for block header pattern
        if (typeof data === 'string' && blockHeaderPattern.test(data)) {
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

        return data; // Return original if not analyst data with block headers
    } catch (error) {
        console.error("Error formatting Analyst data:", error);
        return data; // Return original on error
    }
}

// Updated function to handle sequential analysis with callback
function startSequentialAnalysis(analyst, symbol, apiKey, summaryType, analysisType, endBlock, onCompleteCallback) {
    // Skip if analysis isn't in progress anymore (disconnect was triggered)
    if (!apiConnected) {
        debugLog("Sequential analysis aborted - disconnected");
        return;
    }

    // Calculate chunk ranges based on endBlock
    const chunkSize = 50;
    const startBlock = Math.max(0, endBlock - 200);

    // Define the chunks to analyze
    const chunks = [];
    for (let start = startBlock; start < endBlock; start += chunkSize) {
        chunks.push({
            start: start,
            end: Math.min(start + chunkSize - 1, endBlock - 1)
        });
    }

    let agentResults = '';
    let currentChunk = 0;

    // Get analyst name for display purposes
    const analystName = analyst.name;

    // Process chunks sequentially
    function processNextChunk() {
        // Skip if analysis isn't in progress anymore (disconnect was triggered)
        if (!apiConnected) {
            debugLog(`${analystName} analysis aborted - disconnected`);
            return;
        }

        if (currentChunk >= chunks.length) {
            // All chunks processed
            updateSyncStatus(`${analystName} analysis complete!`);

            // Format the results as a table for all analysts
            let formattedResults = agentResults;
            try {
                formattedResults = formatAnalystData(agentResults);
            } catch (error) {
                console.error(`Error formatting ${analystName} results:`, error);
                // If formatting fails, keep the original agentResults
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
            if (onCompleteCallback && apiConnected) {
                const timer = setTimeout(() => {
                    // Remove this timer from tracking
                    const index = activeTimers.indexOf(timer);
                    if (index !== -1) {
                        activeTimers.splice(index, 1);
                    }

                    // If starting next analyst, don't set isTaskInProgress to false yet
                    onCompleteCallback();
                }, 1000);

                // Add to tracked timers
                activeTimers.push(timer);
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
        const timer = setTimeout(() => {
            // Remove this timer from tracking
            const index = activeTimers.indexOf(timer);
            if (index !== -1) {
                activeTimers.splice(index, 1);
            }

            // Skip if we've disconnected
            if (!apiConnected) {
                debugLog(`${analystName} analysis of chunk ${currentChunk} aborted - disconnected`);
                return;
            }

            // Construct the API URL
            const apiUrl = `https://api.sentichain.com/agent/get_reasoning?ticker=${symbol}&summary_type=${summaryType}&chunk_start=${chunk.start}&chunk_end=${chunk.end}&api_key=${apiKey}`;

            // Make the API call
            fetchDataFromApi(apiUrl, symbol, chunk.start, chunk.end)
                .then(result => {
                    // Check if we've disconnected
                    if (!apiConnected) {
                        debugLog(`${analystName} processing of chunk result aborted - disconnected`);
                        return;
                    }

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
                    // Check if we've disconnected
                    if (!apiConnected) {
                        debugLog(`${analystName} error handling aborted - disconnected`);
                        return;
                    }

                    console.error("Error fetching data:", error);
                    updateSyncStatus(`Error analyzing blocks ${chunk.start}-${chunk.end}: ${error.message}`);

                    // Move to next chunk despite error
                    currentChunk++;
                    processNextChunk();
                });
        }, 3000); // 3 second delay to simulate processing time

        // Add to tracked timers
        activeTimers.push(timer);
    }

    // Start processing the first chunk
    processNextChunk();
}

// Function to fetch data from API
async function fetchDataFromApi(apiUrl, symbol, chunkStart, chunkEnd) {
    try {
        debugLog(`Fetching data from: ${apiUrl}`);

        // Create an AbortController and add it to the tracking array
        const controller = new AbortController();
        abortControllers.push(controller);

        const response = await fetch(apiUrl, { signal: controller.signal });

        // Remove this controller from tracking after fetch is complete
        const index = abortControllers.indexOf(controller);
        if (index !== -1) {
            abortControllers.splice(index, 1);
        }

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
        // Check if this was an abort error, which is expected during disconnection
        if (error.name === 'AbortError') {
            console.log("Fetch aborted due to disconnection");
            return null;
        }

        console.error("API call failed:", error);
        return `Error: Failed to fetch data for ${symbol} blocks ${chunkStart}-${chunkEnd}`;
    }
}

function disconnectFromApi() {
    if (apiConnected) {
        // Mark disconnection in progress
        apiConnected = false;
        updateConnectionStatus(false);
        stopTaskScheduler();

        // Stop ongoing analysis
        analysisInProgress = false;

        // Cancel all active timers
        while (activeTimers.length > 0) {
            const timer = activeTimers.pop();
            clearTimeout(timer);
        }

        // Clear animation timer
        if (animationTimer) {
            clearInterval(animationTimer);
            animationTimer = null;
        }

        // Abort any ongoing fetch requests
        while (abortControllers.length > 0) {
            const controller = abortControllers.pop();
            try {
                controller.abort();
            } catch (e) {
                console.error("Error aborting fetch:", e);
            }
        }

        // Reset all state variables
        currentFetchingTicker = null;
        fetchQueue = [];
        isTaskInProgress = false;
        combinedAnalysisResults = null;
        analysisCompleted = false;

        // Reset all people
        for (const p of people) {
            p.isFetching = false;
            p.state = 'idle';

            // Restore original speak functionality if it was overridden
            if (p.originalSpeak) {
                p.speak = p.originalSpeak;
                p.originalSpeak = null;
            }
        }

        // Reset the terminal display to initial form state
        updateTerminalDisplay();

        // Clear any status messages
        updateSyncStatus("");

        // Restart animation with clean state
        start();

        debugLog("API Disconnected - All processes terminated");
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
        // Don't display block sync dialog in terminal anymore
        // updateSyncStatus("Checking blockchain for new data..."); 
        const response = await fetch(CHAIN_LENGTH_API);
        const data = await response.json();
        if (data && data.chain_length) {
            chainLength = data.chain_length;
            const chainInfoElement = document.getElementById('chain-info');
            chainInfoElement.innerHTML = `Block Height: <a href="https://sentichain.com/app?tab=BlockExplorer&block=last#" target="_blank">${chainLength}</a> (SentiChain ${data.network})`;
            if (chainLength > lastFetchTime) {
                // Don't display block sync dialog in terminal anymore
                // updateSyncStatus("Blockchain data sync complete.");
                queueReasoningFetches(true);
                lastFetchTime = chainLength;
            } else {
                // Don't display block sync dialog in terminal anymore
                // updateSyncStatus("No new blockchain data.");
                queueReasoningFetches(false);
            }
        }
    } catch (err) {
        console.error("Error fetching blockchain data", err);
        debugLog("Error fetching blockchain data");
        // Don't display block sync dialog in terminal anymore
        // updateSyncStatus("Error checking blockchain data");
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
        const endBlock = document.getElementById('endBlock')?.value || '200';

        terminalContent.innerHTML = `
            <div id="branding">Welcome to Fundis.AI</div>
            <div class="terminal-form">
                <div class="form-group">
                    <label for="apiKey">Please input your API Key (<a href="https://sentichain.com/app?tab=APIManagement" target="_blank" style="color: #00FFC8;">Register↗</a>):</label>
                    <input type="text" id="apiKey" class="terminal-input" value="${apiKey}" placeholder="Paste or type your API key here">
                </div>
                <div class="form-group">
                    <label for="symbolSelect">Please select a Symbol:</label>
                    <select id="symbolSelect" class="terminal-select">
                        <option value="BTC" ${selectedSymbol === 'BTC' ? 'selected' : ''}>BTC</option>
                        <option value="ETH" ${selectedSymbol === 'ETH' ? 'selected' : ''}>ETH</option>
                        <option value="SOL" ${selectedSymbol === 'SOL' ? 'selected' : ''}>SOL</option>
                        <option value="XRP" ${selectedSymbol === 'XRP' ? 'selected' : ''}>XRP</option>
                        <option value="ADA" ${selectedSymbol === 'ADA' ? 'selected' : ''}>ADA</option>
                        <option value="AVAX" ${selectedSymbol === 'AVAX' ? 'selected' : ''}>AVAX</option>
                        <option value="DOGE" ${selectedSymbol === 'DOGE' ? 'selected' : ''}>DOGE</option>
                        <option value="TRX" ${selectedSymbol === 'TRX' ? 'selected' : ''}>TRX</option>
                        <option value="LINK" ${selectedSymbol === 'LINK' ? 'selected' : ''}>LINK</option>
                        <option value="DOT" ${selectedSymbol === 'DOT' ? 'selected' : ''}>DOT</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="endBlock">Please input ending Block:</label>
                    <input type="number" id="endBlock" class="terminal-input" value="${endBlock}" placeholder="Enter a number ≥ 200 (multiple of 50)" min="200" step="50">
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

    // Fetch block height immediately on start
    fetchAndUpdateBlockHeight();

    // Set up interval to update block height every 10 seconds
    setInterval(fetchAndUpdateBlockHeight, 10000);

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
                "💯 📉",
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
document.addEventListener('DOMContentLoaded', () => {
    const apiStatusDot = document.getElementById('api-status-dot');
    if (apiStatusDot) {
        apiStatusDot.addEventListener('click', handleApiStatusDotClick);
    }
});

// Separate function to handle API status dot clicks
function handleApiStatusDotClick() {
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

    // Reset any keyboard-related state
    document.body.classList.remove('keyboard-open');

    // For mobile - ensure view is reset
    if (isMobileView) {
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 100);
    }
}

// Add event listener for the API key input to allow pressing Enter to connect
document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const endBlockInput = document.getElementById('endBlock');

    // Fix for mobile keyboard issues
    // Add these event listeners to handle keyboard appearance/disappearance
    const inputs = document.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            // When an input is focused, add a class to the body
            document.body.classList.add('keyboard-open');
        });

        input.addEventListener('blur', () => {
            // When focus leaves an input, remove the class
            document.body.classList.remove('keyboard-open');

            // On iOS, need to force redraw sometimes
            setTimeout(() => {
                window.scrollTo(0, 0);
            }, 100);
        });
    });

    // Add a touchstart event listener to the API status dot 
    // to ensure it works after keyboard is closed
    const apiStatusDot = document.getElementById('api-status-dot');
    if (apiStatusDot) {
        // Use touchstart for more reliable mobile interaction
        apiStatusDot.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent default to avoid double firing
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
    }

    // Add validation for endBlock input
    if (endBlockInput) {
        // Validate on change
        endBlockInput.addEventListener('change', () => {
            const value = parseInt(endBlockInput.value);

            if (isNaN(value) || value < 200) {
                endBlockInput.value = 200; // Reset to minimum valid value
                updateSyncStatus("End Block must be ≥ 200");
            } else if (value % 50 !== 0) {
                // Round to nearest multiple of 50
                const roundedValue = Math.round(value / 50) * 50;
                endBlockInput.value = roundedValue;
                updateSyncStatus(`End Block rounded to ${roundedValue} (must be a multiple of 50)`);
            }
        });

        // Also validate on input to immediately correct invalid entries
        endBlockInput.addEventListener('input', () => {
            const value = endBlockInput.value;
            // Allow empty input while typing
            if (value && (isNaN(parseInt(value)) || parseInt(value) < 200)) {
                updateSyncStatus("End Block must be ≥ 200");
            }
        });
    }

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
            "🐶",
            "🦮",
            "🐾",
            "🦴",
            "🐕‍🦺",
            "🐩",
            "🐕",
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



// Add dog petting ability to Person class
Person.prototype.petDog = function () {
    if (dog.isPettable(this)) {
        if (dog.getPetBy(this)) {
            this.state = 'pettingDog';
            this.stateTime = 0;
            this.speak("❤️");
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
            const dogComments = [
                "❤️",
                "✨",
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
        this.speak("🐶");
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
            this.speak(`👋`);

            // Set a timer for them to respond
            setTimeout(() => {
                if (!partner.isFetching) {
                    partner.speak(`📈`);
                }
            }, 1500);
        } else {
            // Just talk to the office in general
            this.speak("📊");
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
function performCombinedAnalysis(symbol, apiKey, endBlock) {
    // Skip if we're disconnected
    if (!apiConnected) {
        debugLog("Combined analysis cancelled - disconnected");
        return;
    }

    debugLog("Starting combined analysis");
    updateSyncStatus("All analysts are putting together their analysis...");

    // Set a flag to indicate analysis is in progress
    analysisInProgress = true;

    // Calculate the chunk range for combined analysis based on endBlock
    const startBlock = Math.max(0, endBlock - 200);
    const endBlockValue = endBlock - 1; // API uses inclusive end values

    // Have all analysts speak the same message and prepare for collaboration
    for (const person of people) {
        person.startCollaborativeAnalysis();
    }

    // Update terminal to show combined analysis is starting
    const terminalContent = document.getElementById('terminalContent');
    if (terminalContent) {
        terminalContent.innerHTML = `<div id="branding">Welcome to Fundis.AI</div>
<div class="terminal-instructions">All analysts are collaborating on the final ${symbol} analysis...</div>
<div style="color: #0f0">[${new Date().toLocaleTimeString()}] Gathering comprehensive insights across all analysis dimensions (blocks ${startBlock}-${endBlockValue})...</div>`;

        if (window.combinedAnalysisResults) {
            terminalContent.innerHTML += `\n\n${window.combinedAnalysisResults}`;
        }
    }

    // Make the two API calls in parallel with the new block range
    const observationUrl = `https://api.sentichain.com/agent/get_reasoning?ticker=${symbol}&summary_type=observation_public&chunk_start=${startBlock}&chunk_end=${endBlockValue}&api_key=${apiKey}`;
    const considerationUrl = `https://api.sentichain.com/agent/get_reasoning?ticker=${symbol}&summary_type=consideration_public&chunk_start=${startBlock}&chunk_end=${endBlockValue}&api_key=${apiKey}`;

    // Show progress in terminal
    updateSyncStatus(`Fetching comprehensive observation data for blocks ${startBlock}-${endBlockValue}...`);

    // First fetch the observation data
    fetchDataFromApi(observationUrl, symbol, startBlock, endBlockValue)
        .then(observationResult => {
            // Check if we've disconnected
            if (!apiConnected || !analysisInProgress) {
                debugLog("Combined analysis observation fetch completed but disconnected - aborting");
                return { observation: null, consideration: null };
            }

            updateSyncStatus(`Fetching strategic consideration data for blocks ${startBlock}-${endBlockValue}...`);

            // Then fetch the consideration data
            return fetchDataFromApi(considerationUrl, symbol, startBlock, endBlockValue)
                .then(considerationResult => {
                    // Check again for disconnection
                    if (!apiConnected || !analysisInProgress) {
                        debugLog("Combined analysis consideration fetch completed but disconnected - aborting");
                        return { observation: null, consideration: null };
                    }

                    return { observation: observationResult, consideration: considerationResult };
                });
        })
        .then(results => {
            // Check if we've disconnected
            if (!apiConnected || !analysisInProgress) {
                debugLog("Combined analysis processing cancelled - disconnected");
                return;
            }

            // Skip further processing if results are null (user disconnected)
            if (!results.observation && !results.consideration) {
                return;
            }

            // Format and display the combined results
            debugLog("Combined analysis complete");
            updateSyncStatus("Combined analysis completed successfully!");

            // Format the results nicely
            let formattedResults = `<strong>=== COMPREHENSIVE ${symbol} ANALYSIS (Blocks ${startBlock}-${endBlockValue}) ===</strong>\n\n`;

            if (results.observation) {
                try {
                    // Always try to format the observation data
                    const formattedObservation = formatAnalystData(results.observation);
                    formattedResults += `<strong>Market Observations (Blocks ${startBlock}-${endBlockValue}):</strong>\n${formattedObservation}\n\n`;
                } catch (error) {
                    console.error("Error formatting observation data:", error);
                    formattedResults += `<strong>Market Observations (Blocks ${startBlock}-${endBlockValue}):</strong>\n${results.observation}\n\n`;
                }
            } else {
                formattedResults += `<strong>Market Observations:</strong> No data available\n\n`;
            }

            if (results.consideration) {
                try {
                    // Always try to format the consideration data
                    const formattedConsideration = formatAnalystData(results.consideration);
                    formattedResults += `<strong>Strategic Considerations (Blocks ${startBlock}-${endBlockValue}):</strong>\n${formattedConsideration}`;
                } catch (error) {
                    console.error("Error formatting consideration data:", error);
                    formattedResults += `<strong>Strategic Considerations (Blocks ${startBlock}-${endBlockValue}):</strong>\n${results.consideration}`;
                }
            } else {
                formattedResults += `<strong>Strategic Considerations:</strong> No data available`;
            }

            // Store the formatted results in the global variable
            combinedAnalysisResults = `<strong>=== FINAL COLLABORATIVE ANALYSIS ===</strong>\n\n`;
            combinedAnalysisResults += `<span style="color: #0f0">[${new Date().toLocaleTimeString()}] Analysis integration complete!</span>\n\n`;
            combinedAnalysisResults += formattedResults;

            // Set the flag to indicate analysis is complete
            analysisCompleted = true;
            analysisInProgress = false;

            // Add to the terminal
            if (terminalContent) {
                terminalContent.innerHTML = combinedAnalysisResults;
            }

            // Add to terminal history
            addToTerminalHistory(`All analysts completed comprehensive ${symbol} analysis for blocks ${startBlock}-${endBlockValue}`);

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
            // Check if we've disconnected or the error is related to disconnection
            if (!apiConnected || !analysisInProgress || error.name === 'AbortError') {
                debugLog("Combined analysis error handling cancelled - disconnected");
                return;
            }

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
            analysisInProgress = false;
            scheduleNextTask();
        });
}

// Add this function after the drawWindowClouds function
function fetchAndUpdateBlockHeight() {
    fetch(CHAIN_LENGTH_API)
        .then(response => response.json())
        .then(data => {
            if (data && data.chain_length) {
                chainLength = data.chain_length;
                const chainInfoElement = document.getElementById('chain-info');
                chainInfoElement.innerHTML = `Block Height: <a href="https://sentichain.com/app?tab=BlockExplorer&block=last#" target="_blank" style="color: #00FFC8;">${chainLength}<span>↗</span></a> (Powered by SentiChain)`;

                // Auto-fill the endBlock input with the largest multiple of 50 that is <= chainLength
                const endBlockInput = document.getElementById('endBlock');
                if (endBlockInput && !apiConnected) {
                    // Calculate the largest multiple of 50 that is <= chainLength
                    const endBlockValue = Math.floor(chainLength / 50) * 50;
                    // Only update the field if it's currently empty or has the default value
                    if (!endBlockInput.value || endBlockInput.value === "200") {
                        endBlockInput.value = endBlockValue;
                    }
                }
            }
        })
        .catch(err => {
            console.error("Error fetching blockchain data", err);
        });
}

// Add this function to handle window resize events better
window.addEventListener('resize', () => {
    const newIsMobileView = window.innerWidth < 768;

    // Reset offset when switching view modes
    if (isMobileView !== newIsMobileView) {
        canvasOffset = { x: 0, y: 0 };
        // Force a redraw
        requestAnimationFrame(draw);
    }

    isMobileView = newIsMobileView;

    // Reset scroll position when keyboard closes (iOS)
    if (!document.activeElement ||
        (document.activeElement.tagName !== 'INPUT' &&
            document.activeElement.tagName !== 'SELECT')) {
        window.scrollTo(0, 0);
    }
});

// Fix for iOS keyboard issues - detect keyboard closing
document.addEventListener('focusout', (e) => {
    // Only run on mobile
    if (!isMobileView) return;

    // If the focused element is not an input or select, restore scroll position
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        // Small delay to let iOS finish keyboard animation
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.classList.remove('keyboard-open');
        }, 300);
    }
});

// Add a function to handle terminal form submission
function handleFormSubmission() {
    // If we're on mobile, we need to reset the view
    if (isMobileView) {
        // Blur any active element to dismiss keyboard
        if (document.activeElement) {
            document.activeElement.blur();
        }

        // Remove keyboard-open class
        document.body.classList.remove('keyboard-open');

        // Reset scroll position
        setTimeout(() => {
            window.scrollTo(0, 0);
        }, 300);
    }

    // Connect to API if not already connected
    if (!apiConnected) {
        const apiKey = document.getElementById('apiKey').value;
        if (apiKey) {
            updateConnectionStatus('connecting');
            connectToApi();
        } else {
            updateSyncStatus("Error: API Key is required");
        }
    }
}

// Add this to the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for tab switching on mobile
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // When switching tabs, reset any keyboard-related state
            document.body.classList.remove('keyboard-open');

            if (isMobileView) {
                setTimeout(() => {
                    window.scrollTo(0, 0);
                }, 100);
            }
        });
    });
});
