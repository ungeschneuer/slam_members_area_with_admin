import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCityTips, useCreateCityTip, useUpdateCityTip } from '../../hooks/useCityTips.js';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createValidationSchema, getDefaultValues } from '../../../shared/schemas/validationFactory.js';
import { geocodingService } from '../../services/geocodingService.js';
import { getCategoryOptions } from '../../../shared/constants/categories.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { ErrorMessage } from '../StatusMessages.jsx';

const cityTipSchema = createValidationSchema('cityTip');

const predefinedPriceRanges = [
  { value: 'Kostenlos', label: 'Kostenlos' },
  { value: '€', label: '€ (Günstig)' },
  { value: '€€', label: '€€ (Mittel)' },
  { value: '€€€', label: '€€€ (Teuer)' },
  { value: '€€€€', label: '€€€€ (Sehr teuer)' }
];

export default function AdminCityTipsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const { data: cityTipsData, isLoading } = useCityTips({}, true);
  const createCityTipMutation = useCreateCityTip();
  const updateCityTipMutation = useUpdateCityTip();

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeSuccess, setGeocodeSuccess] = useState(null);

  const cityTips = React.useMemo(() => Array.isArray(cityTipsData) ? cityTipsData : [], [cityTipsData]);
  const currentTip = React.useMemo(() => {
    if (!isEditMode || !id) return null;
    return cityTips.find(t => t.id === parseInt(id));
  }, [isEditMode, id, cityTips]);

  const categories = getCategoryOptions();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(cityTipSchema),
    defaultValues: getDefaultValues('cityTip')
  });

  // Load tip data when editing
  useEffect(() => {
    if (isEditMode && currentTip) {
      reset({
        name: currentTip.name || '',
        slug: currentTip.slug || '',
        category: currentTip.category || 'culture',
        description: currentTip.description || '',
        address: currentTip.address || '',
        latitude: currentTip.latitude?.toString() || '',
        longitude: currentTip.longitude?.toString() || '',
        website: currentTip.website || '',
        price_range: currentTip.price_range || '€',
        tips: currentTip.tips || '',
        status: currentTip.status || 'ACTIVE',
        opening_hours: currentTip.opening_hours || ''
      });
    }
  }, [isEditMode, currentTip, reset]);

  // Auto-generate slug from name (only when creating)
  useEffect(() => {
    if (isEditMode) return;

    const subscription = watch((value, { name: fieldName }) => {
      if (fieldName === 'name' && value?.name) {
        const slug = value.name
          .toLowerCase()
          .replace(/[äöü]/g, char => ({ ä: 'ae', ö: 'oe', ü: 'ue' }[char]))
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
          .substring(0, 200);
        setValue('slug', slug);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue, isEditMode]);

  const handleGeocodeAddress = async () => {
    const address = watch('address');
    if (!address || address.trim() === '') {
      setError('address', { type: 'manual', message: 'Bitte geben Sie zuerst eine Adresse ein.' });
      return;
    }

    try {
      setGeocoding(true);
      const result = await geocodingService.geocodeAddress(address);
      setValue('latitude', result.lat.toFixed(6));
      setValue('longitude', result.lng.toFixed(6));
      setGeocodeSuccess(`Koordinaten erfolgreich ermittelt: ${result.displayName}`);
      setTimeout(() => setGeocodeSuccess(null), 3000);
    } catch (error) {
      const processedError = geocodingService.handleError(error);
      setError('address', { type: 'manual', message: `Geocoding fehlgeschlagen: ${processedError.message}` });
    } finally {
      setGeocoding(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const tipData = {
        ...data,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        opening_hours: data.opening_hours || null
      };

      if (isEditMode) {
        await updateCityTipMutation.mutateAsync({ id: currentTip.id, ...tipData });
      } else {
        await createCityTipMutation.mutateAsync(tipData);
      }

      navigate('/admin/city-tips');
    } catch (err) {
      setError('root', {
        type: 'server',
        message: isEditMode ? 'Fehler beim Aktualisieren des Stadt-Tipps.' : 'Fehler beim Erstellen des Stadt-Tipps.'
      });
    }
  };

  if (isLoading) {
    return <LoadingSpinner size="xl" text="Lade Daten..." />;
  }

  if (isEditMode && !currentTip) {
    return (
      <ErrorMessage
        error="Stadt-Tipp nicht gefunden"
        onRetry={() => navigate('/admin/city-tips')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Stadt-Tipp bearbeiten' : 'Neuen Stadt-Tipp erstellen'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode ? 'Aktualisiere die Informationen' : 'Fülle das Formular aus, um einen neuen Stadt-Tipp zu erstellen'}
          </p>
        </div>
      </div>

      {errors.root && (
        <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
          {errors.root.message}
        </div>
      )}

      {geocodeSuccess && (
        <div className="p-4 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200">
          {geocodeSuccess}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name & Slug */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Name des Ortes"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Slug *
              </label>
              <input
                type="text"
                {...register('slug')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="url-freundlicher-name"
              />
              {errors.slug && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.slug.message}</p>}
            </div>
          </div>

          {/* Category & Price Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kategorie *
              </label>
              <select
                {...register('category')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
              {errors.category && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.category.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Preisklasse
              </label>
              <select
                {...register('price_range')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {predefinedPriceRanges.map((price) => (
                  <option key={price.value} value={price.value}>
                    {price.label}
                  </option>
                ))}
              </select>
              {errors.price_range && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.price_range.message}</p>}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Beschreibung *
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Beschreibe den Ort..."
            />
            {errors.description && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.description.message}</p>}
          </div>

          {/* Address with Geocoding */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Adresse *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                {...register('address')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Straße, Stadt, Land"
              />
              <button
                type="button"
                onClick={handleGeocodeAddress}
                disabled={geocoding}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {geocoding ? 'Suche...' : 'Koordinaten'}
              </button>
            </div>
            {errors.address && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.address.message}</p>}
          </div>

          {/* Latitude & Longitude */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Breitengrad
              </label>
              <input
                type="text"
                {...register('latitude')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="z.B. 48.137154"
              />
              {errors.latitude && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.latitude.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Längengrad
              </label>
              <input
                type="text"
                {...register('longitude')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="z.B. 11.576124"
              />
              {errors.longitude && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.longitude.message}</p>}
            </div>
          </div>

          {/* Website */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Website
            </label>
            <input
              type="url"
              {...register('website')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="https://..."
            />
            {errors.website && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.website.message}</p>}
          </div>

          {/* Opening Hours */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Öffnungszeiten
            </label>
            <textarea
              {...register('opening_hours')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="z.B. Mo-Fr 10-18 Uhr, Sa 10-14 Uhr"
            />
            {errors.opening_hours && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.opening_hours.message}</p>}
          </div>

          {/* Tips */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipps & Hinweise
            </label>
            <textarea
              {...register('tips')}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Zusätzliche Tipps für Besucher..."
            />
            {errors.tips && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.tips.message}</p>}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              {...register('status')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="ACTIVE">Aktiv</option>
              <option value="INACTIVE">Inaktiv</option>
            </select>
            {errors.status && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.status.message}</p>}
          </div>

          {/* Submit buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-[#1a6666] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : (isEditMode ? 'Änderungen speichern' : 'Stadt-Tipp erstellen')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/city-tips')}
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
