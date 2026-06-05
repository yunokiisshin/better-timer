import { useState, useEffect, useCallback, useRef } from 'react';
import type { SessionState, ChildTimer } from '../types';
import { DEFAULT_SESSION_SIZE } from '../types';

const STORAGE_KEY = 'better-timer-sessions-v1';

function load(): SessionState[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SessionState[]).map(s => ({
      ...s,
      size: s.size ?? { ...DEFAULT_SESSION_SIZE },
      status: (s.status === 'running' || s.status === 'overtime') ? 'paused' : s.status,
      children: s.children.map(c => ({
        ...c,
        status: (c.status === 'running' || c.status === 'overtime') ? 'paused' : c.status,
      })),
    }));
  } catch {
    return [];
  }
}

export function useSessions() {
  const [sessions, setSessions] = useState<SessionState[]>(load);
  const countRef = useRef(0);
  countRef.current = sessions.length;

  useEffect(() => {
    const id = setInterval(() => {
      setSessions(prev => {
        if (!prev.some(s => s.children.some(c => c.status === 'running' || c.status === 'overtime'))) {
          return prev;
        }
        return prev.map(s => {
          if (!s.children.some(c => c.status === 'running' || c.status === 'overtime')) return s;
          const newChildren = s.children.map(c => {
            if (c.status !== 'running' && c.status !== 'overtime') return c;
            const e = c.elapsed + 1;
            return { ...c, elapsed: e, status: (e >= c.duration ? 'overtime' : 'running') as SessionState['status'] };
          });
          const totalElapsed = newChildren.reduce((sum, c) => sum + c.elapsed, 0);
          const newStatus: SessionState['status'] = totalElapsed >= s.totalDuration ? 'overtime' : 'running';
          return { ...s, children: newChildren, status: newStatus };
        });
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const startChild = useCallback((sessionId: string, childId: string) => {
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const newChildren = s.children.map(c => {
        if (c.id === childId) return { ...c, status: (c.elapsed >= c.duration ? 'overtime' : 'running') as ChildTimer['status'] };
        if (c.status === 'running' || c.status === 'overtime') return { ...c, status: 'paused' as ChildTimer['status'] };
        return c;
      });
      const totalElapsed = newChildren.reduce((sum, c) => sum + c.elapsed, 0);
      const newStatus: SessionState['status'] = totalElapsed >= s.totalDuration ? 'overtime' : 'running';
      return { ...s, children: newChildren, status: newStatus };
    }));
  }, []);

  const pauseChild = useCallback((sessionId: string, childId: string) => {
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const newChildren = s.children.map(c =>
        c.id === childId ? { ...c, status: 'paused' as ChildTimer['status'] } : c,
      );
      const anyRunning = newChildren.some(c => c.status === 'running' || c.status === 'overtime');
      const anyElapsed = newChildren.some(c => c.elapsed > 0);
      const newStatus: SessionState['status'] = anyRunning ? s.status : anyElapsed ? 'paused' : 'idle';
      return { ...s, children: newChildren, status: newStatus };
    }));
  }, []);

  const resetChild = useCallback((sessionId: string, childId: string) => {
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const newChildren = s.children.map(c =>
        c.id === childId ? { ...c, elapsed: 0, status: 'idle' as ChildTimer['status'] } : c,
      );
      const totalElapsed = newChildren.reduce((sum, c) => sum + c.elapsed, 0);
      const anyRunning = newChildren.some(c => c.status === 'running' || c.status === 'overtime');
      const newStatus: SessionState['status'] = anyRunning ? 'running' : totalElapsed > 0 ? 'paused' : 'idle';
      return { ...s, children: newChildren, status: newStatus };
    }));
  }, []);

  const resetSession = useCallback((sessionId: string) => {
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      return {
        ...s,
        status: 'idle' as SessionState['status'],
        children: s.children.map(c => ({ ...c, elapsed: 0, status: 'idle' as ChildTimer['status'] })),
      };
    }));
  }, []);

  const removeSession = useCallback((id: string) => {
    setSessions(p => p.filter(s => s.id !== id));
  }, []);

  const addSession = useCallback((cfg: { name: string; totalDuration: number; color: string }, position?: { x: number; y: number }) => {
    const n = countRef.current;
    setSessions(p => [...p, {
      ...cfg,
      id: crypto.randomUUID(),
      position: position ?? { x: 24 + (n % 2) * (DEFAULT_SESSION_SIZE.w + 24), y: 24 + Math.floor(n / 2) * (DEFAULT_SESSION_SIZE.h + 24) },
      size: { ...DEFAULT_SESSION_SIZE },
      status: 'idle' as SessionState['status'],
      children: [],
    }]);
  }, []);

  const addChild = useCallback((sessionId: string, cfg: { name: string; duration: number; color: string }) => {
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const child: ChildTimer = { id: crypto.randomUUID(), ...cfg, elapsed: 0, status: 'idle' };
      return { ...s, children: [...s.children, child] };
    }));
  }, []);

  const removeChild = useCallback((sessionId: string, childId: string) => {
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const newChildren = s.children.filter(c => c.id !== childId);
      const anyRunning = newChildren.some(c => c.status === 'running' || c.status === 'overtime');
      const anyElapsed = newChildren.some(c => c.elapsed > 0);
      const newStatus: SessionState['status'] = anyRunning ? s.status : anyElapsed ? 'paused' : 'idle';
      return { ...s, children: newChildren, status: newStatus };
    }));
  }, []);

  const updateSessionPosition = useCallback((id: string, pos: { x: number; y: number }) =>
    setSessions(p => p.map(s => s.id === id ? { ...s, position: pos } : s)), []);

  const updateSessionSize = useCallback((id: string, size: { w: number; h: number }) =>
    setSessions(p => p.map(s => s.id === id ? { ...s, size } : s)), []);

  const updateChild = useCallback((sessionId: string, childId: string, cfg: { name: string; duration: number; color: string }) =>
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      return { ...s, children: s.children.map(c => c.id === childId ? { ...c, ...cfg } : c) };
    })), []);

  const reorderChild = useCallback((sessionId: string, childId: string, targetChildId: string) => {
    setSessions(p => p.map(s => {
      if (s.id !== sessionId) return s;
      const from = s.children.findIndex(c => c.id === childId);
      const to   = s.children.findIndex(c => c.id === targetChildId);
      if (from === -1 || to === -1 || from === to) return s;
      const next = [...s.children];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved!);
      return { ...s, children: next };
    }));
  }, []);

  const clearAll = useCallback(() => setSessions([]), []);

  const setAll = useCallback((next: SessionState[]) => setSessions(next), []);

  return {
    sessions,
    startChild,
    pauseChild,
    resetChild,
    resetSession,
    removeSession,
    addSession,
    addChild,
    updateChild,
    removeChild,
    reorderChild,
    updateSessionPosition,
    updateSessionSize,
    clearAll,
    setAll,
  };
}
