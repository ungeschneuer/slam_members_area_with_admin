import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
  password: z.string().min(6, 'Passwort muss mindestens 6 Zeichen lang sein'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword']
});

export default function AdminUserPassword() {
  const [isProtected, setIsProtected] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema)
  });

  // Check current protection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/settings/user-password/status`);
        const data = await response.json();
        
        if (data.success) {
          setIsProtected(data.data.isProtected);
        }
      } catch (error) {
        // Failed to check protection status
      }
    };

    checkStatus();
  }, []);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/settings/user-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: data.password }),
        credentials: 'include'
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Passwort erfolgreich gesetzt! Alle Benutzer müssen sich neu anmelden.');
        setIsProtected(true);
        reset();
      } else {
        setError(result.error || 'Fehler beim Setzen des Passworts');
      }
    } catch (error) {
      setError('Netzwerkfehler beim Setzen des Passworts');
    } finally {
      setIsLoading(false);
    }
  };

  if (isProtected === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Lade Schutz-Status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Benutzer-Passwort</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Passwort-Schutz für den Benutzer-Bereich verwalten
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Passwort-Schutz Status
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {isProtected ? 'Aktiviert' : 'Deaktiviert'}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isProtected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
          }`}>
            {isProtected ? 'Geschützt' : 'Offen'}
          </div>
        </div>
      </div>

      {/* Password Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {isProtected ? 'Passwort ändern' : 'Passwort setzen'}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Neues Passwort
            </label>
            <input
              type="password"
              id="password"
              {...register('password')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Mindestens 6 Zeichen"
            />
            {errors.password && (
              <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Passwort bestätigen
            </label>
            <input
              type="password"
              id="confirmPassword"
              {...register('confirmPassword')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Passwort wiederholen"
            />
            {errors.confirmPassword && (
              <p className="text-red-600 text-sm mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Warning */}
          {isProtected && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-yellow-400">⚠️</span>
                </div>
                <div className="ml-3">
                  <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                    <strong>Warnung:</strong> Alle Benutzer werden abgemeldet und müssen das neue Passwort eingeben.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-green-400">✓</span>
                </div>
                <div className="ml-3">
                  <p className="text-green-800 dark:text-green-200 text-sm">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <span className="text-red-400">✗</span>
                </div>
                <div className="ml-3">
                  <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-[#185757] dark:bg-[#A2D2B9] text-white dark:text-gray-900 rounded-lg hover:bg-[#0f3a3b] dark:hover:bg-[#8BC4A3] focus:ring-2 focus:ring-[#A2D2B9] dark:focus:ring-[#185757] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {isLoading ? 'Speichere...' : (isProtected ? 'Passwort ändern' : 'Passwort setzen')}
            </button>
          </div>
        </form>
      </div>

      {/* Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-blue-400">ℹ️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-blue-800 dark:text-blue-200 font-medium">Information</h3>
            <div className="text-blue-700 dark:text-blue-300 text-sm mt-1 space-y-1">
              <p>• Wenn kein Passwort gesetzt ist, haben alle Benutzer freien Zugang</p>
              <p>• Administratoren umgehen den Passwort-Schutz automatisch</p>
              <p>• Das Passwort wird für 14 Tage gespeichert</p>
              <p>• Bei Passwort-Änderung müssen sich alle Benutzer neu anmelden</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
