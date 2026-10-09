import type { Attribution } from '@/lib/discovery/types';

export function GoogleAttribution({
  contributors = [],
}: {
  contributors?: Attribution[];
}) {
  const unique = contributors.filter(
    (a, i) =>
      contributors.findIndex((b) => b.name === a.name && b.url === a.url) === i,
  );
  return (
    <div className="source-attribution">
      <a
        href="https://maps.google.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className="google-maps-attribution" translate="no">
          Google Maps
        </span>
      </a>
      {unique.map((a, i) => (
        <span key={`${a.name}-${i}`}>
          {' '}
          ·{' '}
          {a.url ? (
            <a href={a.url} target="_blank" rel="noopener noreferrer">
              {a.name}
            </a>
          ) : (
            a.name
          )}
        </span>
      ))}
    </div>
  );
}
export function OvertureAttribution({
  contributors = [],
}: {
  contributors?: Attribution[];
}) {
  return (
    <div className="source-attribution">
      Data from{' '}
      <a
        href="https://docs.overturemaps.org/guides/places/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Overture Maps Places
      </a>{' '}
      ·{' '}
      <a
        href="https://docs.overturemaps.org/attribution/"
        target="_blank"
        rel="noopener noreferrer"
      >
        Source licenses
      </a>
      {contributors
        .filter(
          (a, i) => contributors.findIndex((b) => b.name === a.name) === i,
        )
        .map((a, i) => (
          <span key={i}> · {a.name}</span>
        ))}
    </div>
  );
}
