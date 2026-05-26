// src/App.jsx
import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import { supabase } from './supabaseClient';

export default function App() {
  const [sessionUser, setSessionUser] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [tema, setTema] = useState('dark');
  
  // Estado para controlar o modal de troca de senha forçada
  const [emRecuperacao, setEmRecuperacao] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [loadingSenha, setLoadingSenha] = useState(false);

  useEffect(() => {
    // 1. Verificar sessão existente
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setSessionUser(session.user);
      setLoadingInitial(false);
    });

    // 2. Escutar mudanças na sessão (Login, Logout e Recuperação)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) setSessionUser(session.user);
      else setSessionUser(null);

      // O Supabase dispara o evento 'PASSWORD_RECOVERY' quando o usuário vem do link do e-mail
      if (event === 'PASSWORD_RECOVERY') {
        setEmRecuperacao(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAtualizarSenhaRecuperada = async (e) => {
    e.preventDefault();
    if (novaSenha.length < 6) return alert("A nova senha deve ter pelo menos 6 dígitos.");
    
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

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-xs font-mono text-slate-400">
        Autenticando sessão segura...
      </div>
    );
  }

  // Se o usuário clicou no link do e-mail, exibe a tela de redefinição
  if (emRecuperacao) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${tema === 'dark' ? 'bg-zinc-950 text-white' : 'bg-slate-50 text-zinc-900'}`}>
        <div className={`w-full max-w-sm p-6 border rounded-2xl ${tema === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-xl'}`}>
          <h2 className="text-xl font-black mb-2 text-center">🔐 Criar Nova Senha</h2>
          <p className="text-xs text-slate-500 mb-4 text-center">Sua identidade foi confirmada por e-mail. Defina sua nova senha de acesso abaixo:</p>
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

  // Fluxo de telas normal
  if (!sessionUser) {
    return <Login onLoginSuccess={(user) => setSessionUser(user)} tema={tema} setTema={setTema} />;
  }

  return <Dashboard user={sessionUser} onLogout={handleLogout} tema={tema} setTema={setTema} />;
}