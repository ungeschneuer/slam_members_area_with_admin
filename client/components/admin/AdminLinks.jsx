import React, { useState, useMemo, useEffect } from 'react';
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
  const sortedLinks = useMemo(() => {
    return [...links].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [links]);

  const [editingLink, setEditingLink] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isReordering, setIsReordering] = useState(false);
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
    sort_order: z.number().optional(),
    is_external: z.boolean().optional(),
    is_active: z.boolean().optional()
  });

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm({
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
      is_external: link.is_external,
      color: link.color,
      sort_order: link.sort_order || 0,
      is_active: link.is_active
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
      is_external: true,
      color: 'blue',
      sort_order: 0,
      is_active: true
    });
    setEditingLink(null);
    setShowForm(false);
  };

  const handleMoveUp = async (link, currentIndex) => {
    if (currentIndex === 0 || isReordering) return;
    
    const prevLink = sortedLinks[currentIndex - 1];
    
    try {
      setIsReordering(true);
      setLocalError('');
      
      // Get current sort orders
      const currentSortOrder = link.sort_order || 0;
      const prevSortOrder = prevLink.sort_order || 0;
      
      // Swap sort orders
      await Promise.all([
        updateLink.mutateAsync({ 
          id: link.id,
          title: link.title,
          description: link.description,
          url: link.url,
          icon: link.icon,
          category: link.category,
          is_external: link.is_external,
          color: link.color,
          sort_order: prevSortOrder,
          is_active: link.is_active
        }),
        updateLink.mutateAsync({ 
          id: prevLink.id,
          title: prevLink.title,
          description: prevLink.description,
          url: prevLink.url,
          icon: prevLink.icon,
          category: prevLink.category,
          is_external: prevLink.is_external,
          color: prevLink.color,
          sort_order: currentSortOrder,
          is_active: prevLink.is_active
        })
      ]);
    } catch (err) {
      console.error('Reorder error:', err);
      setLocalError(err.message || 'Fehler beim Verschieben.');
    } finally {
      setIsReordering(false);
    }
  };

  const handleMoveDown = async (link, currentIndex) => {
    if (currentIndex === sortedLinks.length - 1 || isReordering) return;
    
    const nextLink = sortedLinks[currentIndex + 1];
    
    try {
      setIsReordering(true);
      setLocalError('');
      
      // Get current sort orders
      const currentSortOrder = link.sort_order || 0;
      const nextSortOrder = nextLink.sort_order || 0;
      
      // Swap sort orders
      await Promise.all([
        updateLink.mutateAsync({ 
          id: link.id,
          title: link.title,
          description: link.description,
          url: link.url,
          icon: link.icon,
          category: link.category,
          is_external: link.is_external,
          color: link.color,
          sort_order: nextSortOrder,
          is_active: link.is_active
        }),
        updateLink.mutateAsync({ 
          id: nextLink.id,
          title: nextLink.title,
          description: nextLink.description,
          url: nextLink.url,
          icon: nextLink.icon,
          category: nextLink.category,
          is_external: nextLink.is_external,
          color: nextLink.color,
          sort_order: currentSortOrder,
          is_active: nextLink.is_active
        })
      ]);
    } catch (err) {
      console.error('Reorder error:', err);
      setLocalError(err.message || 'Fehler beim Verschieben.');
    } finally {
      setIsReordering(false);
    }
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
            onClick={() => {
              setEditingLink(null);
              reset();
              setShowForm(true);
            }}
            className="min-h-[44px] bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors touch-manipulation active:scale-95"
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        className={`min-h-[44px] px-3 py-2 rounded-lg text-sm border-2 touch-manipulation active:scale-95 ${
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
                    {...register('sort_order', { valueAsNumber: true })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Niedrigere Zahlen erscheinen zuerst. Tipp: Nutze die Pfeile in der Liste für einfaches Umordnen.
                  </p>
                </div>

                <div className="flex items-center space-x-4">
                  <CheckboxInput
                    label="Externer Link"
                    name="is_external"
                    control={control}
                    register={register}
                    errors={errors}
                  />

                  <CheckboxInput
                    label="Aktiv"
                    name="is_active"
                    control={control}
                    register={register}
                    errors={errors}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 touch-manipulation active:scale-95"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createLink.isPending || updateLink.isPending}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 touch-manipulation active:scale-95"
                >
                  {isSubmitting || createLink.isPending || updateLink.isPending ? 'Speichern...' : (editingLink ? 'Aktualisieren' : 'Erstellen')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-3">
          {sortedLinks.map((link, index) => (
            <div key={link.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-3xl">{link.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                      {link.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {link.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        link.color === 'blue' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300' :
                        link.color === 'purple' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300' :
                        link.color === 'green' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                        link.color === 'red' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                        link.color === 'yellow' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                        link.color === 'indigo' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {link.category}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400">
                        Sortierung: {link.sort_order || 0}
                      </span>
                      <span className={link.is_active ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                        {link.is_active ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {/* Reorder buttons */}
                  <div className="flex flex-col space-y-1">
                    <button
                      onClick={() => handleMoveUp(link, index)}
                      disabled={index === 0 || isReordering}
                      className="min-h-[44px] min-w-[44px] p-2 text-lg text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation active:scale-95"
                      title="Nach oben"
                    >
                      {isReordering ? '⏳' : '↑'}
                    </button>
                    <button
                      onClick={() => handleMoveDown(link, index)}
                      disabled={index === sortedLinks.length - 1 || isReordering}
                      className="min-h-[44px] min-w-[44px] p-2 text-lg text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors touch-manipulation active:scale-95"
                      title="Nach unten"
                    >
                      {isReordering ? '⏳' : '↓'}
                    </button>
                  </div>
                  {/* Edit/Delete buttons */}
                  <button
                    onClick={() => handleEdit(link)}
                    className="min-h-[44px] min-w-[44px] p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors touch-manipulation active:scale-95"
                    title="Bearbeiten"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(link.id)}
                    className="min-h-[44px] min-w-[44px] p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors touch-manipulation active:scale-95"
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
