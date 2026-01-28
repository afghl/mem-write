"use client";

import { useEffect } from 'react';
import { X } from 'lucide-react';
import CreationEditorPage from './CreationEditorPage';

type CreationEditorModalProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  creationId: string | null;
};

export default function CreationEditorModal({
  open,
  onClose,
  projectId,
  creationId,
}: CreationEditorModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [open, onClose]);

  if (!open || !creationId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} role="presentation" />
      <div
        className="relative w-[95vw] h-[90vh] max-w-[1600px] max-h-[900px] rounded-[28px] bg-[#F0F2F5] shadow-2xl border border-gray-200 flex flex-col overflow-hidden min-h-0"
        role="dialog"
        aria-modal="true"
        aria-label="Creation editor dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-white/90 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">创作编辑</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden px-4 pb-4 pt-3">
          <div className="h-full min-h-0">
            <CreationEditorPage
              projectId={projectId}
              creationId={creationId}
              enableResize
            />
          </div>
        </div>
      </div>
    </div>
  );
}
