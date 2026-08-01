export default function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-primary">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-full ${bgColor} flex items-center justify-center`}
        >
          <span className={`material-symbols-outlined ${color}`}>{icon}</span>
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-on-surface">{value}</p>
        </div>
      </div>
    </div>
  );
}
