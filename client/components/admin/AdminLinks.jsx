import React, { useState, useMemo } from 'react';
import { FadeIn } from '../Transitions.jsx';
import { useLinks, useCreateLink, useUpdateLink, useDeleteLink } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import TextareaInput from '../forms/TextareaInput.jsx';
import CheckboxInput from '../forms/CheckboxInput.jsx';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const AdminLinks = () => {
  const { data: linksData, isLoading: loading, error } = useLinks({}, true); // isAdmin = true
  const createLink = useCreateLink();
  const updateLink = useUpdateLink();
  const deleteLink = useDeleteLink();
  const [localError, setLocalError] = useState('');
  
  const links = useMemo(() => Array.isArray(linksData) ? linksData : [], [linksData]);
  const [editingLink, setEditingLink] = useState(null);
  const [showForm, setShowForm] = useState(false);
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
    sortOrder: z.number().optional(),
    isExternal: z.boolean().optional(),
    isActive: z.boolean().optional()
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(linkSchema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      icon: '🔗',
      category: 'Sonstiges',
      isExternal: true,
      color: 'blue',
      sortOrder: 0,
      isActive: true
    }
  });
  const currentColor = watch('color');

  const colorOptions = [
    { value: 'blue', label: 'Blau', class: 'bg-blue-100 text-blue-800' },
    { value: 'purple', label: 'Lila', class: 'bg-purple-100 text-purple-800' },
    { value: 'green', label: 'Grün', class: 'bg-green-100 text-green-800' },
    { value: 'red', label: 'Rot', class: 'bg-red-100 text-red-800' },
    { value: 'yellow', label: 'Gelb', class: 'bg-yellow-100 text-yellow-800' },
    { value: 'indigo', label: 'Indigo', class: 'bg-indigo-100 text-indigo-800' }
  ];

  const categoryOptions = [
    'Medien', 'Musik', 'Kommunikation', 'Dokumente', 'Tools', 'Sonstiges'
  ];


  // Live data handled by useLiveData

  const onSubmit = async (data) => {
    try {
      if (editingLink) {
        await updateLink.mutateAsync({ id: editingLink.id, ...data });
      } else {
        await createLink.mutateAsync(data);
      }
      resetForm();
    } catch (err) {
      setLocalError(err.message || 'Fehler beim Speichern.');
    }
  };

  const handleEdit = (link) => {
    setEditingLink(link);
    reset({
      title: link.title,
      description: link.description,
      url: link.url,
      icon: link.icon,
      category: link.category,
      isExternal: link.isExternal,
      color: link.color,
      sortOrder: link.sortOrder || 0,
      isActive: link.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Link wirklich löschen?')) return;
    
    try {
      await deleteLink.mutateAsync(id);
    } catch (err) {
      setLocalError(err.message || 'Fehler beim Löschen.');
    }
  };

  const resetForm = () => {
    reset({
      title: '',
      description: '',
      url: '',
      icon: '🔗',
      category: 'Sonstiges',
      isExternal: true,
      color: 'blue',
      sortOrder: 0,
      isActive: true
    });
    setEditingLink(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <FadeIn>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Links verwalten
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Verwalte wichtige Links für die Mitglieder-Bereich
          </p>
        </div>

        {(error || localError) && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{localError || error}</p>
          </div>
        )}

        <div className="mb-6">
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Neuer Link
          </button>
        </div>

        {showForm && (
          <div className="mb-6 p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingLink ? 'Link bearbeiten' : 'Neuen Link erstellen'}
            </h3>
            
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Titel *" name="title" register={register} rules={{ required: 'Titel ist erforderlich' }} errors={errors} />

                <TextInput label="URL *" name="url" type="url" register={register} rules={{ required: 'URL ist erforderlich' }} errors={errors} />

                <TextareaInput
                  label="Beschreibung"
                  name="description"
                  register={register}
                  errors={errors}
                  rows={2}
                />

                <SelectInput label="Kategorie" name="category" register={register} options={categoryOptions.map(c => ({ value: c, label: c }))} errors={errors} />

                <div>
                  <label htmlFor="icon" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Icon (Emoji)
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      id="icon"
                      type="text"
                      {...register('icon')}
                      placeholder="🔗"
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                      maxLength="10"
                    />
                    <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center text-3xl border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
                      {watch('icon') || '🔗'}
                    </div>
                  </div>
                  {errors.icon && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.icon.message}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Tipp: Kopiere ein Emoji von deinem System-Emoji-Picker (Windows: Win + . | Mac: Cmd + Ctrl + Space)
                  </p>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Farbe
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => setValue('color', color.value)}
                        className={`px-3 py-1 rounded-lg text-sm border-2 ${
                          currentColor === color.value 
                            ? 'border-blue-500' 
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                        } ${color.class}`}
                      >
                        {color.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sortierung
                  </label>
                  <input
                    type="number"
                    {...register('sortOrder', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Niedrigere Zahlen erscheinen zuerst. Links werden nach Kategorie, dann nach Sortierung, dann nach Titel sortiert.
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <CheckboxInput
                    label="Externer Link"
                    name="isExternal"
                    register={register}
                    errors={errors}
                  />

                  <CheckboxInput
                    label="Aktiv"
                    name="isActive"
                    register={register}
                    errors={errors}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createLink.isPending || updateLink.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70"
                >
                  {isSubmitting || createLink.isPending || updateLink.isPending ? 'Speichern...' : (editingLink ? 'Aktualisieren' : 'Erstellen')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          {links.map(link => (
            <div key={link.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">{link.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {link.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">
                      {link.description}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {link.category}
                      </span>
                      <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                        {link.color}
                      </span>
                      <span className="text-xs bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
                        Sortierung: {link.sortOrder || 0}
                      </span>
                      {link.isExternal && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          Extern
                        </span>
                      )}
                      {!link.isActive && (
                        <span className="text-xs bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                          Inaktiv
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
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
          ))}
        </div>
      </FadeIn>
    </div>
  );
};

export default AdminLinks;
