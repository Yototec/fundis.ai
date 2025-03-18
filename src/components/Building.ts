import * as PIXI from 'pixi.js';

export class Building {
  container: PIXI.Container;
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    this.width = width * 0.8; // 80% of the screen
    this.height = height * 0.8;
    this.container = new PIXI.Container();
    
    this.draw();
  }
  
  draw() {
    // Create the office building
    const building = new PIXI.Graphics();
    
    // Main office building (light colored building with walls)
    building.beginFill(0xf5f5f5); // Light color for walls
    building.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
    building.endFill();
    
    // Floor with improved texture
    this.drawFloor(building);
    
    // Add windows along the outer walls with improved texture
    this.drawWindows(building);
    
    // Draw interior walls and workstations
    this.drawInterior(building);
    
    // Add decorative elements
    this.addDecorativeElements(building);
    
    this.container.addChild(building);
  }
  
  drawFloor(building: PIXI.Graphics) {
    // Base floor color
    building.beginFill(0xefefef); // Light gray for floor
    building.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
    building.endFill();
    
    // Add floor tiles pattern
    const tileSize = this.width / 40; // Smaller tiles
    
    for (let x = -this.width / 2; x < this.width / 2; x += tileSize) {
      for (let y = -this.height / 2; y < this.height / 2; y += tileSize) {
        // Alternate tile colors for checkerboard effect
        const isEvenRow = Math.floor(y / tileSize) % 2 === 0;
        const isEvenCol = Math.floor(x / tileSize) % 2 === 0;
        
        if (isEvenRow === isEvenCol) {
          building.beginFill(0xe8e8e8, 0.5); // Slightly darker for alternating tiles
        } else {
          building.beginFill(0xf7f7f7, 0.5); // Slightly lighter for alternating tiles
        }
        
        building.drawRect(x, y, tileSize, tileSize);
        building.endFill();
        
        // Add subtle grout lines
        building.lineStyle(0.5, 0xd9d9d9, 0.3);
        building.drawRect(x, y, tileSize, tileSize);
      }
    }
    
    // Add some floor patterns or designs in certain areas
    building.beginFill(0xd9d9d9, 0.5);
    building.drawCircle(0, 0, this.width / 10); // Center circle design
    building.endFill();
    
    // Entry area with different pattern
    building.beginFill(0xd0d0d0, 0.3);
    building.drawRect(-this.width / 2, -this.height / 8, this.width / 5, this.height / 4);
    building.endFill();
  }
  
  drawWindows(building: PIXI.Graphics) {
    const windowSize = this.width / 20;
    const windowSpacing = this.width / 10;
    
    // Top wall windows
    for (let x = -this.width / 2 + windowSpacing; x < this.width / 2 - windowSize; x += windowSpacing) {
      this.drawWindow(building, x, -this.height / 2 + windowSize / 2, windowSize);
    }
    
    // Bottom wall windows
    for (let x = -this.width / 2 + windowSpacing; x < this.width / 2 - windowSize; x += windowSpacing) {
      this.drawWindow(building, x, this.height / 2 - windowSize * 1.5, windowSize);
    }
    
    // Left wall windows
    for (let y = -this.height / 2 + windowSpacing; y < this.height / 2 - windowSize; y += windowSpacing) {
      this.drawWindow(building, -this.width / 2 + windowSize / 2, y, windowSize);
    }
    
    // Right wall windows
    for (let y = -this.height / 2 + windowSpacing; y < this.height / 2 - windowSize; y += windowSpacing) {
      this.drawWindow(building, this.width / 2 - windowSize * 1.5, y, windowSize);
    }
  }
  
  drawWindow(building: PIXI.Graphics, x: number, y: number, size: number) {
    // Window frame
    building.lineStyle(1, 0xa0a0a0);
    building.beginFill(0xadd8e6); // Light blue for windows
    building.drawRect(x, y, size, size);
    building.endFill();
    
    // Window frame details
    building.lineStyle(0.5, 0xffffff, 0.8);
    
    // Window panes
    building.moveTo(x + size/2, y);
    building.lineTo(x + size/2, y + size);
    
    building.moveTo(x, y + size/2);
    building.lineTo(x + size, y + size/2);
    
    // Window reflection 
    building.lineStyle(0);
    building.beginFill(0xffffff, 0.3);
    building.drawRect(x + size * 0.1, y + size * 0.1, size * 0.3, size * 0.3);
    building.endFill();
    
    // Random chance for open windows
    if (Math.random() > 0.8) {
      building.beginFill(0x87ceeb, 0.9); // Slightly different shade for open window
      building.drawRect(x + size * 0.05, y + size * 0.05, size * 0.9, size/2);
      building.endFill();
    }
  }
  
  drawInterior(building: PIXI.Graphics) {
    // Make workstations smaller - reduced from 1/8 to 1/10 of the width
    const workstationSize = this.width / 10;
    
    // Department areas with different subtle colors
    building.beginFill(0xf0f8ff, 0.3); // Top left quadrant - sales
    building.drawRect(-this.width / 2, -this.height / 2, this.width / 2, this.height / 2);
    building.endFill();
    
    building.beginFill(0xfff0f5, 0.3); // Top right quadrant - marketing
    building.drawRect(0, -this.height / 2, this.width / 2, this.height / 2);
    building.endFill();
    
    building.beginFill(0xf5fffa, 0.3); // Bottom left quadrant - development
    building.drawRect(-this.width / 2, 0, this.width / 2, this.height / 2);
    building.endFill();
    
    building.beginFill(0xfff8e7, 0.3); // Bottom right quadrant - management
    building.drawRect(0, 0, this.width / 2, this.height / 2);
    building.endFill();
    
    // Workstation 1 - top left
    this.drawWorkstation(
      building,
      -this.width / 4 - workstationSize / 2,
      -this.height / 4 - workstationSize / 2,
      workstationSize
    );
    
    // Workstation 2 - top right
    this.drawWorkstation(
      building,
      this.width / 4 - workstationSize / 2,
      -this.height / 4 - workstationSize / 2,
      workstationSize
    );
    
    // Workstation 3 - bottom left
    this.drawWorkstation(
      building,
      -this.width / 4 - workstationSize / 2,
      this.height / 4 - workstationSize / 2,
      workstationSize
    );
    
    // Workstation 4 - bottom right
    this.drawWorkstation(
      building,
      this.width / 4 - workstationSize / 2,
      this.height / 4 - workstationSize / 2,
      workstationSize
    );
    
    // Add walkways between workstations
    building.lineStyle(2, 0xdcdcdc);
    
    // Horizontal pathway
    building.moveTo(-this.width / 2 + 20, 0);
    building.lineTo(this.width / 2 - 20, 0);
    
    // Vertical pathway
    building.moveTo(0, -this.height / 2 + 20);
    building.lineTo(0, this.height / 2 - 20);
  }
  
  drawWorkstation(building: PIXI.Graphics, x: number, y: number, size: number) {
    // Desk
    building.lineStyle(1, 0x654321);
    building.beginFill(0x8B4513); // Brown for desk
    building.drawRect(x, y, size, size / 2);
    building.endFill();
    
    // Desk texture - wood grain
    building.lineStyle(0.5, 0x654321, 0.3);
    for (let i = 0; i < 5; i++) {
      building.moveTo(x, y + i * (size / 10));
      building.lineTo(x + size, y + i * (size / 10));
    }
    
    // Chair
    building.lineStyle(1, 0x222222);
    building.beginFill(0x333333); // Dark gray for chair
    building.drawCircle(x + size / 2, y + size * 0.75, size / 8);
    building.endFill();
    
    // Chair details - backrest
    building.beginFill(0x444444);
    building.drawRect(x + size / 3, y + size * 0.65, size / 3, size / 10);
    building.endFill();
    
    // Computer
    building.beginFill(0x222222); // Black for computer
    building.drawRect(x + size / 4, y + size / 8, size / 2, size / 6);
    building.endFill();
    
    // Computer screen
    building.beginFill(0x87CEEB); // Light blue for screen
    building.drawRect(x + size / 4 + 2, y + size / 8 + 2, size / 2 - 4, size / 6 - 4);
    building.endFill();
    
    // Keyboard
    building.beginFill(0x444444);
    building.drawRect(x + size / 3, y + size / 3, size / 3, size / 10);
    building.endFill();
    
    // Office supplies - papers, etc.
    if (Math.random() > 0.5) {
      building.beginFill(0xFFFFFF);
      building.drawRect(x + size * 0.1, y + size / 4, size / 6, size / 8);
      building.endFill();
    }
    
    if (Math.random() > 0.5) {
      building.beginFill(0xFF9900);
      building.drawCircle(x + size * 0.85, y + size / 4, size / 20); // Coffee mug or pen holder
      building.endFill();
    }
  }
  
  addDecorativeElements(building: PIXI.Graphics) {
    // Add plants around the office
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * this.width * 0.8;
      const y = (Math.random() - 0.5) * this.height * 0.8;
      
      // Don't place plants directly on walkways
      if (Math.abs(x) < 20 || Math.abs(y) < 20) continue;
      
      this.drawPlant(building, x, y, 10 + Math.random() * 10);
    }
    
    // Add a water cooler
    this.drawWaterCooler(building, this.width * 0.2, -this.height * 0.3);
    
    // Add a coffee machine
    this.drawCoffeeMachine(building, -this.width * 0.3, this.height * 0.2);
    
    // Add a meeting table
    this.drawMeetingTable(building, 0, -this.height * 0.1);
  }
  
  drawPlant(building: PIXI.Graphics, x: number, y: number, size: number) {
    // Pot
    building.beginFill(0xCD853F);
    building.drawRect(x - size/3, y - size/3, size/1.5, size/2);
    building.endFill();
    
    // Plant
    const plantColor = Math.random() > 0.5 ? 0x228B22 : 0x008000;
    building.beginFill(plantColor);
    
    // Draw leaves
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const leafX = x + Math.cos(angle) * (size / 3);
      const leafY = y + Math.sin(angle) * (size / 3) - size / 2;
      building.drawEllipse(leafX, leafY, size / 3, size / 2);
    }
    
    building.endFill();
  }
  
  drawWaterCooler(building: PIXI.Graphics, x: number, y: number) {
    // Base
    building.beginFill(0x444444);
    building.drawRect(x - 10, y - 5, 20, 10);
    building.endFill();
    
    // Water container
    building.beginFill(0xadd8e6, 0.7);
    building.drawRect(x - 8, y - 25, 16, 20);
    building.endFill();
    
    // Spout
    building.beginFill(0x999999);
    building.drawRect(x - 2, y - 10, 4, 5);
    building.endFill();
  }
  
  drawCoffeeMachine(building: PIXI.Graphics, x: number, y: number) {
    // Base
    building.beginFill(0x333333);
    building.drawRect(x - 12, y - 5, 24, 10);
    building.endFill();
    
    // Machine body
    building.beginFill(0x666666);
    building.drawRect(x - 10, y - 25, 20, 20);
    building.endFill();
    
    // Coffee pot
    building.beginFill(0x222222);
    building.drawRect(x - 8, y - 20, 8, 15);
    building.endFill();
    
    // Buttons
    building.beginFill(0xFF0000);
    building.drawCircle(x + 5, y - 20, 2);
    building.endFill();
    
    building.beginFill(0x00FF00);
    building.drawCircle(x + 5, y - 15, 2);
    building.endFill();
  }
  
  drawMeetingTable(building: PIXI.Graphics, x: number, y: number) {
    // Table
    building.beginFill(0x8B4513);
    building.drawEllipse(x, y, 40, 25);
    building.endFill();
    
    // Table texture
    building.lineStyle(1, 0x654321, 0.3);
    building.drawEllipse(x, y, 35, 20);
    building.drawEllipse(x, y, 30, 15);
    building.lineStyle(0);
    
    // Chairs around table
    const chairCount = 6;
    for (let i = 0; i < chairCount; i++) {
      const angle = (i / chairCount) * Math.PI * 2;
      const chairX = x + Math.cos(angle) * 45;
      const chairY = y + Math.sin(angle) * 30;
      
      building.beginFill(0x333333);
      building.drawCircle(chairX, chairY, 8);
      building.endFill();
    }
  }
  
  getWorkstationPositions(): Array<[number, number]> {
    // Make workstations smaller, but keep their positions the same
    const workstationSize = this.width / 10;
    
    return [
      // Workstation 1 - top left
      [-this.width / 4, -this.height / 4],
      // Workstation 2 - top right
      [this.width / 4, -this.height / 4],
      // Workstation 3 - bottom left
      [-this.width / 4, this.height / 4],
      // Workstation 4 - bottom right
      [this.width / 4, this.height / 4]
    ];
  }
} 