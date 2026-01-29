"use client";

import { useEffect, useRef } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export default function Modal({ open, onClose, title, children, actions }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      previousFocus.current = document.activeElement as HTMLElement;
      dialog.showModal();
      // Focus the first focusable element
      const focusable = dialog.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"])');
      focusable?.focus();
    } else {
      dialog.close();
      previousFocus.current?.focus();
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      aria-labelledby="modal-title"
      style={{
        border: "none",
        borderRadius: 12,
        padding: 0,
        maxWidth: 400,
        width: "90%",
        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        background: "var(--card-bg, #fff)",
        color: "var(--text, #222)"
      }}
    >
      <div style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 id="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              padding: "4px 8px",
              color: "var(--text, #222)",
              opacity: 0.6
            }}
          >
            ×
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>{children}</div>
        {actions && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {actions}
          </div>
        )}
      </div>
    </dialog>
  );
}

type ConfirmModalProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  confirmColor?: string;
  loading?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  confirmColor = "#c44",
  loading = false
}: ConfirmModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      actions={
        <>
          <button onClick={onClose} disabled={loading} style={{ color: "#888" }}>
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ background: confirmColor, color: "#fff", border: "none" }}
          >
            {loading ? "..." : confirmText}
          </button>
        </>
      }
    >
      <p style={{ margin: 0 }}>{message}</p>
    </Modal>
  );
}

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  onClose: () => void;
};

export function Toast({ message, type = "info", onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    success: { bg: "rgba(50, 180, 80, 0.95)", color: "#fff" },
    error: { bg: "rgba(200, 50, 50, 0.95)", color: "#fff" },
    info: { bg: "rgba(60, 130, 200, 0.95)", color: "#fff" }
  };

  return (
    <div
      role="alert"
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        padding: "12px 20px",
        borderRadius: 8,
        background: colors[type].bg,
        color: colors[type].color,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 12
      }}
    >
      <span>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          padding: 0,
          fontSize: 18,
          opacity: 0.8
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
