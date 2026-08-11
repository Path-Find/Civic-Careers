export function CompanyTitleSuggestions({ titles, selectedTitle, onSelect, onClear }: {
  titles: string[];
  selectedTitle: string | null;
  onSelect: (title: string) => void;
  onClear: () => void;
}) {
  if (titles.length === 0) return null;

  return <section className="company-title-suggestions" aria-labelledby="company-title-suggestions-heading">
    <div className="company-title-suggestions-header">
      <h3 id="company-title-suggestions-heading">Filter by job title</h3>
      {selectedTitle && <button type="button" className="company-title-clear" onClick={onClear}>Clear title</button>}
    </div>
    <div className="company-title-options" role="group" aria-label="Job title suggestions">
      {titles.map(title => <button
        type="button"
        className={`company-title-option ${selectedTitle === title ? 'active' : ''}`}
        aria-pressed={selectedTitle === title}
        key={title}
        onClick={() => onSelect(title)}
      >{title}</button>)}
    </div>
  </section>;
}
