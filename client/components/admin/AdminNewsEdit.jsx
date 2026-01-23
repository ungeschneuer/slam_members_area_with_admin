import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNews, useUpdateNews, useDeleteNews } from '../../hooks/index.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { getNewsCategoryFormOptions } from '../../utils/newsCategories.js';
import { handleLinkClick } from '../../utils/linkUtils.js';
import MarkdownTextarea from '../forms/MarkdownTextarea.jsx';
import LoadingSpinner from '../LoadingSpinner';
import { ErrorMessage } from '../StatusMessages.jsx';
import { apiUpload } from '../../services/apiClient.js';

const schema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich'),
  content: z.string().min(1, 'Inhalt ist erforderlich'),
  category: z.enum(['announcement','workshops','prizes'], { required_error: 'Kategorie ist erforderlich' }),
  status: z.enum(['PUBLISHED','DRAFT']),
  publishedAt: z.string().optional(),
  date: z.string().min(1, 'Datum ist erforderlich'),
  isBreakingNews: z.boolean().optional()
});

export default function AdminNewsEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: newsData, isLoading } = useNews({}, true);
  const updateNewsMutation = useUpdateNews();
  const deleteNewsMutation = useDeleteNews();

  const [uploading, setUploading] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(null);

  // Find the news item
  const newsItem = React.useMemo(() => {
    if (!newsData || !id) return null;
    const newsArray = Array.isArray(newsData) ? newsData : [];
    return newsArray.find(n => n.id === parseInt(id));
  }, [newsData, id]);

  const { register, handleSubmit, formState: { errors, isSubmitting }, setError, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      content: '',
      category: 'announcement',
      status: 'PUBLISHED',
      publishedAt: new Date().toISOString(),
      date: new Date().toISOString().slice(0, 10),
      isBreakingNews: false
    }
  });

  // Use centralized category definitions
  const contentTypes = getNewsCategoryFormOptions();

  // Load news data
  useEffect(() => {
    if (newsItem) {
      reset({
        title: newsItem.title || '',
        content: newsItem.content || '',
        category: newsItem.category || 'announcement',
        status: newsItem.status || 'PUBLISHED',
        publishedAt: newsItem.published_at || new Date().toISOString(),
        date: newsItem.date || new Date().toISOString().slice(0, 10),
        isBreakingNews: newsItem.is_breaking_news || false
      });
      setCurrentImageUrl(newsItem.featured_image_url);
    }
  }, [newsItem, reset]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setError('root', { type: 'manual', message: 'Nur Bilder (JPEG, PNG, GIF, WebP) und PDFs sind erlaubt' });
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('root', { type: 'manual', message: 'Datei ist zu groß. Maximum: 10MB' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file);

      const result = await apiUpload(`/news/${id}/upload-image`, formData);
      setCurrentImageUrl(result.image.filePath);

      // Invalidate news queries to refresh data with new image
      queryClient.invalidateQueries({ queryKey: ['news'] });
    } catch (error) {
      setError('root', { type: 'manual', message: 'Datei-Upload fehlgeschlagen' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setCurrentImageUrl(null);
  };

  const mapFormToAPI = (formData) => ({
    title: formData.title,
    content: formData.content,
    category: formData.category,
    status: formData.status,
    published_at: formData.publishedAt,
    date: formData.date,
    is_breaking_news: formData.isBreakingNews,
    featured_image_url: currentImageUrl
  });

  async function onSubmit(data) {
    try {
      const apiData = mapFormToAPI(data);
      await updateNewsMutation.mutateAsync({ id: parseInt(id), ...apiData });
      navigate('/admin/news');
    } catch (err) {
      setError('root', { type: 'server', message: 'Fehler beim Aktualisieren der News.' });
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Bist du sicher, dass du diese Nachricht löschen möchtest?')) return;

    try {
      await deleteNewsMutation.mutateAsync(parseInt(id));
      navigate('/admin/news');
    } catch (error) {
      setError('root', { type: 'server', message: 'Fehler beim Löschen der News.' });
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Lade News..." />;
  }

  if (!newsItem) {
    return (
      <ErrorMessage
        error="News nicht gefunden"
        onRetry={() => navigate('/admin/news')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">News bearbeiten</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Aktualisiere die News-Informationen</p>
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
                {...register('title')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              {errors.title && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Inhaltstyp</label>
              <select
                aria-invalid={errors.category ? 'true' : 'false'}
                {...register('category')}
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
                {...register('status')}
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
                {...register('date')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              {errors.date && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.date.message}</p>}
            </div>
          </div>

          {/* Breaking News Checkbox */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isBreakingNews"
              {...register('isBreakingNews')}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isBreakingNews" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
              Als Breaking News markieren (wird prominent angezeigt)
            </label>
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

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Bild oder PDF hochladen
            </label>
            <input
              type="file"
              onChange={handleImageUpload}
              accept="image/*,.pdf"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploading && <p className="text-sm text-gray-500 mt-1">Wird hochgeladen...</p>}

            {/* Current file preview */}
            {currentImageUrl && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Aktuelle Datei:</p>
                {currentImageUrl.toLowerCase().includes('.pdf') ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📄</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">PDF-Datei</span>
                    <a
                      href={currentImageUrl}
                      onClick={(e) => {
                        const pdfLink = {
                          url: currentImageUrl,
                          title: 'PDF-Datei',
                          is_external: true
                        };
                        handleLinkClick(pdfLink, e);
                      }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Ansehen
                    </a>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <img
                      src={currentImageUrl}
                      alt="Featured image"
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Bild</p>
                      <a
                        href={currentImageUrl}
                        onClick={(e) => {
                          const imageLink = {
                            url: currentImageUrl,
                            title: 'Bild',
                            is_external: true
                          };
                          handleLinkClick(imageLink, e);
                        }}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Ansehen
                      </a>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Datei entfernen
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={updateNewsMutation.isPending || isSubmitting}
              className="px-6 py-3 bg-[#185757] text-white rounded-lg hover:bg-[#1a6666] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {updateNewsMutation.isPending || isSubmitting ? 'Speichern...' : 'Änderungen speichern'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/news')}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteNewsMutation.isPending}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium sm:ml-auto"
            >
              {deleteNewsMutation.isPending ? 'Löschen...' : 'News löschen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
