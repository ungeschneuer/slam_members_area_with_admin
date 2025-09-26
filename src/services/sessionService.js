import configService from './configService.js';

class SessionService {
  constructor() {
    this.sessionTimeout = 30 * 60 * 1000; // 30 minutes
    this.rememberMeTimeout = 7 * 24 * 60 * 60 * 1000; // 7 days
    this.warningTimeout = 5 * 60 * 1000; // 5 minutes before timeout
    this.lastActivity = Date.now();
    this.isRememberMe = false;
    this.sessionId = null;
    this.warningShown = false;
    this.activityTimer = null;
    this.warningTimer = null;
    this.listeners = new Set();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    
    try {
      await this.loadSession();
      this.startActivityMonitoring();
      this.setupActivityListeners();
      this.checkSessionValidity();
      this.initialized = true;
    } catch (error) {
      console.error('SessionService: Failed to initialize:', error);
      this.initialized = true;
    }
  }

  async loadSession() {
    try {
      const sessionData = localStorage.getItem('slam_session');
      if (sessionData) {
        const session = JSON.parse(sessionData);
        this.lastActivity = session.lastActivity || Date.now();
        this.isRememberMe = session.rememberMe || false;
        this.sessionId = session.sessionId || this.generateSessionId();
        
        const now = Date.now();
        const timeout = this.isRememberMe ? this.rememberMeTimeout : this.sessionTimeout;
        
        if (now - this.lastActivity > timeout) {
          this.clearSession();
          return false;
        }
        
        return true;
      }
    } catch (error) {
      console.error('Error loading session:', error);
      this.clearSession();
    }
    return false;
  }

  async saveSession() {
    try {
      const sessionData = {
        lastActivity: this.lastActivity,
        rememberMe: this.isRememberMe,
        sessionId: this.sessionId,
        createdAt: Date.now()
      };
      localStorage.setItem('slam_session', JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving session:', error);
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  async startSession(rememberMe = false) {
    if (this.loadSession() && this.isSessionActive()) {
      this.extendSession();
      return;
    }
    
    this.isRememberMe = rememberMe;
    this.sessionId = this.generateSessionId();
    this.lastActivity = Date.now();
    this.warningShown = false;
    await this.saveSession();
    this.startActivityMonitoring();
    this.notifyListeners('sessionStarted', { rememberMe });
  }

  updateActivity() {
    this.lastActivity = Date.now();
    this.warningShown = false;
    this.saveSession();
    this.resetTimers();
    this.notifyListeners('activityUpdated');
  }

  startActivityMonitoring() {
    this.activityTimer = setInterval(() => {
      this.checkSessionValidity();
    }, 60000); // Check every minute
  }

  setupActivityListeners() {
    const updateActivity = () => {
      this.updateActivity();
    };

    // Add event listeners for user activity
    document.addEventListener('mousedown', updateActivity);
    document.addEventListener('keydown', updateActivity);
    document.addEventListener('scroll', updateActivity);
    document.addEventListener('touchstart', updateActivity);

    // Cleanup function
    return () => {
      document.removeEventListener('mousedown', updateActivity);
      document.removeEventListener('keydown', updateActivity);
      document.removeEventListener('scroll', updateActivity);
      document.removeEventListener('touchstart', updateActivity);
    };
  }

  checkSessionValidity() {
    const now = Date.now();
    const timeout = this.isRememberMe ? this.rememberMeTimeout : this.sessionTimeout;
    const warningTime = timeout - this.warningTimeout;
    const timeSinceLastActivity = now - this.lastActivity;
    
    if (timeSinceLastActivity > warningTime && !this.warningShown) {
      this.showWarning(timeout - timeSinceLastActivity);
    }
    
    if (timeSinceLastActivity > timeout) {
      this.handleTimeout();
    }
  }

  showWarning(timeRemaining) {
    this.warningShown = true;
    
    const minutes = Math.floor(timeRemaining / 60000);
    const seconds = Math.floor((timeRemaining % 60000) / 1000);
    
    const warningMessage = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Session läuft ab
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Deine Session läuft in ${minutes}:${seconds.toString().padStart(2, '0')} ab
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
              Schließen
            </button>
            <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Verlängern
            </button>
          </div>
        </div>
      </div>
    `;
    
    const warningElement = document.createElement('div');
    warningElement.innerHTML = warningMessage;
    document.body.appendChild(warningElement.firstElementChild);
    
    this.warningTimer = setTimeout(() => {
      if (warningElement.firstElementChild && warningElement.firstElementChild.parentNode) {
        warningElement.firstElementChild.parentNode.removeChild(warningElement.firstElementChild);
      }
    }, timeRemaining);
  }

  handleTimeout() {
    this.clearSession();
    this.notifyListeners('sessionExpired');
    
    // Redirect to login or show timeout message
    const timeoutMessage = `
      <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Session abgelaufen
          </h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Deine Session ist abgelaufen. Bitte melde dich erneut an.
          </p>
          <div class="flex justify-end">
            <button onclick="window.location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Erneut anmelden
            </button>
          </div>
        </div>
      </div>
    `;
    
    const timeoutElement = document.createElement('div');
    timeoutElement.innerHTML = timeoutMessage;
    document.body.appendChild(timeoutElement.firstElementChild);
  }

  extendSession() {
    this.lastActivity = Date.now();
    this.warningShown = false;
    this.saveSession();
    this.resetTimers();
    this.notifyListeners('sessionExtended');
  }

  resetTimers() {
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  clearSession() {
    this.lastActivity = 0;
    this.isRememberMe = false;
    this.sessionId = null;
    this.warningShown = false;
    this.stopActivityMonitoring();
    localStorage.removeItem('slam_session');
  }

  stopActivityMonitoring() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
  }

  isSessionActive() {
    const now = Date.now();
    const timeout = this.isRememberMe ? this.rememberMeTimeout : this.sessionTimeout;
    return now - this.lastActivity < timeout;
  }

  getSessionInfo() {
    const now = Date.now();
    const timeout = this.isRememberMe ? this.rememberMeTimeout : this.sessionTimeout;
    const timeRemaining = Math.max(0, timeout - (now - this.lastActivity));
    
    return {
      sessionId: this.sessionId,
      isRememberMe: this.isRememberMe,
      lastActivity: this.lastActivity,
      timeRemaining,
      isActive: this.isSessionActive()
    };
  }

  addListener(event, callback) {
    this.listeners.add({ event, callback });
  }

  removeListener(event, callback) {
    for (const listener of this.listeners) {
      if (listener.event === event && listener.callback === callback) {
        this.listeners.delete(listener);
        break;
      }
    }
  }

  notifyListeners(event, data = null) {
    for (const listener of this.listeners) {
      if (listener.event === event) {
        try {
          listener.callback(data);
        } catch (error) {
          console.error('Error in session listener:', error);
        }
      }
    }
  }

  // Public API methods
  async getSessionStatus() {
    if (!this.initialized) await this.init();
    return this.getSessionInfo();
  }

  async refreshSession() {
    if (!this.initialized) await this.init();
    this.updateActivity();
  }

  async logout() {
    if (!this.initialized) await this.init();
    this.clearSession();
    this.notifyListeners('sessionEnded');
  }
}

const sessionService = new SessionService();
export default sessionService;
