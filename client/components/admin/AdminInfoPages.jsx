import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useError } from '../../hooks/useError.js';
import { useInfoPages, useCreateInfoPage, useUpdateInfoPage, useDeleteInfoPage } from '../../hooks/useInfoPages.js';
import FileUploadSection from './FileUploadSection.jsx';
import ConsolidatedAdminTable from './ConsolidatedAdminTable.jsx';

// Simple inline schema - no complex abstractions
const infoPageSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  slug: z.string().min(1, 'Slug ist erforderlich'),
  content: z.string().min(1, 'Inhalt ist erforderlich'),
  excerpt: z.string().optional(),
  category: z.enum(['general', 'rules', 'chemnitz', 'weiteres']),
  display_order: z.number().min(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  additionalLinks: z.array(z.object({
    title: z.string().optional().default(''),
    url: z.string().optional().default('')
  })).optional().default([])
  // NO file fields, NO tags - handled separately
});

function AdminInfoPages() {
  const [showForm, setShowForm] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const { handleError } = useError();

  // Direct useForm - no abstractions
  const form = useForm({
    resolver: zodResolver(infoPageSchema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      category: 'general',
      display_order: 0,
      status: 'DRAFT',
      additionalLinks: []
    }
  });

  const { control, register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = form;

  // Additional links management
  const { fields: linkFields, append: appendLink, remove: removeLink } = useFieldArray({
    control,
    name: 'additionalLinks'
  });

  // Queries and mutations using hooks
  const { data: infoPages = [], isLoading } = useInfoPages({}, true);
  const createInfoPageMutation = useCreateInfoPage();
  const updateInfoPageMutation = useUpdateInfoPage();
  const deleteInfoPageMutation = useDeleteInfoPage();

  // Clean form submit handler
  const onSubmit = async (data) => {
    try {
      const payload = {
        title: data.title,
        slug: data.slug,
        content: data.content,
        excerpt: data.excerpt || '',
        category: data.category,
        display_order: data.display_order,
        status: data.status,
        // Backend expects snake_case
        file_url: editingPage?.file_url || null,
        file_type: editingPage?.file_type || null,
        file_description: editingPage?.file_description || '',
        additional_links: data.additionalLinks || [],
        tags: editingPage?.tags || [],
        published_at: editingPage?.published_at || null
      };

      if (editingPage) {
        await updateInfoPageMutation.mutateAsync({ id: editingPage.id, ...payload });
        setShowForm(false);
        setEditingPage(null);
        reset();
      } else {
        await createInfoPageMutation.mutateAsync(payload);
        setShowForm(false);
        setEditingPage(null);
        reset();
      }
    } catch (error) {
      console.error('Form submission error:', error);
      handleError(error, { context: 'form_submission' });
    }
  };

  // Edit handler
  const handleEdit = (page) => {
    setEditingPage(page);
    setShowForm(true);
    
    // ✅ Use reset() to set all form values at once
    reset({
      title: page.title,
      slug: page.slug,
      content: page.content,
      excerpt: page.excerpt || '',
      category: page.category,
      display_order: page.display_order,
      status: page.status,
      additionalLinks: page.additional_links || []
    });
  };

  // File upload handlers
  const handleFileUpload = (filePath, fileType) => {
    // Update form state as primary source of truth
    setValue('file_url', filePath);
    setValue('file_type', fileType);
    
    // Update editingPage only for immediate display
    if (editingPage) {
      setEditingPage(prev => ({
        ...prev,
        file_url: filePath,
        file_type: fileType
      }));
    }
  };

  const handleFileRemove = () => {
    // Update form state as primary source of truth
    setValue('file_url', null);
    setValue('file_type', null);
    setValue('file_description', '');
    
    // Update editingPage only for immediate display
    if (editingPage) {
      setEditingPage(prev => ({
        ...prev,
        file_url: null,
        file_type: null,
        file_description: ''
      }));
    }
  };

  const handleDescriptionChange = (description) => {
    // Update form state as primary source of truth
    setValue('file_description', description);
    
    // Update editingPage only for immediate display
    if (editingPage) {
      setEditingPage(prev => ({
        ...prev,
        file_description: description
      }));
    }
  };

  // Category options
  const categories = [
    { value: 'general', label: 'Allgemein' },
    { value: 'rules', label: 'Regeln' },
    { value: 'chemnitz', label: 'Chemnitz' },
    { value: 'weiteres', label: 'Weiteres' }
  ];

  // Status options
  const statusOptions = [
    { value: 'DRAFT', label: 'Entwurf' },
    { value: 'PUBLISHED', label: 'Veröffentlicht' },
    { value: 'ARCHIVED', label: 'Archiviert' }
  ];

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Lade...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Info-Seiten</h2>
        <button
          onClick={() => {
            setEditingPage(null);
            setShowForm(true);
            reset();
          }}
          className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors touch-manipulation active:scale-95"
        >
          Neue Seite erstellen
        </button>
      </div>

      {/* Table */}
      {!showForm && (
        <ConsolidatedAdminTable
          columns={[
            {
              key: 'title',
              label: 'Titel',
              sortable: true,
              render: (val, page) => (
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {page.title}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    /{page.slug}
                  </div>
                </div>
              )
            },
            {
              key: 'category',
              label: 'Kategorie',
              sortable: true,
              render: (val) => (
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {categories.find(c => c.value === val)?.label || val}
                </span>
              )
            },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              render: (val) => (
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  val === 'PUBLISHED' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : val === 'DRAFT'
                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {statusOptions.find(s => s.value === val)?.label || val}
                </span>
              )
            },
            {
              key: 'display_order',
              label: 'Reihenfolge',
              sortable: true
            },
            {
              key: 'actions',
              label: 'Aktionen',
              render: (_, page) => (
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleEdit(page)}
                    className="min-h-[44px] px-3 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-200 touch-manipulation active:scale-95 rounded"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm('Sind Sie sicher, dass Sie diese Seite löschen möchten?')) {
                        deleteInfoPageMutation.mutate(page.id);
                      }
                    }}
                    className="min-h-[44px] px-3 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 touch-manipulation active:scale-95 rounded"
                  >
                    Löschen
                  </button>
                </div>
              )
            }
          ]}
          data={infoPages}
          loading={isLoading}
          emptyMessage="Keine Info-Seiten vorhanden"
        />
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingPage ? 'Seite bearbeiten' : 'Neue Seite erstellen'}
          </h3>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-800 text-sm">{errors.root.message}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Titel *
                </label>
                <input
                  {...register('title')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.title && <span className="text-red-600 text-sm">{errors.title.message}</span>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Slug *
                </label>
                <input
                  {...register('slug')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.slug && <span className="text-red-600 text-sm">{errors.slug.message}</span>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategorie
                </label>
                <select
                  {...register('category')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
                {errors.category && <span className="text-red-600 text-sm">{errors.category.message}</span>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {statusOptions.map(status => (
                    <option key={status.value} value={status.value}>{status.label}</option>
                  ))}
                </select>
                {errors.status && <span className="text-red-600 text-sm">{errors.status.message}</span>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reihenfolge
                </label>
                <input
                  type="number"
                  {...register('display_order', { valueAsNumber: true })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
                {errors.display_order && <span className="text-red-600 text-sm">{errors.display_order.message}</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Kurzbeschreibung
              </label>
              <textarea
                {...register('excerpt')}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Kurze Beschreibung der Seite..."
              />
              {errors.excerpt && <span className="text-red-600 text-sm">{errors.excerpt.message}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Inhalt (Markdown) *
              </label>
              <textarea
                {...register('content')}
                rows={15}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                placeholder="# Überschrift&#10;&#10;Hier kommt der Inhalt in Markdown-Format..."
              />
              {errors.content && <span className="text-red-600 text-sm">{errors.content.message}</span>}
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Verwende Markdown-Syntax für Formatierung.
              </p>
            </div>

            {/* File Upload Section */}
            <div className="space-y-6">
              {!editingPage && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  💡 Speichere die Seite zuerst, um Dateien hochzuladen
                </p>
              )}
              
              <FileUploadSection
                type="universal"
                currentUrl={editingPage?.file_url}
                currentType={editingPage?.file_type}
                description={editingPage?.file_description}
                onUpload={handleFileUpload}
                onRemove={handleFileRemove}
                onDescriptionChange={handleDescriptionChange}
                editingPageId={editingPage?.id}
                disabled={!editingPage}
              />
            </div>

            {/* Additional Links Section */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Zusätzliche Links</h3>
                <button
                  type="button"
                  onClick={() => appendLink({ title: '', url: '' })}
                  className="min-h-[44px] px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm touch-manipulation active:scale-95"
                >
                  Link hinzufügen
                </button>
              </div>

              {linkFields.map((link, index) => (
                <div key={link.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <input
                    type="text"
                    placeholder="Titel"
                    {...register(`additionalLinks.${index}.title`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    {...register(`additionalLinks.${index}.url`)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(index)}
                    className="min-h-[44px] min-w-[44px] px-3 py-2 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 focus:outline-none rounded flex items-center justify-center touch-manipulation active:scale-95"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {linkFields.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  <p>Noch keine Links hinzugefügt</p>
                  <p className="text-sm">Klicken Sie auf "Link hinzufügen" um einen Link hinzuzufügen</p>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPage(null);
                  reset();
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors touch-manipulation active:scale-95"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
              >
                {isSubmitting ? 'Speichere...' : (editingPage ? 'Aktualisieren' : 'Erstellen')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminInfoPages;