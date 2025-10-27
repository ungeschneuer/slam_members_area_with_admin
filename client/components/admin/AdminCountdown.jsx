import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCountdown, useUpdateCountdown } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import CheckboxInput from '../forms/CheckboxInput.jsx';
import { getTimezoneOffsetFor } from '../../services/timezoneService.js';

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
        // Failed to fetch timezone configuration - using fallback
      }
    };
    
    fetchTimezoneName();
  }, []);

  const schema = z.object({
    title: z.string().min(1, 'Titel ist erforderlich'),
    subtitle: z.string().min(1, 'Untertitel ist erforderlich'),
    target_date: z.string().min(1, 'Ziel-Datum ist erforderlich'),
    button_text: z.string().min(1, 'Button-Text ist erforderlich'),
    button_emoji: z.string().min(1, 'Button-Emoji ist erforderlich'),
    button_link: z.string().min(1, 'Button-Link ist erforderlich'),
    is_active: z.boolean()
  });

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: 'Countdown zum SLAM25',
      subtitle: `28. Oktober 2025 • 12:00 Uhr (${timezoneName})`,
      target_date: '2025-10-28T12:00',
      button_text: 'Zum Zeitplan',
      button_emoji: '📅',
      button_link: '/timetable',
      is_active: true
    }
  });

  // Update form when countdownData changes
  useEffect(() => {
    if (!countdownData) return;
    
    const fetchAndFormat = async () => {
      try {
        // Get configured timezone from API
        const settingsResponse = await fetch(`${import.meta.env.VITE_API_URL}/settings`);
        const settings = await settingsResponse.json();
        const timezone = settings?.data?.timezone || 'Europe/Berlin';
        
        const mapped = {
          title: countdownData.title ?? 'Countdown zum SLAM25',
          subtitle: countdownData.subtitle ?? `28. Oktober 2025 • 12:00 Uhr (${timezoneName})`,
          target_date: countdownData.target_date,
          button_text: countdownData.button_text || 'Zum Zeitplan',
          button_emoji: countdownData.button_emoji || '📅',
          button_link: countdownData.button_link || '/timetable',
          is_active: countdownData.is_active ?? true
        };
        
        const rawDate = mapped.target_date;
        
        if (rawDate) {
          const utcDate = new Date(rawDate);
          
          // Format in configured timezone using formatToParts
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          
          const parts = formatter.formatToParts(utcDate);
          const year = parts.find(p => p.type === 'year').value;
          const month = parts.find(p => p.type === 'month').value;
          const day = parts.find(p => p.type === 'day').value;
          const hour = parts.find(p => p.type === 'hour').value;
          const minute = parts.find(p => p.type === 'minute').value;
          
          const localDateTime = `${year}-${month}-${day}T${hour}:${minute}`;
          
          reset({
            title: mapped.title,
            subtitle: mapped.subtitle,
            target_date: localDateTime,
            button_text: mapped.button_text,
            button_emoji: mapped.button_emoji,
            button_link: mapped.button_link,
            is_active: Boolean(mapped.is_active)
          });
        }
      } catch (error) {
        console.error('Error formatting countdown date:', error);
      }
    };
    
    fetchAndFormat();
  }, [countdownData, reset]);

  const onSubmit = async (data) => {
    setError(null);
    setSuccess(null);

    try {
      // Get configured timezone from API
      const settingsResponse = await fetch(`${import.meta.env.VITE_API_URL}/settings`);
      const settings = await settingsResponse.json();
      const timezone = settings?.data?.timezone || 'Europe/Berlin';
      
      const dateTimeStr = data.target_date; // "2025-10-28T12:00"
      
      // Parse the components
      const [datePart, timePart] = dateTimeStr.split('T');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      
      // Create a date string representing this time in the configured timezone
      const localDateStr = `${year}-${month}-${day}T${hour}:${minute}:00`;
      
      // Strategy: Find what UTC time will display as this local time in the configured timezone
      // Start with the date as if it were UTC
      const asIfUTC = new Date(localDateStr + 'Z');
      
      // Format this UTC time in the configured timezone to see what it looks like there
      const tzFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const parts = tzFormatter.formatToParts(asIfUTC);
      const tzYear = parts.find(p => p.type === 'year').value;
      const tzMonth = parts.find(p => p.type === 'month').value;
      const tzDay = parts.find(p => p.type === 'day').value;
      const tzHour = parts.find(p => p.type === 'hour').value;
      const tzMinute = parts.find(p => p.type === 'minute').value;
      const tzSecond = parts.find(p => p.type === 'second').value;
      
      const tzDateStr = `${tzYear}-${tzMonth}-${tzDay}T${tzHour}:${tzMinute}:${tzSecond}`;
      
      // Calculate the offset between what we want and what we got
      const wantedTime = new Date(localDateStr).getTime();
      const displayedTime = new Date(tzDateStr).getTime();
      const offsetMs = wantedTime - displayedTime;
      
      // Apply the correction to get the correct UTC time
      const correctUTC = new Date(asIfUTC.getTime() + offsetMs);

      await updateCountdown.mutateAsync({
        ...data,
        target_date: correctUTC.toISOString()
      });

      setSuccess('Countdown configuration saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError('Failed to save countdown configuration');
    }
  };

  const handleReset = () => {
    reset({
      title: 'Countdown zum SLAM25',
      subtitle: `28. Oktober 2025 • 12:00 Uhr (${timezoneName})`,
      target_date: '2025-10-28T12:00',
      button_text: 'Zum Zeitplan',
      button_emoji: '📅',
      button_link: '/timetable',
      is_active: true
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white"
                placeholder="28. Oktober 2025 • 12:00 Uhr (Berlin Zeit)"
              />
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="target_date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Date & Time
            </label>
            <input
              type="datetime-local"
              id="target_date"
              {...register('target_date')}
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
              <label htmlFor="button_text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Button Text
              </label>
              <input
                type="text"
                id="button_text"
                {...register('button_text')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white"
                placeholder="Zum Zeitplan"
              />
            </div>

            <div>
              <label htmlFor="button_emoji" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Button Emoji
              </label>
              <input
                type="text"
                id="button_emoji"
                {...register('button_emoji')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white"
                placeholder="📅"
              />
            </div>

            <div>
              <label htmlFor="button_link" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Button Link
              </label>
              <input
                type="text"
                id="button_link"
                {...register('button_link')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] dark:bg-gray-700 dark:text-white"
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
            name="is_active"
            control={control}
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
            className="px-6 py-2 bg-[#185757] text-white rounded-lg hover:bg-[#0f3a3b] focus:ring-2 focus:ring-[#A2D2B9] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  );
}
