import React, { useState } from 'react';
import { Controller } from 'react-hook-form';
import MarkdownRenderer from '../shared/MarkdownRenderer.jsx';

/**
 * MarkdownTextarea - Textarea with live markdown preview
 * Extends the existing TextareaInput pattern for consistency
 */
export default function MarkdownTextarea({
  label,
  name,
  register,
  rules,
  placeholder = '',
  disabled = false,
  errors,
  className = '',
  control,
  defaultValue,
  required = false,
  rows = 4,
  ariaLabel,
  showPreview = true,
  helpText
}) {
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const [previewContent, setPreviewContent] = useState(defaultValue || '');
  const hasError = errors && errors[name];

  // Handle content changes for preview
  const handleContentChange = (value) => {
    setPreviewContent(value);
  };

  // If control is provided, use Controller for better RHF integration
  if (control) {
    return (
      <div className={`space-y-1 ${className}`}>
        {label && (
          <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <Controller
          name={name}
          control={control}
          defaultValue={defaultValue}
          rules={rules}
          render={({ field }) => (
            <>
              <div className="space-y-3">
                <textarea
                  {...field}
                  id={name}
                  rows={rows}
                  placeholder={placeholder}
                  disabled={disabled}
                  aria-label={ariaLabel || label}
                  aria-invalid={hasError ? 'true' : 'false'}
                  onChange={(e) => {
                    field.onChange(e);
                    handleContentChange(e.target.value);
                  }}
                  className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-vertical font-mono text-sm ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`}
                />
                
                {showPreview && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                      >
                        {showPreviewPanel ? '▼' : '▶'} Vorschau {showPreviewPanel ? 'ausblenden' : 'anzeigen'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const markdownHelp = document.getElementById(`markdown-help-${name}`);
                          if (markdownHelp) {
                            markdownHelp.classList.toggle('hidden');
                          }
                        }}
                        className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Markdown-Hilfe
                      </button>
                    </div>
                    
                    {showPreviewPanel && (
                      <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                          Vorschau:
                        </div>
                        <MarkdownRenderer content={previewContent} />
                      </div>
                    )}
                    
                    <div id={`markdown-help-${name}`} className="hidden text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded border">
                      <div className="font-medium mb-2">Markdown-Syntax:</div>
                      <div className="space-y-1">
                        <div><strong>**fett**</strong> → <strong>fett</strong></div>
                        <div><em>*kursiv*</em> → <em>kursiv</em></div>
                        <div><code>`code`</code> → <code>code</code></div>
                        <div># Überschrift 1</div>
                        <div>## Überschrift 2</div>
                        <div>- Liste</div>
                        <div>[Link](https://example.com)</div>
                        <div>URLs werden automatisch verlinkt</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {hasError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                  {errors[name].message}
                </p>
              )}
              
              {helpText && !hasError && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {helpText}
                </p>
              )}
            </>
          )}
        />
      </div>
    );
  }
  
  // Fallback to register-based approach
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="space-y-3">
        <textarea
          id={name}
          name={name}
          rows={rows}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={ariaLabel || label}
          aria-invalid={hasError ? 'true' : 'false'}
          {...(register ? register(name, rules) : {})}
          onChange={(e) => {
            if (register) {
              register(name, rules).onChange(e);
            }
            handleContentChange(e.target.value);
          }}
          className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-vertical font-mono text-sm ${hasError ? 'border-red-500 focus:ring-red-500' : ''}`}
        />
        
        {showPreview && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPreviewPanel(!showPreviewPanel)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
              >
                {showPreviewPanel ? '▼' : '▶'} Vorschau {showPreviewPanel ? 'ausblenden' : 'anzeigen'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const markdownHelp = document.getElementById(`markdown-help-${name}`);
                  if (markdownHelp) {
                    markdownHelp.classList.toggle('hidden');
                  }
                }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Markdown-Hilfe
              </button>
            </div>
            
            {showPreviewPanel && (
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
                  Vorschau:
                </div>
                <MarkdownRenderer content={previewContent} />
              </div>
            )}
            
            <div id={`markdown-help-${name}`} className="hidden text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded border">
              <div className="font-medium mb-2">Markdown-Syntax:</div>
              <div className="space-y-1">
                <div><strong>**fett**</strong> → <strong>fett</strong></div>
                <div><em>*kursiv*</em> → <em>kursiv</em></div>
                <div><code>`code`</code> → <code>code</code></div>
                <div># Überschrift 1</div>
                <div>## Überschrift 2</div>
                <div>- Liste</div>
                <div>[Link](https://example.com)</div>
                <div>URLs werden automatisch verlinkt</div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {hasError && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
          {errors[name].message}
        </p>
      )}
      
      {helpText && !hasError && (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {helpText}
        </p>
      )}
    </div>
  );
}
