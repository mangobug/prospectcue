import { DiscoverySearch } from '@/components/discovery-search';
import { googleKey } from '@/lib/discovery/google';

export default function Discover() {
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">Business discovery</div>
          <h1>Find businesses. Choose your prospects.</h1>
          <p className="muted">
            Search real listings, review the available website details, and save
            selected businesses to your workspace.
          </p>
        </div>
      </div>
      <DiscoverySearch signedIn googleAvailable={!!googleKey()} />
    </>
  );
}
