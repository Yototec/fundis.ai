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
    
    // Main office building (light colored building with windows)
    building.beginFill(0xf5f5f5); // Light color for walls
    building.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
    building.endFill();
    
    // Floor
    building.beginFill(0xe0e0e0); // Slightly darker for floor
    building.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
    building.endFill();
    
    // Add windows along the outer walls
    this.drawWindows(building);
    
    // Draw interior walls and workstations
    this.drawInterior(building);
    
    this.container.addChild(building);
  }
  
  drawWindows(building: PIXI.Graphics) {
    const windowSize = this.width / 20;
    const windowSpacing = this.width / 10;
    
    building.beginFill(0x87ceeb); // Light blue for windows
    
    // Top wall windows
    for (let x = -this.width / 2 + windowSpacing; x < this.width / 2 - windowSize; x += windowSpacing) {
      building.drawRect(x, -this.height / 2 + windowSize / 2, windowSize, windowSize);
    }
    
    // Bottom wall windows
    for (let x = -this.width / 2 + windowSpacing; x < this.width / 2 - windowSize; x += windowSpacing) {
      building.drawRect(x, this.height / 2 - windowSize * 1.5, windowSize, windowSize);
    }
    
    // Left wall windows
    for (let y = -this.height / 2 + windowSpacing; y < this.height / 2 - windowSize; y += windowSpacing) {
      building.drawRect(-this.width / 2 + windowSize / 2, y, windowSize, windowSize);
    }
    
    // Right wall windows
    for (let y = -this.height / 2 + windowSpacing; y < this.height / 2 - windowSize; y += windowSpacing) {
      building.drawRect(this.width / 2 - windowSize * 1.5, y, windowSize, windowSize);
    }
    
    building.endFill();
  }
  
  drawInterior(building: PIXI.Graphics) {
    const workstationSize = this.width / 8;
    
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
  }
  
  drawWorkstation(building: PIXI.Graphics, x: number, y: number, size: number) {
    // Desk
    building.beginFill(0x8B4513); // Brown for desk
    building.drawRect(x, y, size, size / 2);
    building.endFill();
    
    // Chair
    building.beginFill(0x333333); // Dark gray for chair
    building.drawCircle(x + size / 2, y + size * 0.75, size / 6);
    building.endFill();
    
    // Computer
    building.beginFill(0x222222); // Black for computer
    building.drawRect(x + size / 4, y + size / 8, size / 2, size / 4);
    building.endFill();
  }
  
  getWorkstationPositions(): Array<[number, number]> {
    const workstationSize = this.width / 8;
    
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