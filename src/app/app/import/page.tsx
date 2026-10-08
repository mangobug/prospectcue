import { ImportFlow } from '@/components/import-flow';
export default function ImportPage() {
  return (
    <>
      <div className="heading">
        <div>
          <div className="eyebrow">CSV import</div>
          <h1>Bring your opportunities together.</h1>
          <p className="muted">
            A careful import, with you in control of every record.
          </p>
        </div>
      </div>
      <ImportFlow />
    </>
  );
}
