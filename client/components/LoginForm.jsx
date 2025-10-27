import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { usePageTitle } from '../hooks/usePageTitle.js';
import authService from '../services/authService.js';

const schema = z.object({
  identifier: z.string()
    .min(1, 'Benutzername oder E-Mail ist erforderlich')
    .max(255, 'Benutzername oder E-Mail ist zu lang')
    .trim(),
  password: z.string().min(1, 'Passwort ist erforderlich'),
  rememberMe: z.boolean().optional()
});

export default function LoginForm({ onLogin }) {
  usePageTitle('Admin Login');
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { identifier: '', password: '', rememberMe: false }
  });

  const onSubmit = async (data) => {
    try {
      const result = await authService.login(data.identifier, data.password, data.rememberMe);
      if (result.success) {
        onLogin();
        reset();
      } else {
        setError('root', { type: 'server', message: result.error || 'Anmeldung fehlgeschlagen' });
      }
    } catch (error) {
      setError('root', { type: 'network', message: 'Netzwerkfehler. Bitte versuchen Sie es erneut.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="mx-auto w-20 h-20 bg-[#185757] rounded-2xl flex items-center justify-center mb-6">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Access
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your credentials to manage SLAM25
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {errors.root && (
            <div className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-800">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800 dark:text-red-200">{errors.root.message}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Benutzername oder E-Mail
              </label>
              <input
                id="identifier"
                name="identifier"
                type="text"
                autoComplete="username"
                aria-invalid={errors.identifier ? 'true' : 'false'}
                {...register('identifier')}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] focus:z-10 sm:text-sm transition-all duration-200"
                placeholder="Benutzername oder E-Mail eingeben"
                disabled={isSubmitting}
              />
              {errors.identifier && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.identifier.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Passwort
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                {...register('password')}
                className="appearance-none relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#A2D2B9] focus:border-[#185757] focus:z-10 sm:text-sm transition-all duration-200"
                placeholder="Geben Sie Ihr Passwort ein"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              {...register('rememberMe')}
              className="h-4 w-4 text-[#185757] focus:ring-[#A2D2B9] border-gray-300 rounded"
              disabled={isSubmitting}
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Angemeldet bleiben
            </label>
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-sm font-medium rounded-xl text-white bg-[#185757] hover:bg-[#0f3a3b] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A2D2B9] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {isSubmitting ? (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : null}
              {isSubmitting ? 'Anmeldung läuft...' : 'Anmelden'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
