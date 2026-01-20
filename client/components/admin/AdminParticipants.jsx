import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParticipants, useCreateParticipant, useUpdateParticipant, useDeleteParticipant, useBulkImportParticipants } from '../../hooks/index.js';
import LoadingSpinner from '../LoadingSpinner';
import { ErrorMessage, SuccessMessage } from '../StatusMessages.jsx';
import PaginationControls from '../PaginationControls.jsx';
import ConsolidatedAdminTable from './ConsolidatedAdminTable.jsx';
import { useForm } from 'react-hook-form';
import TextInput from '../forms/TextInput.jsx';
import SelectInput from '../forms/SelectInput.jsx';
import SearchFilters from '../forms/SearchFilters.jsx';
import { formatInstagramUrl, normalizeInstagramInput, extractInstagramUsername } from '../../utils/instagramUtils.js';
import { handleLinkClick } from '../../utils/linkUtils.js';
import { generateSlug, generateUniqueSlug } from '../../utils/slugUtils.js';
import { getRegionFlag } from '../../utils/detailViewUtils.js';
import { downloadParticipantTemplate, downloadParticipantTemplateCSV, parseParticipantFile, checkForDuplicates } from '../../services/excelService.js';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ADMIN_PARTICIPANTS_LIMIT } from '../../config/api.js';
import { ALLOWED_REGIONS } from '../../../shared/constants/regions.js';
import { PARTICIPANT_ROLES } from '../../../shared/constants/PARTICIPANT_ROLES.js';

