
// Preload script intentionally left minimal.
// All data fetching is now handled through Next.js Server Actions,
// which provides a more modern and streamlined approach.
// This file is kept for potential future use if direct Electron-to-renderer
// communication is needed for functionalities outside of data management
// (e.g., native dialogs, menu integrations, etc.).

const { contextBridge, ipcRenderer }