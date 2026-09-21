export default function AgencyLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite" aria-label="Yükleniyor">
      <div className="h-8 w-64 rounded-lg bg-paper-4 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="card p-4 h-20 animate-pulse bg-paper-2" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="card h-56 animate-pulse bg-paper-2" />
        ))}
      </div>
    </div>
  );
}
