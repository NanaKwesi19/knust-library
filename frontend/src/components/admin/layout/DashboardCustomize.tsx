import React from 'react';
import { Settings2, X, RotateCcw, ArrowLeft, ArrowRight, EyeOff, Eye, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '../../ui/Button';

interface DashboardCustomizeToolbarProps {
  isEditing: boolean;
  onToggleEditing: () => void;
  onReset: () => void;
  isSaving: boolean;
}

/** Enter/exit layout-editing mode, and reset to the built-in default layout. */
export const DashboardCustomizeToolbar: React.FC<DashboardCustomizeToolbarProps> = ({
  isEditing,
  onToggleEditing,
  onReset,
  isSaving,
}) => (
  <div className="flex items-center gap-2">
    {isEditing && (
      <Button variant="ghost" size="sm" onClick={onReset} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
        Reset Layout
      </Button>
    )}
    <Button
      variant={isEditing ? 'primary' : 'secondary'}
      size="sm"
      onClick={onToggleEditing}
      leftIcon={isEditing ? <X className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
    >
      {isEditing ? (isSaving ? 'Saving...' : 'Done') : 'Customize'}
    </Button>
  </div>
);

interface WidgetEditControlsProps {
  isVisible: boolean;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  isWide: boolean;
  onToggleVisible: () => void;
  onMoveLeft: () => void;
  onMoveRight: () => void;
  onToggleWidth: () => void;
}

/**
 * Rendered as a BentoItem's `action` slot while a dashboard is in edit mode.
 * Small icon-button cluster: reorder, resize, show/hide - no drag-and-drop.
 */
export const WidgetEditControls: React.FC<WidgetEditControlsProps> = ({
  isVisible,
  canMoveLeft,
  canMoveRight,
  isWide,
  onToggleVisible,
  onMoveLeft,
  onMoveRight,
  onToggleWidth,
}) => {
  const btnClass =
    'h-6 w-6 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors';

  return (
    <div className="flex items-center gap-0.5">
      <button type="button" onClick={onMoveLeft} disabled={!canMoveLeft} className={btnClass} title="Move earlier">
        <ArrowLeft className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onMoveRight} disabled={!canMoveRight} className={btnClass} title="Move later">
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={onToggleWidth} className={btnClass} title={isWide ? 'Make compact' : 'Make wide'}>
        {isWide ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
      </button>
      <button
        type="button"
        onClick={onToggleVisible}
        className={btnClass}
        title={isVisible ? 'Hide widget' : 'Show widget'}
      >
        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-400" />}
      </button>
    </div>
  );
};
