'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, X, Clock, FileText, User, School } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export function SearchModal({ isOpen, onClose, onSearch }: {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const recentSearches = ['Jean Dupont', 'Mathématiques 4ème', 'Bulletin trimestriel'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Recherche globale
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher élèves, cours, documents..."
              className="pl-10 pr-10 h-12 text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </div>
        </form>

        {!query && recentSearches.length > 0 && (
          <div className="px-6 py-4 border-t">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Recherches récentes</h3>
            <div className="space-y-1">
              {recentSearches.map((search, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(search)}
                  className="flex items-center gap-3 w-full p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
                >
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {query && (
          <div className="px-6 py-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Élèves
                </h3>
                {/* Résultats élèves */}
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <School className="h-4 w-4" />
                  Cours
                </h3>
                {/* Résultats cours */}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
