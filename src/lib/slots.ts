/**
 * Fixed Time Slots as defined by SPJIMR.
 * Slot numbers 1-8 with their start and end times.
 * Both ends are inclusive for attendance matching.
 */
export interface TimeSlot {
  slot: number;
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  label: string;      // "8:15 – 9:00"
}

export const FIXED_SLOTS: TimeSlot[] = [
  { slot: 1, startTime: "08:15", endTime: "09:00", label: "8:15 – 9:00" },
  { slot: 2, startTime: "09:00", endTime: "10:10", label: "9:00 – 10:10" },
  { slot: 3, startTime: "10:40", endTime: "11:50", label: "10:40 – 11:50" },
  { slot: 4, startTime: "12:10", endTime: "13:20", label: "12:10 – 1:20" },
  { slot: 5, startTime: "14:30", endTime: "15:40", label: "2:30 – 3:40" },
  { slot: 6, startTime: "16:00", endTime: "17:10", label: "4:00 – 5:10" },
  { slot: 7, startTime: "17:30", endTime: "18:40", label: "5:30 – 6:40" },
  { slot: 8, startTime: "19:00", endTime: "20:10", label: "7:00 – 8:10" },
];

export const SLOT_MAP = new Map(FIXED_SLOTS.map(s => [s.slot, s]));

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/**
 * Find which fixed slot a swipe time (HH:mm or HH:mm:ss) falls into.
 * Both ends are inclusive: slotStart <= swipeTime <= slotEnd
 */
export function findSlotForTime(timeStr: string): TimeSlot | null {
  // Normalize to HH:mm
  const parts = timeStr.split(":");
  const hh = parseInt(parts[0]);
  const mm = parseInt(parts[1]);
  const swipeMinutes = hh * 60 + mm;

  for (const slot of FIXED_SLOTS) {
    const [sh, sm] = slot.startTime.split(":").map(Number);
    const [eh, em] = slot.endTime.split(":").map(Number);
    const start = sh * 60 + sm;
    const end = eh * 60 + em;

    if (swipeMinutes >= start && swipeMinutes <= end) {
      return slot;
    }
  }
  return null;
}

/**
 * Given a slot number, get the slot info.
 */
export function getSlot(slotNumber: number): TimeSlot | undefined {
  return SLOT_MAP.get(slotNumber);
}
