/**
 * Score calculation utilities for rounds and jury scoring
 * Provides consistent score calculation across all components
 */

/**
 * Calculate total score from jury scores, removing highest and lowest
 * @param {number[]} scores - Array of jury scores
 * @returns {number} Total score (sum of trimmed scores)
 */
export function calculateTotalScore(scores) {
  if (!scores || scores.length === 0) return 0;
  
  // Need at least 3 scores to remove highest and lowest
  if (scores.length < 3) {
    return scores.reduce((sum, score) => sum + score, 0);
  }
  
  // Sort scores and remove highest and lowest
  const sortedScores = [...scores].sort((a, b) => a - b);
  const trimmedScores = sortedScores.slice(1, -1);
  
  // Return sum of remaining scores
  return trimmedScores.reduce((sum, score) => sum + score, 0);
}

/**
 * Calculate average score from jury scores, removing highest and lowest
 * @param {number[]} scores - Array of jury scores
 * @returns {number} Average score of trimmed scores
 */
export function calculateAverageScore(scores) {
  if (!scores || scores.length === 0) return 0;
  
  // Need at least 3 scores to remove highest and lowest
  if (scores.length < 3) {
    const sum = scores.reduce((sum, score) => sum + score, 0);
    return sum / scores.length;
  }
  
  // Sort scores and remove highest and lowest
  const sortedScores = [...scores].sort((a, b) => a - b);
  const trimmedScores = sortedScores.slice(1, -1);
  
  // Return average of remaining scores
  const sum = trimmedScores.reduce((sum, score) => sum + score, 0);
  return sum / trimmedScores.length;
}

/**
 * Format score for display
 * @param {number} score - Score to format
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted score
 */
export function formatScore(score, decimals = 1) {
  if (typeof score !== 'number' || isNaN(score)) return '0.0';
  return score.toFixed(decimals);
}

/**
 * Check if a score should be struck out (highest or lowest)
 * @param {number} score - The score to check
 * @param {number[]} allScores - All scores in the array
 * @param {number} scoreIndex - Index of the score in the array
 * @returns {boolean} True if score should be struck out
 */
export function shouldStrikeScore(score, allScores, scoreIndex) {
  if (!allScores || allScores.length < 3) return false;
  
  const sortedScores = [...allScores].sort((a, b) => a - b);
  const lowest = sortedScores[0];
  const highest = sortedScores[sortedScores.length - 1];
  
  // Find indices of lowest and highest scores
  const lowestIndices = allScores.map((s, i) => s === lowest ? i : -1).filter(i => i !== -1);
  const highestIndices = allScores.map((s, i) => s === highest ? i : -1).filter(i => i !== -1);
  
  // If all scores are the same (lowest === highest), strike two scores
  if (lowest === highest) {
    // Strike the first two occurrences
    return scoreIndex === lowestIndices[0] || scoreIndex === lowestIndices[1];
  }
  
  // Strike exactly one lowest score (the first occurrence)
  if (score === lowest && scoreIndex === lowestIndices[0]) {
    return true;
  }
  
  // Strike exactly one highest score (the first occurrence)
  if (score === highest && scoreIndex === highestIndices[0]) {
    return true;
  }
  
  // Don't strike any other scores
  return false;
}

/**
 * Get score statistics for display
 * @param {number[]} scores - Array of jury scores
 * @returns {object} Score statistics
 */
export function getScoreStats(scores) {
  if (!scores || scores.length === 0) {
    return {
      total: 0,
      average: 0,
      trimmedTotal: 0,
      trimmedAverage: 0,
      count: 0,
      trimmedCount: 0
    };
  }
  
  const total = scores.reduce((sum, score) => sum + score, 0);
  const average = total / scores.length;
  const trimmedTotal = calculateTotalScore(scores);
  const trimmedAverage = calculateAverageScore(scores);
  
  return {
    total,
    average,
    trimmedTotal,
    trimmedAverage,
    count: scores.length,
    trimmedCount: Math.max(0, scores.length - 2)
  };
}
