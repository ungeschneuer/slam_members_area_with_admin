# Dark Mode Design System

## Overview

This design system provides standardized utility classes for consistent dark mode styling across the SLAM25 Poetry Slam members area. It reduces repetition and improves maintainability by centralizing common styling patterns.

## Component Utilities

### Cards

#### `.card-base`
Standard card with border and shadow for light/dark mode.

```jsx
<div className="card-base p-6">
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</div>
```

#### `.card-elevated`
Card with hover effect for interactive elements.

```jsx
<div className="card-elevated p-6 cursor-pointer">
  <h3>Interactive Card</h3>
  <p>Hover for shadow effect</p>
</div>
```

### Forms

#### `.input-base`
Text inputs with consistent dark mode styling.

```jsx
<input 
  type="text" 
  className="input-base" 
  placeholder="Enter text..."
/>
```

#### `.select-base`
Select dropdowns with consistent styling.

```jsx
<select className="select-base">
  <option>Choose option</option>
</select>
```

#### `.textarea-base`
Textareas with consistent styling.

```jsx
<textarea 
  className="textarea-base" 
  rows="4"
  placeholder="Enter description..."
/>
```

#### `.label-base`
Form labels with proper contrast.

```jsx
<label className="label-base">
  Field Label
</label>
```

### Buttons

#### `.btn-primary`
Primary action buttons (blue).

```jsx
<button className="btn-primary">
  Save Changes
</button>
```

#### `.btn-secondary`
Secondary action buttons (gray).

```jsx
<button className="btn-secondary">
  Cancel
</button>
```

#### `.btn-danger`
Destructive action buttons (red).

```jsx
<button className="btn-danger">
  Delete Item
</button>
```

### Tables

#### Complete Table Structure
```jsx
<div className="card-base overflow-hidden">
  <table className="table-base">
    <thead className="table-header">
      <tr>
        <th className="table-header-cell">Name</th>
        <th className="table-header-cell">Status</th>
        <th className="table-header-cell">Actions</th>
      </tr>
    </thead>
    <tbody className="table-body">
      <tr className="table-row">
        <td className="table-cell">John Doe</td>
        <td className="table-cell">Active</td>
        <td className="table-cell">
          <button className="btn-secondary text-xs">Edit</button>
        </td>
      </tr>
    </tbody>
  </table>
</div>
```

### Typography

#### `.heading-primary`
Main page headings (H1 level).

```jsx
<h1 className="heading-primary">
  Page Title
</h1>
```

#### `.heading-secondary`
Section headings (H2 level).

```jsx
<h2 className="heading-secondary">
  Section Title
</h2>
```

#### `.heading-tertiary`
Subsection headings (H3 level).

```jsx
<h3 className="heading-tertiary">
  Subsection Title
</h3>
```

#### `.text-body`
Body text with proper contrast.

```jsx
<p className="text-body">
  This is body text that adapts to light/dark mode.
</p>
```

#### `.text-muted`
Secondary/muted text.

```jsx
<p className="text-muted">
  This is less prominent text.
</p>
```

### Modals

#### Complete Modal Structure
```jsx
<div className="modal-overlay">
  <div className="modal-content p-6 max-w-md w-full">
    <h2 className="heading-secondary mb-4">Modal Title</h2>
    <p className="text-body mb-6">Modal content goes here.</p>
    <div className="flex space-x-3">
      <button className="btn-primary">Confirm</button>
      <button className="btn-secondary">Cancel</button>
    </div>
  </div>
</div>
```

### Badges

#### Status Badges
```jsx
<span className="badge-success">Active</span>
<span className="badge-warning">Pending</span>
<span className="badge-danger">Error</span>
<span className="badge-primary">Info</span>
```

#### Role-based Badges
```jsx
<span className="badge-role">Participant</span>
<span className="badge-region">Berlin</span>
<span className="badge-pronouns">they/them</span>
<span className="badge-category">News</span>
```

### Search & Filters

#### `.search-input`
Search input fields with placeholder styling.

```jsx
<input 
  type="text" 
  className="search-input" 
  placeholder="Search..."
/>
```

#### `.filter-select`
Filter dropdown selects.

```jsx
<select className="filter-select">
  <option>All Categories</option>
</select>
```

### Icon Containers

#### `.icon-container`
Standard icon container (48x48px).

```jsx
<div className="icon-container">
  <span className="text-blue-600 dark:text-blue-400 text-xl">📰</span>
</div>
```

#### `.icon-container-sm`
Small icon container (32x32px).

