import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Plus, Settings, Users, ArrowLeft } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useSocketStore } from '@/stores/socketStore';
import TaskCard from '@/components/TaskCard';
import CreateTaskModal from '@/components/CreateTaskModal';
import BoardSettingsModal from '@/components/BoardSettingsModal';
import MembersModal from '@/components/MembersModal';

// タスクの型定義
type TaskStatus = 'todo' | 'in_progress' | 'done';

interface Task {
  id: number;
  board_id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
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

interface Board {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
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

// ステータスカラムの定義
const statusColumns: Record<TaskStatus, { title: string; color: string }> = {
  todo: { title: '未対応', color: 'bg-gray-100' },
  in_progress: { title: '対応中', color: 'bg-blue-100' },
  done: { title: '完了', color: 'bg-green-100' },
};

export default function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { socket, joinBoard, leaveBoard } = useSocketStore();
  
  const [board, setBoard] = useState<Board | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberRole, setMemberRole] = useState<string>('member');
  const [isLoading, setIsLoading] = useState(true);
  
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMembersOpen, setIsMembersOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'todo' | 'in_progress' | 'done'>('todo');

  useEffect(() => {
    if (boardId) {
      fetchBoardData();
      joinBoard(Number(boardId));
    }

    return () => {
      if (boardId) {
        leaveBoard(Number(boardId));
      }
    };
  }, [boardId]);

  useEffect(() => {
    if (!socket) return;

    // Socket.ioイベントリスナー
    socket.on('task-created', handleTaskCreated);
    socket.on('task-updated', handleTaskUpdated);
    socket.on('task-deleted', handleTaskDeleted);
    socket.on('tasks-reordered', handleTasksReordered);
    socket.on('board-updated', handleBoardUpdated);
    socket.on('member-added', handleMemberAdded);
    socket.on('member-removed', handleMemberRemoved);

    return () => {
      socket.off('task-created');
      socket.off('task-updated');
      socket.off('task-deleted');
      socket.off('tasks-reordered');
      socket.off('board-updated');
      socket.off('member-added');
      socket.off('member-removed');
    };
  }, [socket, tasks]);

