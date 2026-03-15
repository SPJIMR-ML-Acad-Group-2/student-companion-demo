"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  maxWidth?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Compatibility shim — wraps shadcn Dialog with the old Modal API.
 * New code should use shadcn Dialog directly.
 */
export function Modal({ open, onClose, title, subtitle, footer, children }: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[var(--color-text-primary)]">{title}</DialogTitle>
          {subtitle && <p className="text-sm text-[var(--color-text-secondary)] mt-1">{subtitle}</p>}
        </DialogHeader>
        <div>{children}</div>
        {footer && (
          <DialogFooter className="gap-3">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
