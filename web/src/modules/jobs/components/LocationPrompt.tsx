export function LocationPrompt({
  city,
  error,
  requesting,
  onCityChange,
  onSubmit,
  onRetry,
  onClose,
}: {
  city: string;
  error: string | null;
  requesting: boolean;
  onCityChange: (value: string) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  return <div className="location-prompt-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="location-prompt" role="dialog" aria-modal="true" aria-labelledby="location-prompt-title">
      <div className="location-prompt-header">
        <div>
          <h2 id="location-prompt-title">Find jobs near you</h2>
          <p>We’ll use your city to match jobs with the same city-level location. Your coordinates are used once to identify the city and aren’t saved.</p>
        </div>
        <button type="button" className="location-prompt-close" onClick={onClose} aria-label="Close location prompt">×</button>
      </div>
      {requesting ? <div className="location-prompt-status" role="status">Asking for your location…</div> : <>
        {error && <p className="location-prompt-error" role="alert">{error}</p>}
        <button type="button" className="location-prompt-primary" onClick={onRetry}>Use browser location</button>
        <div className="location-prompt-divider"><span>or enter your city</span></div>
        <form onSubmit={event => { event.preventDefault(); onSubmit(); }}>
          <label htmlFor="near-me-city">City</label>
          <div className="location-prompt-input-row">
            <input id="near-me-city" value={city} onChange={event => onCityChange(event.target.value)} placeholder="e.g. Toronto" autoFocus />
            <button type="submit" disabled={!city.trim()}>Use city</button>
          </div>
        </form>
      </>}
    </section>
  </div>;
}
