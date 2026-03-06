"use client";

import React from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, subtitle, maxWidth = "max-w-2xl", footer, children }: ModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/60" onClick={onClose}>
      <div className={`rounded-2xl flex flex-col w-full ${maxWidth} mx-4 bg-[var(--color-bg-secondary)] max-h-[90vh]`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--color-border)]">
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">{title}</h2>
            {subtitle && <p className="text-sm mt-1 text-[var(--color-text-secondary)]">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-xl text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]">&#x2715;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-[var(--color-border)] flex justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
