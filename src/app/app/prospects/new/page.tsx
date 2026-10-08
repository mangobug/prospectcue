import Link from 'next/link';
import { ProspectForm } from '@/components/prospect-form';
export default function NewProspect() {
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">Prospects / New</div>
          <h1>Add an opportunity.</h1>
          <p className="muted">
            Record the public business information you know.
          </p>
        </div>
        <Link href="/app/prospects">Back to prospects →</Link>
      </div>
      <div className="card">
        <ProspectForm />
      </div>
    </>
  );
}
