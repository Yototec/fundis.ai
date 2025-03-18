import * as PIXI from 'pixi.js';
import { gsap } from 'gsap';
import { Garden } from './Garden';
import { Building } from './Building';
import { Employee } from './Employee';

export class Game {
  app: PIXI.Application;
  container: PIXI.Container;
  garden: Garden;
  building: Building;
  employees: Employee[];
  dayNightFilter: PIXI.ColorMatrixFilter;
  dayNightCycle: number;
  timeOfDay: 'day' | 'evening' | 'night' | 'morning';
  skyOverlay: PIXI.Graphics;
  
  constructor(app: PIXI.Application) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.position.set(app.screen.width / 2, app.screen.height / 2);
    this.dayNightCycle = 0;
    this.timeOfDay = 'day';
    this.employees = [];
    
    // Initialize filter and overlay
    this.dayNightFilter = new PIXI.ColorMatrixFilter();
    this.skyOverlay = new PIXI.Graphics();
    
    this.app.stage.addChild(this.container);
    
    // Add sky and lighting effects
    this.setupSkyAndLighting();
    
    // Create garden (background)
    this.garden = new Garden(app.screen.width, app.screen.height);
    this.container.addChild(this.garden.container);
    
    // Create building (office)
    this.building = new Building(app.screen.width, app.screen.height);
    this.container.addChild(this.building.container);
    
    // Create employees
    this.createEmployees();
    
    // Start game loop
    this.app.ticker.add((delta) => this.update(delta));
    
