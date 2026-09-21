export default function DashboardLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite" aria-label="Yükleniyor">
      <div className="h-8 w-56 rounded-lg bg-paper-4 animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card p-6 h-28 animate-pulse bg-paper-2" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card h-72 animate-pulse bg-paper-2" />
        <div className="card h-72 animate-pulse bg-paper-2" />
      </div>
    </div>
  );
}
