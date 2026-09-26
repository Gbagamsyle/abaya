"use client";

import { useState } from "react";
import { Button, Drawer, Modal } from "@fenomena/ui";

export function DesignSystemOverlayExamples() {
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="ui-demo-actions">
      <Button variant="outline" onClick={() => setModalOpen(true)}>
        Open modal example
      </Button>
      <Button variant="outline" onClick={() => setDrawerOpen(true)}>
        Open drawer example
      </Button>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Accessible modal">
        <p>
          Native dialog behavior provides Escape-to-close, focus containment, and focus restoration.
        </p>
      </Modal>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Navigation drawer"
        side="right"
      >
        <p>Drawer content remains in the focus-managed dialog until it closes.</p>
      </Drawer>
    </div>
  );
}
