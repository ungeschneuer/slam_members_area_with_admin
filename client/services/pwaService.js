class PWAService {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.isOnline = navigator.onLine;
    this.updateAvailable = false;
    
    this.init();
  }

  init() {
    this.setupInstallPrompt();
    this.setupOnlineStatus();
    this.setupServiceWorkerUpdates();
    this.checkInstallationStatus();
  }

  // Handle install prompt
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('Install prompt triggered');
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.hideInstallButton();
    });
  }

  // Handle online/offline status
  setupOnlineStatus() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showOfflineStatus();
    });
  }

  // Handle service worker updates
  setupServiceWorkerUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('New service worker activated');
        this.updateAvailable = false;
        this.showUpdateNotification();
      });

      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
          this.updateAvailable = true;
          this.showUpdateNotification();
        }
      });
    }
  }

  // Check if PWA is installed
  checkInstallationStatus() {
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }
  }

  // Show install button
  showInstallButton() {
    const event = new CustomEvent('pwa:install-available', {
      detail: { canInstall: true }
    });
    window.dispatchEvent(event);
  }

  // Hide install button
  hideInstallButton() {
    const event = new CustomEvent('pwa:install-available', {
      detail: { canInstall: false }
    });
    window.dispatchEvent(event);
  }

  // Show online status
  showOnlineStatus() {
    const event = new CustomEvent('pwa:online-status', {
      detail: { isOnline: true }
    });
    window.dispatchEvent(event);
  }

  // Show offline status
  showOfflineStatus() {
    const event = new CustomEvent('pwa:online-status', {
      detail: { isOnline: false }
    });
    window.dispatchEvent(event);
  }

  // Show update notification
  showUpdateNotification() {
    const event = new CustomEvent('pwa:update-available', {
      detail: { updateAvailable: true }
    });
    window.dispatchEvent(event);
  }

  // Install PWA
  async installPWA() {
    if (!this.deferredPrompt) {
      console.log('No install prompt available');
      return false;
    }

    try {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        this.deferredPrompt = null;
        return true;
      } else {
        console.log('User dismissed the install prompt');
        return false;
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
      return false;
    }
  }


  // Update service worker
  async updateServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
          console.log('Service worker update requested');
          return true;
        }
      } catch (error) {
        console.error('Error updating service worker:', error);
      }
    }
    return false;
  }

  // Get PWA status
  getStatus() {
    return {
      isInstalled: this.isInstalled,
      isOnline: this.isOnline,
      updateAvailable: this.updateAvailable,
      canInstall: !!this.deferredPrompt
    };
  }

  

  // Add to home screen
  showAddToHomeScreen() {
    if (this.isInstalled) {
      console.log('PWA already installed');
      return;
    }

    if (this.deferredPrompt) {
      this.installPWA();
    } else {
      console.log('Install prompt not available');
    }
  }
}

// Create singleton instance
const pwaService = new PWAService();

export default pwaService;

















