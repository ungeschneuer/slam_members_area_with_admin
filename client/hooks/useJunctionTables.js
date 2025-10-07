import { useMutation, useQueryClient } from '@tanstack/react-query';
import junctionTableService from '../services/junctionTableService.js';

/**
 * Hooks for managing junction table relationships
 * Provides mutations for adding/removing participants, crew, and feature artists
 */

// ROUND PARTICIPANTS HOOKS
export const useAddRoundParticipant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, participantId, role }) => 
      junctionTableService.addRoundParticipant(roundId, participantId, role),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error adding participant to round:', error);
    }
  });
};

export const useRemoveRoundParticipant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, participantId }) => 
      junctionTableService.removeRoundParticipant(roundId, participantId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error removing participant from round:', error);
    }
  });
};

export const useUpdateRoundParticipants = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, participants }) => 
      junctionTableService.updateRoundParticipants(roundId, participants),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error updating round participants:', error);
    }
  });
};

// ROUND CREW HOOKS
export const useAddRoundCrew = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, participantId, role }) => 
      junctionTableService.addRoundCrew(roundId, participantId, role),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error adding crew member to round:', error);
    }
  });
};

export const useRemoveRoundCrew = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, participantId }) => 
      junctionTableService.removeRoundCrew(roundId, participantId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error removing crew member from round:', error);
    }
  });
};

export const useUpdateRoundCrew = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, crew }) => 
      junctionTableService.updateRoundCrew(roundId, crew),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error updating round crew:', error);
    }
  });
};

// ROUND FEATURE ARTISTS HOOKS
export const useAddRoundFeatureArtist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, participantId, name, displayOrder, description }) => 
      junctionTableService.addRoundFeatureArtist(roundId, participantId, name, displayOrder, description),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error adding feature artist to round:', error);
    }
  });
};

export const useRemoveRoundFeatureArtist = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, participantId }) => 
      junctionTableService.removeRoundFeatureArtist(roundId, participantId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error removing feature artist from round:', error);
    }
  });
};

export const useUpdateRoundFeatureArtists = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ roundId, featureArtists }) => 
      junctionTableService.updateRoundFeatureArtists(roundId, featureArtists),
    onSuccess: (data, variables) => {
      // Invalidate and refetch rounds data
      queryClient.invalidateQueries({ queryKey: ['rounds'] });
      queryClient.invalidateQueries({ queryKey: ['rounds', variables.roundId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error updating round feature artists:', error);
    }
  });
};

// TIMETABLE PARTICIPANTS HOOKS
export const useAddTimetableParticipant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entryId, participantId, role }) => 
      junctionTableService.addTimetableParticipant(entryId, participantId, role),
    onSuccess: (data, variables) => {
      // Invalidate and refetch timetable data
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['timetable', variables.entryId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error adding participant to timetable entry:', error);
    }
  });
};

export const useUpdateTimetableParticipant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entryId, participantId, role }) => 
      junctionTableService.updateTimetableParticipant(entryId, participantId, role),
    onSuccess: (data, variables) => {
      // Invalidate and refetch timetable data
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['timetable', variables.entryId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error updating participant role in timetable entry:', error);
    }
  });
};

export const useRemoveTimetableParticipant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entryId, participantId }) => 
      junctionTableService.removeTimetableParticipant(entryId, participantId),
    onSuccess: (data, variables) => {
      // Invalidate and refetch timetable data
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['timetable', variables.entryId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error removing participant from timetable entry:', error);
    }
  });
};

export const useUpdateTimetableParticipants = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ entryId, participants }) => 
      junctionTableService.updateTimetableParticipants(entryId, participants),
    onSuccess: (data, variables) => {
      // Invalidate and refetch timetable data
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['timetable', variables.entryId] });
      queryClient.invalidateQueries({ queryKey: ['participants'] });
    },
    onError: (error) => {
      console.error('Error updating timetable participants:', error);
    }
  });
};

// CONVENIENCE HOOKS
export const useRoundJunctionTables = (roundId) => {
  const addParticipant = useAddRoundParticipant();
  const removeParticipant = useRemoveRoundParticipant();
  const updateParticipants = useUpdateRoundParticipants();
  
  const addCrew = useAddRoundCrew();
  const removeCrew = useRemoveRoundCrew();
  const updateCrew = useUpdateRoundCrew();
  
  const addFeatureArtist = useAddRoundFeatureArtist();
  const removeFeatureArtist = useRemoveRoundFeatureArtist();
  const updateFeatureArtists = useUpdateRoundFeatureArtists();
  
  return {
    participants: {
      add: addParticipant,
      remove: removeParticipant,
      update: updateParticipants
    },
    crew: {
      add: addCrew,
      remove: removeCrew,
      update: updateCrew
    },
    featureArtists: {
      add: addFeatureArtist,
      remove: removeFeatureArtist,
      update: updateFeatureArtists
    }
  };
};

export const useTimetableJunctionTables = (entryId) => {
  const addParticipant = useAddTimetableParticipant();
  const updateParticipant = useUpdateTimetableParticipant();
  const removeParticipant = useRemoveTimetableParticipant();
  const updateParticipants = useUpdateTimetableParticipants();
  
  return {
    participants: {
      add: addParticipant,
      update: updateParticipant,
      remove: removeParticipant,
      updateAll: updateParticipants
    }
  };
};
