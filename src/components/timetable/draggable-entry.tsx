'use client';

import { useDraggable } from '@dnd-kit/core';
import { timetableEntry, staff as Staff } from '@/lib/data-types';
import { cn } from '@/lib/utils';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { buttonVariants } from '@/components/ui/button';

interface DraggableEntryProps {
  entry: timetableEntry;
  teacher?: Staff;
  className?: string;
  color?: string;
  canManage: boolean;
  onEdit: (entry: timetableEntry) => void;
  onDelete: (entry: timetableEntry) => void;
  showClass?: boolean;
  classInfo?: { name: string };
}

import React, { useRef, useEffect } from 'react';

interface ColorTextProps {
  color: string;
  children: React.ReactNode;
  className?: string;
}

const SubjectColorText = ({ color, children, className }: ColorTextProps) => {
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.color = color;
    }
  }, [color]);

  return <p ref={textRef} className={className}>{children}</p>;
};

const SubjectColorAccent = ({ color, className }: { color: string; className?: string }) => {
    const accentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (accentRef.current) {
            accentRef.current.style.backgroundColor = color;
        }
    }, [color]);

    return <div ref={accentRef} className={className} />;
};

export function DraggableTimetableEntry({
  entry,
  teacher,
  className,
  color = '#3b82f6',
  canManage,
  onEdit,
  onDelete,
  showClass,
  classInfo
}: DraggableEntryProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: entry.id!,
    disabled: !canManage,
    data: {
      entry,
    }
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  const nodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNodeRef(nodeRef.current);
  }, [setNodeRef]);

  useEffect(() => {
    if (nodeRef.current) {
      nodeRef.current.style.transform = style?.transform || '';
      nodeRef.current.style.backgroundColor = `${color}1A`;
      nodeRef.current.style.borderColor = color;
    }
  }, [style?.transform, color]);

  return (
    <div
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 rounded-2xl text-[11px] mb-2 relative border-l-4 transition-all cursor-grab active:cursor-grabbing overflow-hidden",
        isDragging ? "opacity-30 z-50 scale-105 shadow-2xl rotate-2" : "group bg-white/40 backdrop-blur-md border-white/60 shadow-sm hover:shadow-md hover:bg-white/60 hover:-translate-y-0.5",
        className
      )}
      ref={nodeRef}
    >
      {/* Subject Color Background Accent */}
      <SubjectColorAccent 
        color={color}
        className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.08] transition-opacity"
      />
      
      <div className="flex justify-between items-start relative z-10">
        <SubjectColorText color={color} className="font-black truncate tracking-tight text-xs uppercase">{entry.subject}</SubjectColorText>
        {canManage && !isDragging && (
          <DropdownMenu>
            <DropdownMenuTrigger 
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-all bg-white/50 border border-white/80 shadow-sm")}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4 text-slate-400" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl border-white/40 shadow-xl backdrop-blur-xl bg-white/80">
              <DropdownMenuItem className="font-bold text-slate-700" onClick={(e) => { e.stopPropagation(); onEdit(entry); }}>
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-rose-600 font-bold" 
                onClick={(e) => { e.stopPropagation(); onDelete(entry); }}
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      
      <div className="mt-2 space-y-0.5 relative z-10">
        <p className="text-slate-600 font-bold flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          {teacher ? `${teacher.firstName[0]}. ${teacher.lastName}` : 'N/A'}
        </p>
        
        {showClass && classInfo && (
            <p className="text-indigo-600 font-black text-[10px] uppercase tracking-wider">
                {classInfo.name}
            </p>
        )}
        
        {entry.classroom && (
          <p className="text-[10px] text-slate-400 font-medium italic">
            Salle {entry.classroom}
          </p>
        )}
      </div>
    </div>
  );
}
