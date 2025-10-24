import { getRoleBasedColors } from '../filterUtils.js';

describe('getRoleBasedColors', () => {
  it('should return blue colors for teams', () => {
    const team = { type: 'team', id: 1, name: 'Test Team' };
    const colors = getRoleBasedColors(team);
    
    expect(colors.bg).toBe('bg-blue-50 dark:bg-blue-900/20');
    expect(colors.border).toBe('border-blue-200 dark:border-blue-800');
    expect(colors.text).toBe('text-blue-900 dark:text-blue-100');
  });

  it('should return green colors for Teilnehmer*in', () => {
    const participant = { 
      type: 'participant', 
      id: 1, 
      name: 'Test Participant',
      role: 'Teilnehmer*in'
    };
    const colors = getRoleBasedColors(participant);
    
    expect(colors.bg).toBe('bg-green-50 dark:bg-green-900/20');
    expect(colors.border).toBe('border-green-200 dark:border-green-800');
    expect(colors.text).toBe('text-green-900 dark:text-green-100');
  });

  it('should return purple colors for Supporter*in', () => {
    const participant = { 
      type: 'participant', 
      id: 1, 
      name: 'Test Supporter',
      role: 'Supporter'
    };
    const colors = getRoleBasedColors(participant);
    
    expect(colors.bg).toBe('bg-purple-50 dark:bg-purple-900/20');
    expect(colors.border).toBe('border-purple-200 dark:border-purple-800');
    expect(colors.text).toBe('text-purple-900 dark:text-purple-100');
  });

  it('should return orange colors for Crew', () => {
    const participant = { 
      type: 'participant', 
      id: 1, 
      name: 'Test Crew',
      role: 'Crew'
    };
    const colors = getRoleBasedColors(participant);
    
    expect(colors.bg).toBe('bg-orange-50 dark:bg-orange-900/20');
    expect(colors.border).toBe('border-orange-200 dark:border-orange-800');
    expect(colors.text).toBe('text-orange-900 dark:text-orange-100');
  });

  it('should return red colors for SLAM-MC', () => {
    const participant = { 
      type: 'participant', 
      id: 1, 
      name: 'Test MC',
      role: 'SLAM-MC'
    };
    const colors = getRoleBasedColors(participant);
    
    expect(colors.bg).toBe('bg-red-50 dark:bg-red-900/20');
    expect(colors.border).toBe('border-red-200 dark:border-red-800');
    expect(colors.text).toBe('text-red-900 dark:text-red-100');
  });

  it('should handle multiple roles and use the first one', () => {
    const participant = { 
      type: 'participant', 
      id: 1, 
      name: 'Test Multi-Role',
      role: 'Teilnehmer*in, Crew'
    };
    const colors = getRoleBasedColors(participant);
    
    expect(colors.bg).toBe('bg-green-50 dark:bg-green-900/20');
    expect(colors.border).toBe('border-green-200 dark:border-green-800');
    expect(colors.text).toBe('text-green-900 dark:text-green-100');
  });

  it('should return default colors for unknown roles', () => {
    const participant = { 
      type: 'participant', 
      id: 1, 
      name: 'Test Unknown',
      role: 'Unknown Role'
    };
    const colors = getRoleBasedColors(participant);
    
    expect(colors.bg).toBe('bg-white dark:bg-gray-700');
    expect(colors.border).toBe('border-gray-200 dark:border-gray-600');
    expect(colors.text).toBe('text-gray-900 dark:text-white');
  });

  it('should handle array roles', () => {
    const participant = { 
      type: 'participant', 
      id: 1, 
      name: 'Test Array Roles',
      roles: ['Supporter*in', 'Crew']
    };
    const colors = getRoleBasedColors(participant);
    
    expect(colors.bg).toBe('bg-purple-50 dark:bg-purple-900/20');
    expect(colors.border).toBe('border-purple-200 dark:border-purple-800');
    expect(colors.text).toBe('text-purple-900 dark:text-purple-100');
  });
});