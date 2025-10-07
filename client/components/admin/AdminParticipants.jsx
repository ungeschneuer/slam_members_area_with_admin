import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParticipants, useCreateParticipant, useUpdateParticipant, useDeleteParticipant } from '../../hooks/index.js';
import { useBulkImportParticipants } from '../../hooks/useBulkImportParticipants.js';
import websocketService from '../../services/websocketService.js';
import LoadingSpinner from '../LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import { useForm } from 'react-hook-form';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import SearchFilters from '../forms/SearchFilters.jsx';
import { formatInstagramUrl, normalizeInstagramInput } from '../../utils/instagramUtils.js';
import { generateSlug } from '../../utils/slugUtils.js';
import { downloadParticipantTemplate } from '../../services/excelService.js';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

export default function AdminParticipants() {
  const { data: participantsData, isLoading: loading, error } = useParticipants();
  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [success, setSuccess] = useState(null);
  const [importError, setImportError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Bulk import functionality
  const {
    importState,
    isProcessing,
    validationResults,
    importResults,
    performBulkImport,
    resetImport,
    getImportStatus
  } = useBulkImportParticipants();

  const schema = z.object({
    name: z.string().min(1, 'Name ist erforderlich'),
    slug: z.string().min(1, 'Slug ist erforderlich'),
    region: z.string().min(1, 'Region ist erforderlich'),
    role: z.string().min(1, 'Rolle ist erforderlich'),
    pronouns: z.string().optional(),
    instagram: z.string().optional()
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      region: '',
      role: 'Teilnehmer*in',
      pronouns: '',
      instagram: ''
    }
  });

  // Auto-generate slug when name changes
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'name' && value?.name) {
        const slug = generateSlug(value.name);
        setValue('slug', slug, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, setValue]);

  // RHF for edit modal
  const editForm = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      region: '',
      role: 'Teilnehmer*in',
      pronouns: '',
      instagram: ''
    }
  });
  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: isEditSubmitting } } = editForm;

  const bundeslaender = [
    'Baden-Württemberg', 'Bayern', 'Berlin', 'Brandenburg', 'Bremen',
    'Hamburg', 'Hessen', 'Mecklenburg-Vorpommern', 'Niedersachsen',
    'Nordrhein-Westfalen', 'Rheinland-Pfalz', 'Saarland', 'Sachsen',
    'Sachsen-Anhalt', 'Schleswig-Holstein', 'Thüringen',
    'Österreich', 'Schweiz', 'Belgien', 'Luxemburg', 'Südtirol'
  ];

  const roles = ['Teilnehmer*in', 'Supporter*in', 'Crew', 'SLAM-MC'];

  // Pronouns is now a free-form text field

  // Ensure admin room is joined for targeted updates
  useEffect(() => {
    const ensureAdminRoom = async () => {
      try {
        if (!websocketService.isConnected) {
          await websocketService.connect();
        }
        websocketService.joinAdminRoom();
      } catch (e) {
        console.warn('AdminParticipants: WebSocket admin room join failed:', e);
      }
    };
    ensureAdminRoom();
  }, []);

  const participants = useMemo(() => Array.isArray(participantsData) ? participantsData : [], [participantsData]);

  const filteredParticipants = participants.filter(participant => {
    const matchesSearchTerm = (participant.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (participant.region || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (participant.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                               (participant.pronouns || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRoleFilter = roleFilter === 'all' || participant.role === roleFilter;
    const matchesRegionFilter = regionFilter === 'all' || participant.region === regionFilter;

    return matchesSearchTerm && matchesRoleFilter && matchesRegionFilter;
  });

  const onAddSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        instagram: normalizeInstagramInput(data.instagram)
      };
      await createParticipant.mutateAsync(payload);
      reset();
      setShowAddForm(false);
      setSuccess('Teilnehmer*innen erfolgreich hinzugefügt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error.message);
      console.error('Error adding participant:', error);
    }
  };

  useEffect(() => {
    if (editingParticipant) {
      resetEdit({
        name: editingParticipant.name || '',
        region: editingParticipant.region || '',
        role: editingParticipant.role || 'Teilnehmer*in',
        pronouns: editingParticipant.pronouns || '',
        instagram: editingParticipant.instagram || ''
      });
    }
  }, [editingParticipant, resetEdit]);

  const onEditSubmit = async (data) => {
    try {
      const payload = {
        ...editingParticipant,
        ...data,
        instagram: normalizeInstagramInput(data.instagram)
      };
      await updateParticipant.mutateAsync({ id: editingParticipant.id, ...payload });
      setEditingParticipant(null);
      setSuccess('Teilnehmer*innen erfolgreich aktualisiert!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error.message);
      console.error('Error updating participant:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du diese*n Teilnehmer*in löschen möchtest?')) {
      try {
        await deleteParticipant.mutateAsync(id);
        setSuccess('Teilnehmer*innen erfolgreich gelöscht!');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
        // Data will be automatically updated via WebSocket
      } catch (error) {
        // If backend returned 404 (already deleted), refresh silently and inform user
        const message = (error && error.message) ? String(error.message) : '';
        if (message.includes('404')) {
          await refresh();
          setSuccess('Eintrag war bereits entfernt. Liste wurde aktualisiert.');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setError(error.message);
        }
        console.error('Error deleting participant:', error);
      }
    }
  };

  // Bulk import handlers
  const handleDownloadTemplate = () => {
    downloadParticipantTemplate();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setImportError(`Datei ist zu groß. Maximum: ${maxSize / (1024 * 1024)}MB`);
        setTimeout(() => setImportError(null), 5000);
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'application/vnd.ms-excel.sheet.macroEnabled.12' // .xlsm
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        setImportError('Nur Excel-Dateien (.xlsx, .xls) sind erlaubt');
        setTimeout(() => setImportError(null), 5000);
        return;
      }
      
      handleBulkImport(file);
    }
  };

  const handleBulkImport = async (file) => {
    try {
      await performBulkImport(file, participants);
      setSuccess('Bulk-Import erfolgreich abgeschlossen!');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Bulk import error:', error);
      setImportError(`Bulk-Import fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
      setTimeout(() => setImportError(null), 5000);
    }
  };

  const handleCloseBulkImport = () => {
    setShowBulkImport(false);
    resetImport();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Teilnehmer*in': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Supporter*in': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'Crew': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRegionFlag = (region) => {
    switch (region) {
      case 'Baden-Württemberg': return '🇩🇪';
      case 'Bayern': return '🇩🇪';
      case 'Berlin': return '🇩🇪';
      case 'Brandenburg': return '🇩🇪';
      case 'Bremen': return '🇩🇪';
      case 'Hamburg': return '🇩🇪';
      case 'Hessen': return '🇩🇪';
      case 'Mecklenburg-Vorpommern': return '🇩🇪';
      case 'Niedersachsen': return '🇩🇪';
      case 'Nordrhein-Westfalen': return '🇩🇪';
      case 'Rheinland-Pfalz': return '🇩🇪';
      case 'Saarland': return '🇩🇪';
      case 'Sachsen': return '🇩🇪';
      case 'Sachsen-Anhalt': return '🇩🇪';
      case 'Schleswig-Holstein': return '🇩🇪';
      case 'Thüringen': return '🇩🇪';
      case 'Österreich': return '🇦🇹';
      case 'Schweiz': return '🇨🇭';
      case 'Belgien': return '🇧🇪';
      case 'Luxemburg': return '🇱🇺';
      case 'Südtirol': return '🇮🇹';
      default: return '🌎';
    }
  };

  if (loading) {
    return <LoadingSpinner size="xl" text="Teilnehmer*innen werden geladen..." />;
  }

  if (error) {
    return (
      <ErrorMessage 
        error={error} 
        onRetry={() => window.location.reload()} 
        className="max-w-4xl mx-auto"
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Error and Success Messages */}
      {error && (
        <ErrorMessage 
          error={error} 
          onRetry={() => window.location.reload()} 
          className="max-w-4xl mx-auto"
        />
      )}
      
      {success && (
        <SuccessMessage 
          message={success} 
          onDismiss={() => setSuccess(null)} 
          className="max-w-4xl mx-auto"
        />
      )}

      {importError && (
        <ErrorMessage 
          error={importError} 
          onRetry={() => setImportError(null)} 
          className="max-w-4xl mx-auto"
        />
      )}

      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Teilnehmer*innen verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Fügen Sie neue Teilnehmer*innen hinzu oder bearbeiten Sie bestehende</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              Vorlage herunterladen
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
            >
              Excel importieren
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {showAddForm ? 'Abbrechen' : 'Teilnehmer*innen hinzufügen'}
            </button>
          </div>
        </div>

        {/* Add Participant Form */}
        {showAddForm && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Neuen Teilnehmer*innen hinzufügen</h3>
            <form onSubmit={handleSubmit(onAddSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput label="" name="name" register={register} rules={{ required: 'Name ist erforderlich' }} errors={errors} placeholder="Name" />
                <TextInput label="" name="slug" register={register} rules={{ required: 'Slug ist erforderlich' }} errors={errors} placeholder="Slug" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectInput label="" name="role" register={register} rules={{ required: 'Rolle ist erforderlich' }} errors={errors} options={[{ value: '', label: 'Rolle auswählen' }, ...roles.map(r => ({ value: r, label: r }))]} />
                <SelectInput label="" name="region" register={register} rules={{ required: 'Region ist erforderlich' }} errors={errors} options={[{ value: '', label: 'Bundesland/Region auswählen' }, ...bundeslaender.map(b => ({ value: b, label: b }))]} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput label="" name="pronouns" register={register} errors={errors} placeholder="Pronomen (z.B. er/ihm, sie/ihr, they/them)" />
                <TextInput label="" name="instagram" register={register} errors={errors} placeholder="Instagram-Benutzername (optional, z. B. @john_doe oder john_doe)" />
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isSubmitting || createParticipant.isPending}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70"
                >
                  {isSubmitting || createParticipant.isPending ? 'Hinzufügen...' : 'Hinzufügen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Filter Controls */}
        <SearchFilters
          searchTerm={searchTerm}
          onSearchChange={(e) => setSearchTerm(e.target.value)}
          searchPlaceholder="Teilnehmer*innen suchen..."
          filters={[
            {
              value: roleFilter,
              onChange: (e) => setRoleFilter(e.target.value),
              options: roles.map(role => ({ value: role, label: role })),
              placeholder: 'Alle Rollen'
            },
            {
              value: regionFilter,
              onChange: (e) => setRegionFilter(e.target.value),
              options: bundeslaender.map(bundesland => ({ value: bundesland, label: bundesland })),
              placeholder: 'Alle Regionen'
            }
          ]}
          className="mb-6"
        />

        {/* Participants Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rolle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Region</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Pronomen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Instagram</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Aktionen</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredParticipants.map((participant) => (
                <tr key={participant.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                        {participant.name ? participant.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{participant.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(participant.role)}`}>
                      {participant.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div className="flex items-center space-x-2">
                      <span>{getRegionFlag(participant.region)}</span>
                      <span>{participant.region}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {participant.pronouns || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {participant.instagram ? (
                      <a
                        href={formatInstagramUrl(participant.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-600 hover:text-pink-700 transition-colors"
                      >
                        Instagram
                      </a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingParticipant(participant)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                      >
                        Bearbeiten
                      </button>
                      <button
                        onClick={() => handleDelete(participant.id)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        Löschen
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredParticipants.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Keine Teilnehmer*innen gefunden
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Versuchen Sie andere Suchkriterien oder fügen Sie einen neuen Teilnehmer*innen hinzu.
            </p>
          </div>
        )}
      </div>

      {/* Edit Participant Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Teilnehmer*innen bearbeiten</h3>
            <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Name"
                  aria-invalid={editErrors.name ? 'true' : 'false'}
                  {...registerEdit('name', { required: 'Name ist erforderlich' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{editErrors.name.message}</p>
                )}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Slug"
                  aria-invalid={editErrors.slug ? 'true' : 'false'}
                  {...registerEdit('slug', { required: 'Slug ist erforderlich' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
                {editErrors.slug && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{editErrors.slug.message}</p>
                )}
              </div>
              <div>
                <select
                  aria-invalid={editErrors.role ? 'true' : 'false'}
                  {...registerEdit('role', { required: 'Rolle ist erforderlich' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Rolle auswählen</option>
                  {roles.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                {editErrors.role && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{editErrors.role.message}</p>
                )}
              </div>
              <div>
                <select
                  aria-invalid={editErrors.region ? 'true' : 'false'}
                  {...registerEdit('region', { required: 'Region ist erforderlich' })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Bundesland/Region auswählen</option>
                  {bundeslaender.map(bundesland => (
                    <option key={bundesland} value={bundesland}>{bundesland}</option>
                  ))}
                </select>
                {editErrors.region && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">{editErrors.region.message}</p>
                )}
              </div>
              <input
                type="text"
                placeholder="Pronomen"
                {...registerEdit('pronouns')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <input
                type="text"
                placeholder="Instagram-Benutzername (z.B. john_doe oder @john_doe)"
                {...registerEdit('instagram')}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={isEditSubmitting || updateParticipant.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70"
                >
                  {isEditSubmitting || updateParticipant.isPending ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Excel-Import für Teilnehmer*innen</h3>
              <button
                onClick={handleCloseBulkImport}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* File Upload Area */}
            {!importState.parsedData && (
              <div className="mb-6">
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                  <div className="mb-4">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Ziehen Sie eine Excel-Datei hierher oder klicken Sie zum Auswählen
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Datei auswählen
                  </button>
                </div>
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
              <div className="mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-blue-700 dark:text-blue-300 font-medium">{getImportStatus()}</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Bitte warten Sie, während die Datei verarbeitet wird...
                  </p>
                </div>
              </div>
            )}

            {/* Validation Results */}
            {validationResults && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Validierungsergebnisse</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{validationResults.totalRows}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Gesamtzeilen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{validationResults.validRows}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Gültige Zeilen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{validationResults.errorCount}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Fehler</div>
                    </div>
                  </div>
                  
                  {validationResults.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-semibold text-red-600 mb-2">Validierungsfehler:</h5>
                      <div className="max-h-40 overflow-y-auto">
                        {validationResults.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 mb-1">
                            Zeile {error.row}: {error.field} - {error.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResults && (
              <div className="mb-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">Import-Ergebnisse</h4>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{importResults.importedCount}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Importiert</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">{importResults.duplicateCount}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Duplikate übersprungen</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">Fehler</div>
                    </div>
                  </div>
                  
                  {importResults.duplicates.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-semibold text-yellow-600 mb-2">Übersprungene Duplikate:</h5>
                      <div className="max-h-40 overflow-y-auto">
                        {importResults.duplicates.map((duplicate, index) => (
                          <div key={index} className="text-sm text-yellow-600 mb-1">
                            {duplicate.name} ({duplicate.region})
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {importResults.errors.length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-semibold text-red-600 mb-2">Import-Fehler:</h5>
                      <div className="max-h-40 overflow-y-auto">
                        {importResults.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 mb-1">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              {importResults && (
                <button
                  onClick={handleCloseBulkImport}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Fertig
                </button>
              )}
              <button
                onClick={handleCloseBulkImport}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {importResults ? 'Schließen' : 'Abbrechen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
