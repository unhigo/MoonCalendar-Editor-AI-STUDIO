/**
 * Keyboard shortcuts and accessibility helpers
 */

import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[];
  description: string;
  handler: () => void;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach((shortcut) => {
        const modifierPressed = (modifier: string) => {
          switch (modifier) {
            case 'ctrl':
              return event.ctrlKey;
            case 'shift':
              return event.shiftKey;
            case 'alt':
              return event.altKey;
            case 'meta':
              return event.metaKey;
            default:
              return false;
          }
        };

        const allModifiersPressed =
          (shortcut.modifiers || []).every(modifierPressed) &&
          event.key.toLowerCase() === shortcut.key.toLowerCase();

        if (allModifiersPressed) {
          event.preventDefault();
          shortcut.handler();
        }
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

/**
 * Common keyboard shortcuts for the app
 */
export const APP_SHORTCUTS = {
  undo: { key: 'z', modifiers: ['ctrl'] as const, description: 'Undo (Ctrl+Z)' },
  redo: { key: 'y', modifiers: ['ctrl'] as const, description: 'Redo (Ctrl+Y)' },
  save: { key: 's', modifiers: ['ctrl'] as const, description: 'Save (Ctrl+S)' },
  export: { key: 'e', modifiers: ['ctrl'] as const, description: 'Export (Ctrl+E)' },
  resetZoom: { key: '0', modifiers: ['ctrl'] as const, description: 'Reset Zoom (Ctrl+0)' },
  toggleStarfield: { key: 's', modifiers: ['shift'] as const, description: 'Toggle Starfield (Shift+S)' },
  toggleGrid: { key: 'g', modifiers: ['ctrl'] as const, description: 'Toggle Grid (Ctrl+G)' },
};

/**
 * Generate keyboard shortcut display string
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const modifierMap = {
    ctrl: 'Ctrl',
    shift: 'Shift',
    alt: 'Alt',
    meta: 'Cmd',
  };

  const modifiers = (shortcut.modifiers || [])
    .map((m) => modifierMap[m as keyof typeof modifierMap])
    .join('+');

  const key = shortcut.key.toUpperCase();
  return modifiers ? `${modifiers}+${key}` : key;
}

/**
 * ARIA labels for accessibility
 */
export const ARIA_LABELS = {
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  undo: 'Undo last change',
  redo: 'Redo last change',
  export: 'Export calendar',
  import: 'Import calendar',
  toggleDarkMode: 'Toggle dark mode',
  openSettings: 'Open settings',
  closeModal: 'Close dialog',
  toggleMenu: 'Toggle menu',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  resetZoom: 'Reset zoom to 100%',
};
