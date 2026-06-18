import { Plus, Settings } from "lucide-react";

type EmptySpeedDialProps = {
  onAddShortcut: () => void;
  onOpenSettings: () => void;
};

export function EmptySpeedDial({ onAddShortcut, onOpenSettings }: EmptySpeedDialProps) {
  return (
    <section className="empty-dial" aria-label="Empty speed dial">
      <div className="empty-dial-icon" aria-hidden="true">
        <Plus size={26} />
      </div>
      <div className="empty-dial-copy">
        <h1>Start your speed dial</h1>
        <p>Add your first shortcut or import an existing setup.</p>
      </div>
      <div className="empty-dial-actions">
        <button className="button primary" type="button" onClick={onAddShortcut}>
          <Plus size={16} />
          Add shortcut
        </button>
        <button className="button secondary" type="button" onClick={onOpenSettings}>
          <Settings size={16} />
          Settings
        </button>
      </div>
    </section>
  );
}
