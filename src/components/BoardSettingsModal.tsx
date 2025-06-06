import { useState } from 'react';
import { X, Save } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Board {
  id: number;
  name: string;
  description: string | null;
  owner_id: number;
  created_at: string;
  updated_at: string;
}

interface BoardSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  onUpdate: (board: Board) => void;
}

export default function BoardSettingsModal({
  isOpen,
  onClose,
  board,
  onUpdate,
}: BoardSettingsModalProps) {
  const [formData, setFormData] = useState({
    name: board.name,
    description: board.description || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setIsLoading(true);
    try {
      const response = await api.put(`/boards/${board.id}`, {
        name: formData.name,
        description: formData.description || null,
      });

      onUpdate(response.data.board);
      toast.success('ボード情報を更新しました');
      onClose();
    } catch (error) {
      toast.error('ボード情報の更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  ボード設定
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="board-name" className="label">
                    ボード名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="board-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="input"
                    placeholder="ボード名"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="board-description" className="label">
                    説明
                  </label>
                  <textarea
                    id="board-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input resize-none"
                    rows={4}
                    placeholder="このボードの目的や詳細を記入"
                  />
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">
                    ボード情報
                  </h4>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div>
                      作成日: {new Date(board.created_at).toLocaleDateString('ja-JP')}
                    </div>
                    <div>
                      更新日: {new Date(board.updated_at).toLocaleDateString('ja-JP')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={!formData.name.trim() || isLoading}
                className="w-full sm:w-auto sm:ml-3 btn btn-primary flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{isLoading ? '保存中...' : '保存'}</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="mt-3 w-full sm:mt-0 sm:w-auto btn btn-secondary"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}