export default function AdminParticipants() {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  
  // Load all participants for search (no pagination on API call)
  const { data: allParticipantsResponse, isLoading: loading, error } = useParticipants({ limit: ADMIN_PARTICIPANTS_LIMIT, offset: 0 }, true); // isAdmin = true
  const createParticipant = useCreateParticipant();
  const updateParticipant = useUpdateParticipant();
  const deleteParticipant = useDeleteParticipant();
  const bulkImport = useBulkImportParticipants();
  
  // Initialize real-time updates
  const [editingParticipant, setEditingParticipant] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [regionFilter, setRegionFilter] = useState('all');
  const [success, setSuccess] = useState(null);
  const [importError, setImportError] = useState(null);
  const [formError, setFormError] = useState(null);
  const fileInputRef = useRef(null);
  
  // Import state management
  const [importState, setImportState] = useState({
    parsedData: null,
    validationResults: null,
    importResults: null,
    isProcessing: false,
    step: 'upload' // 'upload' | 'validation' | 'importing' | 'results'
  });
  
  // Bulk import functionality
  // Bulk import functionality removed as part of simplification

  const schema = z.object({
    name: z.string().min(1, 'Name ist erforderlich'),
    region: z.string().optional(),
    role: z.string().min(1, 'Rolle ist erforderlich'),
    pronouns: z.string().optional(),
    instagram: z.string().optional()
  });

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      region: '',
      role: 'Wettbewerb-Teilnehmer*in',
      pronouns: '',
      instagram: ''
    }
  });


  // RHF for edit modal
  const editForm = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      slug: '',
      region: '',
      role: 'Wettbewerb-Teilnehmer*in',
      pronouns: '',
      instagram: ''
    }
  });
  const { register: registerEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: { errors: editErrors, isSubmitting: isEditSubmitting } } = editForm;

  // Pronouns is now a free-form text field

  // Ensure admin room is joined for targeted updates
  useEffect(() => {
    const ensureAdminRoom = async () => {
      try {
        // Real-time updates handled by polling
      } catch (e) {
        // Admin room join failed - handled silently
      }
    };
    ensureAdminRoom();
  }, []);

  // Extract all participants data
  const allParticipants = useMemo(() => {
    if (allParticipantsResponse?.data) {
      return Array.isArray(allParticipantsResponse.data) ? allParticipantsResponse.data : [];
    }
    return Array.isArray(allParticipantsResponse) ? allParticipantsResponse : [];
  }, [allParticipantsResponse]);

  // Filter and sort all participants based on search and filters
  const filteredParticipants = useMemo(() => {
    const filtered = allParticipants.filter(participant => {
      const matchesSearchTerm = (participant.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (participant.region || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (participant.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                                 (participant.pronouns || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchesRoleFilter = roleFilter === 'all' || participant.role === roleFilter;
      const matchesRegionFilter = regionFilter === 'all' || (regionFilter === 'none' ? !participant.region : participant.region === regionFilter);

      return matchesSearchTerm && matchesRoleFilter && matchesRegionFilter;
    });

    // Sort by first character of name alphabetically
    return filtered.sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [allParticipants, searchTerm, roleFilter, regionFilter]);

  // Paginate the filtered results
  const paginatedParticipants = useMemo(() => {
    if (pageSize === 'all') {
      return filteredParticipants;
    }
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredParticipants.slice(startIndex, endIndex);
  }, [filteredParticipants, currentPage, pageSize]);

  // Pagination info based on filtered results
  const paginationInfo = useMemo(() => {
    const totalItems = filteredParticipants.length;
    const totalPages = pageSize === 'all' ? 1 : Math.ceil(totalItems / pageSize);
    
    return {
      totalItems,
      totalPages,
      currentPage
    };
  }, [filteredParticipants.length, pageSize, currentPage]);

  const onAddSubmit = async (data) => {
    try {
      // Get existing slugs for uniqueness check
      const existingSlugs = allParticipants.map(p => p.slug);
      
      const payload = {
        ...data,
        slug: generateUniqueSlug(data.name, existingSlugs), // UNIQUE SLUG
        instagram: data.instagram ? (() => {
          try {
            const normalized = normalizeInstagramInput(data.instagram);
            return extractInstagramUsername(normalized) || data.instagram.replace(/^@/, '');
          } catch (error) {
            // Instagram normalization failed - using original value
            return data.instagram.replace(/^@/, '');
          }
        })() : ''
      };
      
      await createParticipant.mutateAsync(payload);
      reset();
      setShowAddForm(false);
      setSuccess('Teilnehmer*innen erfolgreich hinzugefügt!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setFormError(error.message);
      // Error adding participant - handled by error state
    }
  };

  useEffect(() => {
    if (editingParticipant) {
      resetEdit({
        name: editingParticipant.name || '',
        slug: editingParticipant.slug || '',
        region: editingParticipant.region || '',
        role: editingParticipant.role || 'Wettbewerb-Teilnehmer*in',
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
        instagram: data.instagram ? (() => {
          try {
            const normalized = normalizeInstagramInput(data.instagram);
            return extractInstagramUsername(normalized) || data.instagram.replace(/^@/, '');
          } catch (error) {
            // Instagram normalization failed - using original value
            return data.instagram.replace(/^@/, '');
          }
        })() : ''
      };
      await updateParticipant.mutateAsync({ id: editingParticipant.id, ...payload });
      setEditingParticipant(null);
      setSuccess('Teilnehmer*innen erfolgreich aktualisiert!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setFormError(error.message);
      // Error updating participant - handled by error state
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Bist du sicher, dass du diese*n Teilnehmer*in löschen möchtest?')) {
      try {
        await deleteParticipant.mutateAsync(id);
        setSuccess('Teilnehmer*innen erfolgreich gelöscht!');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
        // Data will be automatically updated via polling
      } catch (error) {
        // If backend returned 404 (already deleted), refresh silently and inform user
        const message = (error && error.message) ? String(error.message) : '';
        if (message.includes('404')) {
          window.location.reload();
          setSuccess('Eintrag war bereits entfernt. Liste wurde aktualisiert.');
          setTimeout(() => setSuccess(null), 3000);
        } else {
          setFormError(error.message);
        }
        // Error deleting participant - handled by error state
      }
    }
  };

  // Bulk import handlers
  const handleDownloadTemplate = () => {
    downloadParticipantTemplate();
  };

  const handleDownloadTemplateCSV = () => {
    downloadParticipantTemplateCSV();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Prevent multiple file selections
    if (importState.isProcessing) {
      setImportError('Bitte warten Sie, bis der aktuelle Vorgang abgeschlossen ist');
      setTimeout(() => setImportError(null), 3000);
      return;
    }
    
    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setImportError(`Datei ist zu groß. Maximum: ${maxSize / (1024 * 1024)}MB`);
      setTimeout(() => setImportError(null), 5000);
      return;
    }
    
    // Validate file type
    const fileName = file.name.toLowerCase();
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCSV = fileName.endsWith('.csv');
    
    if (!isExcel && !isCSV) {
      setImportError('Nur Excel (.xlsx, .xls) und CSV (.csv) Dateien sind erlaubt');
      setTimeout(() => setImportError(null), 5000);
      return;
    }
    
    handleFileValidation(file);
  };

  const handleFileValidation = async (file) => {
    try {
      setImportState(prev => ({ ...prev, isProcessing: true, step: 'validation' }));
      
      // Parse file
      const parsed = await parseParticipantFile(file);
      
      // Check duplicates client-side (for preview only)
      const { uniqueParticipants, duplicates } = checkForDuplicates(
        parsed.validRows,
        allParticipants
      );
      
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        step: 'validation',
        parsedData: parsed,
        validationResults: {
          totalRows: parsed.totalRows,
          validRows: uniqueParticipants.length,
          errorCount: parsed.errors.length,
          duplicateCount: duplicates.length,
          errors: parsed.errors,
          duplicates: duplicates
        }
      }));
      
      if (uniqueParticipants.length === 0) {
        setImportError('Keine gültigen Zeilen zum Importieren gefunden');
      }
      
    } catch (error) {
      // File validation error - handled by error state
      setImportError(`Validierung fehlgeschlagen: ${error.message}`);
      setImportState(prev => ({ ...prev, isProcessing: false, step: 'upload' }));
    }
  };

  const handleConfirmImport = async () => {
    try {
      setImportState(prev => ({ ...prev, isProcessing: true, step: 'importing' }));
      
      // Get unique participants from validation
      const { uniqueParticipants } = checkForDuplicates(
        importState.parsedData.validRows,
        allParticipants
      );
      
      // Import to server
      const result = await bulkImport.mutateAsync(uniqueParticipants);
      
      setImportState(prev => ({
        ...prev,
        isProcessing: false,
        step: 'results',
        importResults: {
          importedCount: result.data.importedCount,
          duplicateCount: result.data.duplicateCount,
          errorCount: result.data.errorCount,
          duplicates: result.data.duplicates,
          errors: result.data.errors
        }
      }));
      
      if (result.data.importedCount > 0) {
        setSuccess(`${result.data.importedCount} Teilnehmer erfolgreich importiert!`);
        setTimeout(() => setSuccess(null), 5000);
      }
      
    } catch (error) {
      // Import error - handled by error state
      setImportError(`Import fehlgeschlagen: ${error.message}`);
      setImportState(prev => ({ ...prev, isProcessing: false, step: 'validation' }));
    }
  };

  const resetImport = () => {
    setImportState({
      parsedData: null,
      validationResults: null,
      importResults: null,
      isProcessing: false,
      step: 'upload'
    });
    setImportError(null);
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
      case 'Wettbewerb-Teilnehmer*in': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'Supporter*in': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'SLAM25-Team': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  // Reset to first page when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, regionFilter]);


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
      {formError && (
        <ErrorMessage 
          error={formError} 
          onRetry={() => setFormError(null)} 
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
      <div className="card-base p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-4 sm:space-y-0">
          <div>
            <h2 className="heading-primary mb-2">Teilnehmer*innen verwalten</h2>
            <p className="text-gray-600 dark:text-gray-400">Fügen Sie neue Teilnehmer*innen hinzu oder bearbeiten Sie bestehende</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowBulkImport(true)}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 touch-manipulation active:scale-95"
            >
              Datei importieren
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="w-full sm:w-auto min-h-[44px] btn-primary touch-manipulation active:scale-95"
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
              <div className="grid grid-cols-1 gap-4">
                <TextInput label="" name="name" register={register} rules={{ required: 'Name ist erforderlich' }} errors={errors} placeholder="Name" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectInput label="" name="role" register={register} rules={{ required: 'Rolle ist erforderlich' }} errors={errors} options={[{ value: '', label: 'Rolle auswählen' }, ...PARTICIPANT_ROLES.map(r => ({ value: r, label: r }))]} />
                <SelectInput label="" name="region" register={register} errors={errors} options={[{ value: '', label: 'Bundesland/Region auswählen' }, ...ALLOWED_REGIONS.map(b => ({ value: b, label: b }))]} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput label="" name="pronouns" register={register} errors={errors} placeholder="Pronomen (z.B. er/ihm, sie/ihr, they/them)" />
                <TextInput label="" name="instagram" register={register} errors={errors} placeholder="Instagram-Benutzername (optional, z. B. @john_doe oder john_doe)" />
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || createParticipant.isPending}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-70 touch-manipulation active:scale-95"
                >
                  {isSubmitting || createParticipant.isPending ? 'Hinzufügen...' : 'Hinzufügen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="w-full sm:w-auto min-h-[44px] px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 touch-manipulation active:scale-95"
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
              options: PARTICIPANT_ROLES.map(role => ({ value: role, label: role })),
              placeholder: 'Alle Rollen'
            },
            {
              value: regionFilter,
              onChange: (e) => setRegionFilter(e.target.value),
              options: [
                { value: 'none', label: 'Keine Region' },
                ...ALLOWED_REGIONS.map(bundesland => ({ value: bundesland, label: bundesland }))
              ],
              placeholder: 'Alle Regionen'
            }
          ]}
          className="mb-6"
        />

        {/* Participants Table */}
        <ConsolidatedAdminTable
          columns={[
            {
              key: 'name',
              label: 'Name',
              render: (value) => (
                <div className="text-sm font-medium text-gray-900 dark:text-white">{value}</div>
              )
            },
            {
              key: 'role',
              label: 'Rolle',
              render: (value) => (
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(value)}`}>
                  {value}
                </span>
              )
            },
            {
              key: 'region',
              label: 'Region',
              render: (value) => (
                value ? (
                  <div className="flex items-center space-x-2">
                    <span>{getRegionFlag(value)}</span>
                    <span>{value}</span>
                  </div>
                ) : (
                  <span className="text-gray-400">-</span>
                )
              )
            },
            {
              key: 'pronouns',
              label: 'Pronomen',
              render: (value) => value || '-'
            },
            {
              key: 'instagram',
              label: 'Instagram',
              render: (value) => (
                value ? (
                  <a
                    href={formatInstagramUrl(value)}
                    onClick={(e) => {
                      const instagramLink = {
                        url: formatInstagramUrl(value),
                        title: `Instagram Profil von ${value}`,
                        is_external: true
                      };
                      handleLinkClick(instagramLink, e);
                    }}
                    className="text-pink-600 hover:text-pink-700 transition-colors"
                  >
                    Instagram
                  </a>
                ) : '-'
              )
            }
          ]}
          data={paginatedParticipants}
          actions={(participant) => (
            <>
              <button
                onClick={() => setEditingParticipant(participant)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                Bearbeiten
              </button>
              <button
                onClick={() => handleDelete(participant.id)}
                className="min-h-[44px] min-w-[44px] px-4 py-2 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 transition-colors touch-manipulation active:scale-95 focus-visible:ring-2 focus-visible:ring-red-500 rounded"
              >
                Löschen
              </button>
            </>
          )}
        />

        {paginatedParticipants.length === 0 && (
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

        {/* Pagination Controls */}
        {paginatedParticipants.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <PaginationControls
              currentPage={paginationInfo.currentPage}
              totalPages={paginationInfo.totalPages}
              pageSize={pageSize}
              totalItems={paginationInfo.totalItems}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              pageSizeOptions={[12, 24, 48, 96, 240]}
              showAllOption={true}
            />
          </div>
        )}
      </div>

      {/* Edit Participant Modal */}
      {editingParticipant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
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
                  {PARTICIPANT_ROLES.map(role => (
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
                  {...registerEdit('region')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Bundesland/Region auswählen</option>
                  {ALLOWED_REGIONS.map(bundesland => (
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
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={isEditSubmitting || updateParticipant.isPending}
                  className="w-full sm:flex-1 min-h-[44px] btn-primary disabled:opacity-70 touch-manipulation active:scale-95"
                >
                  {isEditSubmitting || updateParticipant.isPending ? 'Speichern...' : 'Speichern'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingParticipant(null)}
                  className="w-full sm:flex-1 min-h-[44px] px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 touch-manipulation active:scale-95"
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
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Teilnehmer importieren
              </h3>
              <button
                onClick={handleCloseBulkImport}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Upload State */}
            {importState.step === 'upload' && (
              <div>
                {/* Template Download Buttons */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    1. Vorlage herunterladen
                  </h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleDownloadTemplate}
                      className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 touch-manipulation active:scale-95"
                    >
                      Excel Vorlage (.xlsx)
                    </button>
                    <button
                      onClick={handleDownloadTemplateCSV}
                      className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 touch-manipulation active:scale-95"
                    >
                      CSV Vorlage (.csv)
                    </button>
                  </div>
                </div>

                {/* File Upload */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                    2. Ausgefüllte Datei hochladen
                  </h4>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Excel- oder CSV-Datei auswählen
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation active:scale-95"
                    >
                      Datei auswählen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Validation State */}
            {importState.step === 'validation' && importState.validationResults && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  Validierungsergebnisse
                </h4>
                
                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {importState.validationResults.totalRows}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Zeilen gesamt</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importState.validationResults.validRows}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Gültig</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {importState.validationResults.duplicateCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Duplikate</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importState.validationResults.errorCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Fehler</div>
                  </div>
                </div>

                {/* Errors */}
                {importState.validationResults.errors.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-semibold text-red-600 mb-2">Validierungsfehler:</h5>
                    <div className="max-h-40 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded p-3">
                      {importState.validationResults.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 dark:text-red-400 mb-1">
                          Zeile {error.row}: {error.field} - {error.message}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Duplicates */}
                {importState.validationResults.duplicates.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-semibold text-yellow-600 mb-2">
                      Duplikate (werden übersprungen):
                    </h5>
                    <div className="max-h-40 overflow-y-auto bg-yellow-50 dark:bg-yellow-900/20 rounded p-3">
                      {importState.validationResults.duplicates.map((dup, index) => (
                        <div key={index} className="text-sm text-yellow-600 dark:text-yellow-400 mb-1">
                          {dup.name} ({dup.region})
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6">
                  <button
                    onClick={resetImport}
                    className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 touch-manipulation active:scale-95"
                  >
                    Abbrechen
                  </button>
                  {importState.validationResults.validRows > 0 && (
                    <button
                      onClick={handleConfirmImport}
                      disabled={bulkImport.isPending}
                      className="w-full sm:w-auto min-h-[44px] px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 touch-manipulation active:scale-95"
                    >
                      {importState.validationResults.validRows} Teilnehmer importieren
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Importing State */}
            {importState.step === 'importing' && (
              <div className="text-center py-8">
                <LoadingSpinner size="lg" />
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  Teilnehmer werden importiert...
                </p>
              </div>
            )}

            {/* Results State */}
            {importState.step === 'results' && importState.importResults && (
              <div>
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">
                  Import abgeschlossen
                </h4>
                
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {importState.importResults.importedCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Importiert</div>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {importState.importResults.duplicateCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Übersprungen</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {importState.importResults.errorCount}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Fehler</div>
                  </div>
                </div>

                {/* Server-side errors */}
                {importState.importResults.errors?.length > 0 && (
                  <div className="mb-4">
                    <h5 className="font-semibold text-red-600 mb-2">Import-Fehler:</h5>
                    <div className="max-h-40 overflow-y-auto bg-red-50 dark:bg-red-900/20 rounded p-3">
                      {importState.importResults.errors.map((error, index) => (
                        <div key={index} className="text-sm text-red-600 dark:text-red-400 mb-2">
                          <strong>Zeile {error.row} ({error.name}):</strong>
                          <ul className="ml-4 list-disc">
                            {error.errors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-end">
                  <button
                    onClick={handleCloseBulkImport}
                    className="min-h-[44px] px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 touch-manipulation active:scale-95"
                  >
                    Fertig
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
