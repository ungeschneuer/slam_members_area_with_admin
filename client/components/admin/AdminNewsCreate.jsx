import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCreateNews } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { getNewsCategoryFormOptions } from '../../utils/newsCategories.js';
import MarkdownTextarea from '../forms/MarkdownTextarea.jsx';

const schema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  content: z.string().min(1, 'Inhalt ist erforderlich'),
  category: z.enum(['announcement','workshops','prizes'], { required_error: 'Kategorie ist erforderlich' }),
  status: z.enum(['PUBLISHED','DRAFT']),
  publishedAt: z.string().optional(),
  date: z.string().min(1, 'Datum ist erforderlich')
});

export default function AdminNewsCreate() {
  const navigate = useNavigate();
  const createNewsMutation = useCreateNews();
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      category: 'announcement',
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10)
    }
  });

  // Use centralized category definitions
  const contentTypes = getNewsCategoryFormOptions();

  async function onSubmit(data) {
    try {
      await createNewsMutation.mutateAsync(data);
      reset();
      navigate('/admin/news');
    } catch (err) {
      // Error adding news - handled by error state
      setError('root', { type: 'server', message: 'Fehler beim Erstellen der News.' });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Neue News erstellen</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Fülle das Formular aus, um eine neue News zu erstellen</p>
        </div>
      </div>

      {errors.root && (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
          {errors.root.message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Titel</label>
              <input
                type="text"
                aria-invalid={errors.title ? 'true' : 'false'}
                {...register('title', { required: 'Titel ist erforderlich' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inhaltstyp</label>
              <select
                aria-invalid={errors.category ? 'true' : 'false'}
                {...register('category', { required: 'Kategorie ist erforderlich' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {contentTypes.map((contentType) => (
                  <option key={contentType.value} value={contentType.value}>
                    {contentType.label}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
              <select
                aria-invalid={errors.status ? 'true' : 'false'}
                {...register('status', { required: 'Status ist erforderlich' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="PUBLISHED">Veröffentlicht</option>
                <option value="DRAFT">Entwurf</option>
              </select>
              {errors.status && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Datum</label>
              <input
                type="date"
                aria-invalid={errors.date ? 'true' : 'false'}
                {...register('date', { required: 'Datum ist erforderlich' })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              {errors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>}
            </div>
          </div>
          <div>
            <MarkdownTextarea
              label="Inhalt"
              name="content"
              register={register}
              rules={{ required: 'Inhalt ist erforderlich' }}
              errors={errors}
              rows={8}
              placeholder="News-Inhalt in Markdown eingeben..."
              helpText="Verwende Markdown-Syntax für Formatierung. URLs werden automatisch verlinkt."
            />
          </div>
          
          {/* Upload note */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start space-x-3">
              <span className="text-blue-500 text-xl">💡</span>
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Datei-Upload nach der Erstellung
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Du kannst nach dem Erstellen der News ein Bild oder PDF hochladen, indem du die News bearbeitest.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={createNewsMutation.isPending || isSubmitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70"
            >
              {createNewsMutation.isPending || isSubmitting ? 'Speichern...' : 'News erstellen'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/news')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


