import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLinks, useCreateLink, useUpdateLink } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { ErrorMessage } from '../StatusMessages.jsx';

const linkSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  url: z.string().url('Gültige URL ist erforderlich'),
  description: z.string().optional(),
  category: z.string().optional(),
  icon: z.string()
    .min(1, 'Icon ist erforderlich')
    .max(10, 'Icon ist zu lang')
    .regex(/^[\p{Emoji}\u200d\ufe0f]+$/u, 'Bitte gib ein gültiges Emoji ein')
    .optional(),
  color: z.string().optional(),
  sort_order: z.coerce.number().optional(),
  is_external: z.boolean().optional(),
  is_active: z.boolean().optional()
});

const colorOptions = [
  { value: 'blue', label: 'Blau', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  { value: 'purple', label: 'Lila', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
  { value: 'green', label: 'Grün', class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
  { value: 'red', label: 'Rot', class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
  { value: 'yellow', label: 'Gelb', class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' }
];

const categoryOptions = [
  'Medien', 'Musik', 'Kommunikation', 'Dokumente', 'Tools', 'Sonstiges'
];

export default function AdminLinksForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const { data: linksData, isLoading } = useLinks({}, true);
  const createLinkMutation = useCreateLink();
  const updateLinkMutation = useUpdateLink();

  const links = React.useMemo(() => Array.isArray(linksData) ? linksData : [], [linksData]);
  const currentLink = React.useMemo(() => {
    if (!isEditMode || !id) return null;
    return links.find(l => l.id === parseInt(id));
  }, [isEditMode, id, links]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      icon: '🔗',
      category: 'Sonstiges',
      is_external: true,
      color: 'blue',
      sort_order: 0,
      is_active: true
    }
  });

  const currentColor = watch('color');
  const currentIcon = watch('icon');

  // Load link data when editing
  useEffect(() => {
    if (isEditMode && currentLink) {
      reset({
        title: currentLink.title || '',
        description: currentLink.description || '',
        url: currentLink.url || '',
        icon: currentLink.icon || '🔗',
        category: currentLink.category || 'Sonstiges',
        is_external: currentLink.is_external ?? true,
        color: currentLink.color || 'blue',
        sort_order: currentLink.sort_order || 0,
        is_active: currentLink.is_active ?? true
      });
    }
  }, [isEditMode, currentLink, reset]);

  const onSubmit = async (data) => {
    try {
      const linkData = {
        ...data,
        sort_order: parseInt(data.sort_order) || 0
      };

      if (isEditMode) {
        await updateLinkMutation.mutateAsync({ id: currentLink.id, ...linkData });
      } else {
        await createLinkMutation.mutateAsync(linkData);
      }

      navigate('/admin/links');
    } catch (err) {
      setError('root', {
        type: 'server',
        message: isEditMode ? 'Fehler beim Aktualisieren des Links.' : 'Fehler beim Erstellen des Links.'
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Lade Daten..." />;
  }

  if (isEditMode && !currentLink) {
    return (
      <ErrorMessage
        error="Link nicht gefunden"
        onRetry={() => navigate('/admin/links')}
      />
    );
  }

  const selectedColorClass = colorOptions.find(c => c.value === currentColor)?.class || colorOptions[0].class;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Link bearbeiten' : 'Neuen Link erstellen'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode ? 'Aktualisiere die Informationen' : 'Fülle das Formular aus, um einen neuen Link zu erstellen'}
          </p>
        </div>
      </div>

      {errors.root && (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
          {errors.root.message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Title & URL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Titel *
              </label>
              <input
                type="text"
                {...register('title')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Link-Titel"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL *
              </label>
              <input
                type="url"
                {...register('url')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="https://..."
              />
              {errors.url && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.url.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Beschreibung
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Kurze Beschreibung des Links..."
            />
            {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>}
          </div>

          {/* Icon, Category, Color */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Icon (Emoji)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  {...register('icon')}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="🔗"
                  maxLength={10}
                />
                <div className="w-12 h-12 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-2xl">
                  {currentIcon || '🔗'}
                </div>
              </div>
              {errors.icon && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.icon.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategorie
              </label>
              <select
                {...register('category')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Farbe
              </label>
              <select
                {...register('color')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {colorOptions.map((color) => (
                  <option key={color.value} value={color.value}>
                    {color.label}
                  </option>
                ))}
              </select>
              {/* Preview */}
              <div className="mt-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${selectedColorClass}`}>
                  Vorschau
                </span>
              </div>
              {errors.color && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.color.message}</p>}
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sortierung
            </label>
            <input
              type="number"
              {...register('sort_order')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#185757] focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="0"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Niedrigere Zahlen erscheinen zuerst
            </p>
            {errors.sort_order && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.sort_order.message}</p>}
          </div>

          {/* Checkboxes */}
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_external"
                {...register('is_external')}
                className="h-4 w-4 text-[#185757] focus:ring-[#185757] border-gray-300 rounded"
              />
              <label htmlFor="is_external" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Externer Link (öffnet in neuem Tab)
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                {...register('is_active')}
                className="h-4 w-4 text-[#185757] focus:ring-[#185757] border-gray-300 rounded"
              />
              <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                Link ist aktiv (sichtbar für Benutzer)
              </label>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#185757] text-white rounded-lg hover:bg-[#1a6666] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : (isEditMode ? 'Änderungen speichern' : 'Link erstellen')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/links')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
