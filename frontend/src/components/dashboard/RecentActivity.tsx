import { MessageSquare, Users, Copy, Plus } from 'lucide-react';
import Button from '../ui/Button';

interface Room {
  id: string;
  name: string;
  description?: string;
  code?: string;
  memberCount?: number;
  messageCount?: number;
}

interface RecentActivityProps {
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onCopyRoomCode: (code: string) => void;
}

export default function RecentActivity({ 
  rooms, 
  onJoinRoom, 
  onCreateRoom, 
  onCopyRoomCode 
}: RecentActivityProps) {
  const recentRooms = rooms.slice(0, 6);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif font-semibold text-foreground">
          Recent Activity
        </h2>
        {rooms.length > 6 && (
          <Button variant="ghost" className="text-primary-600">
            View All Rooms
          </Button>
        )}
      </div>

      {rooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentRooms.map((room) => (
            <div
              key={room.id}
              className="bg-white rounded-xl p-6 border border-primary-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => onJoinRoom(room.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                {room.code && (
                  <div 
                    className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer hover:text-primary-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCopyRoomCode(room.code!);
                    }}
                  >
                    <span>{room.code}</span>
                    <Copy className="w-3 h-3" />
                  </div>
                )}
              </div>
              
              <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary-600 transition-colors">
                {room.name}
              </h3>
              
              <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                {room.description || 'No description available'}
              </p>
              
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {room.memberCount || 0} members
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {room.messageCount || 0} messages
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 border border-primary-200 shadow-sm text-center">
          <MessageSquare className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No rooms yet
          </h3>
          <p className="text-neutral-600 mb-6">
            Create your first room to start chatting with your team
          </p>
          <Button
            onClick={onCreateRoom}
            className="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>
      )}
    </div>
  );
}