    // Start day/night cycle
    this.startDayNightCycle();
  }
  
  setupSkyAndLighting() {
    // Create a sky overlay for day/night effects
    this.skyOverlay.beginFill(0x000000, 0);
    this.skyOverlay.drawRect(
      -this.app.screen.width, 
      -this.app.screen.height, 
      this.app.screen.width * 2, 
      this.app.screen.height * 2
    );
    this.skyOverlay.endFill();
    
    // Add to stage as the top layer
    this.app.stage.addChild(this.skyOverlay);
    
    // Apply the filter to the container
    this.container.filters = [this.dayNightFilter];
  }
  
  startDayNightCycle() {
    // Loop through the day/night cycle
    // One complete cycle takes about 2 minutes
    const cycleDuration = 120; // seconds
    
    gsap.to(this, {
      dayNightCycle: 1,
      duration: cycleDuration,
      repeat: -1,
      ease: "none",
      onUpdate: () => this.updateDayNightLighting()
    });
  }
  
  updateDayNightLighting() {
    // Convert cycle (0-1) to time of day
    // 0.0-0.4: day
    // 0.4-0.5: evening
    // 0.5-0.9: night
    // 0.9-1.0: morning
    
    if (this.dayNightCycle < 0.4) {
      // Day - full brightness
      this.timeOfDay = 'day';
      this.dayNightFilter.brightness(1, false);
      this.skyOverlay.tint = 0xFFFFFF;
      this.skyOverlay.alpha = 0;
    } 
    else if (this.dayNightCycle < 0.5) {
      // Evening - sunset colors, gradually darker
      this.timeOfDay = 'evening';
      const sunsetProgress = (this.dayNightCycle - 0.4) / 0.1; // 0 to 1 during sunset
      this.dayNightFilter.brightness(1 - sunsetProgress * 0.3, false);
      
      // Sunset orange tint
      this.skyOverlay.tint = 0xFF9966;
      this.skyOverlay.alpha = sunsetProgress * 0.3;
    }
    else if (this.dayNightCycle < 0.9) {
      // Night - darker and bluer
      this.timeOfDay = 'night';
      const nightProgress = (this.dayNightCycle - 0.5) / 0.4; // 0 to 1 during night
      
      // Make it darker as night progresses, then slightly lighter towards morning
      const nightCurve = Math.sin(nightProgress * Math.PI);
      this.dayNightFilter.brightness(0.7 - nightCurve * 0.3, false);
      
      // Add blue tint for moonlight
      this.skyOverlay.tint = 0x3333AA;
      this.skyOverlay.alpha = 0.3 + nightCurve * 0.2;
      
      // Add a blue shift to colors
      this.dayNightFilter.tint(0x7799FF, false);
    }
    else {
      // Morning - sunrise colors, gradually brighter
      this.timeOfDay = 'morning';
      const sunriseProgress = (this.dayNightCycle - 0.9) / 0.1; // 0 to 1 during sunrise
      this.dayNightFilter.brightness(0.7 + sunriseProgress * 0.3, false);
      
      // Reset color filter
      this.dayNightFilter.tint(0xFFFFFF, false);
      
      // Sunrise golden tint
      this.skyOverlay.tint = 0xFFCC77;
      this.skyOverlay.alpha = 0.3 * (1 - sunriseProgress);
    }
    
    // Add office lights at night
    this.updateOfficeLights();
  }
  
  updateOfficeLights() {
    // Make the office windows glow at night
    if (this.timeOfDay === 'night' || this.timeOfDay === 'evening') {
      // Simulate office lights by making windows emit light
      // This could be implemented by modifying the Building class 
      // to add light effects to windows
    }
  }
  
  createEmployees() {
    const workstations = this.building.getWorkstationPositions();
    
    // Define employee data
    const employeeData = [
      { name: "Alice", startPos: [-50, -50] as [number, number] },
      { name: "Bob", startPos: [50, -50] as [number, number] },
      { name: "Charlie", startPos: [-50, 50] as [number, number] },
      { name: "Diana", startPos: [50, 50] as [number, number] }
    ];
    
    // Create each employee
    for (let i = 0; i < 4; i++) {
      const employee = new Employee(
        employeeData[i].name,
        employeeData[i].startPos,
        workstations[i]
      );
      
      this.employees.push(employee);
      this.container.addChild(employee.container);
    }
    
    // Schedule random employee interactions
    this.scheduleEmployeeInteractions();
  }
  
  scheduleEmployeeInteractions() {
    // Periodically make employees interact with each other
    setInterval(() => {
      // Skip interactions during the night
      if (this.timeOfDay === 'night') return;
      
      // Random chance to trigger an interaction
      if (Math.random() > 0.7) {
        // Pick two random employees
        const availableEmployees = this.employees.filter(e => !e.isMoving);
        
        if (availableEmployees.length >= 2) {
          const e1 = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
          let e2;
          do {
            e2 = availableEmployees[Math.floor(Math.random() * availableEmployees.length)];
          } while (e1 === e2);
          
          // Make them meet at a point between them
          const meetX = (e1.container.position.x + e2.container.position.x) / 2;
          const meetY = (e1.container.position.y + e2.container.position.y) / 2;
          
          // Make them move to the meeting point
          this.moveEmployeeToMeetingPoint(e1, [meetX, meetY]);
          this.moveEmployeeToMeetingPoint(e2, [meetX, meetY]);
        }
      }
    }, 10000); // Check every 10 seconds
  }
  
  moveEmployeeToMeetingPoint(employee: Employee, point: [number, number]) {
    // Calculate distance
    const startX = employee.container.position.x;
    const startY = employee.container.position.y;
    const distance = Math.sqrt(
      Math.pow(point[0] - startX, 2) + 
      Math.pow(point[1] - startY, 2)
    );
    
    // Calculate duration based on distance
    const duration = distance / (employee.speed * 30);
    
    // Face the right direction
    if (point[0] < startX) {
      employee.sprite.scale.x = -1; // Flip horizontally
    } else {
      employee.sprite.scale.x = 1;
    }
    
    // Make them move
    employee.isMoving = true;
    gsap.to(employee.container.position, {
      x: point[0],
      y: point[1],
      duration: duration,
      ease: "none",
      onComplete: () => {
        employee.isMoving = false;
        // Show speech bubble
        employee.showSpeechBubble();
      }
    });
  }
  
  update(delta: number) {
    // Update game logic here
    for (const employee of this.employees) {
      employee.update();
      
      // Make employees go to workstations at night
      if (this.timeOfDay === 'night' && !employee.isMoving && 
          employee.currentTarget !== employee.workstationPosition) {
        // Employee should go home at night
        employee.moveTo(employee.workstationPosition);
        employee.currentTarget = employee.workstationPosition;
      }
    }
    
    // Update any garden animations if needed
    // No need to explicitly call garden updates as they use GSAP for animations
  }
} 