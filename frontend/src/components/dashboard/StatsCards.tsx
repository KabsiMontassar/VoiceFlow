import { MessageSquare, Users, Clock, TrendingUp } from 'lucide-react';

interface StatsCardsProps {
  totalRooms: number;
  totalMembers: number;
  totalMessages: number;
}

export default function StatsCards({ totalRooms, totalMembers, totalMessages }: StatsCardsProps) {
  const stats = [
    {
      label: "Total Rooms",
      value: totalRooms,
      icon: MessageSquare,
      color: "primary"
    },
    {
      label: "Active Members",
      value: totalMembers,
      icon: Users,
      color: "green"
    },
    {
      label: "Total Messages",
      value: totalMessages,
      icon: Clock,
      color: "blue"
    },
    {
      label: "Activity",
      value: "High",
      icon: TrendingUp,
      color: "orange"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const colorClasses = {
          primary: "bg-blue-100 text-blue-600",
          green: "bg-green-100 text-green-600",
          blue: "bg-blue-100 text-blue-600",
          orange: "bg-orange-100 text-orange-600"
        };

        return (
          <div key={index} className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">{stat.label}</p>
                <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}