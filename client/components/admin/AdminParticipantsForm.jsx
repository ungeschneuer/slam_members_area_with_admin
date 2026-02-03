import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useParticipants, useCreateParticipant, useUpdateParticipant } from '../../hooks/index.js';
import { ALLOWED_PARTICIPANT_ROLES } from '@shared/constants/roles.js';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { normalizeInstagramInput, extractInstagramUsername } from '../../utils/instagramUtils.js';
import { generateUniqueSlug } from '../../utils/slugUtils.js';
import LoadingSpinner from '../LoadingSpinner';
import { ErrorMessage } from '../StatusMessages.jsx';
import { ADMIN_PARTICIPANTS_LIMIT } from '../../config/api.js';

const schema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  region: z.string().optional(),
  role: z.string().min(1, 'Rolle ist erforderlich'),
  pronouns: z.string().optional(),
  instagram: z.string().optional()
});

const bundeslaender = [
  'Bayern',
  'Baden-Württemberg',
  'Berlin-Brandenburg',
  'Hamburg',
  'Hessen',
  'Mecklenburg-Vorpommern',
  'Niedersachsen/Bremen',
  'Nordrhein-Westfalen',
  'Rheinland-Pfalz',
  'Saarland',
  'Sachsen',
  'Sachsen-Anhalt',
  'Schleswig-Holstein',
  'Thüringen',
  'Liechtenstein',
  'Luxemburg',
  'Österreich',
  'Ostbelgien',
  'Schweiz',
  'Südtirol',
  'Slam Alphas',
  'BiPOC/Migra',
  'i,Slam',
  'TINte',
  'U20',
  'Chemnitz'
];

const roles = ALLOWED_PARTICIPANT_ROLES;

export default function AdminParticipantsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // Load all participants for slug uniqueness check
  const { data: allParticipantsResponse, isLoading: loadingParticipants } = useParticipants(
    { limit: ADMIN_PARTICIPANTS_LIMIT, offset: 0 },
    true
  );

  // Extract participants array
  const allParticipants = React.useMemo(() => {
    if (allParticipantsResponse?.data) {
      return Array.isArray(allParticipantsResponse.data) ? allParticipantsResponse.data : [];
    }
    return Array.isArray(allParticipantsResponse) ? allParticipantsResponse : [];
  }, [allParticipantsResponse]);

  // Find current participant if editing
  const currentParticipant = React.useMemo(() => {
    if (!isEditMode || !id) return null;
    return allParticipants.find(p => p.id === parseInt(id));
  }, [isEditMode, id, allParticipants]);

  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      region: '',
      role: 'Wettbewerb-Teilnehmer*in',
      pronouns: '',
      instagram: ''
    }
  });

  // Load participant data when editing
  useEffect(() => {
    if (isEditMode && currentParticipant) {
      reset({
        name: currentParticipant.name || '',
        region: currentParticipant.region || '',
        role: currentParticipant.role || 'Wettbewerb-Teilnehmer*in',
        pronouns: currentParticipant.pronouns || '',
        instagram: currentParticipant.instagram || ''
      });
    }
  }, [isEditMode, currentParticipant, reset]);

  const onSubmit = async (data) => {
    try {
      // Normalize Instagram handle
      const instagramNormalized = data.instagram ? (() => {
        try {
          const normalized = normalizeInstagramInput(data.instagram);
          return extractInstagramUsername(normalized) || data.instagram.replace(/^@/, '');
        } catch (error) {
          return data.instagram.replace(/^@/, '');
        }
      })() : '';

      if (isEditMode) {
        // Update existing participant
        const payload = {
          ...currentParticipant,
          ...data,
          instagram: instagramNormalized
        };
        await updateParticipant.mutateAsync({ id: currentParticipant.id, ...payload });
      } else {
        // Create new participant with unique slug
        const existingSlugs = allParticipants.map(p => p.slug);
        const payload = {
          ...data,
          slug: generateUniqueSlug(data.name, existingSlugs),
          instagram: instagramNormalized
        };
        await createParticipant.mutateAsync(payload);
      }

      // Navigate back to list (only on success)
      navigate('/admin/participants');
    } catch (err) {
      // Error is already handled by mutation's onError (shows toast)
      // Don't navigate away on error - stay on form so user can retry
    }
  };

  if (loadingParticipants) {
    return <LoadingSpinner size="xl" text="Lade Daten..." />;
  }

  if (isEditMode && !currentParticipant) {
    return (
      <ErrorMessage
        error="Teilnehmer*in nicht gefunden"
        onRetry={() => navigate('/admin/participants')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Teilnehmer*in bearbeiten' : 'Neue*n Teilnehmer*in erstellen'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode ? 'Aktualisiere die Informationen' : 'Fülle das Formular aus, um eine*n neue*n Teilnehmer*in zu erstellen'}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name *
              </label>
              <input
                type="text"
                aria-invalid={errors.name ? 'true' : 'false'}
                {...register('name')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Vorname Nachname"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Region
              </label>
              <select
                aria-invalid={errors.region ? 'true' : 'false'}
                {...register('region')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Keine Region</option>
                {bundeslaender.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              {errors.region && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.region.message}</p>}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rolle *
              </label>
              <select
                aria-invalid={errors.role ? 'true' : 'false'}
                {...register('role')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
              {errors.role && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.role.message}</p>}
            </div>

            {/* Pronouns */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Pronomen
              </label>
              <input
                type="text"
                aria-invalid={errors.pronouns ? 'true' : 'false'}
                {...register('pronouns')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="z.B. sie/ihr, er/ihm, they/them"
              />
              {errors.pronouns && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.pronouns.message}</p>}
            </div>

            {/* Instagram */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Instagram
              </label>
              <input
                type="text"
                aria-invalid={errors.instagram ? 'true' : 'false'}
                {...register('instagram')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="@username oder https://instagram.com/username"
              />
              {errors.instagram && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.instagram.message}</p>}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Du kannst einen @username, eine URL oder nur den Benutzernamen eingeben
              </p>
            </div>
          </div>

          {/* Submit buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : (isEditMode ? 'Änderungen speichern' : 'Teilnehmer*in erstellen')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/participants')}
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
