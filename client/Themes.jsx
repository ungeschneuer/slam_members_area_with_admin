import React, { useState, useEffect } from 'react';
import { 
  useTheme,
  useSetTheme,
  useAreas,
  useSetAreas,
  useConfigLoaded,
  useSetConfigLoaded,
  useConfigValue,
  useSetConfig
} from './stores/index.js';

export default function Themes() {
  const theme = useTheme();
  const setTheme = useSetTheme();
  const areas = useAreas();
  const setAreas = useSetAreas();
  const configLoaded = useConfigLoaded();
  const setConfigLoaded = useSetConfigLoaded();
  const configTheme = useConfigValue('theme');
  const configAreas = useConfigValue('areas');
  const setConfig = useSetConfig();
  const [initialized, setInitialized] = useState(false);

  // Initialize configuration
  useEffect(() => {
    if (!initialized) {
      setTheme(configTheme);
      setAreas(configAreas);
      setInitialized(true);
    }
  }, [initialized, configTheme, configAreas, setTheme, setAreas]);

  // Mark configuration as loaded once initial values are applied
  useEffect(() => {
    if (initialized && !configLoaded) {
      setConfigLoaded(true);
    }
  }, [initialized, configLoaded, setConfigLoaded]);

  // Update theme when it changes
  useEffect(() => {
    if (initialized) {
      setConfig('theme', theme);
    }
  }, [theme, initialized, setConfig]);

  // Update areas when they change
  useEffect(() => {
    if (initialized) {
      setConfig('areas', areas);
    }
  }, [areas, initialized, setConfig]);

  const addArea = () => {
    const newArea = prompt("Neuer Bereichsname:");
    if (newArea && newArea.trim()) {
      setAreas([...areas, newArea.trim()]);
    }
  };

  const removeArea = (index) => {
    if (confirm("Diesen Bereich entfernen?")) {
      setAreas(areas.filter((_, i) => i !== index));
    }
  };

  const resetToDefaults = async () => {
    if (confirm("Alle Einstellungen auf Standard zurücksetzen?")) {
      setConfig('theme', 'light');
      setConfig('areas', ['Teilnehmer*innen', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Links', 'Info']);
      setTheme('light');
      setAreas(['Teilnehmer*innen', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Links', 'Info']);
    }
  };

  if (!configLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Lade Einstellungen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded shadow max-w-lg mx-auto mt-6">
      <h2 className="text-xl font-semibold mb-4">Themes & Areas</h2>
      <div className="mb-4">
        <label className="block font-medium mb-2">Theme:</label>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="p-2 border rounded w-full">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </div>
      <div>
        <label className="block font-medium mb-2">Areas:</label>
        <ul className="space-y-2 mb-3">
          {areas.map((area, i) => (
            <li key={i} className="flex justify-between items-center border p-2 rounded">
              <span>{area}</span>
              <button onClick={() => removeArea(i)} className="px-2 py-1 border rounded text-sm">Remove</button>
            </li>
          ))}
        </ul>
        <button onClick={addArea} className="px-3 py-2 bg-blue-600 text-white rounded w-full">Add Area</button>
        <button onClick={resetToDefaults} className="mt-3 px-3 py-2 bg-red-600 text-white rounded w-full">Reset to Defaults</button>
      </div>
    </div>
  );
}
