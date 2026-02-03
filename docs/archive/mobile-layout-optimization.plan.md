# Optimize Mobile Layout - Use Left Space for Participants

## Current Problem

In mobile view, the left column (time/date) has significant unused space below the date, while participants are cramped in the right column. This creates inefficient space usage.

## Current Mobile Layout Structure

```jsx
<div className="flex items-start gap-4">
  {/* Column 1: Time - 1/3 width, lots of unused space */}
  <div className="text-center flex-shrink-0">
    <div>18:00 - 20:00</div>
    <div>Mi., 29.10.</div>
    {/* LOTS OF EMPTY SPACE BELOW */}
  </div>

  {/* Column 2: Colored Indicator */}
  <div className="w-1 h-12 rounded-full bg-[#185757]"></div>

  {/* Column 3: Everything Else - 2/3 width, cramped */}
  <div className="flex-1 min-w-0">
    <div>Einzel-Vorrunde 2</div>
    <div>Einzelwettbewerb</div>
    <div>Weltecho Kino</div>
    {/* Participants cramped here */}
    <div className="flex flex-wrap gap-1">
      <span>Dana Galkina</span>
      <span>Levin</span>
      {/* ... more participants */}
    </div>
  </div>
</div>
```

## Proposed Mobile Layout

### Option 1: Two-Row Layout (Recommended)
```jsx
{/* Mobile Layout - Two Rows */}
<div className="sm:hidden">
  {/* Row 1: Time, Title, Location */}
  <div className="flex items-start space-x-3 mb-3">
    <div className="text-center flex-shrink-0">
      <div className="text-lg font-bold">18:00 - 20:00</div>
      <div className="text-xs text-gray-500">Mi., 29.10.</div>
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-bold">Einzel-Vorrunde 2</h3>
      <div className="text-sm text-gray-500">Einzelwettbewerb</div>
      <div className="text-sm text-gray-600">Weltecho Kino</div>
    </div>
  </div>
  
  {/* Row 2: Participants - Full Width */}
  <div className="flex flex-wrap gap-1">
    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">Dana Galkina</span>
    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">Levin</span>
    {/* ... more participants */}
  </div>
</div>
```

### Option 2: Left Column Participants (Alternative)
```jsx
{/* Mobile Layout - Left Column Participants */}
<div className="sm:hidden">
  <div className="flex items-start space-x-3">
    {/* Left: Time + Participants */}
    <div className="flex-shrink-0 w-24">
      <div className="text-center mb-3">
        <div className="text-lg font-bold">18:00 - 20:00</div>
        <div className="text-xs text-gray-500">Mi., 29.10.</div>
      </div>
      {/* Participants in left column */}
      <div className="flex flex-col gap-1">
        <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-center">Dana Galkina</span>
        <span className="px-2 py-1 bg-gray-100 rounded-md text-xs text-center">Levin</span>
        {/* ... more participants */}
      </div>
    </div>

    {/* Right: Title, Type, Location */}
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-bold">Einzel-Vorrunde 2</h3>
      <div className="text-sm text-gray-500">Einzelwettbewerb</div>
      <div className="text-sm text-gray-600">Weltecho Kino</div>
    </div>
  </div>
</div>
```

## Recommended Implementation: Option 1 (Two-Row Layout)

### Benefits:
1. **Better Space Utilization:** Participants get full width
2. **Cleaner Layout:** More organized, less cramped
3. **Better Readability:** Participants are easier to scan
4. **Consistent with Design:** Matches the reference image better
5. **Responsive:** Works well on all mobile screen sizes

### Changes Required:

#### 1. Rounds Component (`client/components/Rounds.jsx`)

**Current Mobile Layout (around lines 430-480):**
```jsx
{/* Single Row Layout - Three Columns */}
<div className="flex items-start gap-4">
  {/* Column 1: Time */}
  <div className="text-center flex-shrink-0">
    <div className="text-lg font-bold text-gray-900 dark:text-white">
      {formatTime(round.start_time)} - {formatTime(round.end_time)}
    </div>
    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
      {formatDateForDisplay(round.date)}
    </div>
  </div>

  {/* Column 2: Colored Indicator Line */}
  <div className={`w-1 h-12 rounded-full ${getCompetitionTypeIndicator(round.competition_type || 'Einzelwettbewerb')}`}></div>

  {/* Column 3: Everything Else */}
  <div className="flex-1 min-w-0">
    {/* Title, type, location, participants */}
  </div>
</div>
```

**New Mobile Layout:**
```jsx
{/* Mobile Layout - Two Rows */}
<div className="sm:hidden">
  {/* Row 1: Time, Title, Location */}
  <div className="flex items-start space-x-3 mb-3">
    <div className="text-center flex-shrink-0">
      <div className="text-lg font-bold text-gray-900 dark:text-white">
        {formatTime(round.start_time)} - {formatTime(round.end_time)}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
        {formatDateForDisplay(round.date)}
      </div>
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-[#185757] dark:group-hover:text-[#A2D2B9] transition-colors leading-tight mb-1">
        {round.title}
      </h3>
      <span className="text-sm text-gray-500 dark:text-gray-300 mb-2 block">
        {round.competition_type || 'Einzelwettbewerb'}
      </span>
      {round.location && (
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {round.location}
        </div>
      )}
    </div>
  </div>
  
  {/* Row 2: Participants - Full Width */}
  {round.assignments && round.assignments.filter(a => a.roles.includes('participant')).length > 0 && (
    <div className="flex flex-wrap gap-1">
      {round.assignments
        .filter(a => a.roles.includes('participant'))
        .map((assignment, index) => {
          const participantName = assignment.participant_name || assignment.team_name || `ID: ${assignment.participant_id || assignment.team_id}`;
          return (
            <span 
              key={assignment.participant_id || assignment.team_id}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md text-xs"
            >
              {participantName}
            </span>
          );
        })}
    </div>
  )}
</div>

{/* Desktop Layout - Keep Current Three-Column */}
<div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 items-center">
  {/* Current desktop layout unchanged */}
</div>
```

## Implementation Steps

1. **Wrap current mobile layout** in `sm:hidden` div
2. **Create new two-row mobile layout** with better space utilization
3. **Keep desktop layout unchanged** (wrap in `hidden sm:grid`)
4. **Test on mobile devices** to ensure proper spacing

## Expected Results

- **Mobile:** Participants get full width, better readability
- **Desktop:** Unchanged, maintains current design
- **Space Efficiency:** Better utilization of available screen space
- **User Experience:** Easier to scan participants on mobile

## Files to Modify

1. `client/components/Rounds.jsx` - Update mobile layout (around lines 430-480)
