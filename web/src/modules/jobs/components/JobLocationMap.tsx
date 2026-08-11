import { ExternalLink } from 'lucide-react';
import { classifyJobLocation } from '../jobUtils';

export function JobLocationMap({ location }: { location: string | null }) {
  const details = classifyJobLocation(location);
  const mapUrl = details.mapQuery
    ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(details.mapQuery)}`
    : null;

  return <section className="location-map-card" aria-labelledby="location-map-heading">
    <div className="location-map-header">
      <h2 id="location-map-heading">Workplace location</h2>
      <span className={`location-map-precision location-map-precision-${details.precision}`}>{details.label}</span>
    </div>
    <p className="location-map-value">{location?.trim() || 'No workplace location was provided.'}</p>
    {mapUrl ? <a className="location-map-link" href={mapUrl} target="_blank" rel="noopener noreferrer">
      Open source location in map <ExternalLink size={14} />
    </a> : <p className="location-map-note">This posting does not provide one fixed workplace, so no precise map point is shown.</p>}
    <p className="location-map-note">Only the employer-provided location is used. Civic Careers does not infer an exact address.</p>
  </section>;
}
