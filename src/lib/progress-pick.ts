import { create } from 'zustand';

/**
 * The move shown on Progress → Moves. Shared so the move picker screen can set it and
 * Progress picks it up when you come back. Not saved between app launches.
 */
export const useProgressMove = create<{ moveId: string | null; setMoveId: (id: string | null) => void }>((set) => ({
  moveId: null,
  setMoveId: (moveId) => set({ moveId }),
}));