  const fetchBoardData = async () => {
    try {
      const [boardRes, tasksRes] = await Promise.all([
        api.get(`/boards/${boardId}`),
        api.get(`/tasks/board/${boardId}`),
      ]);

      setBoard(boardRes.data.board);
      setMembers(boardRes.data.members);
      setTasks(tasksRes.data.tasks);
      
      // 現在のユーザーのロールを見つける
      const currentUser = boardRes.data.members.find(
        (m: Member) => m.email === localStorage.getItem('userEmail')
      );
      if (currentUser) {
        setMemberRole(currentUser.role);
      }
    } catch (error) {
      toast.error('ボードの読み込みに失敗しました');
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  // Socket.ioイベントハンドラー
  const handleTaskCreated = (data: { task: Task }) => {
    setTasks((prev) => [...prev, data.task]);
  };

  const handleTaskUpdated = (data: { task: Task }) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === data.task.id ? data.task : task))
    );
  };

  const handleTaskDeleted = (data: { taskId: number }) => {
    setTasks((prev) => prev.filter((task) => task.id !== data.taskId));
  };

  const handleTasksReordered = (_data: { updates: any[] }) => {
    // タスクの順序を更新
    fetchBoardData();
  };

  const handleBoardUpdated = (data: { board: Board }) => {
    setBoard(data.board);
  };

  const handleMemberAdded = (data: { member: Member }) => {
    setMembers((prev) => [...prev, data.member]);
  };

  const handleMemberRemoved = (data: { memberId: number }) => {
    setMembers((prev) => prev.filter((member) => member.id !== data.memberId));
  };

  // ドラッグ＆ドロップ処理
  const handleDragEnd = async (result: DropResult) => {
    // ドロップ先がない場合（カラム外にドロップ）は何もしない
    if (!result.destination) return;

    const { source, destination, draggableId } = result;
    const taskId = parseInt(draggableId.replace('task-', ''));

    // 同じ位置にドロップした場合は何もしない
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // 移動対象のタスクを取得
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // ドロップ先のステータスを取得（droppableIdがstatusと対応）
    const newStatus = destination.droppableId as TaskStatus;
    
    console.log(`タスク ${taskId} を ${source.droppableId} から ${newStatus} に移動`);
    
    // 楽観的UI更新：APIレスポンスを待たずに即座にUIを更新
    setTasks(prevTasks =>
      prevTasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus } : t
      )
    );

    try {
      // バックエンドAPIでステータス更新
      await api.patch(`/tasks/${taskId}/status`, { status: newStatus });
      
      // Socket.ioでリアルタイム更新を他のユーザーに通知
      socket?.emit('task-updated', {
        task: { ...task, status: newStatus, id: taskId },
        boardId: Number(boardId)
      });
      
      toast.success('タスクを移動しました');
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('タスクの移動に失敗しました');
      // エラー時は楽観的更新を取り消すためにデータを再取得
      fetchBoardData();
    }
  };

  // 指定されたステータスのタスクを取得し、position順にソート
  const getTasksByStatus = (status: TaskStatus): Task[] => {
    return tasks
      .filter((task) => task.status === status)
      .sort((a, b) => a.position - b.position);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!board) {
    return null;
  }

  return (
    <div className="h-full">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-2">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{board.name}</h1>
          <div className="flex items-center space-x-2 ml-auto">
            <button
              onClick={() => setIsMembersOpen(true)}
              className="btn btn-secondary flex items-center space-x-2"
            >
              <Users className="w-4 h-4" />
              <span>{members.length}</span>
            </button>
            {(memberRole === 'owner' || memberRole === 'admin') && (
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="btn btn-secondary"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        {board.description && (
          <p className="text-gray-600 ml-11">{board.description}</p>
        )}
      </div>

      {/* カンバンボード：ドラッグ&ドロップ対応 */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.keys(statusColumns) as TaskStatus[]).map((status) => (
            <div key={status} className="flex flex-col">
              {/* カラムヘッダー */}
              <div className={`px-4 py-2 rounded-t-lg ${statusColumns[status].color}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    {statusColumns[status].title}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedStatus(status);
                      setIsCreateTaskOpen(true);
                    }}
                    className="p-1 hover:bg-white/50 rounded transition-colors"
                  >
                    <Plus className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              </div>
              
              {/* ドロップ可能エリア：droppableIdをstatusと同じにすることで、handleDragEndで判別 */}
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 p-4 rounded-b-lg min-h-[200px] transition-all duration-300 ${
                      snapshot.isDraggingOver
                        ? 'bg-yellow-50 border-2 border-dashed border-yellow-300 shadow-inner'
                        : 'bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {/* ドラッグ可能なタスクカード：draggableIdをtask.idと同じにすることで、handleDragEndで判別 */}
                    {getTasksByStatus(status).map((task, index) => (
                      <Draggable
                        key={`task-${task.id}`}
                        draggableId={`task-${task.id}`}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`mb-3 transition-all duration-200 ${
                              snapshot.isDragging
                                ? 'transform rotate-2 scale-105 shadow-2xl z-50'
                                : 'transform rotate-0 scale-100'
                            }`}
                          >
                            <TaskCard
                              task={task}
                              members={members}
                              onUpdate={fetchBoardData}
                              isDragging={snapshot.isDragging}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* モーダル */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        boardId={Number(boardId)}
        initialStatus={selectedStatus}
        members={members}
        onTaskCreated={(task) => {
          setTasks([...tasks, task]);
          socket?.emit('task-created', { boardId: Number(boardId), task });
        }}
      />

      <BoardSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        board={board}
        onUpdate={(updatedBoard) => {
          setBoard(updatedBoard);
          socket?.emit('board-updated', { boardId: Number(boardId), board: updatedBoard });
        }}
      />

      <MembersModal
        isOpen={isMembersOpen}
        onClose={() => setIsMembersOpen(false)}
        boardId={Number(boardId)}
        members={members}
        memberRole={memberRole}
        onMembersUpdate={fetchBoardData}
      />
    </div>
  );
}