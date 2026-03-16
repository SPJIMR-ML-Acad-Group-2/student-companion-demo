"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-left"
      richColors
      closeButton
      toastOptions={{
        duration: 2800,
      }}
    />
  );
}
