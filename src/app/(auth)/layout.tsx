import { product } from '@/lib/config';
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="auth">
      <aside className="auth-aside">
        <div className="brand">
          <span className="mark">A</span>
          {product.name}
        </div>
        <div>
          <div className="eyebrow" style={{ color: '#6ee7b7' }}>
            From prospect to partnership
          </div>
          <h1>Your next client starts with a clear plan.</h1>
          <p>
            Keep prospects, conversations, and follow-ups in one focused
            workspace.
          </p>
        </div>
        <small>Built for independent designers and digital agencies.</small>
      </aside>
      <section className="auth-main">{children}</section>
    </main>
  );
}
