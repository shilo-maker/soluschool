/**
 * Format a date as dd/mm/yyyy
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in dd/mm/yyyy format
 */
export function formatDate(date) {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format a date for HTML input[type="date"] (yyyy-mm-dd)
 * @param {Date|string} date - Date object or date string
 * @returns {string} Formatted date string in yyyy-mm-dd format
 */
export function formatDateForInput(date) {
  if (!date) return '';

  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Convert dd/mm/yyyy string to yyyy-mm-dd for backend
 * @param {string} dateStr - Date string in dd/mm/yyyy format
 * @returns {string} Date string in yyyy-mm-dd format
 */
export function convertDDMMYYYYtoISO(dateStr) {
  if (!dateStr) return '';

  const parts = dateStr.split('/');
  if (parts.length !== 3) return '';

  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/**
 * Convert yyyy-mm-dd to dd/mm/yyyy for display
 * @param {string} dateStr - Date string in yyyy-mm-dd format
 * @returns {string} Date string in dd/mm/yyyy format
 */
export function convertISOtoDDMMYYYY(dateStr) {
  if (!dateStr) return '';

  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';

  const [year, month, day] = parts;
  return `${day}/${month}/${year}`;
}
