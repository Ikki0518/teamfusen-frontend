import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Calendar, Tag } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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

interface EditTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  members: Member[];
  onUpdate: (task: Task) => void;
}

const tagColorOptions = [
  { value: 'red', label: '赤', className: 'bg-red-100 text-red-800' },
  { value: 'blue', label: '青', className: 'bg-blue-100 text-blue-800' },
  { value: 'green', label: '緑', className: 'bg-green-100 text-green-800' },
  { value: 'yellow', label: '黄', className: 'bg-yellow-100 text-yellow-800' },
  { value: 'purple', label: '紫', className: 'bg-purple-100 text-purple-800' },
  { value: 'gray', label: '灰', className: 'bg-gray-100 text-gray-800' },
];

const statusOptions = [
  { value: 'todo', label: '未対応' },
  { value: 'in_progress', label: '対応中' },
  { value: 'done', label: '完了' },
];

export default function EditTaskModal({
  isOpen,
  onClose,
  task,
  members,
  onUpdate,
}: EditTaskModalProps) {
  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    status: task.status,
    assigneeId: task.assignee_id,
    dueDate: task.due_date ? task.due_date.split('T')[0] : '',
    tagColor: task.tag_color || '',
  });
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setIsLoading(true);
    try {
      const response = await api.put(`/tasks/${task.id}`, {
        title: formData.title,
        description: formData.description || null,
        status: formData.status,
        assigneeId: formData.assigneeId,
        dueDate: formData.dueDate || null,
        tagColor: formData.tagColor || null,
      });

      onUpdate(response.data.task);
      toast.success('タスクを更新しました');
      onClose();
    } catch (error) {
      toast.error('タスクの更新に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 z-[9998]"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full z-[9999] relative">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  タスクを編集
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
                  <label htmlFor="task-title" className="label">
                    タイトル <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="task-title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    className="input"
                    placeholder="タスクのタイトル"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="task-description" className="label">
                    説明
                  </label>
                  <textarea
                    id="task-description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="input resize-none"
                    rows={3}
                    placeholder="タスクの詳細を入力"
                  />
                </div>

                <div>
                  <label htmlFor="task-status" className="label">
                    ステータス
                  </label>
                  <select
                    id="task-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value as 'todo' | 'in_progress' | 'done',
                      })
                    }
                    className="input"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="task-assignee" className="label flex items-center space-x-1">
                      <User className="w-4 h-4" />
                      <span>担当者</span>
                    </label>
                    <select
                      id="task-assignee"
                      value={formData.assigneeId || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          assigneeId: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                      className="input"
                    >
                      <option value="">未割り当て</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="task-due-date" className="label flex items-center space-x-1">
                      <Calendar className="w-4 h-4" />
                      <span>期限</span>
                    </label>
                    <input
                      type="date"
                      id="task-due-date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="label flex items-center space-x-1 mb-2">
                    <Tag className="w-4 h-4" />
                    <span>タグ</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tagColorOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            tagColor: formData.tagColor === option.value ? '' : option.value,
                          })
                        }
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
                          formData.tagColor === option.value
                            ? `${option.className} ring-2 ring-offset-2 ring-gray-400`
                            : `${option.className} hover:ring-2 hover:ring-offset-2 hover:ring-gray-300`
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={!formData.title.trim() || isLoading}
                className="w-full sm:w-auto sm:ml-3 btn btn-primary"
              >
                {isLoading ? '更新中...' : '更新'}
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

  return createPortal(modalContent, document.body);
}