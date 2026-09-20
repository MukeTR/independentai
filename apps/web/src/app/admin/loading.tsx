export default function AdminLoading() {
  return (
    <div className="max-w-6xl space-y-6" aria-busy="true" aria-live="polite" aria-label="Yükleniyor…">
      <div className="h-3 w-24 rounded bg-paper-4 animate-pulse" />
      <div className="h-9 w-64 rounded-lg bg-paper-4 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="card p-4 h-24 animate-pulse bg-paper-2" />
        ))}
      </div>
      <div className="card h-72 animate-pulse bg-paper-2" />
    </div>
  );
}
