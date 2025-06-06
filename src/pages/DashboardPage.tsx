import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Calendar, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import CreateBoardModal from '@/components/CreateBoardModal';

interface Board {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  role: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await api.get('/boards');
      setBoards(response.data.boards);
    } catch (error) {
      toast.error('ボードの取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBoard = async (name: string, description: string) => {
    try {
      const response = await api.post('/boards', { name, description });
      setBoards([response.data.board, ...boards]);
      setIsCreateModalOpen(false);
      toast.success('ボードを作成しました');
    } catch (error) {
      toast.error('ボードの作成に失敗しました');
    }
  };

  const handleDeleteBoard = async (boardId: number) => {
    if (!confirm('本当にこのボードを削除しますか？')) {
      return;
    }

    try {
      await api.delete(`/boards/${boardId}`);
      setBoards(boards.filter((board) => board.id !== boardId));
      toast.success('ボードを削除しました');
    } catch (error) {
      toast.error('ボードの削除に失敗しました');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="mt-2 text-gray-600">参加しているボードの一覧</p>
      </div>

      <div className="mb-6">
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>新しいボードを作成</span>
        </button>
      </div>

      {boards.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            ボードがありません
          </h3>
          <p className="text-gray-500 mb-4">
            新しいボードを作成して、チームメンバーと共有しましょう
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary"
          >
            最初のボードを作成
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/board/${board.id}`}
              className="card p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-gray-900">
                  {board.name}
                </h3>
                {board.role === 'owner' && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteBoard(board.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {board.description && (
                <p className="text-gray-600 mb-4 line-clamp-2">
                  {board.description}
                </p>
              )}
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {format(new Date(board.created_at), 'yyyy年M月d日', { locale: ja })}
                  </span>
                </div>
                <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                  {board.role === 'owner' ? 'オーナー' : 
                   board.role === 'admin' ? '管理者' : 'メンバー'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <CreateBoardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateBoard}
      />
    </div>
  );
}