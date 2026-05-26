// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
// Importando o cliente conectado do Supabase
import { supabase } from '../supabaseClient';

export default function Dashboard() {
  // --- CONTROLES DE INTERFACE ---
  const [painelAberto, setPainelAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('lista'); 
  const [tema, setTema] = useState('dark'); 

  // --- CONTROLE DE NOTIFICAÇÕES & INTERRUPTOR ---
  const [permissaoNotificacao, setPermissaoNotificacao] = useState(
    typeof window !== 'undefined' ? Notification.permission : 'default'
  );
  const [alertasLigados, setAlertasLigados] = useState(true);

  // --- CONTROLE DE DATA ---
  const [dataSelecionada, setDataSelecionada] = useState(new Date().toISOString().split('T')[0]);
  const diaHojeReal = new Date().toISOString().split('T')[0];

  // --- CONFIGURAÇÃO DE MÉTRICAS MOLDÁVEIS ---
  const [configMetricas, setConfigMetricas] = useState([
    { id: 'sono', nome: 'Horas de Sono', icone: '🌙', cor: '#6366f1' },
    { id: 'estudo', nome: 'Horas de Estudo', icone: '📚', cor: '#10b981' },
    { id: 'trabalho', nome: 'Trabalho / Projetos', icone: '💼', cor: '#f59e0b' }
  ]);
  const [novaMetricaNome, setNovaMetricaNome] = useState('');
  const [novaMetricaIcone, setNovaMetricaIcone] = useState('📊');

  // --- ESTADOS DOS DADOS VINDOS DO SUPABASE ---
  const [tarefas, setTarefas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [historicoMetricas, setHistoricoMetricas] = useState({});

  // Formulários temporários (gaveta)
  const [novaTarefaTitulo, setNovaTarefaTitulo] = useState('');
  const [tipoTempoTarefa, setTipoTempoTarefa] = useState('livre'); 
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('10:00');
  const [prioridadeTarefa, setPrioridadeTarefa] = useState('media'); 
  const [novaNota, setNovaNota] = useState('');
  const [tarefaIdAdiar, setTarefaIdAdiar] = useState(null);

  // --- 🔄 BUSCAR DADOS DO SUPABASE (Sincronização Inicial) ---
  const buscarDadosDoSupabase = async () => {
    try {
      const { data: dataTarefas } = await supabase.from('tarefas').select('*');
      if (dataTarefas) setTarefas(dataTarefas);

      const { data: dataNotas } = await supabase.from('notas').select('*');
      if (dataNotas) setNotas(dataNotas);

      const { data: dataMetricas } = await supabase.from('historico_metricas').select('*');
      if (dataMetricas) {
        const mapeado = {};
        dataMetricas.forEach(row => { mapeado[row.data] = row.valores; });
        setHistoricoMetricas(mapeado);
      }
    } catch (error) {
      console.error("Erro ao conectar com o Supabase:", error);
    }
  };

  useEffect(() => {
    buscarDadosDoSupabase();
  }, []);

  // --- AUXILIARES DE MÉTRICAS ---
  const metricasDoDia = historicoMetricas[dataSelecionada] || {};

  const mudarValorMetrica = async (metricaId, mudanca) => {
    const valorAtual = metricasDoDia[metricaId] || 0;
    const novoValor = Math.max(0, valorAtual + mudanca);
    const novosValoresDoDia = { ...metricasDoDia, [metricaId]: novoValor };

    setHistoricoMetricas({ ...historicoMetricas, [dataSelecionada]: novosValoresDoDia });

    await supabase.from('historico_metricas').upsert({
      data: dataSelecionada,
      valores: novosValoresDoDia
    });
  };

  const adicionarNovaMetricaConfig = (e) => {
    e.preventDefault();
    if (!novaMetricaNome.trim()) return;
    const novoId = novaMetricaNome.toLowerCase().replace(/\s+/g, '_');
    const coresDisponiveis = ['#ec4899', '#8b5cf6', '#06b6d4', '#f43f5e', '#10b981'];
    
    setConfigMetricas([...configMetricas, { 
      id: novoId, 
      nome: novaMetricaNome, 
      icone: novaMetricaIcone, 
      cor: coresDisponiveis[configMetricas.length % 5] 
    }]);
    setNovaMetricaNome('');
  };

  const removerMetricaConfig = (id) => setConfigMetricas(configMetricas.filter(m => m.id !== id));

  // --- ✍️ OPERAÇÕES DE TAREFAS ---
  const handleAdicionarTarefa = async (e) => {
    e.preventDefault();
    if (!novaTarefaTitulo.trim()) return;

    const novaTarefaObj = {
      titulo: novaTarefaTitulo,
      data: dataSelecionada,
      tipo: tipoTempoTarefa,
      hora_inicio: tipoTempoTarefa === 'horario' ? horaInicio : '',
      hora_fim: tipoTempoTarefa === 'horario' ? horaFim : '',
      prioridade: prioridadeTarefa,
      status: 'pendente'
    };

    const { data } = await supabase.from('tarefas').insert([novaTarefaObj]).select();
    if (data) setTarefas([...tarefas, data[0]]);
    setNovaTarefaTitulo('');
  };

  const mudarStatusTarefa = async (id, novoStatus) => {
    const tarefaAlvo = tarefas.find(t => t.id === id);
    const statusFinal = tarefaAlvo.status === novoStatus ? 'pendente' : novoStatus;

    setTarefas(tarefas.map(t => t.id === id ? { ...t, status: statusFinal } : t));
    await supabase.from('tarefas').update({ status: statusFinal }).eq('id', id);
  };

  const adiarTarefaParaData = async (id, novaData) => {
    if (!novaData) return;
    setTarefas(tarefas.map(t => t.id === id ? { ...t, data: novaData } : t));
    setTarefaIdAdiar(null);
    await supabase.from('tarefas').update({ data: novaData }).eq('id', id);
  };

  const excluirTarefa = async (id) => {
    setTarefas(tarefas.filter(t => t.id !== id));
    await supabase.from('tarefas').delete().eq('id', id);
  };

  // --- ✍️ OPERAÇÕES DE NOTAS ---
  const handleAdicionarNota = async (e) => {
    e.preventDefault();
    if (!novaNota.trim()) return;

    const { data } = await supabase.from('notes' || 'notas').insert([{ conteudo: novaNota }]).select();
    if (data) setNotas([...notas, data[0]]);
    novaNota('');
  };

  const deletarNota = async (id) => {
    setNotas(notas.filter(n => n.id !== id));
    await supabase.from('notas').delete().eq('id', id);
  };

  // --- 🔔 SISTEMA DE AGENDAMENTO DE NOTIFICAÇÕES NATIVAS ---
  useEffect(() => {
    if (permissaoNotificacao !== 'granted' || !alertasLigados) return;
    
    const checarEEnviarNotificacoes = () => {
      const agora = new Date();
      const horaStr = `${String(agora.getHours()).padStart(2, '0')}:${String(agora.getMinutes()).padStart(2, '0')}`;
      const hojeStr = agora.toISOString().split('T')[0];

      const alertas = tarefas.filter(t => t.data === hojeStr && t.tipo === 'horario' && t.hora_inicio === horaStr && t.status === 'pendente');
      alertas.forEach(t => {
        const icones = { alta: '🔥', media: '⚡', baixa: '🍃' };
        new Notification(`🕒 Compromisso Agora!`, { body: `${icones[t.prioridade] || ''} ${t.titulo} (${t.hora_inicio})` });
      });
    };

    checarEEnviarNotificacoes();
    const intervalo = setInterval(checarEEnviarNotificacoes, 30000);
    return () => clearInterval(intervalo);
  }, [tarefas, permissaoNotificacao, alertasLigados]);

  const solicitarPermissaoNotificacao = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(p => {
      setPermissaoNotificacao(p);
      if(p === 'granted') new Notification("🤖 Notificações Ativas!");
    });
  };

  // --- FILTROS DE RENDERIZAÇÃO ---
  const ordemPrioridade = { alta: 1, media: 2, baixa: 3 };
  const tarefasDeHoje = tarefas.filter(t => t.data === dataSelecionada).sort((a, b) => ordemPrioridade[a.prioridade] - ordemPrioridade[b.prioridade]);
  const tarefasDeHojeComHora = tarefasDeHoje.filter(t => t.tipo === 'horario').sort((a,b) => a.hora_inicio.localeCompare(b.hora_inicio));
  const tarefasDeHojeLivres = tarefasDeHoje.filter(t => t.tipo === 'livre');
  
  // Traz prioridade ALTA para o topo na barra lateral
  const tarefasFuturas = tarefas.filter(t => t.data > dataSelecionada).sort((a, b) => {
    if (a.prioridade === 'alta' && b.prioridade !== 'alta') return -1;
    if (a.prioridade !== 'alta' && b.prioridade === 'alta') return 1;
    return a.data.localeCompare(b.data);
  });

  const horasDoDia = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  const formatarDataExibicao = (dataStr) => {
    const [ano, mes, dia] = dataStr.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${dia} de ${meses[parseInt(mes) - 1]}, ${ano}`;
  };

  const gerarDiasDoMes = () => {
    const baseDate = new Date(dataSelecionada + 'T00:00:00');
    const ano = baseDate.getFullYear();
    const mes = baseDate.getMonth();
    const primeiroDiaSemana = new Date(ano, mes, 1).getDay();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();
    const blocos = [];
    for (let i = 0; i < primeiroDiaSemana; i++) blocos.push(null);
    for (let dia = 1; dia <= totalDiasMes; dia++) {
      blocos.push(`${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);
    }
    return blocos;
  };

  const dadosGrafico = Object.keys(historicoMetricas).sort().map(data => {
    const [, m, d] = data.split('-');
    const ponto = { dataFormatada: `${d}/${m}` };
    configMetricas.forEach(met => { ponto[met.nome] = historicoMetricas[data]?.[met.id] || 0; });
    return ponto;
  });

  const obterEstiloPrioridade = (prioridade) => {
    if (prioridade === 'alta') return 'bg-red-500/10 border-red-500/30 text-red-400 font-bold';
    if (prioridade === 'media') return 'bg-amber-500/10 border-amber-500/30 text-amber-400';
    return 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400';
  };

  const obterIconePrioridade = (prioridade) => prioridade === 'alta' ? '🔥' : prioridade === 'media' ? '⚡' : '🍃';

  // Dicionário de Estilos Globais Dinâmicos
  const estiloFundoApp = tema === 'dark' ? 'bg-zinc-950 text-slate-100' : 'bg-slate-50 text-zinc-800';
  const estiloCard = tema === 'dark' ? 'bg-zinc-900/50 border-zinc-800' : 'bg-white border-slate-200 shadow-md';
  const estiloCardInterno = tema === 'dark' ? 'bg-zinc-900 border-zinc-800/60' : 'bg-slate-100 border-slate-200';
  const estiloInput = tema === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-300 text-zinc-900';
  const estiloTextoPrincipal = tema === 'dark' ? 'text-white' : 'text-zinc-900';
  const estiloTextoSecundario = tema === 'dark' ? 'text-slate-400' : 'text-zinc-500';

  return (
    <div className={`min-h-screen font-sans relative overflow-x-hidden transition-colors duration-300 ${estiloFundoApp}`}>
      
      {/* CORPO DO DASHBOARD */}
      <div className={`p-6 max-w-6xl mx-auto transition-all duration-300 ${painelAberto ? 'pr-[400px] opacity-40 pointer-events-none lg:opacity-100 lg:pointer-events-auto' : ''}`}>
        
        {/* CABEÇALHO */}
        <header className={`mb-6 border-b pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${tema === 'dark' ? 'border-zinc-800' : 'border-slate-200'}`}>
          <div>
            <h1 className={`text-2xl font-extrabold tracking-tight flex items-center gap-2 ${estiloTextoPrincipal}`}>🤖 Central do Assistente</h1>
            <p className={`${estiloTextoSecundario} text-xs mt-0.5`}>Painel de rotina em nuvem com precisão horária e mensal.</p>
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            {/* INTERRUPTOR DE ALERTAS CORRIGIDO */}
            <button
              onClick={() => { if (permissaoNotificacao !== 'granted') solicitarPermissaoNotificacao(); else setAlertasLigados(!alertasLigados); }}
              className={`text-xs px-3 h-[38px] rounded-xl border font-bold transition-all active:scale-95 cursor-pointer ${
                permissaoNotificacao === 'granted' ? alertasLigados ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-zinc-800 border-zinc-700 text-slate-400' : 'bg-zinc-900 border-zinc-800 text-slate-400'
              }`}
            >
              {permissaoNotificacao !== 'granted' ? '🔔 Ativar Alertas' : alertasLigados ? '🔔 Alertas Ligados' : '🔕 Alertas Pausados'}
            </button>

            <button onClick={() => setTema(tema === 'dark' ? 'light' : 'dark')} className={`p-2 rounded-xl border text-xs h-[38px] cursor-pointer font-bold ${tema === 'dark' ? 'bg-zinc-900 border-zinc-800 text-amber-400' : 'bg-white border-slate-300 text-indigo-600 shadow-sm'}`}>
              {tema === 'dark' ? '☀️ Claro' : '🌙 Escuro'}
            </button>
            
            <div className={`border px-3 py-1.5 rounded-xl ${tema === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Dia Ativo</p>
              <p className="text-xs font-bold text-violet-500 font-mono">{formatarDataExibicao(dataSelecionada)}</p>
            </div>
            <button onClick={() => setPainelAberto(true)} className="bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs px-4 h-[38px] rounded-xl cursor-pointer">⚙️ Registrar / Editar</button>
          </div>
        </header>

        {/* CALENDÁRIO MENSAL E CLIMA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className={`border p-5 rounded-2xl lg:col-span-2 ${estiloCard}`}>
            <h3 className={`text-xs font-extrabold uppercase tracking-wider mb-3 ${estiloTextoSecundario}`}>📅 Visão Mensal Interativa</h3>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-2">
              <span>DOM</span><span>SEG</span><span>TER</span><span>QUA</span><span>QUI</span><span>SEX</span><span>SÁB</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {gerarDiasDoMes().map((dayStr, index) => {
                if (!dayStr) return <div key={`empty-${index}`} className="opacity-0" />;
                const diaNum = dayStr.split('-')[2];
                const estaSelecionado = dayStr === dataSelecionada;
                const ehHojeReal = dayStr === diaHojeReal;
                const temTarefa = tarefas.some(t => t.data === dayStr);

                return (
                  <button
                    key={dayStr}
                    onClick={() => setDataSelecionada(dayStr)}
                    className={`h-9 rounded-xl text-xs font-mono relative flex items-center justify-center transition-all cursor-pointer ${estaSelecionado ? 'bg-violet-600 text-white font-extrabold shadow-md' : ehHojeReal ? 'bg-violet-500/20 text-violet-500 border-2 border-violet-500 ring-2 ring-violet-500/10' : tema === 'dark' ? 'bg-zinc-900/60 text-slate-300 border border-zinc-800/40' : 'bg-slate-100 text-zinc-700 border border-slate-200'}`}
                  >
                    {parseInt(diaNum)}
                    {ehHojeReal && !estaSelecionado && <span className="absolute -top-1 -right-1 text-[7px] bg-violet-500 text-white px-1 rounded-full font-bold uppercase scale-75">Hoje</span>}
                    {temTarefa && !estaSelecionado && !ehHojeReal && <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-violet-500" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`border p-5 rounded-2xl flex flex-col justify-between ${estiloCard}`}>
            <div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Condições do Tempo</p>
              <div className="flex items-center justify-between mt-2">
                <div>
                  <h4 className={`text-3xl font-black ${estiloTextoPrincipal}`}>28°C</h4>
                  <p className="text-xs text-slate-400">Fortaleza, Ceará</p>
                </div>
                <span className="text-5xl filter drop-shadow-sm animate-pulse">☀️</span>
              </div>
            </div>
            <div className={`mt-4 pt-3 border-t text-xs text-slate-400 ${tema === 'dark' ? 'border-zinc-800/60' : 'border-slate-100'}`}>
              <span className="text-emerald-500 font-bold">● Ensolarado</span>
            </div>
          </div>
        </div>

        {/* CONTADORES DE MÉTRICAS */}
        <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {configMetricas.map(met => (
            <div key={met.id} className={`p-4 rounded-xl border flex items-center gap-3 ${estiloCard}`}>
              <span className="text-xl p-2 rounded-lg bg-zinc-500/10" style={{ color: met.cor }}>{met.icone}</span>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{met.nome}</p>
                <p className={`text-sm font-bold font-mono ${estiloTextoPrincipal}`}>{metricasDoDia[met.id] || 0}h</p>
              </div>
            </div>
          ))}
        </section>

        {/* ABAS */}
        <div className="flex border-b mb-4 gap-2" style={{ borderColor: tema === 'dark' ? '#27272a' : '#e2e8f0' }}>
          <button onClick={() => setAbaAtiva('lista')} className={`py-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${abaAtiva === 'lista' ? 'border-violet-500 text-violet-500 font-extrabold' : 'border-transparent text-slate-500'}`}>📋 Quadro de Tarefas</button>
          <button onClick={() => setAbaAtiva('agenda')} className={`py-2 px-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer ${abaAtiva === 'agenda' ? 'border-violet-500 text-violet-500 font-extrabold' : 'border-transparent text-slate-500'}`}>⏳ Modo Agenda</button>
        </div>

        {abaAtiva === 'lista' ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`md:col-span-2 border p-5 rounded-2xl ${estiloCard}`}>
              <h2 className="text-sm font-bold text-violet-500 mb-4 uppercase tracking-wider">🎯 Atividades Agendadas</h2>
              <div className="space-y-4">
                {tarefasDeHojeComHora.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">⏱️ Bloqueios de Horário</p>
                    <ul className="space-y-2">
                      {tarefasDeHojeComHora.map(t => (
                        <li key={t.id} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${estiloCardInterno} ${t.status !== 'pendente' ? 'opacity-35 line-through' : ''}`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button onClick={() => mudarStatusTarefa(t.id, 'concluida')} className="w-4 h-4 rounded-full border border-slate-400 text-[8px] flex items-center justify-center cursor-pointer">{t.status === 'concluida' && '✓'}</button>
                            <span className="font-mono text-[10px] bg-violet-500/10 text-violet-500 px-1.5 py-0.5 rounded">{t.hora_inicio} - {t.hora_fim}</span>
                            <span className={`truncate font-medium ${tema === 'light' && t.status === 'pendente' ? 'text-zinc-800' : ''}`}>{t.titulo}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ml-1 uppercase font-bold flex-shrink-0 ${obterEstiloPrioridade(t.prioridade)}`}>{obterIconePrioridade(t.prioridade)} {t.prioridade}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {tarefaIdAdiar === t.id ? (
                              <input type="date" onChange={(e) => adiarTarefaParaData(t.id, e.target.value)} className="bg-zinc-950 border border-zinc-800 text-[10px] rounded p-1 text-white" />
                            ) : (
                              <button onClick={() => setTarefaIdAdiar(t.id)} className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${tema === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-500' : 'bg-slate-200 text-zinc-700'}`}>⏳ Adiar</button>
                            )}
                            <button onClick={() => mudarStatusTarefa(t.id, 'cancelada')} className={`text-[10px] font-bold px-1.5 py-1 rounded cursor-pointer ${tema === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-red-400' : 'bg-slate-200 text-red-600'}`}>✕</button>
                            <button onClick={() => excluirTarefa(t.id)} className="text-slate-400 hover:text-red-500 p-1 cursor-pointer">🗑️</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {tarefasDeHojeLivres.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">☀️ Ao Longo do Dia (Flexíveis)</p>
                    <ul className="space-y-2">
                      {tarefasDeHojeLivres.map(t => (
                        <li key={t.id} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${estiloCardInterno} ${t.status !== 'pendente' ? 'opacity-35 line-through' : ''}`}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button onClick={() => mudarStatusTarefa(t.id, 'concluida')} className="w-4 h-4 rounded-full border border-slate-400 text-[8px] flex items-center justify-center cursor-pointer">{t.status === 'concluida' && '✓'}</button>
                            <span className={`truncate font-medium ${tema === 'light' && t.status === 'pendente' ? 'text-zinc-800' : ''}`}>{t.titulo}</span>
                            <span className={`text-[9px] px-1.5 py-0.5 rounded border ml-1 uppercase font-bold ${obterEstiloPrioridade(t.prioridade)}`}>{obterIconePrioridade(t.prioridade)} {t.prioridade}</span>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            {tarefaIdAdiar === t.id ? (
                              <input type="date" onChange={(e) => adiarTarefaParaData(t.id, e.target.value)} className="bg-zinc-950 border border-zinc-800 text-[10px] rounded p-1 text-white" />
                            ) : (
                              <button onClick={() => setTarefaIdAdiar(t.id)} className={`text-[10px] font-bold px-2 py-1 rounded cursor-pointer ${tema === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-amber-500' : 'bg-slate-200 text-zinc-700'}`}>⏳ Adiar</button>
                            )}
                            <button onClick={() => mudarStatusTarefa(t.id, 'cancelada')} className={`text-[10px] font-bold px-1.5 py-1 rounded cursor-pointer ${tema === 'dark' ? 'bg-zinc-800 hover:bg-zinc-700 text-red-400' : 'bg-slate-200 text-red-600'}`}>✕</button>
                            <button onClick={() => excluirTarefa(t.id)} className="text-slate-400 hover:text-red-500 p-1 cursor-pointer">🗑️</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* BARRA LATERAL DA AGENDA FUTURA CRÍTICA */}
            <div className={`border p-5 rounded-2xl ${estiloCard}`}>
              <h2 className="text-sm font-bold text-amber-500 mb-4 uppercase tracking-wider flex items-center justify-between">
                <span>📅 Agenda Futura</span>
                <span className="text-[9px] bg-amber-500/10 px-2 py-0.5 rounded text-amber-500 font-mono font-bold">Foco Crítico</span>
              </h2>
              {tarefasFuturas.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">Sem agendamentos futuros.</p>
              ) : (
                <ul className="space-y-2">
                  {tarefasFuturas.slice(0, 5).map(t => (
                    <li key={t.id} className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1.5 ${estiloCardInterno} ${t.prioridade === 'alta' ? 'border-red-500/40 bg-red-500/5' : ''}`}>
                      <div className="flex justify-between items-center gap-2">
                        <span className={`truncate font-semibold ${tema === 'light' ? 'text-zinc-800' : 'text-slate-200'}`}>{t.titulo}</span>
                        <span className={`text-[8px] px-1 rounded uppercase font-bold ${t.prioridade === 'alta' ? 'bg-red-500 text-white' : 'bg-zinc-800 text-slate-400'}`}>{t.prioridade}</span>
                      </div>
                      <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                        <span>📅 {t.data.split('-').reverse().slice(0,2).join('/')}</span>
                        <span>{t.tipo === 'horario' ? `⏱️ ${t.hora_inicio}` : '☀️ Todo o dia'}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          /* ABA GOOGLE AGENDA */
          <div className={`border p-5 rounded-2xl shadow-sm mb-6 ${estiloCard}`}>
            {tarefasDeHojeLivres.length > 0 && (
              <div className="mb-4 pb-4 border-b border-zinc-800/40">
                <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider mb-2">💡 Sem Horário Marcado</p>
                <div className="flex flex-wrap gap-2">
                  {tarefasDeHojeLivres.map(t => (
                    <span key={t.id} className="text-xs px-3 py-1.5 border rounded-xl font-medium bg-amber-500/10 text-amber-400 flex items-center gap-1">
                      <span>{obterIconePrioridade(t.prioridade)}</span>{t.titulo}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-1">
              {horasDoDia.map(hora => {
                const tarefaNoBloco = tarefas.find(t => t.data === dataSelecionada && t.tipo === 'horario' && hora >= t.hora_inicio && hora < t.hora_fim);
                return (
                  <div key={hora} className="flex py-2.5 items-center gap-4 border-b border-zinc-800/40">
                    <span className="w-12 font-mono text-xs text-slate-400 text-right">{hora}</span>
                    <div className="flex-1">
                      {tarefaNoBloco ? (
                        <div className={`p-2 rounded-lg border text-xs font-semibold flex justify-between items-center ${tarefaNoBloco.status === 'concluida' ? 'bg-zinc-800/20 text-slate-500 line-through border-transparent' : 'bg-violet-600/15 border-violet-500/20 text-violet-400'}`}>
                          <span className="truncate flex items-center gap-1"><span>{obterIconePrioridade(tarefaNoBloco.prioridade)}</span>{tarefaNoBloco.titulo}</span>
                        </div>
                      ) : <span className={`text-xs italic pl-2 ${tema === 'dark' ? 'text-zinc-800' : 'text-slate-300'}`}>Disponível</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* GRÁFICOS COMPACTADOS */}
        {dadosGrafico.length > 0 && (
          <div className={`border p-5 rounded-2xl mb-6 ${estiloCard}`}>
            <h3 className="text-xs font-bold mb-4 text-slate-400 uppercase tracking-wider">📈 Análise Histórica de Métricas</h3>
            <div className="h-56 w-full text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosGrafico} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={tema === 'dark' ? "#27272a" : "#e2e8f0"} />
                  <XAxis dataKey="dataFormatada" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: tema === 'dark' ? '#18181b' : '#ffffff', color: tema === 'dark' ? '#f4f4f5' : '#1e293b' }} />
                  {configMetricas.map(met => (
                    <Area key={met.id} type="monotone" dataKey={met.nome} stroke={met.cor} strokeWidth={2} fillOpacity={0.01} fill={met.cor} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* LEMBRETES MURAL */}
        <section className={`border p-5 rounded-2xl ${estiloCard}`}>
          <h2 className="text-sm font-bold text-slate-500 mb-3 uppercase tracking-wider">📌 Mural de Lembretes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {notas.map(nota => (
              <div key={nota.id} className={`border p-3 rounded-xl relative group ${estiloCardInterno}`}>
                <p className={`text-xs leading-relaxed pr-4 ${tema === 'dark' ? 'text-slate-400' : 'text-zinc-700'}`}>{nota.conteudo}</p>
                <button onClick={() => deletarNota(nota.id)} className="absolute top-2 right-2 text-slate-500 hover:text-red-500 text-xs opacity-0 group-hover:opacity-100 cursor-pointer">✕</button>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* --- GAVETA LATERAL DE EDIÇÃO (CORRIGIDA E COMPLETA) --- */}
      <div className={`fixed top-0 right-0 h-full w-[380px] max-w-full border-l shadow-2xl p-6 transform transition-transform duration-300 ease-in-out z-50 flex flex-col justify-between overflow-y-auto ${painelAberto ? 'translate-x-0' : 'translate-x-full'} ${tema === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-200'}`}>
        <div className="w-full min-w-0 space-y-6">
          
          <div className={`flex items-center justify-between pb-3 border-b gap-2 ${tema === 'dark' ? 'border-zinc-800' : 'border-slate-200'}`}>
            <div className="min-w-0 flex-1">
              <h2 className={`text-sm font-bold uppercase truncate ${tema === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Painel Operacional</h2>
              <p className="text-[11px] text-violet-500 font-mono mt-0.5 truncate">Editando: {dataSelecionada}</p>
            </div>
            <button onClick={() => setPainelAberto(false)} className={`text-xs px-2 py-1 rounded cursor-pointer ${tema === 'dark' ? 'bg-zinc-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-zinc-600 hover:bg-slate-200'}`}>Fechar ✕</button>
          </div>

          {/* Gerenciar Métricas Customizadas */}
          <div className="space-y-3 w-full min-w-0">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">⚙️ Criar Suas Métricas</h3>
            <form onSubmit={adicionarNovaMetricaConfig} className="flex gap-1.5 w-full">
              <input type="text" placeholder="Ex: Trabalho, Leitura..." value={novaMetricaNome} onChange={(e) => setNovaMetricaNome(e.target.value)} className={`flex-1 border rounded-lg p-1.5 text-xs focus:outline-none ${estiloInput}`} />
              <select value={novaMetricaIcone} onChange={(e) => setNovaMetricaIcone(e.target.value)} className={`border rounded-lg p-1.5 text-xs focus:outline-none ${estiloInput}`}>
                <option value="📊">📊</option><option value="💼">💼</option><option value="🏃">🏃</option><option value="💧">💧</option><option value="📖">📖</option>
              </select>
              <button type="submit" className="bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-white rounded-lg text-xs font-bold cursor-pointer">+</button>
            </form>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {configMetricas.map(m => (
                <span key={m.id} className={`text-[10px] px-2 py-1 border rounded-md flex items-center gap-1.5 ${tema === 'dark' ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-slate-50 border-slate-200 text-zinc-800'}`}>
                  <span>{m.icone} {m.nome}</span>
                  <button type="button" onClick={() => removerMetricaConfig(m.id)} className="text-red-400 hover:text-red-500 font-bold cursor-pointer">✕</button>
                </span>
              ))}
            </div>
          </div>

          {/* Lançamento de Valores das Métricas Ativas */}
          <div className={`space-y-2 border-t pt-4 ${tema === 'dark' ? 'border-zinc-800/50' : 'border-slate-200'}`}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">🔢 Lançamento do Dia</h3>
            {configMetricas.map(met => (
              <div key={met.id} className={`flex items-center justify-between p-2 rounded-xl border gap-2 w-full min-w-0 ${tema === 'dark' ? 'bg-zinc-950 border-zinc-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className={`text-xs truncate flex-1 ${tema === 'dark' ? 'text-slate-300' : 'text-zinc-700'}`}>{met.icone} {met.nome}</span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => mudarValorMetrica(met.id, -0.5)} className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${tema === 'dark' ? 'bg-zinc-800 text-white' : 'bg-slate-200 text-zinc-800'}`}>-</button>
                  <span className={`text-xs font-mono font-bold w-12 text-center ${estiloTextoPrincipal}`}>{metricasDoDia[met.id] || 0}h</span>
                  <button onClick={() => mudarValorMetrica(met.id, 0.5)} className={`px-2 py-0.5 rounded text-xs font-bold cursor-pointer ${tema === 'dark' ? 'bg-zinc-800 text-white' : 'bg-slate-200 text-zinc-800'}`}></button>
                </div>
              </div>
            ))}
          </div>

          {/* Criar Atividade Flexível ou com Horário */}
          <div className={`space-y-3 border-t pt-4 ${tema === 'dark' ? 'border-zinc-800/50' : 'border-slate-200'}`}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">➕ Nova Atividade</h3>
            <form onSubmit={handleAdicionarTarefa} className="space-y-2">
              <input type="text" placeholder="Nome do compromisso..." value={novaTarefaTitulo} onChange={(e) => setNovaTarefaTitulo(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-violet-500 ${estiloInput}`} />
              
              <div>
                <select value={prioridadeTarefa} onChange={(e) => setPrioridadeTarefa(e.target.value)} className={`w-full border rounded-lg p-2 text-xs focus:outline-none ${estiloInput}`}>
                  <option value="alta">🔥 Alta (Urgente / Crítico)</option>
                  <option value="media">⚡ Média (Importante)</option>
                  <option value="baixa">🍃 Baixa (Flexível)</option>
                </select>
              </div>

              <div className="flex gap-4 p-1">
                <label className="text-xs flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={tipoTempoTarefa === 'livre'} onChange={() => setTipoTempoTarefa('livre')} className="text-violet-600" /> Todo o dia</label>
                <label className="text-xs flex items-center gap-1.5 cursor-pointer"><input type="radio" checked={tipoTempoTarefa === 'horario'} onChange={() => setTipoTempoTarefa('horario')} className="text-violet-600" /> Hora marcada</label>
              </div>

              {tipoTempoTarefa === 'horario' && (
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-[10px] text-slate-500 block mb-0.5">Início</label><input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={`w-full border rounded-lg p-1.5 text-xs ${estiloInput}`} /></div>
                  <div><label className="text-[10px] text-slate-500 block mb-0.5">Término</label><input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)} className={`w-full border rounded-lg p-1.5 text-xs ${estiloInput}`} /></div>
                </div>
              )}
              <button type="submit" className="w-full bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-lg text-xs cursor-pointer shadow-sm">Agendar na Nuvem</button>
            </form>
          </div>

          {/* Criar Nota de Mural */}
          <div className={`space-y-3 border-t pt-4 ${tema === 'dark' ? 'border-zinc-800/50' : 'border-slate-200'}`}>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wide">📌 Novo Lembrete</h3>
            <form onSubmit={handleAdicionarNota} className="space-y-2">
              <textarea rows="2" placeholder="Fixar no mural..." value={novaNota} onChange={(e) => setNovaNota(e.target.value)} className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none resize-none ${estiloInput}`} />
              <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-lg text-xs cursor-pointer">Fixar Lembrete</button>
            </form>
          </div>

        </div>

        {/* Rodapé da Gaveta */}
        <div className={`pt-4 border-t text-center ${tema === 'dark' ? 'border-zinc-800' : 'border-slate-200'}`}>
          <p className="text-[10px] text-slate-500 font-mono">Assistente Operacional v1.4</p>
        </div>
      </div>

    </div>
  );
}