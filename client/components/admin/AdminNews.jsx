import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNews, useBreakingNews, useUpdateNews, useDeleteNews, useUpdateBreakingNews, useDeleteBreakingNews } from '../../hooks/index.js';
import { useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '../LoadingSpinner';
import { useForm } from 'react-hook-form';
import { handleLinkClick } from '../../utils/linkUtils.js';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import MarkdownTextarea from '../forms/MarkdownTextarea.jsx';
import SearchFilters from '../forms/SearchFilters.jsx';
import BreakingNewsCountdown from '../shared/BreakingNewsCountdown.jsx';
// useSlugAutoGeneration hook removed as part of simplification
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { validateFilterValue } from '../../utils/filterUtils.js';
import { getNewsCategoryAdminOptions } from '../../utils/newsCategories.js';


export default function AdminNews() {
  const navigate = useNavigate();
  const { data: newsData, isLoading: loading, error } = useNews({}, true); // isAdmin = true
  const { data: breakingNewsData, isLoading: breakingNewsLoading, error: breakingNewsQueryError } = useBreakingNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();
  const updateBreakingNews = useUpdateBreakingNews();
  const deleteBreakingNews = useDeleteBreakingNews();
  const queryClient = useQueryClient();
  const news = Array.isArray(newsData) ? newsData : [];
  const [editingNews, setEditingNews] = useState(null);
  const [uploading, setUploading] = useState(false);
  const editSchema = z.object({
    title: z.string().min(1, 'Titel ist erforderlich'),
    slug: z.string().min(1, 'Slug ist erforderlich'),
    category: z.enum(['announcement','workshops','prizes']),
    status: z.enum(['PUBLISHED','DRAFT']),
    date: z.string().min(1, 'Datum ist erforderlich'),
    content: z.string().min(1, 'Inhalt ist erforderlich'),
    priority: z.enum(['NORMAL', 'HIGH', 'URGENT']).optional().default('NORMAL')
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      slug: '',
      category: 'announcement',
      status: 'PUBLISHED',
      date: new Date().toISOString().slice(0, 10),
      content: '',
      priority: 'NORMAL'
    }
  });

  // Auto-generate slug functionality removed as part of simplification
  // Inline add form removed in favor of dedicated page
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Breaking news state
  const [breakingNewsSuccess, setBreakingNewsSuccess] = useState(null);
  const [breakingNewsError, setBreakingNewsError] = useState(null);
  
  // Breaking news form
  const breakingNewsSchema = z.object({
    selectedNewsForBreaking: z.string().min(1, 'Bitte wählen Sie einen Artikel aus'),
    breakingNewsDuration: z.number().min(1, 'Dauer muss mindestens 1 Stunde sein').max(168, 'Dauer darf maximal 168 Stunden (1 Woche) sein')
  });
  
  const breakingNewsForm = useForm({
    resolver: zodResolver(breakingNewsSchema),
    defaultValues: {
      selectedNewsForBreaking: '',
      breakingNewsDuration: 24
    }
  });
  const { register: breakingNewsRegister, handleSubmit: handleBreakingNewsSubmit, formState: { errors: breakingNewsErrors, isSubmitting: breakingNewsIsSubmitting } } = breakingNewsForm;

  // Removed newNews inline state; creation handled on /admin/news/new

  // Use centralized category definitions
  const predefinedContentTypes = getNewsCategoryAdminOptions();

  // Admin forms show all predefined options
  const contentTypes = predefinedContentTypes;

  // Auto-reset selected category if it no longer exists
  useEffect(() => {
    const validCategory = validateFilterValue(selectedCategory, contentTypes);
    if (validCategory !== selectedCategory) {
      setSelectedCategory(validCategory);
    }
  }, [contentTypes]); // Only depend on contentTypes to prevent loops

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Creation handled in AdminNewsCreate page

  const handleEditOpen = (newsItem) => {
    setEditingNews(newsItem);
    // Use API data directly (already in snake_case)
    reset({
      title: newsItem.title,
      slug: newsItem.slug || '',
      category: newsItem.category,
      status: newsItem.status || 'PUBLISHED',
      date: newsItem.date,
      content: newsItem.content,
      priority: newsItem.priority || 'NORMAL'
    });
  };

  // Map form data to API format (camelCase to snake_case)
  const mapFormToAPI = (formData) => ({
    title: formData.title,
    slug: formData.slug,
    category: formData.category,
    status: formData.status,
    date: formData.date,
    content: formData.content,
    priority: formData.priority,
    // Map camelCase form fields to snake_case database columns
    published_at: formData.publishedAt || formData.date,
    featured_image_url: formData.featuredImageUrl,
    is_published: formData.isPublished || (formData.status === 'PUBLISHED'),
    is_breaking_news: formData.isBreakingNews || false,
    breaking_news_until: formData.breakingNewsUntil
  });

  const onUpdateSubmit = async (data) => {
    if (!editingNews) return;
    try {
      const apiData = mapFormToAPI(data);
      await updateNews.mutateAsync({ id: editingNews.id, ...apiData });
      setEditingNews(null);
    } catch (error) {
      // Error updating news - handled by error state
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du diesen News-Eintrag löschen möchtest?')) {
      try {
        await deleteNews.mutateAsync(id);
      } catch (error) {
        // Error deleting news - handled by error state
      }
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`/api/news/${editingNews.id}/upload-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      // Update the editing news object with the new file path
      setEditingNews({...editingNews, featured_image_url: result.image.filePath});
      
      // Invalidate news queries to refresh data with new image
      queryClient.invalidateQueries({ queryKey: ['news'] });
    } catch (err) {
      // Error uploading file - handled by alert
      alert('Fehler beim Hochladen der Datei');
    } finally {
      setUploading(false);
    }
  };

  // Breaking news functions
  const setBreakingNewsArticle = async (data) => {
    try {
      setBreakingNewsError(null);

      await updateBreakingNews.mutateAsync({
        id: data.selectedNewsForBreaking,
        duration: parseInt(data.breakingNewsDuration)
      });

      const durationText = data.breakingNewsDuration === 1 ? '1 Stunde' :
                         data.breakingNewsDuration === 24 ? '24 Stunden (1 Tag)' :
                         data.breakingNewsDuration === 48 ? '48 Stunden (2 Tage)' :
                         data.breakingNewsDuration === 72 ? '72 Stunden (3 Tage)' :
                         data.breakingNewsDuration === 168 ? '1 Woche' :
                         `${data.breakingNewsDuration} Stunden`;
      setBreakingNewsSuccess(`Breaking News erfolgreich gesetzt für ${durationText}`);
      breakingNewsForm.reset();
    } catch (err) {
      // Error setting breaking news - handled by error state
      setBreakingNewsError('Fehler beim Setzen der Breaking News');
    }
  };

  const clearBreakingNews = async () => {
    try {
      setBreakingNewsError(null);

      await deleteBreakingNews.mutateAsync();

      setBreakingNewsSuccess('Breaking News erfolgreich entfernt');
    } catch (err) {
      // Error clearing breaking news - handled by error state
      setBreakingNewsError('Fehler beim Entfernen der Breaking News');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Nachrichten werden geladen..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-6xl mb-4">⚠️</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Fehler beim Laden der Nachrichten</h3>
        <p className="text-gray-600 dark:text-gray-400">{error?.message || error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nachrichten verwalten</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Erstellen und verwalten Sie Nachrichten und Ankündigungen</p>
        </div>
        <button
          onClick={() => navigate('/admin/news/new')}
          className="mt-4 sm:mt-0 w-full sm:w-auto min-h-[44px] btn-primary touch-manipulation active:scale-95"
        >
          Nachricht hinzufügen
        </button>
      </div>

      {/* Breaking News Management */}
      <div className="card-base p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Breaking News Verwaltung
        </h2>
        
        {/* Error and Success Messages */}
        {breakingNewsError && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">{breakingNewsError}</p>
          </div>
        )}
        
        {breakingNewsSuccess && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{breakingNewsSuccess}</p>
          </div>
        )}

        {/* Current Breaking News */}
        {breakingNewsData && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Aktuelle Breaking News
            </h3>
            <div className="space-y-2">
              <p className="text-red-800 dark:text-red-200 font-medium">{breakingNewsData.title}</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Kategorie: {contentTypes.find(c => c.value === breakingNewsData.category)?.label || breakingNewsData.category}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Erstellt: {formatDate(breakingNewsData.created_at)}
              </p>
              {breakingNewsData.breaking_news_until && (
                <div className="space-y-1">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Läuft bis: {formatDate(breakingNewsData.breaking_news_until)}
                  </p>
                  <BreakingNewsCountdown 
                    breakingNewsUntil={breakingNewsData.breaking_news_until} 
                    variant="admin"
                  />
                </div>
              )}
            </div>
            <button
              onClick={clearBreakingNews}
              className="mt-3 w-full sm:w-auto min-h-[44px] px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 touch-manipulation active:scale-95"
            >
              Breaking News entfernen
            </button>
          </div>
        )}

        {/* Set New Breaking News */}
        <form onSubmit={handleBreakingNewsSubmit(setBreakingNewsArticle)} className="space-y-4">
          <h3 className="heading-tertiary">
            Neue Breaking News setzen
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Artikel auswählen *
              </label>
              <select
                {...breakingNewsRegister('selectedNewsForBreaking')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Artikel auswählen...</option>
                {news
                  .filter(article => article.status === 'PUBLISHED')
                  .map(article => (
                    <option key={article.id} value={article.id}>
                      {article.title} ({contentTypes.find(c => c.value === article.category)?.label || article.category})
                    </option>
                  ))}
              </select>
              {breakingNewsErrors.selectedNewsForBreaking && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {breakingNewsErrors.selectedNewsForBreaking.message}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dauer (Stunden) *
              </label>
              <select
                {...breakingNewsRegister('breakingNewsDuration', { valueAsNumber: true })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>1 Stunde</option>
                <option value={6}>6 Stunden</option>
                <option value={12}>12 Stunden</option>
                <option value={24}>24 Stunden (1 Tag)</option>
                <option value={48}>48 Stunden (2 Tage)</option>
                <option value={72}>72 Stunden (3 Tage)</option>
                <option value={168}>1 Woche</option>
              </select>
              {breakingNewsErrors.breakingNewsDuration && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {breakingNewsErrors.breakingNewsDuration.message}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                💡 Tipp: Breaking News werden automatisch nach der gewählten Zeit entfernt
              </p>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={breakingNewsIsSubmitting}
            className="w-full sm:w-auto min-h-[44px] px-6 py-2 bg-[#185757] hover:bg-[#0f3a3b] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 touch-manipulation active:scale-95"
          >
            {breakingNewsIsSubmitting ? 'Setzen...' : 'Breaking News setzen'}
          </button>
        </form>
      </div>

      {/* Search and Filter */}
      <div className="card-base p-6">
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          searchPlaceholder="Nachrichten suchen..."
          filters={[
            {
              value: selectedCategory,
              onChange: (e) => setSelectedCategory(e.target.value),
              options: contentTypes.map(type => ({ value: type.value, label: type.label })),
              placeholder: 'Alle Typen'
            }
          ]}
          gridCols="grid-cols-1 md:grid-cols-2"
        />
      </div>

      {/* Add Form moved to /admin/news/new */}

      {/* News List */}
      <div className="space-y-4">
        {filteredNews.map((newsItem) => (
          <div key={newsItem.id} className="card-base">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="heading-tertiary">{newsItem.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          contentTypes.find(c => c.value === newsItem.category)?.color || 'bg-gray-100 text-gray-800'
                  }`}>
                    {contentTypes.find(c => c.value === newsItem.category)?.label}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (newsItem.status === 'PUBLISHED') ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {(newsItem.status === 'PUBLISHED') ? 'Veröffentlicht' : 'Entwurf'}
                    </span>
                    {breakingNewsData && breakingNewsData.id === newsItem.id && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded-full">
                        🚨 Breaking News
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {formatDate(newsItem.published_at)}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">{newsItem.content}</p>
                </div>
                <div className="flex flex-wrap gap-3 mt-4 sm:mt-0 sm:ml-4">
                  <button
                    onClick={() => handleEditOpen(newsItem)}
                    className="min-h-[44px] min-w-[44px] px-4 py-2 text-[#185757] hover:text-[#0f3a3b] dark:text-[#A2D2B9] dark:hover:text-[#8BC4A3] transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-[#185757] rounded"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(newsItem.id)}
                    className="min-h-[44px] min-w-[44px] px-4 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 rounded"
                  >
                    Löschen
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredNews.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📰</div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Keine Nachrichten gefunden</h3>
          <p className="text-gray-600 dark:text-gray-400">Versuchen Sie, Ihre Such- oder Filterkriterien anzupassen</p>
        </div>
      )}

      {/* Edit Modal */}
      {editingNews && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md sm:max-w-lg md:max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nachricht bearbeiten</h2>
            <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Titel" name="title" register={register} rules={{ required: 'Titel ist erforderlich' }} errors={errors} />
                <TextInput label="Slug" name="slug" register={register} rules={{ required: 'Slug ist erforderlich' }} errors={errors} />
                <SelectInput label="Inhaltstyp" name="category" register={register} rules={{ required: 'Inhaltstyp ist erforderlich' }} errors={errors} options={contentTypes.map(c => ({ value: c.value, label: c.label }))} />
                <SelectInput label="Status" name="status" register={register} rules={{ required: 'Status ist erforderlich' }} errors={errors} options={[{ value: 'PUBLISHED', label: 'Veröffentlicht' }, { value: 'DRAFT', label: 'Entwurf' }]} />
                <SelectInput label="Priorität" name="priority" register={register} errors={errors} options={[
                  { value: 'NORMAL', label: 'Normal' },
                  { value: 'HIGH', label: 'Hoch' },
                  { value: 'URGENT', label: 'Dringend' }
                ]} />
                <TextInput label="Datum" name="date" type="date" register={register} rules={{ required: 'Datum ist erforderlich' }} errors={errors} />
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
              
              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bild/PDF hochladen
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-[#A2D2B9] focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {uploading && <p className="text-sm text-gray-500 mt-1">Wird hochgeladen...</p>}
                
                {/* Current file preview */}
                {editingNews?.featured_image_url && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aktuelle Datei:</p>
                    {editingNews.featured_image_url.toLowerCase().includes('.pdf') ? (
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">📄</span>
                        <span className="text-sm text-gray-600 dark:text-gray-400">PDF-Datei</span>
                        <a 
                          href={editingNews.featured_image_url} 
                          onClick={(e) => {
                            const pdfLink = {
                              url: editingNews.featured_image_url,
                              title: 'PDF-Datei',
                              is_external: true
                            };
                            handleLinkClick(pdfLink, e);
                          }}
                          className="text-[#185757] hover:text-[#0f3a3b] text-sm"
                        >
                          Anzeigen
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3">
                        <img 
                          src={editingNews.featured_image_url} 
                          alt="Featured image" 
                          className="w-16 h-16 object-cover rounded"
                        />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Bild</p>
                          <a 
                            href={editingNews.featured_image_url} 
                            onClick={(e) => {
                              const imageLink = {
                                url: editingNews.featured_image_url,
                                title: 'Bild',
                                is_external: true
                              };
                              handleLinkClick(imageLink, e);
                            }}
                            className="text-[#185757] hover:text-[#0f3a3b] text-sm"
                          >
                            Anzeigen
                          </a>
                        </div>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingNews({...editingNews, featured_image_url: null});
                      }}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Datei entfernen
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || updateNews.isPending}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70 touch-manipulation active:scale-95"
                >
                  {isSubmitting || updateNews.isPending ? 'Speichern...' : 'Änderungen speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNews(null)}
                  className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors touch-manipulation active:scale-95"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
