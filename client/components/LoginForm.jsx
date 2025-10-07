import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import CheckboxInput from './forms/CheckboxInput.jsx';
import authService from '../services/authService.js';

const schema = z.object({
  email: z.string().email('Gültige E-Mail ist erforderlich'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
  rememberMe: z.boolean().optional()
});

export default function LoginForm({ onLogin }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', rememberMe: false }
  });

  const onSubmit = async (data) => {
    try {
      const result = await authService.login(data.email, data.password, data.rememberMe);
      if (result.success) {
        onLogin(result.user);
        reset();
      } else {
        setError('root', { type: 'server', message: result.error || 'Login failed' });
      }
    } catch (error) {
      setError('root', { type: 'network', message: 'Network error. Please try again.' });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Sign in to SLAM25
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your credentials to access the members area
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          {errors.root && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                    {errors.root.message}
                  </h3>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                aria-invalid={errors.email ? 'true' : 'false'}
                {...register('email')}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.email.message}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? 'true' : 'false'}
                {...register('password')}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                disabled={isSubmitting}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <CheckboxInput
              label="Remember me"
              name="rememberMe"
              register={register}
              errors={errors}
              disabled={isSubmitting}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
