export function HomeQuickFilters({
  deadlineDays,
  newlyAdded,
  locationTerm,
  closingSoonCount,
  newlyAddedCount,
  onClosingSoon,
  onNewlyAdded,
  onNearMe,
}: {
  deadlineDays: number | null;
  newlyAdded: boolean;
  locationTerm: string;
  closingSoonCount?: number;
  newlyAddedCount?: number;
  onClosingSoon: () => void;
  onNewlyAdded: () => void;
  onNearMe: () => void;
}) {
  return <div className="home-quick-filters" aria-label="Quick job filters">
    <button className={deadlineDays === 14 ? 'active' : ''} onClick={onClosingSoon}>
      Ending within 14 days{closingSoonCount !== undefined && <span className="list-sort-count"> ({closingSoonCount.toLocaleString()})</span>}
    </button>
    <button className={newlyAdded ? 'active' : ''} onClick={onNewlyAdded}>
      Added in last 7 days{newlyAddedCount !== undefined && <span className="list-sort-count"> ({newlyAddedCount.toLocaleString()})</span>}
    </button>
    <button className={locationTerm ? 'active' : ''} onClick={onNearMe}>
      Near me{locationTerm && <span className="list-sort-count"> ({locationTerm})</span>}
    </button>
  </div>;
}