```jsx
<div className="icon-container-sm">
  <span className="text-blue-600 dark:text-blue-400">📰</span>
</div>
```

### Content Cards

#### `.content-card`
Interactive content cards with hover effect.

```jsx
<Link to="/news/article" className="content-card block">
  <h3>Article Title</h3>
  <p>Article content...</p>
</Link>
```

#### `.page-header-card`
Page header containers.

```jsx
<div className="page-header-card">
  <h1>Page Title</h1>
  <p>Page description</p>
</div>
```

### Pagination

#### `.pagination-btn`
Pagination navigation buttons.

```jsx
<button className="pagination-btn">Previous</button>
```

#### `.pagination-btn-active`
Active page button.

```jsx
<button className="pagination-btn-active">1</button>
```

### Detail Pages

#### `.detail-section`
Section containers for detail pages.

```jsx
<div className="detail-section">
  <div className="detail-section-header">
    <h2 className="detail-section-title">Section Title</h2>
    <p className="detail-section-subtitle">Section description</p>
  </div>
  <div className="p-6">
    Section content
  </div>
</div>
```

## Usage Guidelines

### When to Use Utility Classes

✅ **Use utility classes for:**
- New components and features
- Refactoring existing repetitive patterns
- Standardizing form elements
- Creating consistent card layouts

❌ **Don't use utility classes for:**
- One-off custom styling
- Complex animations
- Layout-specific spacing (use Tailwind spacing classes)

### Migration Strategy

1. **New Development**: Use utility classes from the start
2. **Maintenance**: Replace repetitive patterns during updates
3. **Refactoring**: Gradually replace inline dark mode classes
4. **Documentation**: Update component examples to use utilities

### Common Patterns

#### Form Container
```jsx
// Before
<div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">

// After
<div className="card-base p-6">
```

#### Form Input
```jsx
// Before
<input className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500" />

// After
<input className="input-base" />
```

#### Button
```jsx
// Before
<button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">

// After
<button className="btn-primary">
```

## Color Tokens

The design system includes semantic color tokens defined in `tailwind.config.js`:

- `surface` - Main background colors
- `surface-elevated` - Elevated surface colors
- `border` - Border colors
- `border-input` - Input border colors
- `text-primary` - Primary text colors
- `text-secondary` - Secondary text colors
- `text-tertiary` - Tertiary text colors

## Accessibility

All utility classes include:
- WCAG AA contrast ratios (≥4.5:1)
- Focus states for keyboard navigation
- Proper color contrast in both light and dark modes
- Screen reader friendly text colors

## Testing

When implementing new components:

1. **Visual Testing**: Check in both light and dark modes
2. **Contrast Check**: Use browser DevTools to verify contrast ratios
3. **Keyboard Navigation**: Ensure focus states are visible
4. **Responsive Design**: Test on mobile and desktop

## Examples

### Complete Form Example
```jsx
<div className="card-base p-6">
  <h2 className="heading-secondary mb-6">Create New Item</h2>
  
  <form className="space-y-4">
    <div>
      <label className="label-base">Name</label>
      <input 
        type="text" 
        className="input-base" 
        placeholder="Enter name..."
      />
    </div>
    
    <div>
      <label className="label-base">Description</label>
      <textarea 
        className="textarea-base" 
        rows="3"
        placeholder="Enter description..."
      />
    </div>
    
    <div className="flex space-x-3 pt-4">
      <button type="submit" className="btn-primary">
        Save
      </button>
      <button type="button" className="btn-secondary">
        Cancel
      </button>
    </div>
  </form>
</div>
```

### Complete Table Example
```jsx
<div className="card-base overflow-hidden">
  <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
    <h3 className="heading-tertiary">Items List</h3>
  </div>
  
  <table className="table-base">
    <thead className="table-header">
      <tr>
        <th className="table-header-cell">Name</th>
        <th className="table-header-cell">Status</th>
        <th className="table-header-cell">Actions</th>
      </tr>
    </thead>
    <tbody className="table-body">
      {items.map(item => (
        <tr key={item.id} className="table-row">
          <td className="table-cell">{item.name}</td>
          <td className="table-cell">
            <span className="badge-success">Active</span>
          </td>
          <td className="table-cell">
            <button className="btn-secondary text-xs">
              Edit
            </button>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

## Benefits

- **Consistency**: Unified styling across all components
- **Maintainability**: Change once, apply everywhere
- **Developer Experience**: Shorter, semantic class names
- **Performance**: Reduced CSS bundle size
- **Accessibility**: Built-in WCAG compliance
- **Dark Mode**: Automatic light/dark mode support
