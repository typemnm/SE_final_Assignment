export const formatDate = (date: string): string => {
  const d = new Date(date);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

export const formatDistance = (meters: number): string => {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)}km`;
  }
  return `${meters}m`;
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

export const formatPace = (secondsPerKm: number): string => {
  const m = Math.floor(secondsPerKm / 60);
  const s = secondsPerKm % 60;
  return `${m}'${String(s).padStart(2, '0')}"`;
};

export const formatCalories = (kcal: number): string => `${kcal.toLocaleString()} kcal`;
