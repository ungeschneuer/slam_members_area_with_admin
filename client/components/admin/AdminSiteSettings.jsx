import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboardSettings, useUpdateDashboardSettings } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

export default function AdminSiteSettings() {
  const navigate = useNavigate();
  
  // Use TanStack Query for dashboard settings
  const { data: settingsData, isLoading: loading, error: dataError } = useDashboardSettings();
  const updateSettings = useUpdateDashboardSettings();
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const schema = z.object({
    heading: z.string()
      .min(1, 'Überschrift ist erforderlich')
      .max(100, 'Überschrift darf maximal 100 Zeichen haben'),
    subtitle: z.string()
      .min(1, 'Untertitel ist erforderlich')
      .max(150, 'Untertitel darf maximal 150 Zeichen haben'),
    description: z.string()
      .min(1, 'Beschreibung ist erforderlich')
      .max(500, 'Beschreibung darf maximal 500 Zeichen haben')
  });

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      heading: 'Willkommen bei SLAM25',
      subtitle: 'Dein Poetry Slam Community Hub',
      description: 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.'
    }
  });

  // Watch form values for character counting
  const watchedValues = watch();

  // Update form when settingsData changes
  useEffect(() => {
    if (!settingsData) return;
    
    reset({
      heading: settingsData.heading || 'Willkommen bei SLAM25',
      subtitle: settingsData.subtitle || 'Dein Poetry Slam Community Hub',
      description: settingsData.description || 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.'
    });
  }, [settingsData, reset]);

  const onSubmit = async (data) => {
    setError(null);
    setSuccess(null);

    try {
      await updateSettings.mutateAsync(data);
      setSuccess('Seiten-Einstellungen erfolgreich gespeichert!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Fehler beim Speichern der Seiten-Einstellungen');
    }
  };

  const handleReset = () => {
    reset({
      heading: 'Willkommen bei SLAM25',
      subtitle: 'Dein Poetry Slam Community Hub',
      description: 'Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden.'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#185757]"></div>
      </div>
    );
  }

  // Handle data loading error
  if (dataError) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">
                Fehler beim Laden der Seiten-Einstellungen: {dataError}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seiten-Einstellungen</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Bearbeite den Text im Hero-Bereich der Startseite
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Zurück zum Dashboard
          </button>
        </div>
      </div>

      {/* Error and Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error?.message || error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Hero Section Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Hero-Bereich Text</h2>
          
          <div className="space-y-6">
            {/* Heading */}
            <div>
              <label htmlFor="heading" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hauptüberschrift
              </label>
              <input
                type="text"
                id="heading"
                {...register('heading')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white"
                placeholder="Willkommen bei SLAM25"
              />
              <div className="flex justify-between items-center mt-1">
                {errors.heading && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.heading.message}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                  {watchedValues.heading?.length || 0}/100 Zeichen
                </p>
              </div>
            </div>

            {/* Subtitle */}
            <div>
              <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Untertitel
              </label>
              <input
                type="text"
                id="subtitle"
                {...register('subtitle')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white"
                placeholder="Dein Poetry Slam Community Hub"
              />
              <div className="flex justify-between items-center mt-1">
                {errors.subtitle && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.subtitle.message}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                  {watchedValues.subtitle?.length || 0}/150 Zeichen
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Beschreibung
              </label>
              <textarea
                id="description"
                rows={4}
                {...register('description')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white resize-vertical"
                placeholder="Entdecke Teilnehmer*innen, verfolge Runden, lies Tipps und bleibe mit der Poetry Slam Community verbunden."
              />
              <div className="flex justify-between items-center mt-1">
                {errors.description && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
                  {watchedValues.description?.length || 0}/500 Zeichen
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Auf Standard zurücksetzen
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-[#185757] text-white rounded-lg hover:bg-[#0f3a3b] focus:ring-2 focus:ring-[#A2D2B9] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Speichern...' : 'Einstellungen speichern'}
          </button>
        </div>
      </form>
    </div>
  );
}
