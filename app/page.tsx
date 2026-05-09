export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-7xl mx-auto px-8 py-12">
        <h1 className="text-4xl font-bold mb-3">Welcome to AUTOCLUB ERP</h1>
        <p className="text-zinc-400 text-lg mb-12">
          Fleet & Financial Management System
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DashboardCard
            title="Get Started"
            description="Navigate through the menu to manage your fleet operations"
          />
          <DashboardCard
            title="Dashboard"
            description="View key metrics and operational overview"
          />
          <DashboardCard
            title="Documentation"
            description="Learn more about AUTOCLUB ERP features"
          />
        </div>
      </div>
    </div>
  );
}

function DashboardCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 hover:border-zinc-700 transition-colors">
      <h3 className="font-semibold text-white mb-2">{title}</h3>
      <p className="text-zinc-400 text-sm">{description}</p>
    </div>
  );
}