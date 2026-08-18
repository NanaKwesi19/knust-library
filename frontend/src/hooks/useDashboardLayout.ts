import { useCallback, useEffect, useRef, useState } from 'react';
import API from '../services/api';

export interface WidgetDefinition {
  /** Stable identifier - do not rename once shipped, saved layouts reference it by key. */
  key: string;
  label: string;
  defaultWidth: 1 | 2;
  defaultHeight: 1 | 2;
}

export interface WidgetLayoutEntry extends WidgetDefinition {
  width: 1 | 2;
  height: 1 | 2;
  isVisible: boolean;
}

interface SavedWidget {
  widgetType: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  isVisible: boolean;
}

function toDefaultLayout(definitions: WidgetDefinition[]): WidgetLayoutEntry[] {
  return definitions.map((d) => ({ ...d, width: d.defaultWidth, height: d.defaultHeight, isVisible: true }));
}

/**
 * Drives a per-user, per-dashboard widget layout (order, size, visibility)
 * backed by the DashboardWidget table. `scope` namespaces the saved rows
 * (e.g. "admin-overview" vs "student-overview") so different dashboards
 * never collide even though they share one table server-side.
 *
 * `definitions` describes the built-in widget catalog and its defaults; any
 * widget not yet in a saved layout (new widget shipped later) appends at the
 * end, visible, with its default size.
 */
export function useDashboardLayout(scope: string, definitions: WidgetDefinition[]) {
  const [layout, setLayout] = useState<WidgetLayoutEntry[]>(() => toDefaultLayout(definitions));
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const definitionsRef = useRef(definitions);
  definitionsRef.current = definitions;

  useEffect(() => {
    let cancelled = false;

    API.get(`/dashboard/widgets`, { params: { scope } })
      .then((res) => {
        if (cancelled) return;
        const saved: SavedWidget[] = res.data?.data || [];
        if (saved.length === 0) return;

        const savedByKey = new Map(saved.map((w) => [w.widgetType, w]));
        const defs = definitionsRef.current;
        const known = defs
          .filter((d) => savedByKey.has(d.key))
          .sort((a, b) => savedByKey.get(a.key)!.positionX - savedByKey.get(b.key)!.positionX)
          .map((d): WidgetLayoutEntry => {
            const s = savedByKey.get(d.key)!;
            return {
              ...d,
              width: (s.width === 2 ? 2 : 1) as 1 | 2,
              height: (s.height === 2 ? 2 : 1) as 1 | 2,
              isVisible: s.isVisible,
            };
          });
        // Widgets shipped after the user last saved a layout - keep them visible at the end.
        const unknown = defs.filter((d) => !savedByKey.has(d.key)).map((d) => ({ ...d, width: d.defaultWidth, height: d.defaultHeight, isVisible: true }));

        setLayout([...known, ...unknown]);
      })
      .catch(() => {
        // No saved layout yet (or offline) - keep the built-in defaults.
      });

    return () => {
      cancelled = true;
    };
  }, [scope]);

  const persist = useCallback(
    (next: WidgetLayoutEntry[]) => {
      setIsSaving(true);
      API.put(
        `/dashboard/widgets`,
        {
          widgets: next.map((w, index) => ({
            widgetType: w.key,
            positionX: index,
            positionY: 0,
            width: w.width,
            height: w.height,
            isVisible: w.isVisible,
          })),
        },
        { params: { scope } }
      )
        .catch(() => {
          // Best-effort - the local state is still correct for this session.
        })
        .finally(() => setIsSaving(false));
    },
    [scope]
  );

  const update = useCallback(
    (next: WidgetLayoutEntry[]) => {
      setLayout(next);
      persist(next);
    },
    [persist]
  );

  const toggleVisible = useCallback(
    (key: string) => {
      update(layout.map((w) => (w.key === key ? { ...w, isVisible: !w.isVisible } : w)));
    },
    [layout, update]
  );

  const move = useCallback(
    (key: string, direction: -1 | 1) => {
      const index = layout.findIndex((w) => w.key === key);
      const targetIndex = index + direction;
      if (index < 0 || targetIndex < 0 || targetIndex >= layout.length) return;
      const next = [...layout];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      update(next);
    },
    [layout, update]
  );

  const toggleWidth = useCallback(
    (key: string) => {
      update(layout.map((w) => (w.key === key ? { ...w, width: (w.width === 1 ? 2 : 1) as 1 | 2 } : w)));
    },
    [layout, update]
  );

  const resetLayout = useCallback(() => {
    setLayout(toDefaultLayout(definitionsRef.current));
    setIsSaving(true);
    API.delete(`/dashboard/widgets`, { params: { scope } })
      .catch(() => {})
      .finally(() => setIsSaving(false));
  }, [scope]);

  return { layout, isEditing, setIsEditing, isSaving, toggleVisible, move, toggleWidth, resetLayout };
}
