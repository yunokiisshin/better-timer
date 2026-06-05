export type TimerStatus = 'idle' | 'running' | 'paused' | 'overtime';

export interface TimerState {
  id: string;
  name: string;
  duration: number; // seconds
  color: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  elapsed: number; // seconds
  status: TimerStatus;
}

export interface ChildTimer {
  id: string;
  name: string;
  duration: number; // seconds
  color: string;
  elapsed: number; // seconds
  status: TimerStatus;
}

export interface SessionState {
  id: string;
  name: string;
  totalDuration: number; // manually set overall budget, in seconds
  color: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
  status: TimerStatus;
  children: ChildTimer[];
}

export interface SessionTask {
  id: string;
  name: string;
  duration: number; // seconds
}

export interface LinearSessionState {
  id: string;
  name: string;
  color: string;
  tasks: SessionTask[];
  elapsed: number;            // wall-clock seconds since session start
  activeTaskIdx: number;      // only advances when user presses "Next"
  taskStartElapsed: number[]; // [k] = session.elapsed when task k became active
  status: TimerStatus;
  position: { x: number; y: number };
  size: { w: number; h: number };
}

export const DEFAULT_SIZE = { w: 212, h: 290 } as const;
export const DEFAULT_SESSION_SIZE = { w: 288, h: 490 } as const;
export const DEFAULT_LINEAR_SESSION_SIZE = { w: 310, h: 440 } as const;
