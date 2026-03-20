import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus } from 'lucide-react';
import { createAdminUser } from '../utils/setupAdmin';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { signIn } = useAuth();

  const handleCreateAdmin = async () => {
    setLoading(true);
    setError('');
    setMessage('');

    const result = await createAdminUser();

    if (result.success) {
      setMessage(result.message);
      setEmail('admin@nivvio.com');
      setPassword('admin');
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let loginEmail = email;
    if (email.toLowerCase() === 'admin') {
      loginEmail = 'admin@nivvio.com';
    }

    const { error } = await signIn(loginEmail, password);

    if (error) {
      // Se falhar o login real com admin/admin, tentamos o bypass de teste
      if (email.toLowerCase() === 'admin' && password === 'admin') {
        const result = await signIn('admin', 'admin'); // O AuthContext já trata o bypass
        if (result.error) {
          setError('Erro ao acessar com usuário de teste');
        }
      } else {
        setError('Usuário ou senha incorretos');
      }
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1a3d2a] via-[#2d5940] to-[#45b896]">
      <div className="w-full max-w-md px-6">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#4a8b3a] to-[#45b896] rounded-xl mb-4">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1a3d2a] mb-2">NIVVIO POLI</h1>
            <p className="text-gray-600">Plataforma de Inteligência Territorial Eleitoral</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <input
                id="email"
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none transition-all"
                placeholder="Seu usuário (ou 'admin')"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#45b896] focus:border-transparent outline-none transition-all"
                placeholder="Digite sua senha"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#4a8b3a] to-[#45b896] text-white py-3 rounded-lg font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <div className="text-sm text-gray-500 mb-3">
              <p>Usuário de teste: admin</p>
              <p>Senha: admin</p>
            </div>
            <button
              type="button"
              onClick={handleCreateAdmin}
              disabled={loading}
              className="text-sm text-[#4a8b3a] hover:text-[#45b896] font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              <UserPlus size={16} />
              Criar usuário admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
