export function ListSortControls({ sortNewest, deadlineDays, newlyAdded, onMostRecent, onClosingSoon, onNewlyAdded, closingSoonDisabled = false, counts, className = 'list-sort-options' }: {
  sortNewest: boolean;
  deadlineDays: number | null;
  newlyAdded: boolean;
  onMostRecent: () => void;
  onClosingSoon: () => void;
  onNewlyAdded: () => void;
  closingSoonDisabled?: boolean;
  counts?: {
    closingSoon?: number;
    newlyAdded?: number;
  };
  className?: string;
}) {
  return <div className={className}>
    <button className={sortNewest ? 'active' : ''} onClick={onMostRecent}>Latest postings</button>
    <button className={deadlineDays === 14 ? 'active' : ''} onClick={onClosingSoon} disabled={closingSoonDisabled}>Closing within 14 days{counts?.closingSoon !== undefined && <span className="list-sort-count"> ({counts.closingSoon.toLocaleString()})</span>}</button>
    <button className={newlyAdded ? 'active' : ''} onClick={onNewlyAdded}>Added in last 7 days{counts?.newlyAdded !== undefined && <span className="list-sort-count"> ({counts.newlyAdded.toLocaleString()})</span>}</button>
  </div>;
}
