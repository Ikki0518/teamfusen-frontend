import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { UserPlus, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function InvitePage() {
  const { token: inviteToken } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { token: authToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ログインしていない場合はログインページへ
    if (!authToken) {
      // 招待トークンをセッションストレージに保存
      if (inviteToken) {
        sessionStorage.setItem('inviteToken', inviteToken);
      }
      navigate(`/login`);
    }
  }, [authToken, inviteToken, navigate]);

  const handleAcceptInvite = async () => {
    if (!inviteToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post(`/members/accept-invite/${inviteToken}`);
      toast.success('ボードに参加しました！');
      
      // 参加したボードへ遷移
      navigate(`/board/${response.data.board.id}`);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || '招待の受け入れに失敗しました';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // ログイン後、セッションストレージから招待トークンを取得
  useEffect(() => {
    if (authToken && !inviteToken) {
      const savedToken = sessionStorage.getItem('inviteToken');
      if (savedToken) {
        sessionStorage.removeItem('inviteToken');
        navigate(`/invite/${savedToken}`);
      }
    }
  }, [authToken, inviteToken, navigate]);

  if (!authToken) {
    return null; // ログインページへリダイレクト中
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
            <UserPlus className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            ボードへの招待
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            あなたはチームボードに招待されています
          </p>
        </div>

        <div className="card p-6">
          {error ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <p className="text-sm">{error}</p>
              </div>
              
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => navigate('/')}
                  className="btn btn-primary"
                >
                  ダッシュボードへ戻る
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-gray-600 text-center">
                「参加する」をクリックして、チームボードに参加しましょう
              </p>
              
              <div className="flex flex-col space-y-2">
                <button
                  onClick={handleAcceptInvite}
                  disabled={isLoading}
                  className="btn btn-primary"
                >
                  {isLoading ? '処理中...' : '参加する'}
                </button>
                
                <button
                  onClick={() => navigate('/')}
                  disabled={isLoading}
                  className="btn btn-secondary"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}