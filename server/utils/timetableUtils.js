/**
 * Utility functions for timetable operations
 */

/**
 * Maps competition type from rounds to timetable type
 * @param {string} competitionType - The competition type from rounds table
 * @returns {string} The corresponding timetable type
 */
export function mapCompetitionTypeToTimetableType(competitionType) {
  switch (competitionType) {
    case 'Einzelwettbewerb':
      return 'individual-round';
    case 'Teamwettbewerb':
      return 'team-round';
    case 'Freestyle':
      return 'individual-round'; // Default to individual
    default:
      return 'individual-round';
  }
}

/**
 * Maps round data to timetable entry data
 * @param {Object} round - The round object
 * @returns {Object} The timetable entry data
 */
export function mapRoundToTimetableEntry(round) {
  return {
    title: round.title,
    description: round.description,
    location: round.location,
    date: round.date,
    time: round.startTime,
    end_time: round.endTime,
    type: mapCompetitionTypeToTimetableType(round.competitionType),
    status: round.status,
    internal_link: round.slug,
    round_id: round.id
  };
}
