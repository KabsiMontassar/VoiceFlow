import Button from '../ui/Button';
import Modal from '../ui/Modal';
import Input from '../ui/Input';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
  setRoomName: (name: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export default function CreateRoomModal({
  isOpen,
  onClose,
  roomName,
  setRoomName,
  onSubmit,
  isLoading
}: CreateRoomModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Room"
      size="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Input
          type="text"
          placeholder="Room name"
          label="Room Name"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
          disabled={isLoading}
        />
        
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
          >
            Create Room
          </Button>
        </div>
      </form>
    </Modal>
  );
}