import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function JoinRoomModal({
  isOpen,
  onClose,
  roomCode,
  setRoomCode,
  onSubmit,
  isLoading
}: JoinRoomModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Join Room"
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Enter room code"
          label="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          disabled={isLoading}
          maxLength={20}
        />
        
        <p className="text-sm text-slate-600">
          Ask the room creator for the room code to join
        </p>
        
        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isLoading}
            disabled={!roomCode.trim()}
          >
            Join Room
          </Button>
        </div>
      </form>
    </Modal>
  );
}