import { useState } from 'react';
import { User, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSocketStore } from '@/stores/socketStore';
import EditTaskModal from './EditTaskModal';

interface Task {
  id: number;
  board_id: number;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  assignee_id: number | null;
  assignee_name: string | null;
  assignee_email: string | null;
  due_date: string | null;
  tag_color: string | null;
  position: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: number;
  email: string;
  name: string;
  role: string;
  joined_at: string;
}

interface TaskCardProps {
  task: Task;
  members: Member[];
  onUpdate: () => void;
  isDragging?: boolean;
}

const tagColors: Record<string, string> = {
  red: 'bg-red-200 border-red-300',
  blue: 'bg-blue-200 border-blue-300',
  green: 'bg-green-200 border-green-300',
  yellow: 'bg-yellow-200 border-yellow-300',
  purple: 'bg-purple-200 border-purple-300',
  pink: 'bg-pink-200 border-pink-300',
  orange: 'bg-orange-200 border-orange-300',
  gray: 'bg-gray-200 border-gray-300',
};

export default function TaskCard({ task, members, onUpdate, isDragging = false }: TaskCardProps) {
  const { socket } = useSocketStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('このタスクを削除しますか？')) return;

    try {
      await api.delete(`/tasks/${task.id}`);
      socket?.emit('task-deleted', { boardId: task.board_id, taskId: task.id });
      toast.success('タスクを削除しました');
      onUpdate();
    } catch (error) {
      toast.error('タスクの削除に失敗しました');
    }
  };

  const handleCardClick = () => {
    setIsEditModalOpen(true);
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <>
      <div
        className={`relative p-4 transition-all duration-200 transform cursor-pointer ${
          isDragging
            ? 'shadow-2xl scale-105 rotate-2 z-50'
            : 'hover:scale-105 hover:shadow-lg hover:-rotate-1'
        } ${
          task.tag_color && tagColors[task.tag_color]
            ? tagColors[task.tag_color]
            : 'bg-yellow-100 border-yellow-200'
        } border-2 rounded-lg shadow-md`}
        onClick={handleCardClick}
        title="クリックして編集"
      >
        {/* ふせんの角を表現する小さな三角形 */}
        <div className="absolute top-0 right-0 w-4 h-4 bg-gray-400 opacity-20 transform rotate-45 translate-x-2 -translate-y-2 rounded-sm"></div>
        
        <div className="flex justify-between items-start mb-2">
          <h4 className="font-medium text-gray-900 flex-1 pr-2">{task.title}</h4>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full mb-1"></div>
              <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center space-x-2 text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>削除</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {task.description && (
          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{task.description}</p>
        )}

        <div className="space-y-2">
          {task.assignee_name && (
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="w-4 h-4" />
              <span>{task.assignee_name}</span>
            </div>
          )}

          {task.due_date && (
            <div className={`flex items-center space-x-2 text-sm ${
              isOverdue ? 'text-red-600' : 'text-gray-600'
            }`}>
              <Calendar className="w-4 h-4" />
              <span>
                {format(new Date(task.due_date), 'M月d日', { locale: ja })}
              </span>
            </div>
          )}

        </div>
      </div>

      {isEditModalOpen && (
        <EditTaskModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          task={task}
          members={members}
          onUpdate={(updatedTask) => {
            socket?.emit('task-updated', { boardId: task.board_id, task: updatedTask });
            onUpdate();
          }}
        />
      )}
    </>
  );
}