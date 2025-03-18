import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

export class Garden {
  container: PIXI.Container;
  width: number;
  height: number;
  treeContainers: PIXI.Container[];
  flowerContainers: PIXI.Container[];
  fishSprites: PIXI.Graphics[];
  pond: PIXI.Graphics;
  animationTimelines: gsap.core.Timeline[];
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.container = new PIXI.Container();
    this.treeContainers = [];
    this.flowerContainers = [];
    this.fishSprites = [];
    this.pond = new PIXI.Graphics();
    this.animationTimelines = [];
    
    this.draw();
    this.startAnimations();
  }
  
  draw() {
    // Create the garden base
    this.drawGrass();
    
    // Add garden elements
    this.addPond();
    this.addTrees();
    this.addFlowers();
    this.addPathways();
    this.addGardenFurniture();
  }
  
  drawGrass() {
    const grass = new PIXI.Graphics();
    
    // Fill the entire area with grass base color
    grass.beginFill(0x7cbc3a); // Bright green for grass
    grass.drawRect(-this.width / 2, -this.height / 2, this.width, this.height);
    grass.endFill();
    
    // Add grass texture with multiple layers
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * this.width - this.width / 2;
      const y = Math.random() * this.height - this.height / 2;
      const size = Math.random() * 5 + 2;
      
      // Skip the middle where the office will be
      const distFromCenter = Math.sqrt(x * x + y * y);
      if (distFromCenter < Math.min(this.width, this.height) * 0.3) continue;
      
      // Different shades of green for more natural look
      const grassShades = [0x619a30, 0x88cb47, 0x5a8d2a, 0x83c343, 0x75b336];
      const shade = grassShades[Math.floor(Math.random() * grassShades.length)];
      
      grass.beginFill(shade, 0.7 + Math.random() * 0.3);
      grass.drawEllipse(x, y, size, size + Math.random() * 3);
      grass.endFill();
    }
    
    // Add some dirt patches and texture variation
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * this.width - this.width / 2;
      const y = Math.random() * this.height - this.height / 2;
      const size = Math.random() * 15 + 5;
      
      // Skip the middle where the office will be
      const distFromCenter = Math.sqrt(x * x + y * y);
      if (distFromCenter < Math.min(this.width, this.height) * 0.35) continue;
      
      grass.beginFill(0x8B4513, 0.1); // Very subtle brown
      grass.drawEllipse(x, y, size, size);
      grass.endFill();
    }
    
    this.container.addChild(grass);
    
    // Add some tall grass blades at the edges
    for (let i = 0; i < 100; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.min(this.width, this.height) * (0.45 + Math.random() * 0.05);
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      this.drawGrassBlade(x, y, 8 + Math.random() * 12);
    }
  }
  
  drawGrassBlade(x: number, y: number, height: number) {
    const blade = new PIXI.Graphics();
    const grassShades = [0x619a30, 0x88cb47, 0x5a8d2a];
    const shade = grassShades[Math.floor(Math.random() * grassShades.length)];
    
    blade.beginFill(shade);
    
    // Draw a curved grass blade
    blade.moveTo(x, y);
    blade.bezierCurveTo(
      x + 1, y - height / 2,
      x + 3, y - height * 0.8,
      x, y - height
    );
    blade.bezierCurveTo(
      x - 3, y - height * 0.8,
      x - 1, y - height / 2,
      x, y
    );
    
    blade.endFill();
    this.container.addChild(blade);
    
    // Animate grass blade swaying
    const timeline = gsap.timeline({ repeat: -1, yoyo: true });
    timeline.to(blade, {
      rotation: (Math.random() - 0.5) * 0.2,
      duration: 1 + Math.random() * 2,
      ease: "sine.inOut",
      delay: Math.random() * 2
    });
    
    this.animationTimelines.push(timeline);
  }
  
  addPond() {
    // Create a natural looking pond with better shape and details
    const pondContainer = new PIXI.Container();
    
    // Position the pond in a better location
    pondContainer.position.set(this.width * 0.3, this.height * 0.25);
    
    // Draw the pond with more natural shape
    this.pond = new PIXI.Graphics();
    const pondWidth = this.width * 0.15;
    const pondHeight = this.height * 0.1;
    
    // Base water - dark blue
    this.pond.beginFill(0x1a5276); // Deeper blue for depth
    
    // Create irregular pond shape using a parametric equation
    const points = [];
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      // Add randomness to radius for natural look
      const noiseX = 0.7 + Math.sin(angle * 3) * 0.2 + Math.random() * 0.1;
      const noiseY = 0.7 + Math.cos(angle * 2) * 0.3 + Math.random() * 0.1;
      const x = Math.cos(angle) * pondWidth * noiseX;
      const y = Math.sin(angle) * pondHeight * noiseY;
      points.push(new PIXI.Point(x, y));
    }
    
    this.pond.drawPolygon(points);
    this.pond.endFill();
    
    // Bank around the pond
    this.pond.beginFill(0x8B4513, 0.6); // Brown for mud around pond
    
    const bankPoints = [];
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const idx = i % points.length;
      const bankSize = 5 + Math.random() * 10;
      const x = points[idx].x * (1.1 + bankSize / 100);
      const y = points[idx].y * (1.1 + bankSize / 100);
      bankPoints.push(new PIXI.Point(x, y));
    }
    
    this.pond.drawPolygon([...points.reverse(), ...bankPoints]);
    this.pond.endFill();
    
    // Water top - lighter blue
    this.pond.beginFill(0x2980b9, 0.8); // Mid blue for main water
    this.pond.drawPolygon(points);
    this.pond.endFill();
    
    // Surface highlights - lightest blue
    this.pond.beginFill(0x3498db, 0.5); // Light blue for surface
    
    // Create irregular smaller shape for highlights
    const highlightPoints = [];
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const idx = i % points.length;
      const x = points[idx].x * 0.7;
      const y = points[idx].y * 0.6;
      highlightPoints.push(new PIXI.Point(x, y));
    }
    
    this.pond.drawPolygon(highlightPoints);
    this.pond.endFill();
    
    // Water ripples
    this.pond.lineStyle(1, 0xadd8e6, 0.3); // Light blue, transparent
    
    for (let i = 0; i < 3; i++) {
      const ripplePoints = [];
      for (let j = 0; j < steps; j++) {
        const angle = (j / steps) * Math.PI * 2;
        const idx = j % points.length;
        const scale = 0.5 + i * 0.2;
        const x = points[idx].x * scale;
        const y = points[idx].y * scale;
        ripplePoints.push(new PIXI.Point(x, y));
      }
      this.pond.drawPolygon(ripplePoints);
    }
    
    // Add pebbles around the pond
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = pondWidth * (1.05 + Math.random() * 0.1);
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist * (pondHeight / pondWidth);
      
      // Pebble
      this.pond.beginFill(0xcbcbcb, 0.8);
      this.pond.drawEllipse(x, y, 2 + Math.random() * 4, 1 + Math.random() * 3);
      this.pond.endFill();
    }
    
    // Add animated water surface with ripples
    this.animatePondSurface();
    
    // Add fish
    this.addFishToPond();
    
    // Add lily pads
    this.addLilyPads();
    
    pondContainer.addChild(this.pond);
    this.container.addChild(pondContainer);
  }
  
  animatePondSurface() {
    // Create animated ripples that appear randomly
    const createRipple = () => {
      const ripple = new PIXI.Graphics();
      
      // Random position within the pond
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.width * 0.08;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      // Add ripple to pond
      ripple.lineStyle(1, 0xffffff, 0.7);
      ripple.drawCircle(x, y, 1);
      this.pond.addChild(ripple);
      
      // Animate ripple expanding and fading
      gsap.to(ripple, {
        alpha: 0,
        duration: 2,
        ease: "sine.out",
        onUpdate: () => {
          ripple.clear();
          ripple.lineStyle(1, 0xffffff, 0.7 * ripple.alpha);
          // Expand the circle as it fades
          const size = 1 + (1 - ripple.alpha) * 15;
          ripple.drawCircle(x, y, size);
        },
        onComplete: () => {
          this.pond.removeChild(ripple);
        }
      });
    };
    
    // Create ripples occasionally
    setInterval(createRipple, 3000);
    createRipple(); // Start with one ripple
  }
  
  addFishToPond() {
    this.fishSprites = [];
    
    // Add fish
    for (let i = 0; i < 8; i++) {
      const fish = this.createFish();
      
      // Position the fish randomly in the pond
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.width * 0.06;
      fish.position.x = Math.cos(angle) * distance;
      fish.position.y = Math.sin(angle) * distance;
      
      // Rotate the fish to a random direction
      fish.rotation = Math.random() * Math.PI * 2;
      
      this.pond.addChild(fish);
      this.fishSprites.push(fish);
      
      // Animate each fish swimming
      this.animateFish(fish);
    }
  }
  
  createFish(): PIXI.Graphics {
    // Create a fish with more detail
    const fish = new PIXI.Graphics();
    
    // Random fish colors
    const fishColors = [0xFF4500, 0xFFA500, 0xFFD700, 0xFF8C00, 0xE9967A, 0x1E90FF, 0x00BFFF];
    const primaryColor = fishColors[Math.floor(Math.random() * fishColors.length)];
    const secondaryColor = fishColors[Math.floor(Math.random() * fishColors.length)];
    
    // Fish body
    fish.beginFill(primaryColor);
    fish.drawEllipse(0, 0, 8, 4); // Larger fish
    
    // Fish tail
    fish.drawPolygon([6, 0, 12, -5, 12, 5]);
    fish.endFill();
    
    // Fish patterns - stripes or spots
    fish.beginFill(secondaryColor, 0.5);
    if (Math.random() > 0.5) {
      // Stripes
      for (let i = -5; i < 5; i += 3) {
        fish.drawRect(i, -3, 1, 6);
      }
    } else {
      // Spots
      for (let i = 0; i < 3; i++) {
        fish.drawCircle(-2 + i * 3, Math.random() * 2 - 1, 1);
      }
    }
    fish.endFill();
    
    // Fish eye
    fish.beginFill(0xFFFFFF);
    fish.drawCircle(-5, -1, 1.5);
    fish.endFill();
    
    fish.beginFill(0x000000);
    fish.drawCircle(-5, -1, 0.8);
    fish.endFill();
    
    // Fish fin on top
    fish.beginFill(primaryColor, 0.8);
    fish.drawPolygon([0, 0, -2, -5, 2, -5]);
    fish.endFill();
    
    // Fish fin on bottom
    fish.beginFill(primaryColor, 0.8);
    fish.drawPolygon([-1, 0, 1, 0, 0, 5]);
    fish.endFill();
    
    return fish;
  }
  
  animateFish(fish: PIXI.Graphics) {
    // Create a timeline for each fish
    const timeline = gsap.timeline({ repeat: -1 });
    
    // Random movement within the pond
    const moveFish = () => {
      // Generate a new target point
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.width * 0.06;
      const targetX = Math.cos(angle) * distance;
      const targetY = Math.sin(angle) * distance;
      
      // Calculate duration based on distance
      const currentX = fish.position.x;
      const currentY = fish.position.y;
      const distToTravel = Math.sqrt(
        Math.pow(targetX - currentX, 2) + Math.pow(targetY - currentY, 2)
      );
      const duration = distToTravel / 10; // Adjust speed here
      
      // Calculate angle to target
      const angleToTarget = Math.atan2(targetY - currentY, targetX - currentX);
      
      // Determine if fish should flip (if going left)
      const shouldFlip = Math.abs(angleToTarget) > Math.PI / 2;
      
      // Create animation
      fish.scale.x = shouldFlip ? -1 : 1;
      
      return gsap.to(fish.position, {
        x: targetX,
        y: targetY,
        duration: duration,
        ease: "power1.inOut",
        onUpdate: () => {
          // Subtle up/down movement
          fish.position.y += Math.sin(Date.now() / 200) * 0.1;
        }
      });
    };
    
    // Queue multiple movements
    for (let i = 0; i < 5; i++) {
      timeline.add(moveFish());
    }
    
    // Add subtle tail wiggle animation
    const tailWiggle = gsap.to(fish, {
      rotation: "+=0.1",
      duration: 0.2,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
    
    this.animationTimelines.push(timeline);
  }
  
  addLilyPads() {
    // Add lily pads to the pond
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * this.width * 0.05;
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;
      
      // Create lily pad
      const lilyPad = new PIXI.Graphics();
      
      // Lily pad base
      lilyPad.beginFill(0x006400);
      
      // Create an irregular circle for lily pad
      const points = [];
      const steps = 12;
      const size = 5 + Math.random() * 5;
      
      for (let j = 0; j < steps; j++) {
        const padAngle = (j / steps) * Math.PI * 2;
        // Add randomness to radius for natural look
        const noise = 0.8 + Math.sin(padAngle * 3) * 0.1 + Math.random() * 0.2;
        const padX = Math.cos(padAngle) * size * noise;
        const padY = Math.sin(padAngle) * size * noise;
        points.push(new PIXI.Point(padX, padY));
      }
      
      lilyPad.drawPolygon(points);
      lilyPad.endFill();
      
      // Add highlight on the pad
      lilyPad.beginFill(0x32CD32, 0.3);
      for (let j = 0; j < points.length; j++) {
        points[j].x *= 0.7;
        points[j].y *= 0.7;
      }
      lilyPad.drawPolygon(points);
      lilyPad.endFill();
      
      // Sometimes add a flower to the lily pad
      if (Math.random() > 0.6) {
        // Flower stem
        lilyPad.beginFill(0x006400);
        lilyPad.drawRect(-0.5, -2, 1, 4);
        lilyPad.endFill();
        
        // Flower petals
        const flowerColor = Math.random() > 0.5 ? 0xFF69B4 : 0xFFFFFF;
        lilyPad.beginFill(flowerColor);
        
        for (let j = 0; j < 5; j++) {
          const flowerAngle = (j / 5) * Math.PI * 2;
          const petalX = Math.cos(flowerAngle) * 3;
          const petalY = Math.sin(flowerAngle) * 3 - 3;
          lilyPad.drawCircle(petalX, petalY, 2);
        }
        
        lilyPad.endFill();
        
        // Flower center
        lilyPad.beginFill(0xFFFF00);
        lilyPad.drawCircle(0, -3, 1);
        lilyPad.endFill();
      }
      
      lilyPad.position.set(x, y);
      
      // Add subtle floating animation
      gsap.to(lilyPad, {
        y: y + (Math.random() - 0.5) * 3,
        rotation: (Math.random() - 0.5) * 0.3,
        duration: 2 + Math.random() * 3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
      });
      
      this.pond.addChild(lilyPad);
    }
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
      trunk.drawRect(-5, -10, 10, 30);
      trunk.endFill();
      
      // Add trunk texture
      trunk.lineStyle(1, 0x654321, 0.3);
      for (let j = -5; j < 5; j += 3) {
        trunk.moveTo(j, -10);
        trunk.lineTo(j, 20);
      }
      
      // Tree top with better texture and shape
      const treeTop = new PIXI.Graphics();
      const treeColor = Math.random() > 0.3 ? 0x228B22 : 0x006400; // Different shades of green
      
      // Randomize tree shape
      if (Math.random() > 0.5) {
        // Round tree with multiple levels for more detail
        treeTop.beginFill(treeColor);
        treeTop.drawCircle(0, -25, 20);
        treeTop.endFill();
        
        treeTop.beginFill(treeColor);
        treeTop.drawCircle(0, -35, 15);
        treeTop.endFill();
        
        treeTop.beginFill(treeColor);
        treeTop.drawCircle(0, -42, 10);
        treeTop.endFill();
        
        // Add texture to foliage
        treeTop.beginFill(0x006400, 0.3);
        for (let j = 0; j < 10; j++) {
          const leafAngle = Math.random() * Math.PI * 2;
          const leafDist = Math.random() * 18;
          const leafX = Math.cos(leafAngle) * leafDist;
          const leafY = Math.sin(leafAngle) * leafDist - 30;
          treeTop.drawCircle(leafX, leafY, 5 + Math.random() * 5);
        }
        treeTop.endFill();
      } else {
        // Triangular tree (conifer/pine)
        treeTop.beginFill(treeColor);
        treeTop.drawPolygon([-20, -10, 0, -40, 20, -10]);
        treeTop.endFill();
        
        // Add more levels for detail
        treeTop.beginFill(treeColor);
        treeTop.drawPolygon([-15, -20, 0, -45, 15, -20]);
        treeTop.endFill();
        
        treeTop.beginFill(treeColor);
        treeTop.drawPolygon([-10, -30, 0, -50, 10, -30]);
        treeTop.endFill();
        
        // Add texture to foliage
        treeTop.lineStyle(1, 0x006400, 0.5);
        for (let j = -15; j < 15; j += 5) {
          treeTop.moveTo(j / 2, -10 - (15 - Math.abs(j)) / 2);
          treeTop.lineTo(j, -10);
        }
      }
      
      treeContainer.addChild(trunk);
      treeContainer.addChild(treeTop);
      treeContainer.scale.set(Math.random() * 0.5 + 0.8); // Random size
      
      this.container.addChild(treeContainer);
      this.treeContainers.push(treeContainer);
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
        const colors = [0xFF1493, 0xFF6347, 0xFFFF00, 0xDA70D6, 0xFFFFFF, 0x9370DB, 0xFF69B4, 0xFFA07A];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        // Stem
        flower.beginFill(0x228B22);
        flower.drawRect(-1, 0, 2, 10);
        flower.endFill();
        
        // Add leaves to stem
        flower.beginFill(0x32CD32);
        flower.drawEllipse(-3, 5, 3, 1);
        flower.drawEllipse(3, 8, 3, 1);
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
      this.flowerContainers.push(flowerCluster);
    }
  }
  
  addPathways() {
    // Add stone pathways through the garden
    const path = new PIXI.Graphics();
    
    // Path from bottom to center
    path.beginFill(0xD3D3D3, 0.7);
    
    // Create a winding path with curves
    const pathWidth = this.width * 0.05;
    const controlPoints = [
      { x: 0, y: this.height * 0.45 },
      { x: this.width * 0.05, y: this.height * 0.35 },
      { x: -this.width * 0.05, y: this.height * 0.25 },
      { x: 0, y: this.height * 0.15 },
      { x: 0, y: 0 }
    ];
    
    // Draw path segments
    for (let i = 0; i < controlPoints.length - 1; i++) {
      const current = controlPoints[i];
      const next = controlPoints[i + 1];
      
      // Create a segment with bezier curves for natural look
      const curveFactor = 0.3;
      const ctrlX = current.x + (next.x - current.x) * curveFactor;
      const ctrlY = current.y + (next.y - current.y) * curveFactor;
      
      path.moveTo(current.x - pathWidth / 2, current.y);
      path.quadraticCurveTo(
        ctrlX - pathWidth / 2, 
        ctrlY, 
        next.x - pathWidth / 2, 
        next.y
      );
      
      path.lineTo(next.x + pathWidth / 2, next.y);
      
      path.quadraticCurveTo(
        ctrlX + pathWidth / 2, 
        ctrlY, 
        current.x + pathWidth / 2, 
        current.y
      );
      
      path.lineTo(current.x - pathWidth / 2, current.y);
    }
    
    path.endFill();
    
    // Add stones/pebbles texture to the path
    for (let i = 0; i < 200; i++) {
      // Random positions along path
      const t = Math.random();
      const pathIndex = Math.floor(t * (controlPoints.length - 1));
      const current = controlPoints[pathIndex];
      const next = controlPoints[pathIndex + 1];
      
      const lerpX = current.x + (next.x - current.x) * (t * (controlPoints.length - 1) - pathIndex);
      const lerpY = current.y + (next.y - current.y) * (t * (controlPoints.length - 1) - pathIndex);
      
      // Random offset within path width
      const offsetX = (Math.random() - 0.5) * pathWidth * 0.9;
      
      path.beginFill(0xBEBEBE, 0.7);
      path.drawEllipse(
        lerpX + offsetX, 
        lerpY, 
        1 + Math.random() * 2, 
        1 + Math.random() * 2
      );
      path.endFill();
    }
    
    this.container.addChild(path);
  }
  
  addGardenFurniture() {
    // Add a garden bench
    this.drawBench(-this.width * 0.25, this.height * 0.3);
    
    // Add a bird bath
    this.drawBirdBath(this.width * 0.2, -this.height * 0.25);
  }
  
  drawBench(x: number, y: number) {
    const bench = new PIXI.Graphics();
    
    // Bench legs
    bench.beginFill(0x8B4513);
    bench.drawRect(x - 20, y - 5, 5, 15);
    bench.drawRect(x + 15, y - 5, 5, 15);
    bench.endFill();
    
    // Bench seat
    bench.beginFill(0xA0522D);
    bench.drawRect(x - 25, y - 10, 50, 5);
    bench.endFill();
    
    // Bench back
    bench.beginFill(0xA0522D);
    bench.drawRect(x - 25, y - 25, 50, 3);
    bench.drawRect(x - 25, y - 20, 50, 3);
    bench.drawRect(x - 25, y - 15, 50, 3);
    
    // Back supports
    bench.drawRect(x - 20, y - 25, 3, 20);
    bench.drawRect(x + 17, y - 25, 3, 20);
    bench.endFill();
    
    // Wood grain texture
    bench.lineStyle(0.5, 0x654321, 0.5);
    for (let i = 0; i < 5; i++) {
      bench.moveTo(x - 25, y - 10 + i);
      bench.lineTo(x + 25, y - 10 + i);
    }
    
    this.container.addChild(bench);
  }
  
  drawBirdBath(x: number, y: number) {
    const birdBath = new PIXI.Graphics();
    
    // Base/pedestal
    birdBath.beginFill(0xD3D3D3);
    birdBath.drawRect(x - 5, y - 5, 10, 25);
    birdBath.endFill();
    
    // Basin
    birdBath.beginFill(0xD3D3D3);
    birdBath.drawEllipse(x, y - 15, 15, 5);
    birdBath.endFill();
    
    // Water
    birdBath.beginFill(0x87CEEB, 0.7);
    birdBath.drawEllipse(x, y - 15, 12, 3);
    birdBath.endFill();
    
    // Water ripple animation
    const ripple = new PIXI.Graphics();
    ripple.lineStyle(1, 0xFFFFFF, 0.3);
    ripple.drawEllipse(x, y - 15, 5, 1);
    birdBath.addChild(ripple);
    
    // Animate ripples
    gsap.to(ripple.scale, {
      x: 2,
      y: 2,
      alpha: 0,
      duration: 2,
      repeat: -1,
      ease: "sine.out"
    });
    
    // Occasionally add a bird
    if (Math.random() > 0.5) {
      const bird = new PIXI.Graphics();
      
      // Bird body
      bird.beginFill(Math.random() > 0.5 ? 0x964B00 : 0x333333);
      bird.drawEllipse(x + 5, y - 20, 5, 3);
      bird.endFill();
      
      // Bird head
      bird.beginFill(Math.random() > 0.5 ? 0x964B00 : 0x333333);
      bird.drawCircle(x + 9, y - 22, 3);
      bird.endFill();
      
      // Bird beak
      bird.beginFill(0xFFA500);
      bird.drawPolygon([x + 11, y - 22, x + 14, y - 21, x + 11, y - 20]);
      bird.endFill();
      
      // Bird eye
      bird.beginFill(0x000000);
      bird.drawCircle(x + 10, y - 23, 0.5);
      bird.endFill();
      
      // Bird legs
      bird.beginFill(0xFFA500);
      bird.drawRect(x + 3, y - 17, 1, 3);
      bird.drawRect(x + 6, y - 17, 1, 3);
      bird.endFill();
      
      birdBath.addChild(bird);
      
      // Animate bird slightly
      gsap.to(bird, {
        y: "-=1",
        duration: 0.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
    
    this.container.addChild(birdBath);
  }
  
  startAnimations() {
    // Animate trees swaying in the wind
    this.treeContainers.forEach(tree => {
      gsap.to(tree, {
        rotation: (Math.random() - 0.5) * 0.05,
        duration: 2 + Math.random() * 3,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random() * 2
      });
    });
    
    // Animate flowers swaying in the wind
    this.flowerContainers.forEach(flowerCluster => {
      gsap.to(flowerCluster, {
        rotation: (Math.random() - 0.5) * 0.1,
        duration: 1 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random()
      });
      
      // Add subtle scale breathing animation
      gsap.to(flowerCluster, {
        scaleX: 1 + Math.random() * 0.05,
        scaleY: 1 + Math.random() * 0.05,
        duration: 1 + Math.random() * 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: Math.random()
      });
    });
  }
} 