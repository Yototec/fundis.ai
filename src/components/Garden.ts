import * as PIXI from 'pixi.js';

export class Garden {
  container: PIXI.Container;
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.container = new PIXI.Container();
    
    this.draw();
  }
  
  draw() {
    // Create the garden base
    this.drawGrass();
    
    // Add garden elements
    this.addTrees();
    this.addFlowers();
    this.addPond();
  }
  
  drawGrass() {
    const grass = new PIXI.Graphics();
    
    // Fill the entire area with grass
    grass.beginFill(0x7cbc3a); // Bright green for grass
    grass.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
    grass.endFill();
    
    // Add some grass texture with slightly varied colors
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * this.width - this.width / 2;
      const y = Math.random() * this.height - this.height / 2;
      const size = Math.random() * 5 + 2;
      
      grass.beginFill(Math.random() > 0.5 ? 0x619a30 : 0x88cb47);
      grass.drawCircle(x, y, size);
      grass.endFill();
    }
    
    this.container.addChild(grass);
  }
  
  addTrees() {
    // Add trees around the perimeter, but not in front of the office
    for (let i = 0; i < 20; i++) {
      const treeContainer = new PIXI.Container();
      
      // Randomize position around the perimeter
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.min(this.width, this.height) * 0.45; // Place near the edge
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      treeContainer.position.set(x, y);
      
      // Tree trunk
      const trunk = new PIXI.Graphics();
      trunk.beginFill(0x8B4513); // Brown
      trunk.drawRect(-5, -10, 10, 20);
      trunk.endFill();
      
      // Tree top
      const treeTop = new PIXI.Graphics();
      const treeColor = Math.random() > 0.3 ? 0x228B22 : 0x006400; // Different shades of green
      treeTop.beginFill(treeColor);
      
      // Randomize tree shape
      if (Math.random() > 0.5) {
        // Round tree
        treeTop.drawCircle(0, -25, 20);
      } else {
        // Triangular tree
        treeTop.drawPolygon([-20, -10, 0, -40, 20, -10]);
      }
      
      treeTop.endFill();
      
      treeContainer.addChild(trunk);
      treeContainer.addChild(treeTop);
      treeContainer.scale.set(Math.random() * 0.5 + 0.8); // Random size
      
      this.container.addChild(treeContainer);
    }
  }
  
  addFlowers() {
    // Add clusters of flowers throughout the garden
    for (let i = 0; i < 30; i++) {
      const flowerCluster = new PIXI.Container();
      
      // Position around the garden but not in the building
      const angle = Math.random() * Math.PI * 2;
      const minDistance = Math.min(this.width, this.height) * 0.25; // Don't be too close to center
      const maxDistance = Math.min(this.width, this.height) * 0.45; // Don't be too close to edge
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      flowerCluster.position.set(x, y);
      
      // Add 3-7 flowers in the cluster
      const flowerCount = Math.floor(Math.random() * 5) + 3;
      
      for (let j = 0; j < flowerCount; j++) {
        // Create a flower
        const flower = new PIXI.Graphics();
        
        // Randomize flower color
        const colors = [0xFF1493, 0xFF6347, 0xFFFF00, 0xDA70D6, 0xFFFFFF, 0x9370DB];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Stem
        flower.beginFill(0x228B22);
        flower.drawRect(-1, 0, 2, 10);
        flower.endFill();
        
        // Flower petals
        flower.beginFill(color);
        const petalSize = Math.random() * 2 + 3;
        
        // Draw petals
        for (let k = 0; k < 5; k++) {
          const petalAngle = (k / 5) * Math.PI * 2;
          const petalX = Math.cos(petalAngle) * petalSize;
          const petalY = Math.sin(petalAngle) * petalSize - 5;
          flower.drawCircle(petalX, petalY, petalSize);
        }
        
        // Center of flower
        flower.beginFill(0xFFFF00);
        flower.drawCircle(0, -5, petalSize / 2);
        flower.endFill();
        
        // Position in the cluster
        flower.position.set(
          (Math.random() - 0.5) * 15,
          (Math.random() - 0.5) * 15
        );
        
        flowerCluster.addChild(flower);
      }
      
      this.container.addChild(flowerCluster);
    }
  }
  
  addPond() {
    // Add a pond in the garden
    const pondContainer = new PIXI.Container();
    
    // Position the pond in the bottom right
    pondContainer.position.set(this.width * 0.3, this.height * 0.25);
    
    // Draw the pond
    const pond = new PIXI.Graphics();
    const pondWidth = this.width * 0.15;
    const pondHeight = this.height * 0.1;
    
    // Pond shape
    pond.beginFill(0x4682B4); // Steel blue for water
    pond.drawEllipse(0, 0, pondWidth, pondHeight);
    pond.endFill();
    
    // Water ripples
    for (let i = 0; i < 5; i++) {
      pond.lineStyle(1, 0xADD8E6, 0.3); // Light blue, transparent
      const rippleSize = 0.8 + i * 0.05;
      pond.drawEllipse(0, 0, pondWidth * rippleSize, pondHeight * rippleSize);
    }
    
    // Add fish
    for (let i = 0; i < 5; i++) {
      this.addFish(pond, pondWidth, pondHeight);
    }
    
    pondContainer.addChild(pond);
    this.container.addChild(pondContainer);
  }
  
  addFish(pond: PIXI.Graphics, pondWidth: number, pondHeight: number) {
    // Create a fish
    const fish = new PIXI.Graphics();
    
    // Random fish colors
    const fishColors = [0xFF4500, 0xFFA500, 0xFFD700, 0xFF8C00, 0xE9967A];
    const fishColor = fishColors[Math.floor(Math.random() * fishColors.length)];
    
    // Fish body
    fish.beginFill(fishColor);
    fish.drawEllipse(0, 0, 6, 3);
    
    // Fish tail
    fish.drawPolygon([4, 0, 8, -3, 8, 3]);
    fish.endFill();
    
    // Fish eye
    fish.beginFill(0x000000);
    fish.drawCircle(-3, 0, 1);
    fish.endFill();
    
    // Position the fish randomly in the pond
    const fishX = (Math.random() - 0.5) * pondWidth * 0.8;
    const fishY = (Math.random() - 0.5) * pondHeight * 0.8;
    fish.position.set(fishX, fishY);
    
    // Rotate the fish to a random direction
    fish.rotation = Math.random() * Math.PI * 2;
    
    pond.addChild(fish);
    
    return fish;
  }
} 