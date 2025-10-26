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
        <h2 className="text-xl font-primary font-semibold text-primary-text">
          Quick Actions
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          onClick={onCreateRoom}
          className="h-20 flex items-center justify-center gap-3 btn-primary"
        >
          <Plus className="w-6 h-6" />
          <span className="font-medium">Create New Room</span>
        </Button>
        
        <Button
          onClick={onJoinRoom}
          variant="secondary"
          className="h-20 flex items-center justify-center gap-3 border-default hover:bg-background-tertiary"
        >
          <Users className="w-6 h-6 text-blue-600" />
          <span className="font-medium text-blue-600">Join Room by Code</span>
        </Button>
      </div>
    </div>
  );
}