import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';

// Full switch to Zustand for config (no localStorage persistence unless explicit later)
export const useConfigStore = (import.meta && import.meta.env && import.meta.env.DEV)
  ? create(devtools(persist((set, get) => ({
      config: {},
      defaults: {
        theme: 'light',
        areas: ['Teilnehmer*innen', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Links', 'Info'],
      },

      setConfig: (key, value) => set((state) => ({
        config: { ...state.config, [key]: value }
      })),

      getConfig: (key) => {
        const state = get();
        return state.config[key] ?? state.defaults[key];
      },

      resetConfig: () => set({ config: {} }),
      importConfig: (obj) => set({ config: { ...obj } }),
      exportConfig: () => get().config,
      resetState: () => set({ config: {} }),
    }), {
      name: 'ConfigStore:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: {
          theme: state.config.theme,
          areas: state.config.areas,
        }
      })
    }), { name: 'ConfigStore' }))
  : create(persist((set, get) => ({
      config: {},
      defaults: {
        theme: 'light',
        areas: ['Teilnehmer*innen', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Links', 'Info'],
      },

      setConfig: (key, value) => set((state) => ({
        config: { ...state.config, [key]: value }
      })),

      getConfig: (key) => {
        const state = get();
        return state.config[key] ?? state.defaults[key];
      },

      resetConfig: () => set({ config: {} }),
      importConfig: (obj) => set({ config: { ...obj } }),
      exportConfig: () => get().config,
      resetState: () => set({ config: {} }),
    }), {
      name: 'ConfigStore:v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        config: {
          theme: state.config.theme,
          areas: state.config.areas,
        }
      })
    }));

// Selectors
export const useConfigValue = (key) => useConfigStore(s => s.config[key] ?? s.defaults[key]);
export const useSetConfig = () => useConfigStore(s => s.setConfig);


