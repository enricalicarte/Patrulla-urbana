export enum ObjectType {
  CivilianCar,
  Cone,
  Energy,
}

export interface GameObject {
  id: number;
  type: ObjectType;
  x: number; // Position percentage from left (0-100)
  y: number; // Position in pixels from top
  width: number;
  height: number;
  color?: string; // Optional color for variety, e.g., civilian cars
}

export enum GameState {
  Start,
  Playing,
  GameOver,
}