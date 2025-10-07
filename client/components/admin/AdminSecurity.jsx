import React, { useState, useEffect } from 'react';

export default function AdminSecurity() {
  const [securitySettings, setSecuritySettings] = useState({
    sessionTimeout: 30, // minutes
    maxLoginAttempts: 5,
    lockoutDuration: 30, // minutes
    requireMFA: false,
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true
    }
  });
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setLoading(true);
    try {
      // Load audit logs from localStorage (in real app, this would be from API)
      const logs = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
      setAuditLogs(logs.slice(-50)); // Last 50 entries

      // Load active sessions
      const sessions = JSON.parse(localStorage.getItem('admin_sessions') || '[]');
      setActiveSessions(sessions);

      // Load security settings
      const settings = JSON.parse(localStorage.getItem('admin_security_settings') || '{}');
      if (Object.keys(settings).length > 0) {
        setSecuritySettings(prev => ({ ...prev, ...settings }));
      }
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSecuritySettings = async (newSettings) => {
    try {
      const updatedSettings = { ...securitySettings, ...newSettings };
      setSecuritySettings(updatedSettings);
      localStorage.setItem('admin_security_settings', JSON.stringify(updatedSettings));
      
      // Log the change
      logAuditEvent('security_settings_updated', {
        changes: Object.keys(newSettings),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating security settings:', error);
    }
  };

  const logAuditEvent = (event, details) => {
    const logEntry = {
      id: Date.now(),
      event,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ip: '127.0.0.1' // In real app, get from server
    };

    const logs = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
    logs.push(logEntry);
    
    // Keep only last 1000 entries
    if (logs.length > 1000) {
      logs.splice(0, logs.length - 1000);
    }
    
    localStorage.setItem('admin_audit_logs', JSON.stringify(logs));
    setAuditLogs(logs.slice(-50));
  };

  const terminateSession = (sessionId) => {
    try {
      const sessions = activeSessions.filter(s => s.id !== sessionId);
      setActiveSessions(sessions);
      localStorage.setItem('admin_sessions', JSON.stringify(sessions));
      
      logAuditEvent('session_terminated', {
        sessionId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error terminating session:', error);
    }
  };

  const exportAuditLogs = () => {
    const logs = JSON.parse(localStorage.getItem('admin_audit_logs') || '[]');
    const csvContent = [
      'Timestamp,Event,Details,User Agent,IP',
      ...logs.map(log => 
        `${log.timestamp},"${log.event}","${JSON.stringify(log.details)}","${log.userAgent}","${log.ip}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `admin_audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getEventIcon = (event) => {
    switch (event) {
      case 'login': return '🔑';
      case 'logout': return '🚪';
      case 'login_failed': return '❌';
      case 'security_settings_updated': return '⚙️';
      case 'session_terminated': return '🔒';
      case 'data_exported': return '📤';
      case 'data_imported': return '📥';
      default: return '📝';
    }
  };

  const getEventColor = (event) => {
    switch (event) {
      case 'login': return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-400';
      case 'logout': return 'text-blue-600 bg-blue-100 dark:bg-blue-900 dark:text-blue-400';
      case 'login_failed': return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-400';
      case 'security_settings_updated': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Sicherheit & Verwaltung</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">Admin-Bereich Sicherheitseinstellungen und Überwachung</p>
      </div>

      {/* Security Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Sicherheitseinstellungen</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Session Management */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sitzungsverwaltung</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sitzungs-Timeout (Minuten)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                value={securitySettings.sessionTimeout}
                onChange={(e) => updateSecuritySettings({ sessionTimeout: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximale Login-Versuche
              </label>
              <input
                type="number"
                min="3"
                max="10"
                value={securitySettings.maxLoginAttempts}
                onChange={(e) => updateSecuritySettings({ maxLoginAttempts: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sperrzeit nach fehlgeschlagenen Versuchen (Minuten)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                value={securitySettings.lockoutDuration}
                onChange={(e) => updateSecuritySettings({ lockoutDuration: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Password Policy */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Passwort-Richtlinien</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimale Länge
              </label>
              <input
                type="number"
                min="6"
                max="20"
                value={securitySettings.passwordPolicy.minLength}
                onChange={(e) => updateSecuritySettings({
                  passwordPolicy: {
                    ...securitySettings.passwordPolicy,
                    minLength: parseInt(e.target.value)
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={securitySettings.passwordPolicy.requireUppercase}
                  onChange={(e) => updateSecuritySettings({
                    passwordPolicy: {
                      ...securitySettings.passwordPolicy,
                      requireUppercase: e.target.checked
                    }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Großbuchstaben erforderlich</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={securitySettings.passwordPolicy.requireNumbers}
                  onChange={(e) => updateSecuritySettings({
                    passwordPolicy: {
                      ...securitySettings.passwordPolicy,
                      requireNumbers: e.target.checked
                    }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Zahlen erforderlich</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={securitySettings.passwordPolicy.requireSpecialChars}
                  onChange={(e) => updateSecuritySettings({
                    passwordPolicy: {
                      ...securitySettings.passwordPolicy,
                      requireSpecialChars: e.target.checked
                    }
                  })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Sonderzeichen erforderlich</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Aktive Sitzungen</h2>
          <button
            onClick={() => logAuditEvent('sessions_refreshed', { timestamp: new Date().toISOString() })}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Aktualisieren
          </button>
        </div>
        
        <div className="space-y-3">
          {activeSessions.length > 0 ? (
            activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <span className="text-lg">💻</span>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{session.userAgent}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Gestartet: {new Date(session.startedAt).toLocaleString('de-DE')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => terminateSession(session.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  Beenden
                </button>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Keine aktiven Sitzungen</p>
          )}
        </div>
      </div>

      {/* Audit Logs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Audit-Logs</h2>
          <button
            onClick={exportAuditLogs}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Export CSV
          </button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {auditLogs.length > 0 ? (
            auditLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <span className="text-lg">{getEventIcon(log.event)}</span>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getEventColor(log.event)}`}>
                      {log.event}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(log.timestamp).toLocaleString('de-DE')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                    {log.details ? JSON.stringify(log.details) : 'Keine Details verfügbar'}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">Keine Audit-Logs verfügbar</p>
          )}
        </div>
      </div>
    </div>
  );
}
