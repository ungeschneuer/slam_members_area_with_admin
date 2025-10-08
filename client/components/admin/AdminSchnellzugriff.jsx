import React, { useState, useMemo } from 'react';
import { FadeIn } from '../Transitions.jsx';
import { useSchnellzugriff, useCreateSchnellzugriff, useUpdateSchnellzugriff, useDeleteSchnellzugriff } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import TextareaInput from '../forms/TextareaInput.jsx';
import CheckboxInput from '../forms/CheckboxInput.jsx';

const AdminSchnellzugriff = () => {
  const { data: linksData, isLoading: loading, error } = useSchnellzugriff();
  const createSchnellzugriff = useCreateSchnellzugriff();
  const updateSchnellzugriff = useUpdateSchnellzugriff();
  const deleteSchnellzugriff = useDeleteSchnellzugriff();
  
  const links = useMemo(() => Array.isArray(linksData) ? linksData : [], [linksData]);
  const [editingLink, setEditingLink] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [localError, setLocalError] = useState('');

  const schema = z.object({
    title: z.string().min(1, 'Titel ist erforderlich'),
    description: z.string().optional(),
    url: z.string().url('Gültige URL ist erforderlich'),
    icon: z.string().optional(),
    color: z.string().optional(),
    sortOrder: z.number().optional(),
    isActive: z.boolean().optional(),
    isExternal: z.boolean().optional()
  });

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      icon: '🔗',
      color: 'blue',
      sortOrder: 0,
      isActive: true,
      isExternal: true
    }
  });

  const colorOptions = [
    { value: 'blue', label: 'Blau', class: 'bg-blue-100 text-blue-800' },
    { value: 'purple', label: 'Lila', class: 'bg-purple-100 text-purple-800' },
    { value: 'green', label: 'Grün', class: 'bg-green-100 text-green-800' },
    { value: 'red', label: 'Rot', class: 'bg-red-100 text-red-800' },
    { value: 'yellow', label: 'Gelb', class: 'bg-yellow-100 text-yellow-800' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-800' },
    { value: 'pink', label: 'Pink', class: 'bg-pink-100 text-pink-800' },
    { value: 'orange', label: 'Orange', class: 'bg-orange-100 text-orange-800' },
    { value: 'teal', label: 'Türkis', class: 'bg-teal-100 text-teal-800' },
    { value: 'cyan', label: 'Cyan', class: 'bg-cyan-100 text-cyan-800' }
  ];

  const iconOptions = [
    '🔗', '🏠', '📝', '📅', '📰', '👥', '🎭', '📸', '📱', '🎵', '💬', '📄', '🛠️', '📊', '🎯', '⭐', '🔥', '💡', '🚀', '💎', '🌟', '🎨', '🎪', '🎉'
  ];

  // Live data handled by useLiveData

  const onSubmit = async (data) => {
    try {
      if (editingLink) {
        await updateSchnellzugriff.mutateAsync({ id: editingLink.id, ...data });
      } else {
        await createSchnellzugriff.mutateAsync(data);
      }
      resetForm();
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    reset({
      title: link.title,
      description: link.description || '',
      url: link.url,
      icon: link.icon,
      color: link.color,
      sortOrder: link.sort_order || 0,
      isActive: link.is_active,
      isExternal: link.is_external
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Schnellzugriff Link wirklich löschen?')) return;
    
    try {
      await deleteSchnellzugriff.mutateAsync(id);
    } catch (err) {
      setLocalError(err.message);
    }
  };

  const resetForm = () => {
    reset();
    setEditingLink(null);
    setShowForm(false);
  };

  const toggleActive = async (link) => {
    try {
      await updateSchnellzugriff.mutateAsync({
        id: link.id,
        ...link,
        isActive: !link.is_active
      });
      // No manual refresh needed - TanStack Query handles this automatically
    } catch (err) {
      setLocalError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <FadeIn>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Schnellzugriff Links verwalten
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verwalte die Quick Access Links für die Schnellzugriff-Sektion
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{error?.message || error}</p>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <span className="mr-2">➕</span>
            Neuer Schnellzugriff Link
          </button>
        </div>

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                {editingLink ? 'Schnellzugriff Link bearbeiten' : 'Neuer Schnellzugriff Link'}
              </h2>
              
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titel *
                  </label>
                  <input
                    type="text"
                    {...register('title')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                  {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title.message}</p>}
                </div>

                <div>
                  <TextareaInput
                    label="Beschreibung"
                    name="description"
                    register={register}
                    errors={errors}
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL *
                  </label>
                  <input
                    type="url"
                    {...register('url')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    required
                  />
                  {errors.url && <p className="text-red-500 text-sm mt-1">{errors.url.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Icon
                    </label>
                    <select
                      {...register('icon')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      {iconOptions.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Farbe
                    </label>
                    <select
                      {...register('color')}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    >
                      {colorOptions.map(color => (
                        <option key={color.value} value={color.value}>{color.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sortierreihenfolge
                  </label>
                  <input
                    type="number"
                    {...register('sortOrder', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex space-x-4">
                  <CheckboxInput
                    label="Aktiv"
                    name="isActive"
                    register={register}
                    errors={errors}
                  />

                  <CheckboxInput
                    label="Externer Link"
                    name="isExternal"
                    register={register}
                    errors={errors}
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Speichern...' : (editingLink ? 'Aktualisieren' : 'Erstellen')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Links List */}
        <div className="space-y-4">
          {links.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Keine Schnellzugriff Links
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Erstelle deinen ersten Schnellzugriff Link
              </p>
            </div>
          ) : (
            links.map((link) => (
              <div
                key={link.id}
                className={`p-4 rounded-lg border ${
                  link.is_active 
                    ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{link.icon}</div>
                    <div>
                      <h3 className={`font-medium ${
                        link.is_active 
                          ? 'text-gray-900 dark:text-white' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {link.title}
                      </h3>
                      {link.description && (
                        <p className={`text-sm ${
                          link.is_active 
                            ? 'text-gray-600 dark:text-gray-400' 
                            : 'text-gray-500 dark:text-gray-500'
                        }`}>
                          {link.description}
                        </p>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          colorOptions.find(c => c.value === link.color)?.class || 'bg-gray-100 text-gray-800'
                        }`}>
                          {colorOptions.find(c => c.value === link.color)?.label || link.color}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Sortierung: {link.sort_order}
                        </span>
                        {link.is_external && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            Extern
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleActive(link)}
                      className={`px-3 py-1 text-xs rounded-full ${
                        link.is_active
                          ? 'bg-green-100 text-green-800 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                      }`}
                    >
                      {link.is_active ? 'Aktiv' : 'Inaktiv'}
                    </button>
                    
                    <button
                      onClick={() => handleEdit(link)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    
                    <button
                      onClick={() => handleDelete(link.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </FadeIn>
    </div>
  );
};

export default AdminSchnellzugriff;
