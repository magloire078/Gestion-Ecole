'use client';

import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { timetableEntry } from '@/lib/data-types';

interface DroppableCellProps {
  day: timetableEntry['day'];
  time: string;
  children: React.ReactNode;
  isOver?: boolean;
}

export function DroppableCell({ day, time, children }: DroppableCellProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `${day}-${time}`,
    data: {
      day,
      time,
    }
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "p-2 align-top min-h-[120px] w-full relative transition-all duration-300 border-r border-slate-50 last:border-r-0",
        isOver ? "bg-indigo-600/10 scale-[0.98] ring-2 ring-indigo-600/20 ring-inset z-10" : "hover:bg-white/20"
      )}
    >
      {children}
    </div>
  );
}
