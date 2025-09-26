import databaseService from './databaseService.js';

class ConfigService {
  constructor() {
    this.config = new Map();
    this.defaults = {
      theme: 'light',
      areas: ['Teilnehmer', 'Runden', 'Neuigkeiten', 'Zeitplan', 'Stadt-Tipps', 'Info'],
      language: 'de',
      timezone: 'Europe/Berlin',
      notifications: true,
      autoSave: true,
      debugMode: false
    };
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      // Try to load from database first
      if (databaseService.isConnected) {
        await this.loadFromDatabase();
      } else {
        // Fallback to localStorage
        this.loadFromLocalStorage();
      }
    } catch (error) {
      console.warn('ConfigService: Failed to load config, using defaults:', error);
      this.loadFromLocalStorage();
    }
    
    this.initialized = true;
  }

  async loadFromDatabase() {
    try {
      // This would be implemented when we have a proper config table
      // For now, we'll use localStorage as fallback
      this.loadFromLocalStorage();
    } catch (error) {
      console.warn('ConfigService: Database load failed, using localStorage:', error);
      this.loadFromLocalStorage();
    }
  }

  loadFromLocalStorage() {
    // Load theme
    const theme = localStorage.getItem('slam_theme') || this.defaults.theme;
    this.config.set('theme', theme);

    // Load areas
    try {
      const storedAreas = localStorage.getItem('slam_areas');
      if (storedAreas) {
        const areas = JSON.parse(storedAreas);
        // Validate and clean areas
        const validAreas = this.validateAreas(areas);
        this.config.set('areas', validAreas);
      } else {
        this.config.set('areas', this.defaults.areas);
      }
    } catch (error) {
      console.warn('ConfigService: Failed to parse areas, using defaults:', error);
      this.config.set('areas', this.defaults.areas);
    }

    // Load other config values
    Object.keys(this.defaults).forEach(key => {
      if (!this.config.has(key)) {
        const value = localStorage.getItem(`slam_${key}`);
        if (value !== null) {
          try {
            this.config.set(key, JSON.parse(value));
          } catch {
            this.config.set(key, value);
          }
        } else {
          this.config.set(key, this.defaults[key]);
        }
      }
    });
  }

  validateAreas(areas) {
    if (!Array.isArray(areas)) return this.defaults.areas;
    
    
    const validAreas = areas.filter(area => 
      area !== 'Participants' && 
      area !== 'Rounds' && 
      area !== 'News' && 
      area !== 'Timetable' &&
      area !== 'Spaß' && 
      area !== 'Tipps' &&
      typeof area === 'string' && 
      area.trim().length > 0
    );

    // If no valid areas, return defaults
    if (validAreas.length === 0) return this.defaults.areas;
    
    return validAreas;
  }

  async get(key) {
    if (!this.initialized) await this.init();
    return this.config.get(key) ?? this.defaults[key];
  }

  async set(key, value) {
    if (!this.initialized) await this.init();
    
    this.config.set(key, value);
    
    try {
      // Try to save to database first
      if (databaseService.isConnected) {
        await this.saveToDatabase(key, value);
      } else {
        // Fallback to localStorage
        this.saveToLocalStorage(key, value);
      }
    } catch (error) {
      console.warn(`ConfigService: Failed to save ${key}, using localStorage:`, error);
      this.saveToLocalStorage(key, value);
    }
  }

  async saveToDatabase(key, value) {
    // This would be implemented when we have a proper config table
    // For now, we'll use localStorage as fallback
    this.saveToLocalStorage(key, value);
  }

  saveToLocalStorage(key, value) {
    try {
      if (typeof value === 'object') {
        localStorage.setItem(`slam_${key}`, JSON.stringify(value));
      } else {
        localStorage.setItem(`slam_${key}`, value);
      }
    } catch (error) {
      console.error(`ConfigService: Failed to save to localStorage:`, error);
    }
  }

  async getTheme() {
    return await this.get('theme');
  }

  async setTheme(theme) {
    await this.set('theme', theme);
    // Apply theme to document
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }

  async getAreas() {
    return await this.get('areas');
  }

  async setAreas(areas) {
    const validAreas = this.validateAreas(areas);
    await this.set('areas', validAreas);
  }

  async addArea(area) {
    const areas = await this.getAreas();
    if (!areas.includes(area)) {
      await this.setAreas([...areas, area]);
    }
  }

  async removeArea(area) {
    const areas = await this.getAreas();
    await this.setAreas(areas.filter(a => a !== area));
  }

  async resetToDefaults() {
    Object.keys(this.defaults).forEach(key => {
      this.config.set(key, this.defaults[key]);
      this.saveToLocalStorage(key, this.defaults[key]);
    });
  }

  async exportConfig() {
    if (!this.initialized) await this.init();
    const config = {};
    for (const [key, value] of this.config) {
      config[key] = value;
    }
    return config;
  }

  async importConfig(config) {
    if (!this.initialized) await this.init();
    
    for (const [key, value] of Object.entries(config)) {
      if (this.defaults.hasOwnProperty(key)) {
        await this.set(key, value);
      }
    }
  }
}

const configService = new ConfigService();
export default configService;




