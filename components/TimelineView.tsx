.sort((a, b) => {
  // Primary sort by start date
  const aDate = a.startDate ? new Date(a.startDate).getTime() : Number.MAX_SAFE_INTEGER;
  const bDate = b.startDate ? new Date(b.startDate).getTime() : Number.MAX_SAFE_INTEGER;
  if (aDate !== bDate) return aDate - bDate;
  
  // Secondary sort by end date if available
  const aEndDate = a.endDate ? new Date(a.endDate).getTime() : Number.MAX_SAFE_INTEGER;
  const bEndDate = b.endDate ? new Date(b.endDate).getTime() : Number.MAX_SAFE_INTEGER;
  if (aEndDate !== bEndDate) return aEndDate - bEndDate;
  
  // Final sort by title alphabetically
  return (a.title || '').localeCompare(b.title || '')
})