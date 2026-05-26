// src/main.jsx
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { supabase } from './supabaseClient';
import './index.css'; // Garante que os estilos do Tailwind sejam carregados

function Main() {
  const [sessionUser, setSessionUser] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [tema, setTema] = useState('dark');
  
  // Estados para controlar o fluxo de redefinição de senha
  const [emRecuperacao, setEmRecuperacao] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);

  useEffect(() => {
    // 1. Verifica se já existe uma sessão de usuário ativa ao carregar a página
    const checarSessao = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setSessionUser(session.user);
        }
      } catch (err) {
        console.error("Erro ao verificar sessão inicial:", err);
      } finally {
        setLoadingInitial(false); // Força a saída do loading para evitar tela branca
      }
    };

    checarSessao();

    // 2. Ouve em tempo real as mudanças de autenticação (Login, Logout, Recuperação)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setSessionUser(session.user);
      } else {
        setSessionUser(null);
      }

      // Disparado quando o usuário clica no link enviado para o e-mail
      if (event === 'PASSWORD_RECOVERY') {
        setEmRecuperacao(true);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const handleAtualizarSenhaRecuperada = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) return alert("A nova senha deve ter pelo menos 6 caracteres.");
    
    setLoadingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setLoadingSenha(false);
    
    if (error) {
      alert("Erro ao atualizar a senha: " + error.message);
    } else {
      alert("Sua senha foi atualizada com sucesso!");
      setEmRecuperacao(false);
      setNovaSenha('');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionUser(null);
  };

  // 1. Tela de Carregamento Inicial (Previne o congelamento visual)
  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs font-mono text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <span className="text-xl animate-spin">⏳</span>
          <span>Autenticando sessão segura...</span>
        </div>
      </div>
    );
  }

  // 2. Tela de Redefinição de Senha (Ativada pelo link do e-mail)
  if (emRecuperacao) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${tema === 'dark' ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-900'}`}>
        <div className={`w-full max-w-sm p-6 border rounded-2xl ${tema === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xl'}`}>
          <h2 className="text-xl font-black mb-2 text-center">🔐 Criar Nova Senha</h2>
          <p className="text-xs text-slate-500 mb-4 text-center">Sua identidade foi confirmada por e-mail. Defina a sua nova senha de acesso abaixo:</p>
          <form onSubmit={handleAtualizarSenhaRecuperada} className="space-y-4">
            <input 
              type="password" 
              required
              placeholder="Digite a nova senha forte" 
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2 text-xs focus:outline-none ${tema === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-100 border-slate-300'}`}
            />
            <button type="submit" disabled={loadingSenha} className="w-full bg-violet-600 hover:bg-violet-500 text-white py-2 rounded-xl text-xs font-semibold cursor-pointer">
              {loadingSenha ? 'Atualizando...' : 'Confirmar Nova Senha'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. Fluxo de Telas Normal (Usuário Deslogado -> Login | Logado -> Dashboard)
  if (!sessionUser) {
    return <Login onLoginSuccess={(user) => setSessionUser(user)} tema={tema} setTema={setTema} />;
  }

  return <Dashboard user={sessionUser} onLogout={handleLogout} tema={tema} setTema={setTema} />;
}

// Renderização oficial no nó Root do HTML
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>
);