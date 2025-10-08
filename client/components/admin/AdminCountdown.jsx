import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountdown, useUpdateCountdown } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import CheckboxInput from '../forms/CheckboxInput.jsx';
import { formatDateInConfiguredTimezone } from '../../services/timezoneService.js';

export default function AdminCountdown() {
  const navigate = useNavigate();
  
  // Use TanStack Query for countdown configuration
  const { data: countdownData, isLoading: loading, error: dataError } = useCountdown();
  const updateCountdown = useUpdateCountdown();
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [timezoneName, setTimezoneName] = useState('Berlin Zeit');

  // Fetch timezone name for display
  useEffect(() => {
    const fetchTimezoneName = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/settings`);
        const data = await response.json();
        
        if (data.success && data.data.timezone) {
          const timezone = data.data.timezone;
          // Convert timezone to readable name
          const timezoneNames = {
            'Europe/Berlin': 'Berlin Zeit',
            'Europe/London': 'London Zeit',
            'Europe/Paris': 'Paris Zeit',
            'America/New_York': 'New York Zeit',
            'America/Los_Angeles': 'Los Angeles Zeit',
            'Asia/Tokyo': 'Tokyo Zeit',
            'Australia/Sydney': 'Sydney Zeit'
          };
          setTimezoneName(timezoneNames[timezone] || `${timezone} Zeit`);
        }
      } catch (error) {
        console.warn('Failed to fetch timezone configuration:', error);
      }
    };
    
    fetchTimezoneName();
  }, []);

  const schema = z.object({
    title: z.string().min(1, 'Titel ist erforderlich'),
    subtitle: z.string().min(1, 'Untertitel ist erforderlich'),
    targetDate: z.string().min(1, 'Ziel-Datum ist erforderlich'),
    buttonText: z.string().min(1, 'Button-Text ist erforderlich'),
    buttonEmoji: z.string().min(1, 'Button-Emoji ist erforderlich'),
    buttonLink: z.string().min(1, 'Button-Link ist erforderlich'),
    isActive: z.boolean()
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: 'Countdown zum SLAM25',
      subtitle: `28. Oktober 2025 • 12:00 Uhr (${timezoneName})`,
      targetDate: '2025-10-28T12:00',
      buttonText: 'Zum Zeitplan',
      buttonEmoji: '📅',
      buttonLink: '/timetable',
      isActive: true
    }
  });

  // Update form when countdownData changes
  useEffect(() => {
    if (countdownData) {
      // Map backend snake_case fields to frontend camelCase
      const mapped = {
        title: countdownData.title ?? 'Countdown zum SLAM25',
        subtitle: countdownData.subtitle ?? `28. Oktober 2025 • 12:00 Uhr (${timezoneName})`,
        targetDate: countdownData.targetDate || countdownData.target_date,
        buttonText: countdownData.buttonText || countdownData.button_text || 'Zum Zeitplan',
        buttonEmoji: countdownData.buttonEmoji || countdownData.button_emoji || '📅',
        buttonLink: countdownData.buttonLink || countdownData.button_link || '/timetable',
        isActive: typeof countdownData.isActive === 'boolean' ? countdownData.isActive : (countdownData.is_active ?? true)
      };

      // Convert targetDate to local datetime format for input if valid
      const rawDate = mapped.targetDate;
      const parsed = rawDate ? new Date(rawDate) : null;
      const isValidDate = parsed && !isNaN(parsed.getTime());
      const localDateTime = isValidDate
        ? new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16)
        : '2025-10-28T12:00';

      reset({
        title: mapped.title,
        subtitle: mapped.subtitle,
        targetDate: localDateTime,
        buttonText: mapped.buttonText,
        buttonEmoji: mapped.buttonEmoji,
        buttonLink: mapped.buttonLink,
        isActive: Boolean(mapped.isActive)
      });
    }
  }, [countdownData, reset]);

  const onSubmit = async (data) => {
    setError(null);
    setSuccess(null);

    try {
      // Convert local datetime to ISO string with timezone
      const targetDate = new Date(data.targetDate);
      const berlinTime = new Date(targetDate.getTime() + (2 * 60 * 60 * 1000)); // Add 2 hours for CEST
      const isoString = berlinTime.toISOString();

      // Use TanStack Query mutation for consistent response handling
      await updateCountdown.mutateAsync({
        ...data,
        targetDate: isoString
      });

      setSuccess('Countdown configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
      // No manual refresh needed - TanStack Query handles this automatically
    } catch (error) {
      console.error('Error saving countdown config:', error);
      setError('Failed to save countdown configuration');
    }
  };

  const handleReset = () => {
    reset();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
                Failed to load countdown configuration: {dataError}
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
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Countdown Configuration</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Customize the countdown display on the landing page
            </p>
          </div>
          <button
            onClick={() => navigate('/admin')}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            ← Back to Dashboard
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
        {/* Basic Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Basic Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Countdown Title
              </label>
              <input
                type="text"
                id="title"
                {...register('title')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Countdown zum SLAM25"
              />
            </div>

            <div>
              <label htmlFor="subtitle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Subtitle
              </label>
              <input
                type="text"
                id="subtitle"
                {...register('subtitle')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Date & Time
            </label>
            <input
              type="datetime-local"
              id="targetDate"
              {...register('targetDate')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              The countdown will count down to this date and time
            </p>
          </div>
        </div>

        {/* Button Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Button Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="buttonText" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Button Text
              </label>
              <input
                type="text"
                id="buttonText"
                {...register('buttonText')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Zum Zeitplan"
              />
            </div>

            <div>
              <label htmlFor="buttonEmoji" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Button Emoji
              </label>
              <input
                type="text"
                id="buttonEmoji"
                {...register('buttonEmoji')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="📅"
              />
            </div>

            <div>
              <label htmlFor="buttonLink" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Button Link
              </label>
              <input
                type="text"
                id="buttonLink"
                {...register('buttonLink')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="/timetable"
              />
            </div>
          </div>
        </div>

        {/* Status Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Status</h2>
          
          <CheckboxInput
            label="Show countdown on landing page"
            name="isActive"
            register={register}
            errors={errors}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
