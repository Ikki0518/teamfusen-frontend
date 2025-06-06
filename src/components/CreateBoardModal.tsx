import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => void;
}

export default function CreateBoardModal({
  isOpen,
  onClose,
  onCreate,
}: CreateBoardModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await onCreate(name, description);
      setName('');
      setDescription('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setName('');
      setDescription('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={handleClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  新しいボードを作成
                </h3>
                <button
                  type="button"
                  onClick={handleClose}
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
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="例: プロジェクトA"
                    required
                    autoFocus
                  />
                </div>

                <div>
                  <label htmlFor="board-description" className="label">
                    説明（任意）
                  </label>
                  <textarea
                    id="board-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input resize-none"
                    rows={3}
                    placeholder="このボードの目的や詳細を記入"
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={!name.trim() || isLoading}
                className="w-full sm:w-auto sm:ml-3 btn btn-primary"
              >
                {isLoading ? '作成中...' : '作成'}
              </button>
              <button
                type="button"
                onClick={handleClose}
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