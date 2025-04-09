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

// Add this function to draw a light glow effect around workstations
function drawWorkstationGlow(x, y, radius) {
    // Create a radial gradient for the glow effect
    const gradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, radius
    );

    // Soft yellow light that fades to transparent
    gradient.addColorStop(0, 'rgba(255, 240, 180, 0.5)');
    gradient.addColorStop(0.6, 'rgba(255, 220, 120, 0.25)');
    gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawOffice() {
    ctx.fillStyle = COLORS.sky;
    ctx.fillRect(0, -GRID_SIZE, canvas.width, GRID_SIZE);

    drawClouds();

    // Check if we're in dark mode to add workstation lighting
    const isDarkMode = document.body.classList.contains('dark-theme');

    // If in dark mode, first draw the workstation lights under everything
    if (isDarkMode) {
        // Define workstation positions
        const workstationPositions = [
            { x: 6, y: 5 },           // Event
            { x: 6, y: 15 },          // Sentiment
            { x: COLS - 10, y: 5 },   // Market
            { x: COLS - 10, y: 15 }   // Quant
        ];

        // Draw light for each workstation
        for (const pos of workstationPositions) {
            // Convert grid coordinates to pixel coordinates (center of the cell)
            const pixelX = (pos.x + 0.5) * GRID_SIZE;
            const pixelY = (pos.y + 0.5) * GRID_SIZE;

            // Draw the glow with a large radius
            drawWorkstationGlow(pixelX, pixelY, GRID_SIZE * 4);
        }
    }

    // Continue with the normal drawing code
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

                case OBJECTS.DOOR:
                    // Get position relative to middle of door
                    const middleY = Math.floor(ROWS / 2);
                    const doorY = Math.floor(cellY / GRID_SIZE);
                    const doorSection = doorY === middleY ? 'middle' : 
                                        doorY === middleY - 1 ? 'top' : 'bottom';
                    
                    // Door frame - Only draw the side frames, not top/bottom for middle sections
                    ctx.fillStyle = COLORS.wall;
                    
                    // Fill the entire cell first
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);
                    
                    if (isDoorOpen) {
                        // Door opening (empty space showing outside)
                        ctx.fillStyle = '#8B95A2'; // Light grayish blue for outside
                        
                        // Different rendering based on section to create a continuous door
                        if (doorSection === 'top') {
                            // Top section - draw the top frame and sides only
                            ctx.fillRect(cellX + 3, cellY + 3, GRID_SIZE - 6, GRID_SIZE);
                        } else if (doorSection === 'middle') {
                            // Middle section - draw just the sides, continuous with top and bottom
                            ctx.fillRect(cellX + 3, cellY, GRID_SIZE - 6, GRID_SIZE);
                        } else { // bottom section
                            // Bottom section - draw the bottom frame and sides only
                            ctx.fillRect(cellX + 3, cellY, GRID_SIZE - 6, GRID_SIZE - 3);
                        }
                        
                        // Only draw the door itself on the middle section
                        if (doorSection === 'middle') {
                            // Door itself (shown open)
                            // Draw the main door body first (without the colored left edge)
                            ctx.fillStyle = COLORS.door;
                            
                            // Draw the door without the left edge (we'll cover that with colored strips)
                            // Top section
                            ctx.fillRect(
                                cellX - GRID_SIZE/2 + 4, // Left edge + 4px offset for the colored strip
                                cellY - GRID_SIZE + 3, 
                                GRID_SIZE/2 - 7, 
                                GRID_SIZE - 3
                            );
                            
                            // Middle section
                            ctx.fillRect(
                                cellX - GRID_SIZE/2 + 4,
                                cellY,
                                GRID_SIZE/2 - 7,
                                GRID_SIZE
                            );
                            
                            // Bottom section
                            ctx.fillRect(
                                cellX - GRID_SIZE/2 + 4,
                                cellY + GRID_SIZE,
                                GRID_SIZE/2 - 7,
                                GRID_SIZE - 3
                            );
                            
                            // Door handle
                            ctx.fillStyle = '#B8860B'; // Darker golden color for handle
                            ctx.beginPath();
                            ctx.arc(cellX - GRID_SIZE/4, cellY + GRID_SIZE/2, 2, 0, Math.PI * 2);
                            ctx.fill();
                            
                            // Now draw the colored strips for the left edge
                            
                            // Red strip - TOP section (full left edge)
                            ctx.fillStyle = '#6B4226'; // Dark wood color
                            ctx.fillRect(
                                cellX - GRID_SIZE/2, // Exact left edge
                                cellY - GRID_SIZE + 3, // Top of door
                                4, // Width of strip
                                GRID_SIZE - 3 // Height of top section
                            );
                            
                            // Yellow strip - MIDDLE section (full left edge)
                            ctx.fillStyle = '#6B4226'; // Dark wood color
                            ctx.fillRect(
                                cellX - GRID_SIZE/2, // Exact left edge
                                cellY, // Top of middle section
                                4, // Width of strip
                                GRID_SIZE // Height of middle section
                            );
                            
                            // Blue strip - BOTTOM section (full left edge)
                            ctx.fillStyle = '#6B4226'; // Dark wood color
                            ctx.fillRect(
                                cellX - GRID_SIZE/2, // Exact left edge
                                cellY + GRID_SIZE, // Top of bottom section
                                4, // Width of strip
                                GRID_SIZE - 3 // Height of bottom section
                            );
                        }
                    } else {
                        // Closed door
                        ctx.fillStyle = COLORS.door;
                        
                        // Different rendering based on section to create a continuous door
                        if (doorSection === 'top') {
                            // Top section - draw the top frame and sides only
                            ctx.fillRect(cellX + 3, cellY + 3, GRID_SIZE - 6, GRID_SIZE);
                        } else if (doorSection === 'middle') {
                            // Middle section - draw just the sides, continuous with top and bottom
                            ctx.fillRect(cellX + 3, cellY, GRID_SIZE - 6, GRID_SIZE);
                        } else { // bottom section
                            // Bottom section - draw the bottom frame and sides only
                            ctx.fillRect(cellX + 3, cellY, GRID_SIZE - 6, GRID_SIZE - 3);
                        }
                        
                        // Only draw handle on the middle section
                        if (doorSection === 'middle') {
                            // Door handle
                            ctx.fillStyle = '#B8860B'; // Darker golden color for handle
                            ctx.beginPath();
                            ctx.arc(cellX + GRID_SIZE - 10, cellY + GRID_SIZE/2, 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        // Add horizontal detail lines to the door - only if not overlapping with frames
                        ctx.strokeStyle = '#6B4226'; // Darker wood tone
                        ctx.lineWidth = 1;
                        
                        // Draw appropriate detail lines for each section
                        ctx.beginPath();
                        if (doorSection === 'top') {
                            // Top section line
                            ctx.moveTo(cellX + 3, cellY + GRID_SIZE/2);
                            ctx.lineTo(cellX + GRID_SIZE - 3, cellY + GRID_SIZE/2);
                        } else if (doorSection === 'middle') {
                            // Middle section lines
                            ctx.moveTo(cellX + 3, cellY + GRID_SIZE/3);
                            ctx.lineTo(cellX + GRID_SIZE - 3, cellY + GRID_SIZE/3);
                            ctx.moveTo(cellX + 3, cellY + GRID_SIZE*2/3);
                            ctx.lineTo(cellX + GRID_SIZE - 3, cellY + GRID_SIZE*2/3);
                        } else { // bottom section
                            // Bottom section line
                            ctx.moveTo(cellX + 3, cellY + GRID_SIZE/2);
                            ctx.lineTo(cellX + GRID_SIZE - 3, cellY + GRID_SIZE/2);
                        }
                        ctx.stroke();
                    }
                    
                    // Draw the door frames
                    ctx.strokeStyle = '#000';
                    ctx.lineWidth = 1;
                    
                    // Draw different parts of the frame based on position to create a continuous look
                    if (doorSection === 'top') {
                        // Top section - top and sides of frame only
                        ctx.beginPath();
                        ctx.moveTo(cellX + 3, cellY + 3);
                        ctx.lineTo(cellX + GRID_SIZE - 3, cellY + 3);
                        ctx.lineTo(cellX + GRID_SIZE - 3, cellY + GRID_SIZE);
                        ctx.moveTo(cellX + 3, cellY + 3);
                        ctx.lineTo(cellX + 3, cellY + GRID_SIZE);
                        ctx.stroke();
                    } else if (doorSection === 'middle') {
                        // Middle section - only sides of frame
                        ctx.beginPath();
                        ctx.moveTo(cellX + 3, cellY);
                        ctx.lineTo(cellX + 3, cellY + GRID_SIZE);
                        ctx.moveTo(cellX + GRID_SIZE - 3, cellY);
                        ctx.lineTo(cellX + GRID_SIZE - 3, cellY + GRID_SIZE);
                        ctx.stroke();
                    } else { // bottom section
                        // Bottom section - bottom and sides of frame only
                        ctx.beginPath();
                        ctx.moveTo(cellX + 3, cellY);
                        ctx.lineTo(cellX + 3, cellY + GRID_SIZE - 3);
                        ctx.lineTo(cellX + GRID_SIZE - 3, cellY + GRID_SIZE - 3);
                        ctx.lineTo(cellX + GRID_SIZE - 3, cellY);
                        ctx.stroke();
                    }
                    
                    // Add a subtle indicator that the door is interactive
                    // Only on the middle section
                    if (doorSection === 'middle') {
                        // Pulsing effect based on time
                        const time = Date.now() / 1000;
                        const pulseStrength = (Math.sin(time * 2) + 1) / 2 * 0.5; // Value between 0 and 0.5
                        
                        ctx.fillStyle = `rgba(255, 255, 255, ${0.2 + pulseStrength})`;
                        ctx.beginPath();
                        if (isDoorOpen) {
                            // Glow on the handle when open
                            ctx.arc(cellX - GRID_SIZE/4, cellY + GRID_SIZE/2, 4, 0, Math.PI * 2);
                        } else {
                            // Glow on the handle when closed
                            ctx.arc(cellX + GRID_SIZE - 10, cellY + GRID_SIZE/2, 4, 0, Math.PI * 2);
                        }
                        ctx.fill();
                    }
                    break;

                case OBJECTS.DESK:
                    ctx.fillStyle = COLORS.desk;
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    // Use darker wood color in dark mode
                    ctx.fillStyle = isDarkMode ? '#5a2906' : '#7a3b11';
                    ctx.fillRect(cellX + 2, cellY + 2, GRID_SIZE - 4, GRID_SIZE - 4);

                    // Darker stroke in dark mode
                    ctx.strokeStyle = isDarkMode ? '#401d04' : '#5d2906';
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
                    // Use a grey background in dark mode instead of white
                    ctx.fillStyle = isDarkMode ? '#DEDEDE' : '#f5f5f5';
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

                    // Base/counter - darker in dark mode
                    ctx.fillStyle = isDarkMode ? '#6B3010' : '#8B4513';
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    // Counter surface - darker in dark mode
                    ctx.fillStyle = isDarkMode ? '#A28A60' : '#D2B48C';
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
                    // Darker table surface in dark mode
                    ctx.fillStyle = isDarkMode ? '#6b4226' : '#8B5A2B';
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

                    // Fill the entire cell with a specific background color based on theme
                    // Use specific colors for the bar table background instead of the general floor color
                    ctx.fillStyle = isDarkMode ? '#E4E4E4' : '#f5f5f5';
                    ctx.fillRect(cellX, cellY, GRID_SIZE, GRID_SIZE);

                    // Always draw the table top surface
                    // Dark wood top with consistent coloring - darker in dark mode
                    ctx.fillStyle = isDarkMode ? '#2a1506' : '#3A2313';

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
                    ctx.fillStyle = isDarkMode ? '#1a0d05' : '#2A1A0A'; // Darker wood for the frame in dark mode

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
                    ctx.fillStyle = isDarkMode ? '#8a8a8a' : '#B8B8B8';
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
                        ctx.strokeStyle = isDarkMode ? '#8a8a8a' : '#B8B8B8';
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
                    ctx.strokeStyle = isDarkMode ? '#111' : '#222';
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

function drawPeople() {
    for (const person of people) {
        person.draw();
    }
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