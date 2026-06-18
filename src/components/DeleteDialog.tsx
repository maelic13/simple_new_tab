import { AlertTriangle, X } from "lucide-react";

import type { Shortcut } from "../types";

type DeleteDialogProps = {
  shortcut: Shortcut;
  isBusy: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteDialog({ shortcut, isBusy, error, onCancel, onConfirm }: DeleteDialogProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="dialog compact-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-title">
        <div className="dialog-header">
          <h2 id="delete-title">Delete shortcut</h2>
          <button className="icon-button" title="Close" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="delete-copy">
          <AlertTriangle size={20} aria-hidden="true" />
          <p>{shortcut.name}</p>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="dialog-footer">
          <button className="button secondary" type="button" onClick={onCancel} disabled={isBusy}>
            Cancel
          </button>
          <button className="button danger" type="button" onClick={onConfirm} disabled={isBusy}>
            Delete
          </button>
        </div>
      </section>
    </div>
  );
}
