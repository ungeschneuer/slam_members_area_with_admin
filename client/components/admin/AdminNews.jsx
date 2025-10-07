import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNews, useBreakingNews, useUpdateNews, useDeleteNews } from '../../hooks/index.js';
import authService from '../../services/authService.js';
import LoadingSpinner from '../LoadingSpinner';
import { useForm } from 'react-hook-form';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import SearchFilters from '../forms/SearchFilters.jsx';
import BreakingNewsCountdown from '../shared/BreakingNewsCountdown.jsx';
import { generateSlug } from '../../utils/slugUtils.js';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';


export default function AdminNews() {
  const navigate = useNavigate();
  const { data: newsData, isLoading: loading, error } = useNews();
  const { data: breakingNewsData, isLoading: breakingNewsLoading, error: breakingNewsQueryError } = useBreakingNews();
  const updateNews = useUpdateNews();
  const deleteNews = useDeleteNews();
  const news = Array.isArray(newsData) ? newsData : [];
  const [editingNews, setEditingNews] = useState(null);
  const editSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    slug: z.string().min(1, 'Slug is required'),
    category: z.enum(['announcement','workshops','prizes']),
    status: z.enum(['PUBLISHED','DRAFT']),
    date: z.string().min(1, 'Datum ist erforderlich'),
    content: z.string().min(1, 'Inhalt ist erforderlich')
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(editSchema),
    defaultValues: {
      title: '',
      slug: '',
      category: 'announcement',
      status: 'PUBLISHED',
      date: new Date().toISOString().slice(0, 10),
      content: ''
    }
  });

  // Auto-generate slug when title changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'title' && value?.title) {
        const slug = generateSlug(value.title);
        setValue('slug', slug, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);
  // Inline add form removed in favor of dedicated page
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Breaking news state
  const [breakingNews, setBreakingNews] = useState(breakingNewsData);
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

  const contentTypes = [
    { value: 'announcement', label: 'Ankündigung', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    { value: 'workshops', label: 'Workshops', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' },
    { value: 'prizes', label: 'Preise', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' }
  ];

  // Update breaking news state when useLiveData changes
  useEffect(() => {
    if (breakingNewsData) {
      setBreakingNews(breakingNewsData);
    } else {
      setBreakingNews(null);
    }
  }, [breakingNewsData]);

  const filteredNews = news.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Creation handled in AdminNewsCreate page

  const handleEditOpen = (newsItem) => {
    setEditingNews(newsItem);
    reset({
      title: newsItem.title,
      slug: newsItem.slug || '',
      category: newsItem.category,
      status: newsItem.status || 'PUBLISHED',
      date: newsItem.date,
      content: newsItem.content
    });
  };

  const onUpdateSubmit = async (data) => {
    if (!editingNews) return;
    try {
      await updateNews.mutateAsync({ id: editingNews.id, ...data });
      setEditingNews(null);
    } catch (error) {
      console.error('Error updating news:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du diesen News-Eintrag löschen möchtest?')) {
      try {
        await deleteNews.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting news:', error);
      }
    }
  };

  // Breaking news functions
  const setBreakingNewsArticle = async (data) => {
    try {
      setBreakingNewsError(null);
      
      const response = await authService.authenticatedRequest(`${import.meta.env.VITE_API_URL}/breaking-news/${data.selectedNewsForBreaking}`, {
        method: 'POST',
        body: JSON.stringify({ duration: parseInt(data.breakingNewsDuration) })
      });
      
      const responseData = await response.json();
      
      if (responseData.success) {
        const durationText = data.breakingNewsDuration === 1 ? '1 Stunde' : 
                           data.breakingNewsDuration === 24 ? '24 Stunden (1 Tag)' :
                           data.breakingNewsDuration === 48 ? '48 Stunden (2 Tage)' :
                           data.breakingNewsDuration === 72 ? '72 Stunden (3 Tage)' :
                           data.breakingNewsDuration === 168 ? '1 Woche' :
                           `${data.breakingNewsDuration} Stunden`;
        setBreakingNewsSuccess(`Breaking News erfolgreich gesetzt für ${durationText}`);
        setBreakingNews(responseData.data);
        breakingNewsForm.reset();
      } else {
        setBreakingNewsError(responseData.error || 'Fehler beim Setzen der Breaking News');
      }
    } catch (err) {
      console.error('Error setting breaking news:', err);
      setBreakingNewsError('Fehler beim Setzen der Breaking News');
    }
  };

  const clearBreakingNews = async () => {
    try {
      setBreakingNewsError(null);
      
      const response = await authService.authenticatedRequest(`${import.meta.env.VITE_API_URL}/breaking-news`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        setBreakingNewsSuccess('Breaking News erfolgreich entfernt');
        setBreakingNews(null);
      } else {
        setBreakingNewsError(data.error || 'Fehler beim Entfernen der Breaking News');
      }
    } catch (err) {
      console.error('Error clearing breaking news:', err);
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
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
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
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nachricht hinzufügen
        </button>
      </div>

      {/* Breaking News Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
        {breakingNews && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Aktuelle Breaking News
            </h3>
            <div className="space-y-2">
              <p className="text-red-800 dark:text-red-200 font-medium">{breakingNews.title}</p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Kategorie: {contentTypes.find(c => c.value === breakingNews.category)?.label || breakingNews.category}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Erstellt: {formatDate(breakingNews.created_at)}
              </p>
              {breakingNews.breakingNewsUntil && (
                <div className="space-y-1">
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Läuft bis: {formatDate(breakingNews.breakingNewsUntil)}
                  </p>
                  <BreakingNewsCountdown 
                    breakingNewsUntil={breakingNews.breakingNewsUntil} 
                    variant="admin"
                  />
                </div>
              )}
            </div>
            <button
              onClick={clearBreakingNews}
              className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
            >
              Breaking News entfernen
            </button>
          </div>
        )}

        {/* Set New Breaking News */}
        <form onSubmit={handleBreakingNewsSubmit(setBreakingNewsArticle)} className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Neue Breaking News setzen
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Artikel auswählen *
              </label>
              <select
                {...breakingNewsRegister('selectedNewsForBreaking')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
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
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
          >
            {breakingNewsIsSubmitting ? 'Setzen...' : 'Breaking News setzen'}
          </button>
        </form>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
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
          <div key={newsItem.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{newsItem.title}</h3>
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
                    {breakingNews && breakingNews.id === newsItem.id && (
                      <span className="px-2 py-1 bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 text-xs font-medium rounded-full">
                        🚨 Breaking News
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    {formatDate(newsItem.date)}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">{newsItem.content}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0 sm:ml-4">
                  <button
                    onClick={() => handleEditOpen(newsItem)}
                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleDelete(newsItem.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Nachricht bearbeiten</h2>
            <form onSubmit={handleSubmit(onUpdateSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Titel" name="title" register={register} rules={{ required: 'Titel ist erforderlich' }} errors={errors} />
                <TextInput label="Slug" name="slug" register={register} rules={{ required: 'Slug ist erforderlich' }} errors={errors} />
                <SelectInput label="Inhaltstyp" name="category" register={register} rules={{ required: 'Inhaltstyp ist erforderlich' }} errors={errors} options={contentTypes.map(c => ({ value: c.value, label: c.label }))} />
                <SelectInput label="Status" name="status" register={register} rules={{ required: 'Status ist erforderlich' }} errors={errors} options={[{ value: 'PUBLISHED', label: 'Veröffentlicht' }, { value: 'DRAFT', label: 'Entwurf' }]} />
                <TextInput label="Datum" name="date" type="date" register={register} rules={{ required: 'Datum ist erforderlich' }} errors={errors} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inhalt</label>
                <textarea
                  {...register('content', { required: 'Inhalt ist erforderlich' })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {errors.content && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.content.message}</p>}
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting || updateNews.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-70"
                >
                  {isSubmitting || updateNews.isPending ? 'Speichern...' : 'Änderungen speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNews(null)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
