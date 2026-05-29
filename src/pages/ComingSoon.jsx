export default function ComingSoon({ title = "Page" }) {
  return (
    <div className="page-shell">
      <div className="subtle-panel mx-auto max-w-2xl py-20 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
          {title}
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] text-slate-950">
          Coming Soon
        </h1>
        <p className="mt-3 text-sm text-slate-500">
          This page is not ready yet.
        </p>
      </div>
    </div>
  );
}
