import { Plus, Users } from 'lucide-react';
import Button from '../ui/Button';

interface QuickActionsProps {
  onCreateRoom: () => void;
  onJoinRoom: () => void;
}

export default function QuickActions({ onCreateRoom, onJoinRoom }: QuickActionsProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-serif font-semibold text-foreground">
          Quick Actions
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={onCreateRoom}
          className="h-20 flex items-center justify-center gap-3 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white border-0"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium">Create New Room</span>
        </Button>
        
        <Button
          onClick={onJoinRoom}
          variant="secondary"
          className="h-20 flex items-center justify-center gap-3 border-primary-200 hover:bg-primary-50"
        >
          <Users className="w-6 h-6 text-primary-600" />
          <span className="font-medium text-primary-600">Join Room by Code</span>
        </Button>
      </div>
    </div>
  );
}