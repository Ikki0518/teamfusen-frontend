import { useState } from 'react';
import { X, UserPlus, Mail, Shield, User, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

interface Member {
  id: number;
  email: string;
  name: string;
  role: string;
  joined_at: string;
}

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: number;
  members: Member[];
  memberRole: string;
  onMembersUpdate: () => void;
}

export default function MembersModal({
  isOpen,
  onClose,
  boardId,
  members,
  memberRole,
  onMembersUpdate,
}: MembersModalProps) {
  const { user } = useAuthStore();
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');

  if (!isOpen) return null;

  const canManageMembers = memberRole === 'owner' || memberRole === 'admin';

  const handleInvite = async () => {
    setIsInviting(true);
    try {
      const response = await api.post('/members/invite', {
        boardId,
        email: inviteEmail || undefined,
      });
      
      setInviteLink(response.data.inviteLink);
      toast.success('招待リンクを作成しました');
      
      // クリップボードにコピー
      if (navigator.clipboard) {
        navigator.clipboard.writeText(response.data.inviteLink);
        toast.success('招待リンクをクリップボードにコピーしました');
      }
    } catch (error) {
      toast.error('招待リンクの作成に失敗しました');
    } finally {
      setIsInviting(false);
    }
  };

  const handleChangeRole = async (memberId: number, newRole: 'admin' | 'member') => {
    try {
      await api.put(`/members/${boardId}/members/${memberId}`, {
        role: newRole,
      });
      toast.success('ロールを変更しました');
      onMembersUpdate();
    } catch (error) {
      toast.error('ロールの変更に失敗しました');
    }
  };

  const handleRemoveMember = async (memberId: number, memberName: string) => {
    if (!confirm(`${memberName}さんをボードから削除しますか？`)) return;

    try {
      await api.delete(`/members/${boardId}/members/${memberId}`);
      toast.success('メンバーを削除しました');
      onMembersUpdate();
    } catch (error) {
      toast.error('メンバーの削除に失敗しました');
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return 'オーナー';
      case 'admin':
        return '管理者';
      default:
        return 'メンバー';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
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

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                メンバー管理
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* 招待セクション */}
            {canManageMembers && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center space-x-2">
                  <UserPlus className="w-4 h-4" />
                  <span>メンバーを招待</span>
                </h4>
                
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="メールアドレス（任意）"
                      className="input flex-1"
                    />
                    <button
                      onClick={handleInvite}
                      disabled={isInviting}
                      className="btn btn-primary flex items-center space-x-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>{isInviting ? '作成中...' : '招待リンクを作成'}</span>
                    </button>
                  </div>
                  
                  {inviteLink && (
                    <div className="p-3 bg-white rounded border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">招待リンク（クリップボードにコピー済み）:</p>
                      <p className="text-sm font-mono break-all text-gray-800">
                        {inviteLink}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* メンバーリスト */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900 mb-3">
                メンバー一覧 ({members.length}人)
              </h4>
              
              <div className="max-h-96 overflow-y-auto">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-medium">
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{member.name}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded text-sm">
                        {getRoleIcon(member.role)}
                        <span>{getRoleLabel(member.role)}</span>
                      </div>
                      
                      {canManageMembers && member.role !== 'owner' && member.id !== user?.id && (
                        <div className="flex items-center space-x-1">
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value as 'admin' | 'member')}
                            className="text-sm border-gray-300 rounded focus:ring-primary-500 focus:border-primary-500"
                          >
                            <option value="member">メンバー</option>
                            <option value="admin">管理者</option>
                          </select>
                          
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="メンバーを削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto btn btn-secondary"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}