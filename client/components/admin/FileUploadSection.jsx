import React, { useState } from 'react';
import { useFileUpload } from '../../hooks/useFileUpload.js';
import { handleLinkClick } from '../../utils/linkUtils.js';

/**
 * Unified file upload component
 * Handles both image and PDF uploads with consistent UI and behavior
 */
function FileUploadSection({
  type = 'universal', // 'universal' for both image and PDF
  currentUrl,
  currentType, // 'image' or 'pdf'
  description,
  onUpload,
  onRemove,
  onDescriptionChange,
  disabled = false,
  className = '',
  editingPageId = null
}) {
  const { uploading, error, uploadFile, clearError } = useFileUpload();
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [localError, setLocalError] = useState(null);

  const config = {
    universal: {
      label: 'Datei hochladen (Bild oder PDF)',
      accept: '.jpg,.jpeg,.png,.gif,.webp,.pdf',
      maxSize: 15 * 1024 * 1024, // 15MB (max for PDFs)
      allowedTypes: ['image/*', 'application/pdf'],
      fieldName: 'file',
      endpoint: `/api/info-pages/${editingPageId}/upload-file`
    },
    image: {
      label: 'Bild hochladen',
      accept: '.jpg,.jpeg,.png,.gif,.webp',
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/*'],
      fieldName: 'image',
      endpoint: `/api/info-pages/${editingPageId}/upload-image`
    },
    pdf: {
      label: 'PDF hochladen',
      accept: '.pdf',
      maxSize: 15 * 1024 * 1024, // 15MB
      allowedTypes: ['application/pdf'],
      fieldName: 'pdf',
      endpoint: `/api/info-pages/${editingPageId}/upload-pdf`
    }
  };

  const currentConfig = config[type];

  const handleFileChange = async (e) => {
    console.log('File input clicked, disabled:', disabled, 'uploading:', uploading, 'editingPageId:', editingPageId);
    const file = e.target.files[0];
    if (!file) return;

    // Don't allow upload if no page ID (creating new page)
    if (!editingPageId) {
      setLocalError('Speichere die Seite zuerst, um Dateien hochzuladen');
      return;
    }

    clearError();
    setLocalError(null);

    try {
      const result = await uploadFile({
        file,
        endpoint: currentConfig.endpoint,
        maxSize: currentConfig.maxSize,
        allowedTypes: currentConfig.allowedTypes,
        fieldName: currentConfig.fieldName,
        additionalData: type === 'universal' ? { description: description || '' } : {},
        onSuccess: (result) => {
          if (type === 'universal') {
            const filePath = result.file?.filePath;
            const fileType = result.file?.fileType;
            onUpload?.(filePath, fileType);
          } else {
            const filePath = result[type === 'image' ? 'image' : 'pdf']?.filePath;
            onUpload?.(filePath);
          }
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 3000);
        }
      });
    } catch (err) {
      // Error already handled by hook
    }
  };

  const handleRemove = () => {
    onRemove?.();
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {currentConfig.label}
      </label>
      
      <input
        type="file"
        accept={currentConfig.accept}
        onChange={handleFileChange}
        onClick={(e) => {
          console.log('File input clicked', { 
            disabled, 
            uploading, 
            editingPageId,
            target: e.target,
            currentTarget: e.currentTarget 
          });
          if (disabled) {
            e.preventDefault();
            console.warn('File input is disabled');
          }
        }}
        disabled={disabled || uploading}
        aria-label={currentConfig.label}
        aria-describedby="file-upload-help"
        aria-invalid={error || localError ? 'true' : 'false'}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <p id="file-upload-help" className="sr-only">
        {disabled ? 'Speichere die Seite zuerst, um Dateien hochzuladen' : 'Wähle eine Datei zum Hochladen'}
      </p>

      {/* Custom description input for universal upload */}
      {type === 'universal' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Beschreibung (optional)
          </label>
          <input
            type="text"
            value={description || ''}
            onChange={(e) => onDescriptionChange?.(e.target.value)}
            placeholder="z.B. 'Teilnahmebedingungen' oder 'Anfahrtsskizze'"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      )}

      {uploading && (
        <p className="text-sm text-blue-600 dark:text-blue-400" role="status" aria-live="polite">
          Wird hochgeladen...
        </p>
      )}

      {uploadSuccess && (
        <p className="text-sm text-green-600 dark:text-green-400" role="status" aria-live="polite">✓ Erfolgreich hochgeladen</p>
      )}

      {(error || localError) && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg" role="alert" aria-live="assertive">
          <p className="text-sm text-red-800 dark:text-red-200">{error || localError}</p>
          <button
            onClick={() => {
              clearError();
              setLocalError(null);
            }}
            className="mt-1 text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
          >
            Fehler verwerfen
          </button>
        </div>
      )}

      {currentUrl && (
        <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Aktuelle {type === 'universal' ? 'Datei' : (type === 'image' ? 'Bild' : 'PDF')}:
          </p>
          
          {type === 'universal' ? (
            <div className="space-y-2">
              {currentType === 'image' ? (
                <div className="flex items-center space-x-3">
                  <img 
                    src={currentUrl} 
                    alt="Current file" 
                    className="w-16 h-16 object-cover rounded"
                  />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bild</p>
                    <a 
                      href={currentUrl} 
                      onClick={(e) => {
                        const imageLink = {
                          url: currentUrl,
                          title: 'Bild',
                          is_external: true
                        };
                        handleLinkClick(imageLink, e);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Anzeigen
                    </a>
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">📄</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">PDF-Datei</span>
                  <a 
                    href={currentUrl} 
                    onClick={(e) => {
                      const pdfLink = {
                        url: currentUrl,
                        title: 'PDF-Datei',
                        is_external: true
                      };
                      handleLinkClick(pdfLink, e);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Anzeigen
                  </a>
                </div>
              )}
              {description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  <strong>Beschreibung:</strong> {description}
                </p>
              )}
            </div>
          ) : type === 'image' ? (
            <div className="flex items-center space-x-3">
              <img 
                src={currentUrl} 
                alt="Current file" 
                className="w-16 h-16 object-cover rounded"
              />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bild</p>
                <a 
                  href={currentUrl} 
                  onClick={(e) => {
                    const imageLink = {
                      url: currentUrl,
                      title: 'Bild',
                      is_external: true
                    };
                    handleLinkClick(imageLink, e);
                  }}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Anzeigen
                </a>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-2xl">📄</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">PDF-Datei</span>
              <a 
                href={currentUrl} 
                onClick={(e) => {
                  const pdfLink = {
                    url: currentUrl,
                    title: 'PDF-Datei',
                    is_external: true
                  };
                  handleLinkClick(pdfLink, e);
                }}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Anzeigen
              </a>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleRemove}
            className="mt-2 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
          >
            {type === 'universal' ? 'Datei' : (type === 'image' ? 'Bild' : 'PDF')} entfernen
          </button>
        </div>
      )}
    </div>
  );
}

export default FileUploadSection;
