class Fundis extends Person {
    constructor() {
        // Get the middle Y position of the door
        const middleY = Math.floor(ROWS / 2);
        // Position just inside the door
        const doorX = 1;
        
        // Call parent constructor with position, name, and "fundis" as ticker (for styling)
        super(doorX, middleY, "Fundis", "fundis");
        
        // Custom properties for Fundis agent
        this.uniformColor = '#4B0082'; // Indigo color for Fundis uniform
        this.isGreeter = true;
        this.hasGreeted = false;
        this.messageTime = 20; // Make initial message stay longer
        
        // Initial message
        this.speak("Welcome to Fundis.AI! 👋");
    }
    
    // Override update method to have custom behavior
    update() {
        // Keep the message visible longer on initial load
        if (this.messageTime > 0) {
            this.messageTime--;
        }
        
        // Always stay by the door
        if (this.x !== 1 || this.y !== Math.floor(ROWS / 2)) {
            this.setDestination(1, Math.floor(ROWS / 2));
        }
        
        // Always face inward (to the right)
        this.facingDirection = 'right';
        
        // Perform greeting if not yet done
        if (!this.hasGreeted && this.messageTime === 0) {
            this.speak("I'm Fundis, your AI assistant. Click on analysts to see their work!");
            this.hasGreeted = true;
            this.messageTime = 20;
        }
    }
    
    // Override drawTickerLogo to use custom Fundis logo
    drawTickerLogo(x, y, ticker) {
        const logoSize = this.bodyWidth * 0.4;

        ctx.save();
        ctx.translate(x, y);

        // Fundis logo (custom)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(0, 0, logoSize / 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4B0082'; // Indigo
        ctx.font = `bold ${logoSize * 0.6}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('F', 0, 0);

        ctx.restore();
    }
    
    // Override drawHair to give Fundis a unique hairstyle
    drawHair(x, y, view) {
        // Set custom hair color for Fundis
        ctx.fillStyle = '#663399'; // Purple hair for Fundis
        
        if (view === 'front') {
            // Front view hair - sleek professional style
            ctx.beginPath();
            ctx.arc(x, y - this.headSize / 6, this.headSize / 2 + 2, Math.PI, 2 * Math.PI);
            ctx.fill();
            
            // Add some volume on top
            ctx.beginPath();
            ctx.moveTo(x - this.headSize / 2, y - this.headSize / 3);
            ctx.quadraticCurveTo(x, y - this.headSize * 0.8, x + this.headSize / 2, y - this.headSize / 3);
            ctx.fill();
        } else if (view === 'back') {
            // Back view hair
            ctx.beginPath();
            ctx.arc(x, y, this.headSize / 2 + 2, 0, Math.PI);
            ctx.fill();
            
            // Add volume in back
            ctx.beginPath();
            ctx.moveTo(x - this.headSize / 2, y);
            ctx.quadraticCurveTo(x, y + this.headSize / 4, x + this.headSize / 2, y);
            ctx.fill();
        } else {
            // Side view hair (left or right)
            const direction = view === 'left' ? -1 : 1;
            
            // Basic side hair shape
            ctx.beginPath();
            ctx.arc(x, y, this.headSize / 2 + 2, Math.PI * 0.5, Math.PI * 1.5);
            ctx.fill();
            
            // Add styled hair on top
            ctx.beginPath();
            ctx.moveTo(x - direction * this.headSize / 4, y - this.headSize / 2);
            ctx.quadraticCurveTo(x, y - this.headSize * 0.7, x + direction * this.headSize / 3, y - this.headSize / 4);
            ctx.fill();
        }
    }
} 