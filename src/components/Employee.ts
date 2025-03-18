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
  speechBubble: PIXI.Container | null;
  moodState: 'working' | 'walking' | 'talking' | 'coffee';
  
  constructor(name: string, startPosition: [number, number], workstationPosition: [number, number]) {
    this.name = name;
    this.startPosition = startPosition;
    this.workstationPosition = workstationPosition;
    this.currentTarget = workstationPosition;
    this.speed = 0.5 + Math.random() * 0.5; // Random speed
    this.isMoving = false;
    this.animationTimeline = null;
    this.speechBubble = null;
    this.moodState = 'walking';
    
    this.container = new PIXI.Container();
    this.container.position.set(startPosition[0], startPosition[1]);
    
    // Make employee scale larger - 1.5x the original size
    this.container.scale.set(1.5);
    
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
    
    // Hair with more detail
    sprite.beginFill(hairColor);
    if (Math.random() > 0.5) {
      // Long hair
      sprite.drawEllipse(0, -19, 8, 5);
      // Add hair strands
      sprite.lineStyle(1, hairColor);
      for (let i = -6; i <= 6; i += 3) {
        sprite.moveTo(i, -16);
        sprite.lineTo(i, -8);
      }
    } else {
      // Short hair
      sprite.drawEllipse(0, -20, 8, 3);
      // Add hair texture
      sprite.lineStyle(1, hairColor);
      for (let i = -6; i <= 6; i += 2) {
        sprite.moveTo(i, -20);
        sprite.lineTo(i, -17);
      }
    }
    sprite.endFill();
    
    // Eyes with more detail
    sprite.beginFill(0xFFFFFF);
    sprite.drawCircle(-3, -16, 2);
    sprite.drawCircle(3, -16, 2);
    sprite.endFill();
    
    sprite.beginFill(0x000000);
    const eyeColor = Math.random() > 0.7 ? 0x6B8E23 : Math.random() > 0.5 ? 0x8B4513 : 0x000000;
    sprite.beginFill(eyeColor);
    sprite.drawCircle(-3, -16, 1);
    sprite.drawCircle(3, -16, 1);
    sprite.endFill();
    
    // Eyebrows
    sprite.lineStyle(1, hairColor);
    sprite.moveTo(-5, -19);
    sprite.lineTo(-1, -18);
    sprite.moveTo(1, -18);
    sprite.lineTo(5, -19);
    
    // Mouth with expressions (random)
    sprite.lineStyle(1, 0x000000);
    if (Math.random() > 0.7) {
      // Smile
      sprite.moveTo(-4, -12);
      sprite.quadraticCurveTo(0, -9, 4, -12);
    } else if (Math.random() > 0.5) {
      // Straight line
      sprite.moveTo(-3, -12);
      sprite.lineTo(3, -12);
    } else {
      // Slight frown
      sprite.moveTo(-4, -11);
      sprite.quadraticCurveTo(0, -13, 4, -11);
    }
    
    // Body with more detail
    sprite.lineStyle(0);
    sprite.beginFill(shirtColor);
    sprite.drawRect(-7, -7, 14, 14); // Shirt/torso
    sprite.endFill();
    
    // Shirt details
    sprite.lineStyle(1, 0x000000, 0.3);
    sprite.moveTo(-7, -2);
    sprite.lineTo(7, -2);
    sprite.moveTo(0, -7);
    sprite.lineTo(0, 7);
    
    // Collar
    sprite.lineStyle(1, 0xFFFFFF);
    sprite.moveTo(-3, -7);
    sprite.lineTo(-1, -4);
    sprite.lineTo(1, -4);
    sprite.lineTo(3, -7);
    
    // Pants
    sprite.lineStyle(0);
    sprite.beginFill(pantsColor);
    sprite.drawRect(-7, 7, 14, 8);
    sprite.endFill();
    
    // Belt
    sprite.lineStyle(1, Math.random() > 0.5 ? 0x8B4513 : 0x000000);
    sprite.moveTo(-7, 7);
    sprite.lineTo(7, 7);
    
    // Legs
    sprite.lineStyle(0);
    sprite.beginFill(pantsColor);
    sprite.drawRect(-5, 15, 3, 10);
    sprite.drawRect(2, 15, 3, 10);
    sprite.endFill();
    
    // Shoes
    sprite.beginFill(0x000000);
    sprite.drawEllipse(-3.5, 25, 4, 2);
    sprite.drawEllipse(3.5, 25, 4, 2);
    sprite.endFill();
    
    // Arms
    sprite.beginFill(shirtColor);
    sprite.drawRect(-10, -5, 3, 12);
    sprite.drawRect(7, -5, 3, 12);
    sprite.endFill();
    
    // Hands
    sprite.beginFill(skinColor);
    sprite.drawCircle(-10, 7, 2);
    sprite.drawCircle(10, 7, 2);
    sprite.endFill();
    
    return sprite;
  }
  
  addNameTag() {
    const nameTag = new PIXI.Text(this.name, {
      fontFamily: 'Arial',
      fontSize: 8,
      fill: 0xFFFFFF,
      align: 'center',
      stroke: 0x000000,
      strokeThickness: 2
    });
    
    nameTag.position.set(-20, -32);
    this.container.addChild(nameTag);
  }
  
  startBehavior() {
    // Schedule random movements between workstation and random places
    this.scheduleNextMove();
    
    // Start walking animation
    this.startWalkingAnimation();
    
    // Sometimes create speech bubbles
    setInterval(() => {
      if (!this.isMoving && Math.random() > 0.7) {
        this.showSpeechBubble();
      }
    }, 8000);
  }
  
  showSpeechBubble() {
    // Remove existing speech bubble
    if (this.speechBubble) {
      this.container.removeChild(this.speechBubble);
    }
    
    // Create a new speech bubble
    this.speechBubble = new PIXI.Container();
    
    // Speech bubble background
    const bubble = new PIXI.Graphics();
    bubble.beginFill(0xFFFFFF);
    bubble.drawRoundedRect(-25, -50, 50, 25, 5);
    bubble.endFill();
    
    bubble.beginFill(0xFFFFFF);
    bubble.drawPolygon([0, -25, -5, -20, 5, -20]);
    bubble.endFill();
    
    // Add random conversation text
    const phrases = [
      "...",
      "Hi!",
      "Coffee?",
      "Meeting?",
      "Deadline!",
      "Good work!",
      "Lunch?",
      "Email me",
      "Call you"
    ];
    
    const phrase = phrases[Math.floor(Math.random() * phrases.length)];
    
    const text = new PIXI.Text(phrase, {
      fontFamily: 'Arial',
      fontSize: 7,
      fill: 0x000000,
      align: 'center'
    });
    
    text.position.set(-20, -45);
    
    this.speechBubble.addChild(bubble);
    this.speechBubble.addChild(text);
    this.container.addChild(this.speechBubble);
    
    // Set mood state
    this.moodState = 'talking';
    
    // Hide the speech bubble after a random time
    setTimeout(() => {
      if (this.speechBubble) {
        this.container.removeChild(this.speechBubble);
        this.speechBubble = null;
      }
      // Return to previous state if not already changed
      if (this.moodState === 'talking') {
        this.moodState = this.isMoving ? 'walking' : 'working';
      }
    }, 3000 + Math.random() * 2000);
  }
  
  scheduleNextMove() {
    // Wait for a random time before moving
    setTimeout(() => {
      // Sometimes employees talk to each other
      if (Math.random() > 0.8 && !this.isMoving) {
        // Stay in place and chat
        this.showSpeechBubble();
        this.scheduleNextMove();
        return;
      }
      
      this.isMoving = true;
      this.moodState = 'walking';
      
      // Decide where to go next
      if (Math.random() > 0.6 && this.currentTarget !== this.workstationPosition) {
        // Go to workstation
        this.moveTo(this.workstationPosition);
        this.currentTarget = this.workstationPosition;
      } else if (Math.random() > 0.7) {
        // Coffee break or water cooler area
        const breakAreaX = 100 * (Math.random() > 0.5 ? 1 : -1);
        const breakAreaY = 80 * (Math.random() > 0.5 ? 1 : -1);
        this.moveTo([breakAreaX, breakAreaY]);
        this.currentTarget = [breakAreaX, breakAreaY];
        this.moodState = 'coffee';
      } else {
        // Go to a random position in the office
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
        // 50% chance to animate "working" at workstation
        if (this.currentTarget === this.workstationPosition) {
          this.moodState = 'working';
          this.animateWorking();
        }
        this.scheduleNextMove();
      }
    });
  }
  
  animateWorking() {
    // Subtle typing animation
    if (this.moodState === 'working') {
      gsap.to(this.sprite, {
        y: -1,
        duration: 0.2,
        repeat: 5,
        yoyo: true,
        ease: "sine.inOut"
      });
    }
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
    // Called in the animation loop
    // Add random head movements when not moving
    if (!this.isMoving && Math.random() > 0.98) {
      gsap.to(this.sprite, {
        rotation: (Math.random() - 0.5) * 0.1,
        duration: 0.5,
        ease: "sine.inOut",
        yoyo: true,
        repeat: 1
      });
    }
  }
} 