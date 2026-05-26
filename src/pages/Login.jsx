// src/pages/Login.jsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Login({ onLoginSuccess, tema, setTema }) {
  // Estados de navegação interna: 'login' | 'cadastro' | 'recuperar'
  const [modo, setModo] = useState('login'); 
  
  const [nome, setNome] = useState(''); // Novo estado para o nome do usuário
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState({ texto: '', tipo: '' }); // 'sucesso' ou 'erro'

  const limparFormulario = (novoModo) => {
    setModo(novoModo);
    setNome('');
    setEmail('');
    setSenha('');
    setConfirmarSenha('');
    setMensagem({ texto: '', tipo: '' });
  };

  const handleAutenticacao = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensagem({ texto: '', tipo: '' });

    try {
      // --- FLUXO 1: CADASTRO DE USUÁRIO ---
      if (modo === 'cadastro') {
        if (!nome.trim()) {
          throw new Error('Por favor, insira o seu nome.');
        }
        if (senha !== confirmarSenha) {
          throw new Error('As senhas digitadas não coincidem.');
        }
        if (senha.length < 6) {
          throw new Error('A senha precisa ter no mínimo 6 caracteres.');
        }

        // Enviando o nome dentro de options.data (user_metadata)
        const { error } = await supabase.auth.signUp({ 
          email, 
          password: senha,
          options: {
            data: {
              display_name: nome
            }
          }
        });
        
        if (error) throw error;

        setMensagem({
          texto: 'Conta criada com sucesso! Enviamos um e-mail de confirmação. Ative-o antes de entrar.',
          tipo: 'sucesso'
        });
        setModo('login');
        setSenha('');
        setConfirmarSenha('');
      } 
      
      // --- FLUXO 2: RECUPERAÇÃO DE SENHA ---
      else if (modo === 'recuperar') {
        if (!email.trim()) throw new Error('Por favor, digite o seu e-mail.');

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;

        setMensagem({
          texto: 'Se o e-mail estiver cadastrado, um link de redefinição de senha será enviado em instantes.',
          tipo: 'sucesso'
        });
      } 
      
      // --- FLUXO 3: LOGIN TRADICIONAL ---
      else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;

        if (data?.user) {
          onLoginSuccess(data.user);
        }
      }
    } catch (error) {
      setMensagem({ texto: error.message || 'Ocorreu um erro inesperado.', tipo: 'erro' });
    } finally {
      setLoading(false);
    }
  };

  // Estilos visuais dinâmicos baseados no tema
  const estiloFundoApp = tema === 'dark' ? 'bg-zinc-950 text-slate-100' : 'bg-slate-50 text-zinc-800';
  const estiloCard = tema === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200 shadow-xl';
  const estiloInput = tema === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white focus:border-violet-500' : 'bg-slate-50 border-slate-300 text-zinc-900 focus:border-violet-600';
  const estiloTextoPrincipal = tema === 'dark' ? 'text-white' : 'text-zinc-900';

  return (
    <div className={`min-h-screen font-sans flex flex-col items-center justify-center p-4 transition-colors duration-300 ${estiloFundoApp}`}>
      
      {/* Alternador de Tema */}
      <div className="absolute top-4 right-4">
        <button 
          onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} 
          className={`p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${tema === 'dark' ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-slate-300 text-indigo-600 shadow-sm'}`}
        >
          {tema === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
        </button>
      </div>

      <div className={`w-full max-w-md border p-8 rounded-2xl transition-all ${estiloCard}`}>
        
        {/* Cabeçalho do Card Dinâmico */}
        <div className="text-center mb-6">
          <span className="text-4xl">🤖</span>
          <h2 className={`text-2xl font-black mt-3 tracking-tight ${estiloTextoPrincipal}`}>
            {modo === 'login' && 'Acessar Central'}
            {modo === 'cadastro' && 'Criar Nova Conta'}
            {modo === 'recuperar' && 'Recuperar Senha'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {modo === 'login' && 'Sua central de comando modular e em nuvem.'}
            {modo === 'cadastro' && 'Cadastre-se para gerenciar sua rotina de forma privada.'}
            {modo === 'recuperar' && 'Insira seu e-mail para receber as instruções de acesso.'}
          </p>
        </div>

        {/* Alertas de Feedback */}
        {mensagem.texto && (
          <div className={`p-3 rounded-xl border text-xs font-medium mb-4 leading-relaxed ${
            mensagem.tipo === 'erro' 
              ? 'bg-red-500/10 border-red-500/20 text-red-400' 
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}>
            {mensagem.tipo === 'erro' ? '⚠️ ' : '✓ '} {mensagem.texto}
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleAutenticacao} className="space-y-4">
          
          {/* CAMPO NOVO: Nome do Usuário (Exibido apenas no cadastro) */}
          {modo === 'cadastro' && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold tracking-wider">Como quer ser chamado?</label>
              <input 
                type="text" 
                required
                placeholder="José da Silva" 
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-colors ${estiloInput}`}
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold tracking-wider">E-mail de Acesso</label>
            <input 
              type="email" 
              required
              placeholder="seu@email.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-colors ${estiloInput}`}
            />
          </div>

          {modo !== 'recuperar' && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold tracking-wider">Senha de Segurança</label>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-colors ${estiloInput}`}
              />
              
              {modo === 'login' && (
                <div className="flex justify-end mt-1.5">
                  <button 
                    type="button"
                    onClick={() => limparFormulario('recuperar')}
                    className="text-[11px] text-violet-500 font-semibold hover:text-violet-400 hover:underline bg-transparent border-none cursor-pointer p-0"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </div>
          )}

          {modo === 'cadastro' && (
            <div>
              <label className="text-[10px] text-slate-500 block mb-1 uppercase font-bold tracking-wider">Confirme sua Senha</label>
              <input 
                type="password" 
                required
                placeholder="••••••••" 
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-xs focus:outline-none transition-colors ${estiloInput}`}
              />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-violet-800 text-white font-semibold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-lg shadow-violet-600/10 mt-2"
          >
            {loading ? 'Processando dados...' : 
             modo === 'login' ? 'Entrar no Sistema' : 
             modo === 'cadastro' ? 'Concluir Cadastro' : 'Enviar Link de Recuperação'}
          </button>
        </form>

        {/* Rodapé Alternador de Modos */}
        <div className="text-center mt-5 pt-4 border-t border-zinc-800/20 flex flex-col gap-2">
          {modo === 'login' ? (
            <button 
              onClick={() => limparFormulario('cadastro')}
              className="text-xs font-semibold text-violet-500 hover:text-violet-400 transition-colors bg-transparent border-none cursor-pointer"
            >
              Não tem uma conta? Crie uma agora
            </button>
          ) : (
            <button 
              onClick={() => limparFormulario('login')}
              className="text-xs font-semibold text-slate-400 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer"
            >
              ← Voltar para o Login
            </button>
          )}
        </div>

      </div>
    </div>
  );
}