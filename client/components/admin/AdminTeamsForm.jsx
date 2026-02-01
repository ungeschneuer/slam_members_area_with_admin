import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTeams, useParticipants, useCreateTeam, useUpdateTeam, useAddTeamMember, useRemoveTeamMember } from '../../hooks/index.js';
import { normalizeInstagramInput, extractInstagramUsername } from '../../utils/instagramUtils.js';
import LoadingSpinner from '../LoadingSpinner.jsx';
import { ErrorMessage } from '../StatusMessages.jsx';
import ParticipantMultiSelect from './ParticipantMultiSelect.jsx';
import { ADMIN_PARTICIPANTS_LIMIT } from '../../config/api.js';

const schema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  instagram: z.string().optional()
});

export default function AdminTeamsForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const { data: teams, isLoading: teamsLoading } = useTeams(true);
  const { data: participants, isLoading: participantsLoading } = useParticipants({ limit: ADMIN_PARTICIPANTS_LIMIT }, true);
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const addTeamMemberMutation = useAddTeamMember();
  const removeTeamMemberMutation = useRemoveTeamMember();

  const [selectedMembers, setSelectedMembers] = useState([]);
  const [existingMembers, setExistingMembers] = useState([]);

  // Find current team if editing
  const currentTeam = React.useMemo(() => {
    if (!isEditMode || !id || !teams) return null;
    return teams.find(t => t.id === parseInt(id));
  }, [isEditMode, id, teams]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting }, setError } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      instagram: ''
    }
  });

  // Get eligible participants
  const eligibleParticipants = React.useMemo(() => {
    if (!participants) return [];
    const participantsArray = participants.data || participants;
    if (!Array.isArray(participantsArray)) return [];
    return participantsArray;
  }, [participants]);

  // Load team data when editing
  useEffect(() => {
    if (isEditMode && currentTeam) {
      reset({
        name: currentTeam.name || '',
        instagram: currentTeam.instagram || ''
      });
      // Set existing team members
      const memberIds = currentTeam.members?.map(m => m.id) || [];
      setExistingMembers(memberIds);
      setSelectedMembers(memberIds);
    }
  }, [isEditMode, currentTeam, reset]);

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

      const payload = {
        ...data,
        instagram: instagramNormalized
      };

      if (isEditMode) {
        // Update team
        await updateTeamMutation.mutateAsync({ id: currentTeam.id, ...payload });

        // Handle member changes
        const membersToAdd = selectedMembers.filter(id => !existingMembers.includes(id));
        const membersToRemove = existingMembers.filter(id => !selectedMembers.includes(id));

        // Collect member operation errors
        const memberErrors = [];

        // Add new members
        for (const participantId of membersToAdd) {
          try {
            await addTeamMemberMutation.mutateAsync({
              teamId: currentTeam.id,
              participantId
            });
          } catch (error) {
            const participant = eligibleParticipants.find(p => p.id === participantId);
            const name = participant?.name || `ID ${participantId}`;
            memberErrors.push(`Fehler beim Hinzufügen von ${name}: ${error.message || 'Unbekannter Fehler'}`);
          }
        }

        // Remove old members
        for (const participantId of membersToRemove) {
          try {
            await removeTeamMemberMutation.mutateAsync({
              teamId: currentTeam.id,
              participantId
            });
          } catch (error) {
            const participant = eligibleParticipants.find(p => p.id === participantId);
            const name = participant?.name || `ID ${participantId}`;
            memberErrors.push(`Fehler beim Entfernen von ${name}: ${error.message || 'Unbekannter Fehler'}`);
          }
        }

        // Don't close form if there were member errors
        if (memberErrors.length > 0) {
          setError('root', {
            type: 'server',
            message: `Team wurde aktualisiert, aber es gab Probleme mit Mitgliedern:\n${memberErrors.join('\n')}`
          });
          return; // Don't navigate away
        }
      } else {
        // Create new team
        const result = await createTeamMutation.mutateAsync(payload);

        // Collect member operation errors
        const memberErrors = [];

        // Add selected members
        if (selectedMembers.length > 0 && result?.id) {
          for (const participantId of selectedMembers) {
            try {
              await addTeamMemberMutation.mutateAsync({
                teamId: result.id,
                participantId
              });
            } catch (error) {
              const participant = eligibleParticipants.find(p => p.id === participantId);
              const name = participant?.name || `ID ${participantId}`;
              memberErrors.push(`Fehler beim Hinzufügen von ${name}: ${error.message || 'Unbekannter Fehler'}`);
            }
          }
        }

        // Don't close form if there were member errors
        if (memberErrors.length > 0) {
          setError('root', {
            type: 'server',
            message: `Team wurde erstellt, aber es gab Probleme beim Hinzufügen von Mitgliedern:\n${memberErrors.join('\n')}`
          });
          return; // Don't navigate away
        }
      }

      // Navigate back to list only if no member errors
      navigate('/admin/teams');
    } catch (err) {
      setError('root', {
        type: 'server',
        message: isEditMode ? 'Fehler beim Aktualisieren des Teams.' : 'Fehler beim Erstellen des Teams.'
      });
    }
  };

  if (teamsLoading || participantsLoading) {
    return <LoadingSpinner size="xl" text="Lade Daten..." />;
  }

  if (isEditMode && !currentTeam) {
    return (
      <ErrorMessage
        error="Team nicht gefunden"
        onRetry={() => navigate('/admin/teams')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {isEditMode ? 'Team bearbeiten' : 'Neues Team erstellen'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {isEditMode ? 'Aktualisiere die Informationen' : 'Fülle das Formular aus, um ein neues Team zu erstellen'}
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
          {/* Team Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Name *
            </label>
            <input
              type="text"
              aria-invalid={errors.name ? 'true' : 'false'}
              {...register('name')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Team Name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>}
          </div>

          {/* Instagram */}
          <div>
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

          {/* Team Members */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team-Mitglieder
            </label>
            <ParticipantMultiSelect
              participants={eligibleParticipants}
              selectedParticipants={selectedMembers}
              onSelectionChange={setSelectedMembers}
              placeholder="Teilnehmer*innen auswählen"
              maxHeight="300px"
            />
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Wähle die Teilnehmer*innen aus, die zu diesem Team gehören
            </p>
          </div>

          {/* Submit buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-[#1a6666] transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {isSubmitting ? 'Speichern...' : (isEditMode ? 'Änderungen speichern' : 'Team erstellen')}
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/teams')}
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
