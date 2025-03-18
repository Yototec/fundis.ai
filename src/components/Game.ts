import * as PIXI from 'pixi.js';
import { Garden } from './Garden';
import { Building } from './Building';
import { Employee } from './Employee';

export class Game {
  app: PIXI.Application;
  container: PIXI.Container;
  garden: Garden;
  building: Building;
  employees: Employee[];
  
  constructor(app: PIXI.Application) {
    this.app = app;
    this.container = new PIXI.Container();
    this.container.position.set(app.screen.width / 2, app.screen.height / 2);
    
    this.app.stage.addChild(this.container);
    
    // Create garden (background)
    this.garden = new Garden(app.screen.width, app.screen.height);
    this.container.addChild(this.garden.container);
    
    // Create building (office)
    this.building = new Building(app.screen.width, app.screen.height);
    this.container.addChild(this.building.container);
    
    // Create employees
    this.employees = [];
    this.createEmployees();
    
    // Start game loop
    this.app.ticker.add(() => this.update());
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
  }
  
  update() {
    // Update game logic here
    for (const employee of this.employees) {
      employee.update();
    }
  }
} 