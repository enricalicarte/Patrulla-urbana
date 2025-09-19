import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameObject, ObjectType } from './types';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  CAR_WIDTH,
  CAR_HEIGHT,
  OBSTACLE_WIDTH,
  OBSTACLE_HEIGHT,
  ENERGY_PICKUP_SIZE,
  INITIAL_ENERGY,
  ENERGY_PER_PICKUP,
  ENERGY_COST_PER_HIT,
  ENERGY_DRAIN_PER_SECOND,
  INITIAL_GAME_SPEED,
  MAX_GAME_SPEED,
  SPEED_INCREASE_INTERVAL,
  SPEED_INCREASE_AMOUNT,
  CAR_MOVE_STEP,
  OBSTACLE_SPAWN_RATE,
  ENERGY_SPAWN_RATE,
} from './constants';


// --- Themed Helper Components ---

const PoliceCar: React.FC<{ x: number; isHit: boolean }> = ({ x, isHit }) => (
  <div
    className={`absolute bottom-5 transition-all duration-75 ${isHit ? 'opacity-50 animate-pulse' : 'opacity-100'}`}
    style={{
      width: `${CAR_WIDTH}%`,
      height: `${CAR_HEIGHT}px`,
      left: `${x}%`,
      transform: 'translateX(-50%)',
      transitionProperty: 'left',
    }}
  >
    <div className="relative w-full h-full bg-white rounded-t-lg border-2 border-gray-300 shadow-lg">
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-blue-900 rounded-t-md"></div>
      <div className="absolute w-full h-1 bg-gray-400 top-1/2"></div>
      {/* Light Bar */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-1/3 h-2 rounded-t-sm bg-gray-600 flex justify-around items-center overflow-hidden">
        <div className="w-1/2 h-full bg-red-500 animate-flash-red"></div>
        <div className="w-1/2 h-full bg-blue-500 animate-flash-blue"></div>
      </div>
    </div>
  </div>
);

const CivilianCar: React.FC<{ obstacle: GameObject }> = ({ obstacle }) => (
  <div
    className="absolute rounded-md border-2 border-gray-800"
    style={{
      width: `${obstacle.width}%`,
      height: `${obstacle.height}px`,
      left: `${obstacle.x}%`,
      top: `${obstacle.y}px`,
      transform: 'translateX(-50%)',
      backgroundColor: obstacle.color || '#9ca3af', // gray-400
    }}
  />
);

const TrafficCone: React.FC<{ obstacle: GameObject }> = ({ obstacle }) => (
  <div
    className="absolute"
    style={{
      width: `${obstacle.width}%`,
      height: `${obstacle.height}px`,
      left: `${obstacle.x}%`,
      top: `${obstacle.y}px`,
      transform: 'translateX(-50%)',
      backgroundColor: '#f97316', // orange-500
      clipPath: 'polygon(35% 0, 65% 0, 100% 100%, 0% 100%)',
    }}
  />
);


const MupolShield: React.FC<{ pickup: GameObject }> = ({ pickup }) => (
  <div
    className="absolute flex items-center justify-center font-black text-white text-lg rounded-full animate-pulse"
    style={{
      width: `${pickup.width}%`,
      height: `${pickup.width}%`, // maintain aspect ratio
      left: `${pickup.x}%`,
      top: `${pickup.y}px`,
      transform: 'translateX(-50%)',
      backgroundColor: '#004b8d', // MUPOL Blue
      border: '3px solid #fff',
      clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
    }}
  >
    M
  </div>
);

const RoadLine: React.FC<{ top: number; duration: number }> = ({ top, duration }) => (
  <div
    className="absolute w-2 bg-yellow-400"
    style={{
      height: '40px',
      left: '50%',
      transform: 'translateX(-50%)',
      top: `${top}px`,
      animation: `moveDown ${duration}s linear infinite`,
    }}
  />
);

const Cityscape: React.FC<{ speed: number }> = ({ speed }) => (
  <>
    {[...Array(5)].map((_, i) => (
      <div key={i} className="absolute bg-gray-900 bottom-0 opacity-50" style={{
        left: `${i * 20 + Math.random() * 10}%`,
        width: `${10 + Math.random() * 10}%`,
        height: `${20 + Math.random() * 40}%`,
        animation: `moveDown ${15 / speed}s linear infinite`,
        animationDelay: `${Math.random() * -5}s`
      }}/>
    ))}
  </>
);


const GameUI: React.FC<{ score: number; energy: number }> = ({ score, energy }) => {
  const energyColor = energy > 60 ? 'bg-green-500' : energy > 30 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="absolute top-0 left-0 right-0 p-4 text-white font-bold z-10 flex justify-between items-center text-lg bg-black bg-opacity-20">
      <div>PUNTUACIÓN: {score}</div>
      <div className="w-1/3">
        <div className="font-sans text-sm mb-1 text-right tracking-wider">PROTECCIÓN</div>
        <div className="h-4 w-full bg-gray-700 rounded-full overflow-hidden border-2 border-gray-500">
          <div
            className={`h-full rounded-full ${energyColor} transition-all duration-300`}
            style={{ width: `${Math.max(0, energy)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const StartScreen: React.FC<{ onStart: () => void }> = ({ onStart }) => (
  <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-20 text-white text-center p-4">
    <h1 className="text-5xl md:text-6xl font-bold text-white tracking-wider" style={{ textShadow: '0 0 15px #004b8d' }}>
      MUPOL
    </h1>
    <h2 className="text-3xl md:text-4xl font-semibold text-cyan-300 tracking-wider mb-4" style={{ textShadow: '0 0 10px #004b8d' }}>
      Patrulla Urbana
    </h2>
    <p className="mt-4 text-xl">Usa ← y → para moverte</p>
    <p className="text-lg">Esquiva el tráfico y recoge los escudos.</p>
    <button
      onClick={onStart}
      className="mt-8 px-8 py-3 text-white font-bold text-2xl rounded-lg border-2 border-cyan-300 transition-transform transform hover:scale-105"
      style={{ backgroundColor: '#004b8d', textShadow: '1px 1px 3px #000' }}
    >
      Iniciar Juego
    </button>
  </div>
);

const GameOverScreen: React.FC<{ score: number; onRestart: () => void }> = ({ score, onRestart }) => (
   <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col justify-center items-center z-20 text-white">
    <h1 className="text-6xl font-bold">Fin de la Partida</h1>
    <p className="mt-4 text-3xl">Puntuación Final: {score}</p>
    <button
      onClick={onRestart}
      className="mt-8 px-8 py-3 text-white font-bold text-2xl rounded-lg border-2 border-cyan-400 transition-transform transform hover:scale-105"
      style={{ backgroundColor: '#004b8d', textShadow: '1px 1px 3px #000' }}
    >
      Volver a Jugar
    </button>
  </div>
);

// --- Main App Component ---

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.Start);
  const [score, setScore] = useState(0);
  const [energy, setEnergy] = useState(INITIAL_ENERGY);
  const [carPositionX, setCarPositionX] = useState(50);
  const [gameObjects, setGameObjects] = useState<GameObject[]>([]);
  const [isHit, setIsHit] = useState(false);
  const [isShaking, setIsShaking] = useState(false);

  const gameSpeed = useRef(INITIAL_GAME_SPEED);
  const frameCount = useRef(0);
  const gameLoopId = useRef<number>();
  const lastTime = useRef<number>(performance.now());
  const timeAccumulator = useRef(0);

  const resetGame = useCallback(() => {
    setScore(0);
    setEnergy(INITIAL_ENERGY);
    setCarPositionX(50);
    setGameObjects([]);
    gameSpeed.current = INITIAL_GAME_SPEED;
    frameCount.current = 0;
    timeAccumulator.current = 0;
    lastTime.current = performance.now();
    setGameState(GameState.Playing);
  }, []);

  // FIX: The error "Expected 1 arguments, but got 0" on this line is cryptic.
  // Directly assigning `resetGame` to `handleStart` simplifies the code and avoids
  // the potential issue, as creating a wrapper function is unnecessary here.
  const handleStart = resetGame;

  const triggerHit = () => {
    setIsHit(true);
    setIsShaking(true);
    setTimeout(() => setIsHit(false), 300);
    setTimeout(() => setIsShaking(false), 200);
  };

  const checkCollision = (carX: number, obj: GameObject): boolean => {
      const carLeft = carX - CAR_WIDTH / 2;
      const carRight = carX + CAR_WIDTH / 2;
      const objLeft = obj.x - obj.width / 2;
      const objRight = obj.x + obj.width / 2;
  
      const carRect = {
          left: carLeft, right: carRight,
          top: GAME_HEIGHT - CAR_HEIGHT - 20, bottom: GAME_HEIGHT - 20
      };
      const objRect = {
          left: objLeft, right: objRight,
          top: obj.y, bottom: obj.y + obj.height
      };
  
      return carRect.left < objRect.right && carRect.right > objRect.left &&
             carRect.top < objRect.bottom && carRect.bottom > objRect.top;
  };

  const gameLoop = useCallback(() => {
    setGameObjects(prevObjects => {
        let currentEnergy = energy;
        let energyChanged = false;

        // Move existing objects
        const movedObjects = prevObjects
          .map(o => ({ ...o, y: o.y + gameSpeed.current }))
          .filter(o => o.y < GAME_HEIGHT + 50); // Keep them a bit longer for smooth exit

        // Spawn new objects
        frameCount.current++;
        if (frameCount.current % OBSTACLE_SPAWN_RATE === 0) {
            const type = Math.random() > 0.3 ? ObjectType.CivilianCar : ObjectType.Cone;
            const width = type === ObjectType.CivilianCar ? OBSTACLE_WIDTH : OBSTACLE_WIDTH * 0.6;
            const height = type === ObjectType.CivilianCar ? OBSTACLE_HEIGHT : OBSTACLE_HEIGHT * 0.7;
            movedObjects.push({
                id: Date.now() + Math.random(),
                type,
                x: Math.random() * (100 - width) + width / 2,
                y: -height,
                width: width,
                height: height,
                color: `hsl(${Math.random() * 360}, 20%, 60%)`
            });
        }
        if (frameCount.current % ENERGY_SPAWN_RATE === 0) {
            movedObjects.push({
                id: Date.now() + Math.random(),
                type: ObjectType.Energy,
                x: Math.random() * (100 - ENERGY_PICKUP_SIZE) + ENERGY_PICKUP_SIZE / 2,
                y: -ENERGY_PICKUP_SIZE * 2,
                width: ENERGY_PICKUP_SIZE,
                height: ENERGY_PICKUP_SIZE
            });
        }
        
        // Collision detection
        const objectsToRemove = new Set<number>();
        let energyDelta = 0;

        for (const obj of movedObjects) {
          if(checkCollision(carPositionX, obj)) {
              if (obj.type === ObjectType.Energy) {
                  energyDelta += ENERGY_PER_PICKUP;
              } else {
                  energyDelta -= ENERGY_COST_PER_HIT;
                  triggerHit();
              }
              objectsToRemove.add(obj.id);
          }
        }

        if (energyDelta !== 0) {
            currentEnergy = Math.max(0, Math.min(INITIAL_ENERGY, energy + energyDelta));
            energyChanged = true;
        }

        const now = performance.now();
        const deltaTime = now - lastTime.current;
        lastTime.current = now;
        timeAccumulator.current += deltaTime;

        if (timeAccumulator.current >= 1000) {
            currentEnergy = Math.max(0, currentEnergy - ENERGY_DRAIN_PER_SECOND);
            energyChanged = true;
            setScore(prev => prev + Math.floor(gameSpeed.current));
            timeAccumulator.current -= 1000;
        }

        if (energyChanged) {
            setEnergy(currentEnergy);
        }

        if (currentEnergy <= 0) {
            setGameState(GameState.GameOver);
        }
        
        if (frameCount.current > 0 && frameCount.current % (SPEED_INCREASE_INTERVAL / (1000/60)) === 0) {
            gameSpeed.current = Math.min(MAX_GAME_SPEED, gameSpeed.current + SPEED_INCREASE_AMOUNT);
        }

        return movedObjects.filter(o => !objectsToRemove.has(o.id));
    });
    
    gameLoopId.current = requestAnimationFrame(gameLoop);
  }, [carPositionX, energy]);

  useEffect(() => {
    if (gameState === GameState.Playing) {
      lastTime.current = performance.now();
      gameLoopId.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopId.current) cancelAnimationFrame(gameLoopId.current);
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if(gameState !== GameState.Playing) return;
        if (e.key === 'ArrowLeft') {
            setCarPositionX(prev => Math.max(CAR_WIDTH / 2, prev - CAR_MOVE_STEP));
        } else if (e.key === 'ArrowRight') {
            setCarPositionX(prev => Math.min(100 - CAR_WIDTH / 2, prev + CAR_MOVE_STEP));
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  return (
    <div className="min-h-screen w-full flex justify-center items-center bg-gray-900 p-4">
      <div
        className={`relative bg-gray-700 overflow-hidden border-4 border-gray-900 shadow-2xl shadow-black transition-transform duration-100 ${isShaking ? 'animate-shake' : ''}`}
        style={{ width: `${GAME_WIDTH}px`, height: `${GAME_HEIGHT}px` }}
      >
        <style>
            {`
            @keyframes moveDown {
                from { transform: translateY(-${GAME_HEIGHT + 100}px); }
                to { transform: translateY(${GAME_HEIGHT}px); }
            }
            @keyframes flash-red { 0%, 100% { background-color: #ef4444; } 50% { background-color: #7f1d1d; } }
            @keyframes flash-blue { 0%, 100% { background-color: #3b82f6; } 50% { background-color: #1e3a8a; } }
            .animate-flash-red { animation: flash-red 0.5s infinite; }
            .animate-flash-blue { animation: flash-blue 0.5s infinite 0.25s; }
            
            @keyframes shake {
              10%, 90% { transform: translate3d(-1px, 0, 0); }
              20%, 80% { transform: translate3d(2px, 0, 0); }
              30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
              40%, 60% { transform: translate3d(4px, 0, 0); }
            }
            .animate-shake { animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both; }
            `}
        </style>
        
        <Cityscape speed={gameSpeed.current / INITIAL_GAME_SPEED}/>
        
        {[...Array(5)].map((_, i) => 
            <RoadLine key={i} top={(i * 150) - 50} duration={3 / (gameSpeed.current / INITIAL_GAME_SPEED)} />
        )}

        {gameState === GameState.Playing && (
          <>
            <GameUI score={score} energy={energy} />
            <PoliceCar x={carPositionX} isHit={isHit} />
            {gameObjects.map(obj => {
                switch(obj.type) {
                    case ObjectType.CivilianCar:
                        return <CivilianCar key={obj.id} obstacle={obj} />;
                    case ObjectType.Cone:
                        return <TrafficCone key={obj.id} obstacle={obj} />;
                    case ObjectType.Energy:
                        return <MupolShield key={obj.id} pickup={obj} />;
                    default:
                        return null;
                }
            })}
          </>
        )}
        {gameState === GameState.Start && <StartScreen onStart={handleStart} />}
        {gameState === GameState.GameOver && <GameOverScreen score={score} onRestart={handleStart} />}
      </div>
    </div>
  );
}

export default App;
