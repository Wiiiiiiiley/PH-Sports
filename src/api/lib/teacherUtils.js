/**
 * Utility functions for teacher-related data parsing and handling
 */

/**
 * Parse sport_coached field from user data into an array of sports
 * @param {Object} user - User object containing sport_coached field
 * @returns {Array} Array of sport names
 */
export const getTeacherSports = (user) => {
  if (!user?.sport_coached) return [];
  
  // Handle JSON string format from backend
  if (typeof user.sport_coached === 'string') {
    try {
      const parsed = JSON.parse(user.sport_coached);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      return [user.sport_coached];
    }
  }
  
  return Array.isArray(user.sport_coached) ? user.sport_coached : [user.sport_coached];
};

/**
 * Check if a teacher coaches a specific sport
 * @param {Object} user - User object
 * @param {string} sport - Sport name to check
 * @returns {boolean} True if teacher coaches the sport
 */
export const teacherCoachesSport = (user, sport) => {
  const sports = getTeacherSports(user);
  return sports.includes(sport);
};

/**
 * Get formatted string of teacher's sports for display
 * @param {Object} user - User object
 * @param {string} separator - Separator between sports (default: ", ")
 * @returns {string} Formatted string of sports
 */
export const getTeacherSportsDisplay = (user, separator = ", ") => {
  const sports = getTeacherSports(user);
  return sports.join(separator) || "No sports assigned";
};
