"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, IconButton } from "./primitives";

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "left" | "right";
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      className={`ui-drawer ui-drawer--${side}`}
      ref={dialogRef}
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="ui-drawer__panel">
        <header className="ui-drawer__header">
          <h2>{title}</h2>
          <IconButton type="button" label="Close panel" onClick={onClose}>
            ×
          </IconButton>
        </header>
        <div className="ui-drawer__content">{children}</div>
      </div>
    </dialog>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog className="ui-modal" ref={dialogRef} aria-labelledby="ui-modal-title" onClose={onClose}>
      <header className="ui-modal__header">
        <h2 id="ui-modal-title">{title}</h2>
        <IconButton type="button" label="Close dialog" onClick={onClose}>
          ×
        </IconButton>
      </header>
      <div>{children}</div>
    </dialog>
  );
}

export function MobileNavigationDrawer({
  items,
}: {
  items: Array<{ label: string; href: string }>;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        className="ui-mobile-menu-trigger"
        variant="ghost"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span aria-hidden="true">☰</span>
        <span className="ui-visually-hidden">Menu</span>
      </Button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Menu" side="left">
        <nav aria-label="Mobile navigation" className="ui-mobile-nav">
          {items.map((item) => (
            <a href={item.href} key={item.href} onClick={() => setOpen(false)}>
              {item.label}
              <span aria-hidden="true">↗</span>
            </a>
          ))}
        </nav>
      </Drawer>
    </>
  );
}
