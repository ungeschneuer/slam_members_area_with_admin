// Utility helpers for participant entity compatibility

export const getParticipantId = (entity) => {
  if (!entity) return undefined;
  if (typeof entity === 'number') return entity;
  if (typeof entity === 'string') return parseInt(entity);
  return entity.id ?? entity.participantId;
};

export const mapToParticipantId = (list) => {
  if (!Array.isArray(list)) return [];
  return list
    .map(getParticipantId)
    .filter((id) => id !== undefined && id !== null && id !== '');
};


