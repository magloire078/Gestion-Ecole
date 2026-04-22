import { timetableEntry } from "./data-types";

/**
 * Checks for conflicts in a timetable entry against existing entries.
 * Returns an array of conflict descriptions, or an empty array if no conflicts.
 */
export function checkTimetableConflicts(
  newEntry: Partial<timetableEntry>,
  allEntries: timetableEntry[],
  excludeEntryId?: string
): string[] {
  const conflicts: string[] = [];
  
  if (!newEntry.day || !newEntry.startTime || !newEntry.endTime) return [];

  const start = timeToMinutes(newEntry.startTime);
  const end = timeToMinutes(newEntry.endTime);

  if (start >= end) {
    conflicts.push("L'heure de début doit être avant l'heure de fin.");
    return conflicts;
  }

  allEntries.forEach((existing) => {
    // Skip checking against itself if we're editing
    if (excludeEntryId && existing.id === excludeEntryId) return;
    
    // Only check same day
    if (existing.day !== newEntry.day) return;

    const existStart = timeToMinutes(existing.startTime);
    const existEnd = timeToMinutes(existing.endTime);

    // Check for overlap
    const hasOverlap = start < existEnd && end > existStart;
    if (!hasOverlap) return;

    // 1. Teacher Conflict
    if (newEntry.teacherId && existing.teacherId === newEntry.teacherId) {
      conflicts.push(`L'enseignant est déjà occupé de ${existing.startTime} à ${existing.endTime}.`);
    }

    // 2. Classroom Conflict
    if (newEntry.classroom && existing.classroom === newEntry.classroom) {
      conflicts.push(`La salle ${existing.classroom} est déjà occupée de ${existing.startTime} à ${existing.endTime}.`);
    }

    // 3. Class Conflict (Same class cannot have two subjects at the same time)
    if (newEntry.classId && existing.classId === newEntry.classId) {
      conflicts.push(`La classe a déjà un cours (${existing.subject}) de ${existing.startTime} à ${existing.endTime}.`);
    }
  });

  return conflicts;
}

/**
 * Converts a HH:MM string to minutes from 00:00
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

/**
 * Checks if a movement (drag and drop) results in a conflict
 */
export function validateMove(
  entry: timetableEntry,
  newDay: timetableEntry['day'],
  newStartTime: string,
  allEntries: timetableEntry[]
): string[] {
  // Calculate new end time based on original duration
  const startMins = timeToMinutes(entry.startTime);
  const endMins = timeToMinutes(entry.endTime);
  const duration = endMins - startMins;
  
  const newStartMins = timeToMinutes(newStartTime);
  const newEndMins = newStartMins + duration;
  
  // Format end time back to HH:MM
  const endHours = Math.floor(newEndMins / 60);
  const endMinutes = newEndMins % 60;
  const newEndTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;

  const updatedEntry: Partial<timetableEntry> = {
    ...entry,
    day: newDay,
    startTime: newStartTime,
    endTime: newEndTime
  };

  return checkTimetableConflicts(updatedEntry, allEntries, entry.id);
}
