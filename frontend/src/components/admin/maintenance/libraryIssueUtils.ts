export type LibraryIssueStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface ParsedLibraryIssue {
  isLibraryIssue: boolean;
  category: string | null;
  priority: string | null;
  relatedRecord: string | null;
}

export function parseLibraryIssue(description?: string | null): ParsedLibraryIssue {
  const text = String(description || '');
  const marker = /---\s*Smart Intake\s*---/i.test(text);
  if (!marker) return { isLibraryIssue: false, category: null, priority: null, relatedRecord: null };

  const read = (label: string) => {
    const match = text.match(new RegExp(`${label}\\s*:\\s*([^\\n\\r]+)`, 'i'));
    return match?.[1]?.trim() || null;
  };

  return {
    isLibraryIssue: true,
    category: read('Category'),
    priority: read('Priority'),
    relatedRecord: read('Related record'),
  };
}

export function getLibraryIssueStatusLabel(status?: string | null): string {
  switch (String(status || '').toUpperCase()) {
    case 'PENDING': return 'Pending Review';
    case 'IN_PROGRESS': return 'In Progress';
    case 'RESOLVED': return 'Resolved';
    case 'CLOSED': return 'Closed';
    default: return status || 'Unknown';
  }
}

export function isLibraryIssue(description?: string | null, roomNumber?: string | null): boolean {
  return String(roomNumber || '').toUpperCase() === 'LIBRARY' || parseLibraryIssue(description).isLibraryIssue;
}
