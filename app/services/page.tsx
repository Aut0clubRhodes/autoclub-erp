export default function Services() {
  return (
    <div className="min-h-screen bg-transparent p-8 text-white">
      <h1 className="text-3xl font-bold mb-2">Services</h1>
      <p className="text-zinc-400 mb-8">Track maintenance and services</p>
      {/* TODO: Future service QR flow will use one shared QR leading to login + vehicle dropdown. */}
      <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-8 shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
        <p className="text-zinc-500">Services log coming soon...</p>
      </div>
    </div>
  );
}
