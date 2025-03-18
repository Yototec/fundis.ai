class Person {
    constructor(x, y, name, ticker) {
        this.x = x;
        this.y = y;
        this.name = name;
        this.ticker = ticker;
        this.uniformColor = COLORS[ticker.toLowerCase() + 'Uniform'];
        this.desk = findDeskForTicker(ticker);
        // Go directly to desk position
        this.x = this.desk.x;
        this.y = this.desk.y;
        this.messageTime = 0;
        this.message = '';
        this.isFetching = false;
        this.reasoningText = '';
        this.facingDirection = 'up';
        this.state = 'idle';
        this.stateTime = 0;

        // Body dimensions for rendering
        this.bodyWidth = GRID_SIZE * 0.98;
        this.bodyHeight = GRID_SIZE * 1.12;
        this.headSize = GRID_SIZE * 0.7;
        this.armWidth = GRID_SIZE * 0.28;
        this.armHeight = GRID_SIZE * 0.56;
        this.legWidth = GRID_SIZE * 0.35;
        this.legHeight = GRID_SIZE * 0.42;
    }

    speak(message) {
        // Check if this is an analysis-related message
        const isAnalysisMessage = message.includes('Analyzing') ||
            message.includes('analysis') ||
            this.isFetching ||
            this.state === 'working';

        // If it's an analysis message, use the actual message
        if (isAnalysisMessage) {
            const maxWords = 20;
            const words = message.split(' ');
            if (words.length > maxWords) {
                message = words.slice(0, maxWords).join(' ') + '...';
            }
            this.message = message;
            this.messageTime = 10;
        } else {
            // For non-analysis communication, use symbols/emojis instead
            const symbolMessages = [
                "📊 💹 🔍",
                "📈 ⚡ 💻",
                "🚀 ⭐ 📊",
                "💯 📉 🔄",
                "⚙️ 🔢 #@!",
                "💻 🔮 📝",
                "🧮 %$#@!",
                "👀 💹 ⁉️",
                "🤔 📊 ⁉️",
                "🔍 👨‍💻 ⚡",
                "⏱️ 📶 🔄",
                "💸 ⤴️ 📱",
                "📉 📈 ❓",
                "💹 $¥£ ⁉️",
                "📊 💻 ⚠️",
                "🔢 🧠 ⭐"
            ];

            const randomSymbols = symbolMessages[Math.floor(Math.random() * symbolMessages.length)];
            this.message = randomSymbols;
            this.messageTime = 10;
        }
    }

    draw() {
        const centerX = this.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = this.y * GRID_SIZE + GRID_SIZE / 2;

        // Draw appropriate view based on facing direction
        if (this.facingDirection === 'up') {
            this.drawFromBehind(centerX, centerY);
        } else if (this.facingDirection === 'down') {
            this.drawFromFront(centerX, centerY);
        } else if (this.facingDirection === 'left') {
            this.drawFromSide(centerX, centerY, 'left');
        } else {
            this.drawFromSide(centerX, centerY, 'right');
        }

        // Draw speech bubble if message exists
        if (this.message && this.messageTime > 0) {
            drawSpeechBubble(centerX, centerY - GRID_SIZE * 1.8, this.message);
        }

        // Draw name
        ctx.fillStyle = '#000';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.name,
            centerX,
            centerY + GRID_SIZE * 1.5 + 10
        );
    }

    drawFromFront(x, y) {
        // Draw legs (static)
        ctx.fillStyle = this.uniformColor;
        ctx.fillRect(x - this.bodyWidth / 2, y + this.bodyHeight / 2, this.legWidth, this.legHeight);
        ctx.fillRect(x + this.bodyWidth / 2 - this.legWidth, y + this.bodyHeight / 2, this.legWidth, this.legHeight);

        // Draw body/uniform with rounded corners
        ctx.fillStyle = this.uniformColor;
        this.roundedRect(
            x - this.bodyWidth / 2,
            y - this.bodyHeight / 2,
            this.bodyWidth,
            this.bodyHeight,
            4
        );

        // Add shirt collar
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(x - this.bodyWidth / 4, y - this.bodyHeight / 2 + 5);
        ctx.lineTo(x, y - this.bodyHeight / 2 + 12);
        ctx.lineTo(x + this.bodyWidth / 4, y - this.bodyHeight / 2 + 5);
        ctx.fill();

        // Add ticker logo on uniform
        this.drawTickerLogo(x, y - this.bodyHeight / 5, this.ticker);

        // Draw arms (static)
        ctx.fillStyle = this.uniformColor;
        this.roundedRect(
            x - this.bodyWidth / 2 - this.armWidth,
            y - this.bodyHeight / 4,
            this.armWidth,
            this.armHeight,
            3
        );
        this.roundedRect(
            x + this.bodyWidth / 2,
            y - this.bodyHeight / 4,
            this.armWidth,
            this.armHeight,
            3
        );

        // Draw hands
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(
            x - this.bodyWidth / 2 - this.armWidth / 2,
            y - this.bodyHeight / 4 + this.armHeight,
            this.armWidth / 2 + 1,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            x + this.bodyWidth / 2 + this.armWidth / 2,
            y - this.bodyHeight / 4 + this.armHeight,
            this.armWidth / 2 + 1,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw head with skin color
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(
            x,
            y - this.bodyHeight / 2 - this.headSize / 2,
            this.headSize / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw eyes
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(
            x - this.headSize / 4,
            y - this.bodyHeight / 2 - this.headSize / 2,
            this.headSize / 10,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            x + this.headSize / 4,
            y - this.bodyHeight / 2 - this.headSize / 2,
            this.headSize / 10,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw mouth
        ctx.beginPath();
        ctx.arc(
            x,
            y - this.bodyHeight / 2 - this.headSize / 2 + this.headSize / 4,
            this.headSize / 6,
            0.1 * Math.PI,
            0.9 * Math.PI,
            false
        );
        ctx.stroke();

        // Add hair based on ticker
        this.drawHair(x, y - this.bodyHeight / 2 - this.headSize / 2, 'front');
    }

    drawFromBehind(x, y) {
        // Draw legs (static)
        ctx.fillStyle = this.uniformColor;
        ctx.fillRect(x - this.bodyWidth / 2, y + this.bodyHeight / 2, this.legWidth, this.legHeight);
        ctx.fillRect(x + this.bodyWidth / 2 - this.legWidth, y + this.bodyHeight / 2, this.legWidth, this.legHeight);

        // Draw body/uniform with rounded corners
        ctx.fillStyle = this.uniformColor;
        this.roundedRect(
            x - this.bodyWidth / 2,
            y - this.bodyHeight / 2,
            this.bodyWidth,
            this.bodyHeight,
            4
        );

        // Add ticker logo on back of uniform
        this.drawTickerLogo(x, y - this.bodyHeight / 5, this.ticker);

        // Draw arms (static)
        ctx.fillStyle = this.uniformColor;
        this.roundedRect(
            x - this.bodyWidth / 2 - this.armWidth,
            y - this.bodyHeight / 4,
            this.armWidth,
            this.armHeight,
            3
        );
        this.roundedRect(
            x + this.bodyWidth / 2,
            y - this.bodyHeight / 4,
            this.armWidth,
            this.armHeight,
            3
        );

        // Draw hands
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(
            x - this.bodyWidth / 2 - this.armWidth / 2,
            y - this.bodyHeight / 4 + this.armHeight,
            this.armWidth / 2 + 1,
            0,
            Math.PI * 2
        );
        ctx.fill();
        ctx.beginPath();
        ctx.arc(
            x + this.bodyWidth / 2 + this.armWidth / 2,
            y - this.bodyHeight / 4 + this.armHeight,
            this.armWidth / 2 + 1,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw head with skin color
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(
            x,
            y - this.bodyHeight / 2 - this.headSize / 2,
            this.headSize / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Add hair from behind
        this.drawHair(x, y - this.bodyHeight / 2 - this.headSize / 2, 'back');
    }

    drawFromSide(x, y, side) {
        const direction = (side === 'left') ? -1 : 1;

        // Draw legs (static)
        ctx.fillStyle = this.uniformColor;
        ctx.fillRect(x + direction * (this.bodyWidth / 4), y + this.bodyHeight / 2, this.legWidth, this.legHeight);
        ctx.fillRect(x - direction * (this.bodyWidth / 4), y + this.bodyHeight / 2, this.legWidth, this.legHeight);

        // Draw body/uniform with rounded corners
        ctx.fillStyle = this.uniformColor;
        this.roundedRect(
            x - this.bodyWidth / 2,
            y - this.bodyHeight / 2,
            this.bodyWidth,
            this.bodyHeight,
            4
        );

        // Add ticker symbol on side of uniform (first letter only)
        ctx.font = '12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(
            this.ticker.charAt(0).toUpperCase(),
            x,
            y
        );

        // Draw arm (static)
        ctx.fillStyle = this.uniformColor;
        this.roundedRect(
            x + direction * (this.bodyWidth / 4),
            y - this.bodyHeight / 4,
            this.armWidth * direction,
            this.armHeight,
            3
        );

        // Draw hand
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(
            x + direction * (this.bodyWidth / 4 + this.armWidth / 2 * direction),
            y - this.bodyHeight / 4 + this.armHeight,
            this.armWidth / 2 + 1,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw head with skin color
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(
            x + direction * (this.bodyWidth / 4),
            y - this.bodyHeight / 2 - this.headSize / 2,
            this.headSize / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw eye
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(
            x + direction * (this.bodyWidth / 4 + this.headSize / 4),
            y - this.bodyHeight / 2 - this.headSize / 2,
            this.headSize / 10,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Draw ear on the visible side
        ctx.fillStyle = COLORS.skin;
        ctx.beginPath();
        ctx.arc(
            x + direction * (this.bodyWidth / 4 + this.headSize / 2 - 2),
            y - this.bodyHeight / 2 - this.headSize / 2,
            this.headSize / 6,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // Add hair from side
        this.drawHair(x + direction * (this.bodyWidth / 4), y - this.bodyHeight / 2 - this.headSize / 2, side);

        // Draw mouth from side
        ctx.beginPath();
        ctx.moveTo(
            x + direction * (this.bodyWidth / 4 + this.headSize / 8),
            y - this.bodyHeight / 2 - this.headSize / 2 + this.headSize / 4
        );
        ctx.lineTo(
            x + direction * (this.bodyWidth / 4 + this.headSize / 3),
            y - this.bodyHeight / 2 - this.headSize / 2 + this.headSize / 4
        );
        ctx.stroke();
    }

    // Helper method to draw rounded rectangles
    roundedRect(x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
    }

    // Helper method to draw ticker logos
    drawTickerLogo(x, y, ticker) {
        const logoSize = this.bodyWidth * 0.4;

        ctx.save();
        ctx.translate(x, y);

        switch (ticker.toLowerCase()) {
            case 'event':
                // Event Analyst logo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, logoSize / 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#F7931A';
                ctx.font = `bold ${logoSize * 0.8}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('E', 0, 0);
                break;

            case 'sentiment':
                // Sentiment Analyst logo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, logoSize / 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#627EEA';
                ctx.font = `bold ${logoSize * 0.8}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('S', 0, 0);
                break;

            case 'market':
                // Market Analyst logo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, logoSize / 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#00FFA3';
                ctx.font = `bold ${logoSize * 0.5}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('M', 0, 0);
                break;

            case 'quant':
                // Quant Analyst logo
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(0, 0, logoSize / 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#C3A634';
                ctx.font = `bold ${logoSize * 0.4}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('Q', 0, -2);

                // Simple graph symbol instead of dog ears
                ctx.beginPath();
                ctx.moveTo(-logoSize / 4, 0);
                ctx.lineTo(-logoSize / 6, -logoSize / 8);
                ctx.lineTo(0, 0);
                ctx.lineTo(logoSize / 6, -logoSize / 6);
                ctx.lineTo(logoSize / 4, -logoSize / 12);
                ctx.stroke();
                break;
        }

        ctx.restore();
    }

    // Helper method to draw hair based on character
    drawHair(x, y, view) {
        const hairColors = {
            event: '#8B4513', // brown hair for Event Analyst
            sentiment: '#000000', // black hair for Sentiment Analyst
            market: '#FFD700', // blonde hair for Market Analyst
            quant: '#A0522D'  // auburn hair for Quant Analyst
        };

        ctx.fillStyle = hairColors[this.ticker.toLowerCase()];

        if (view === 'front') {
            // Front view hair
            ctx.beginPath();
            ctx.arc(x, y - this.headSize / 6, this.headSize / 2 + 2, Math.PI, 2 * Math.PI);
            ctx.fill();

            // Add hair tufts based on character
            if (this.ticker.toLowerCase() === 'event') {
                // Short business-like hair
                ctx.beginPath();
                ctx.moveTo(x - this.headSize / 2, y - this.headSize / 3);
                ctx.quadraticCurveTo(x - this.headSize / 4, y - this.headSize / 2, x, y - this.headSize / 2);
                ctx.quadraticCurveTo(x + this.headSize / 4, y - this.headSize / 2, x + this.headSize / 2, y - this.headSize / 3);
                ctx.fill();
            } else if (this.ticker.toLowerCase() === 'sentiment') {
                // Modern tech look
                ctx.beginPath();
                ctx.moveTo(x - this.headSize / 2, y - this.headSize / 4);
                ctx.quadraticCurveTo(x, y - this.headSize, x + this.headSize / 2, y - this.headSize / 4);
                ctx.fill();
            } else if (this.ticker.toLowerCase() === 'market') {
                // Trendy hairstyle
                ctx.beginPath();
                ctx.moveTo(x - this.headSize / 2, y - this.headSize / 3);
                ctx.quadraticCurveTo(x, y - this.headSize * 0.9, x + this.headSize / 2, y - this.headSize / 3);
                ctx.fill();
            } else if (this.ticker.toLowerCase() === 'quant') {
                // Fun, playful hair
                ctx.beginPath();
                for (let i = -3; i <= 3; i++) {
                    ctx.moveTo(x + i * (this.headSize / 6), y - this.headSize / 2);
                    ctx.lineTo(x + i * (this.headSize / 6), y - this.headSize * 0.7 - Math.abs(i) * 2);
                }
                ctx.stroke();
                ctx.fill();
            }
        } else if (view === 'back') {
            // Back view hair
            ctx.beginPath();
            ctx.arc(x, y, this.headSize / 2 + 2, 0, Math.PI);
            ctx.fill();

            // Add character-specific back hair
            if (this.ticker.toLowerCase() === 'sentiment' || this.ticker.toLowerCase() === 'market') {
                // Longer hair in back for some characters
                ctx.beginPath();
                ctx.moveTo(x - this.headSize / 2, y);
                ctx.quadraticCurveTo(x, y + this.headSize / 3, x + this.headSize / 2, y);
                ctx.fill();
            }
        } else {
            // Side view hair (left or right)
            const direction = view === 'left' ? -1 : 1;

            // Basic side hair shape
            ctx.beginPath();
            ctx.arc(x, y, this.headSize / 2 + 2, Math.PI * 0.5, Math.PI * 1.5);
            ctx.fill();

            // Character specific side hair
            if (this.ticker.toLowerCase() === 'event') {
                // Short business cut
                ctx.beginPath();
                ctx.arc(x, y - this.headSize / 4, this.headSize / 2, Math.PI * 1.1, Math.PI * 1.9);
                ctx.fill();
            } else if (this.ticker.toLowerCase() === 'sentiment') {
                // Modern tech look
                ctx.beginPath();
                ctx.moveTo(x - direction * this.headSize / 4, y - this.headSize / 2);
                ctx.quadraticCurveTo(x, y - this.headSize * 0.8, x + direction * this.headSize / 3, y - this.headSize / 4);
                ctx.fill();
            } else if (this.ticker.toLowerCase() === 'market') {
                // Trendy hairstyle
                ctx.beginPath();
                ctx.moveTo(x - direction * this.headSize / 4, y - this.headSize / 2);
                ctx.quadraticCurveTo(x, y - this.headSize * 0.9, x + direction * this.headSize / 4, y - this.headSize / 2);
                ctx.fill();
            } else if (this.ticker.toLowerCase() === 'quant') {
                // Fun, playful hair
                ctx.beginPath();
                for (let i = -1; i <= 1; i++) {
                    ctx.moveTo(x + i * (this.headSize / 6), y - this.headSize / 2);
                    ctx.lineTo(x + i * (this.headSize / 6), y - this.headSize * 0.7 - Math.abs(i) * 2);
                }
                ctx.stroke();
                ctx.fill();
            }
        }
    }

    update() {
        if (this.messageTime > 0) {
            this.messageTime--;
        }

        if (this.isFetching) {
            this.facingDirection = 'up';
            return;
        }

        switch (this.state) {
            case 'idle':
                this.stateTime++;
                if (this.stateTime > 10) {
                    this.stateTime = 0;
                    const rand = Math.random();

                    if (rand < 0.4) {
                        // Start working
                        this.state = 'working';
                        this.stateTime = 0;
                        this.facingDirection = 'up';
                    } else if (rand < 0.7) {
                        // Random turning - only stationary action
                        const directions = ['up', 'down', 'left', 'right'];
                        this.facingDirection = directions[Math.floor(Math.random() * directions.length)];

                        // Say something about looking around using emojis
                        const lookMessages = [
                            "👀 📊 🔍",
                            "💫 🔄 ✨",
                            "🧠 ⏱️ 💭",
                            "💪 🔁 🌟",
                            `${this.ticker} 📶 📊`
                        ];
                        this.speak(lookMessages[Math.floor(Math.random() * lookMessages.length)]);
                    } else {
                        // Virtual interaction - speak using emojis
                        this.speak(`🔊 👋 ${this.ticker}?`);
                    }
                }
                break;

            case 'working':
                this.stateTime++;
                if (this.stateTime > 15) {
                    this.state = 'idle';
                    this.stateTime = 0;
                }
                break;
        }
    }

    startFetching() {
        debugLog(`${this.name} starting to fetch data`);
        this.isFetching = true;
        this.speak("Analyzing the market");
        this.facingDirection = 'up';
        updateSyncStatus(`${this.name} performing analysis...`);
        this.reasoningText = '';
    }

    // Add new method for collaborative analysis
    startCollaborativeAnalysis() {
        debugLog(`${this.name} joining collaborative analysis`);
        this.isFetching = true;
        this.speak("Let's put together our analysis!");
        this.facingDirection = 'down'; // Face toward center
        this.state = 'working';
        // Don't update sync status here, as the main function handles this
    }

    displayReasoning(reasoning) {
        debugLog(`${this.name} displaying reasoning`);
        this.speak("Analysis complete");

        const terminalContent = document.getElementById('terminalContent');
        if (terminalContent) {
            const timestamp = new Date().toLocaleTimeString();
            let formattedReasoning = reasoning;

            formattedReasoning = formattedReasoning.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

            if (!formattedReasoning.includes("Market Analysis:")) {
                const ticker = this.ticker.toLowerCase();

                let structuredReasoning = `<strong>FINAL ANALYSIS REPORT</strong>\n\n`;
                structuredReasoning += formattedReasoning.split('\n')[0] + '\n\n';
                formattedReasoning = structuredReasoning;
            }

            // Always try to format the data as a table regardless of analyst type
            try {
                if (typeof formatAnalystData === 'function') {
                    formattedReasoning = formatAnalystData(formattedReasoning);
                } else if (typeof formatEventAnalystData === 'function') {
                    formattedReasoning = formatEventAnalystData(formattedReasoning);
                }
            } catch (e) {
                console.error(`Error formatting data for ${this.name}:`, e);
                // If formatting fails, keep the original formatting
            }

            this.reasoningText = `<strong>=== ${this.name} Analysis Results ===</strong>\n` +
                `<span style="color: #0f0">[${timestamp}] Analysis completed successfully!</span>\n\n` +
                formattedReasoning;

            terminalContent.innerHTML = this.reasoningText;

            addToTerminalHistory(`${this.name} completed analysis - NEW INSIGHTS FOUND`);
        }

        updateSyncStatus(`${this.name} finished analysis and found something new!`);

        setTimeout(() => {
            debugLog(`${this.name} done fetching reasoning`);
            this.isFetching = false;
            currentFetchingTicker = null;
            isTaskInProgress = false;
            scheduleNextTask();
        }, REASONING_DISPLAY_TIME);
    }

    // Method for dog interaction - simplified but preserved
    petDog() {
        if (dog.isPettable(this)) {
            if (dog.getPetBy(this)) {
                this.state = 'idle';
                this.speak("🐶 ❤️ !");
                return true;
            }
        }
        return false;
    }
}