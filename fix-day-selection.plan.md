# Fix Day Tab Auto-Selection

## Root Cause

There are TWO conflicting `useEffect` hooks managing `activeDay`:

1. **Smart Selection Hook (Lines 49-78):** Correctly selects the appropriate day
2. **Reset Hook (Lines 235-239):** Leftover from old "Alle Tage" view, conflicts with smart selection

The reset hook tries to set `activeDay` to `'all'`, which no longer exists after we removed the "Alle Tage" view.

## Solution

Remove the conflicting reset `useEffect` hook from both Rounds and Timetable components.

## Changes Required

### 1. Rounds Component (`client/components/Rounds.jsx`)

**Remove Lines 234-239:**

```javascript
// Reset activeDay if it's no longer valid
useEffect(() => {
  if (activeDay !== 'all' && !uniqueDates.includes(activeDay)) {
    setActiveDay(uniqueDates[0] || 'all');
  }
}, [uniqueDates, activeDay]);
```

**Why:** This hook is a leftover from the "Alle Tage" view and conflicts with the smart day selection logic.

### 2. Timetable Component (`client/components/Timetable.jsx`)

**Find and Remove Similar Reset Logic (around lines 218-229):**

```javascript
// Reset activeDay if it's no longer valid
useEffect(() => {
  if (activeDay !== 'all' && !uniqueDates.includes(activeDay)) {
    const todayStr = getTodayBerlinDateString();
    if (uniqueDates.includes(todayStr)) {
      setActiveDay(todayStr);
    } else {
      const futureDates = uniqueDates.filter(d => isFutureDateBerlin(d));
      setActiveDay(futureDates.length > 0 ? futureDates[0] : uniqueDates[0] || 'all');
    }
  }
}, [uniqueDates, activeDay]);
```

**Why:** Same issue - this is trying to handle the old "Alle Tage" view logic.

## Expected Result

After removing these conflicting hooks:

1. **Smart selection works correctly:**
   - Before events: Selects first day
   - During events: Selects current day
   - After events: Selects last day

2. **No conflicts:** Only one `useEffect` manages day selection

3. **Day tab is automatically selected** on component mount

## Files to Modify

1. `client/components/Rounds.jsx` - Remove lines 234-239
2. `client/components/Timetable.jsx` - Remove lines ~218-229

## Technical Details

The smart selection hook (lines 49-78) is sufficient and correct:
- Waits for data to load (`uniqueDates.length > 0`)
- Only runs once (`!activeDay` condition)
- Implements the correct logic (before/during/after)
- Has proper fallback to first day

The reset hooks were needed when "Alle Tage" was an option, but now they just cause conflicts.

