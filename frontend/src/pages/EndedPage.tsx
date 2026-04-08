import { useNavigate } from 'react-router-dom';

export function EndedPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 px-4">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Conversation ended</h1>
        <p className="text-gray-600">Thanks for using qhat!</p>
        <button
          onClick={() => navigate('/')}
          className="rounded-lg bg-blue-600 px-6 py-3 text-white font-medium hover:bg-blue-700 transition-colors"
        >
          Start a new conversation
        </button>
      </div>
    </div>
  );
}
