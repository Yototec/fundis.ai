import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';

export class Employee {
  container: PIXI.Container;
  sprite: PIXI.Graphics;
  name: string;
  startPosition: [number, number];
  workstationPosition: [number, number];
  currentTarget: [number, number];
  speed: number;
  isMoving: boolean;
  animationTimeline: gsap.core.Timeline | null;
  
  constructor(name: string, startPosition: [number, number], workstationPosition: [number, number]) {
    this.name = name;
    this.startPosition = startPosition;
    this.workstationPosition = workstationPosition;
    this.currentTarget = workstationPosition;
    this.speed = 0.5 + Math.random() * 0.5; // Random speed
    this.isMoving = false;
    this.animationTimeline = null;
    
    this.container = new PIXI.Container();
    this.container.position.set(startPosition[0], startPosition[1]);
    
    // Create the employee sprite
    this.sprite = this.createSprite();
    this.container.addChild(this.sprite);
    
    // Add name tag
    this.addNameTag();
    
    // Start movement behavior
    this.startBehavior();
  }
  
  createSprite(): PIXI.Graphics {
    // Create a cartoon-style person
    const sprite = new PIXI.Graphics();
    
    // Random colors for variety
    const colors = [0x3366CC, 0xCC3366, 0x66CC33, 0xCC6633, 0x33CCCC, 0x9933CC];
    const skinTones = [0xF5DEB3, 0xFFDCD1, 0xDEB887, 0xCD853F, 0x8D5524];
    const hairColors = [0x000000, 0x8B4513, 0xD2B48C, 0xF4A460, 0xFFD700];
    
    const shirtColor = colors[Math.floor(Math.random() * colors.length)];
    const pantsColor = 0x222222;
    const skinColor = skinTones[Math.floor(Math.random() * skinTones.length)];
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    
    // Head
    sprite.beginFill(skinColor);
    sprite.drawCircle(0, -15, 8);
    sprite.endFill();
    
    // Hair
    sprite.beginFill(hairColor);
    if (Math.random() > 0.5) {
      // Long hair
      sprite.drawEllipse(0, -19, 8, 5);
    } else {
      // Short hair
      sprite.drawEllipse(0, -20, 8, 3);
    }
    sprite.endFill();
    
    // Eyes
    sprite.beginFill(0xFFFFFF);
    sprite.drawCircle(-3, -16, 2);
    sprite.drawCircle(3, -16, 2);
    sprite.endFill();
    
    sprite.beginFill(0x000000);
    sprite.drawCircle(-3, -16, 1);
    sprite.drawCircle(3, -16, 1);
    sprite.endFill();
    
    // Mouth
    sprite.lineStyle(1, 0x000000);
    sprite.moveTo(-3, -12);
    sprite.lineTo(3, -12);
    
    // Body
    sprite.beginFill(shirtColor);
    sprite.drawRect(-7, -7, 14, 14); // Shirt/torso
    sprite.endFill();
    
    // Pants
    sprite.beginFill(pantsColor);
    sprite.drawRect(-7, 7, 14, 8);
    sprite.endFill();
    
    // Legs
    sprite.beginFill(pantsColor);
    sprite.drawRect(-5, 15, 3, 10);
    sprite.drawRect(2, 15, 3, 10);
    sprite.endFill();
    
    // Arms
    sprite.beginFill(shirtColor);
    sprite.drawRect(-10, -5, 3, 12);
    sprite.drawRect(7, -5, 3, 12);
    sprite.endFill();
    
    return sprite;
  }
  
  addNameTag() {
    const nameTag = new PIXI.Text(this.name, {
      fontFamily: 'Arial',
      fontSize: 10,
      fill: 0xFFFFFF,
      align: 'center',
      stroke: 0x000000,
      strokeThickness: 2
    });
    
    nameTag.position.set(-20, -30);
    this.container.addChild(nameTag);
  }
  
  startBehavior() {
    // Schedule random movements between workstation and random places
    this.scheduleNextMove();
    
    // Start walking animation
    this.startWalkingAnimation();
  }
  
  scheduleNextMove() {
    // Wait for a random time before moving
    setTimeout(() => {
      this.isMoving = true;
      
      // Decide where to go next
      if (Math.random() > 0.5 && this.currentTarget !== this.workstationPosition) {
        // Go to workstation
        this.moveTo(this.workstationPosition);
        this.currentTarget = this.workstationPosition;
      } else {
        // Go to a random position
        const randomX = (Math.random() - 0.5) * 300;
        const randomY = (Math.random() - 0.5) * 200;
        this.moveTo([randomX, randomY]);
        this.currentTarget = [randomX, randomY];
      }
    }, Math.random() * 5000 + 2000); // Random wait between 2-7 seconds
  }
  
  moveTo(position: [number, number]) {
    // Calculate distance and time to move
    const startX = this.container.position.x;
    const startY = this.container.position.y;
    const distance = Math.sqrt(
      Math.pow(position[0] - startX, 2) + 
      Math.pow(position[1] - startY, 2)
    );
    
    const duration = distance / (this.speed * 30); // Adjust for speed
    
    // Face the right direction
    if (position[0] < startX) {
      this.sprite.scale.x = -1; // Flip horizontally
    } else {
      this.sprite.scale.x = 1;
    }
    
    // Create animation
    gsap.to(this.container.position, {
      x: position[0],
      y: position[1],
      duration: duration,
      ease: "none",
      onComplete: () => {
        this.isMoving = false;
        this.scheduleNextMove();
      }
    });
  }
  
  startWalkingAnimation() {
    // Animate the legs/arms for walking
    this.animationTimeline = gsap.timeline({ repeat: -1, yoyo: true });
    
    // We're using the container rotation for a subtle walking effect
    this.animationTimeline.to(this.container, {
      rotation: 0.05,
      duration: 0.2,
      ease: "sine.inOut"
    });
    
    this.animationTimeline.to(this.container, {
      rotation: -0.05,
      duration: 0.2,
      ease: "sine.inOut"
    });
  }
  
  stopWalkingAnimation() {
    if (this.animationTimeline) {
      this.animationTimeline.kill();
      this.animationTimeline = null;
      this.container.rotation = 0;
    }
  }
  
  update() {
    // This method would be called in the animation loop if needed
    // For more complex behaviors
  }
} 