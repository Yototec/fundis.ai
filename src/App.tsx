import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import './App.css';
import { Game } from './components/Game';

// We'll create components in separate files later
const Garden = ({ width, height }: { width: number, height: number }) => {
  return <Container />;
};

const OfficeSpace = ({ width, height }: { width: number, height: number }) => {
  return <Container />;
};

const Employee = ({ name, startPosition, workstationPosition, texture }: { 
  name: string, 
  startPosition: [number, number], 
  workstationPosition: [number, number], 
  texture: string 
}) => {
  return <Container />;
};

function App() {
  const pixiContainer = useRef<HTMLDivElement>(null);
  const pixiApp = useRef<PIXI.Application | null>(null);
  const game = useRef<Game | null>(null);
  
  // Initialize PixiJS app
  useEffect(() => {
    if (!pixiContainer.current) return;
    
    // Create the PixiJS application
    const app = new PIXI.Application({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x76c2af,
      antialias: true,
    });
    
    // Add the canvas to the DOM
    pixiContainer.current.appendChild(app.view as unknown as HTMLCanvasElement);
    pixiApp.current = app;
    
    // Initialize the game
    game.current = new Game(app);
    
    // Handle resize
    const handleResize = () => {
      app.renderer.resize(window.innerWidth, window.innerHeight);
      
      // If the game is initialized, we need to reposition the main container
      if (game.current) {
        game.current.container.position.set(window.innerWidth / 2, window.innerHeight / 2);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      app.destroy(true, true);
      if (pixiContainer.current && pixiContainer.current.firstChild) {
        pixiContainer.current.removeChild(pixiContainer.current.firstChild);
      }
    };
  }, []);
  
  return (
    <div className="app-container">
      <div ref={pixiContainer} />
    </div>
  );
}

export default App; 