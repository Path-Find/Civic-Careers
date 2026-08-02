export function ListSortControls({ sortNewest, deadlineDays, newlyAdded, onMostRecent, onClosingSoon, onNewlyAdded, className = 'list-sort-options' }: {
  sortNewest: boolean;
  deadlineDays: number | null;
  newlyAdded: boolean;
  onMostRecent: () => void;
  onClosingSoon: () => void;
  onNewlyAdded: () => void;
  className?: string;
}) {
  return <div className={className}>
    <button className={sortNewest ? 'active' : ''} onClick={onMostRecent}>Most recent</button>
    <button className={deadlineDays === 14 ? 'active' : ''} onClick={onClosingSoon}>Closing within 14 days</button>
    <button className={newlyAdded ? 'active' : ''} onClick={onNewlyAdded}>Newly added</button>
  </div>;
}
