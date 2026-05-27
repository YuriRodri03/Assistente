import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AssistenteVoz({ userId, dataSelecionada, onTarefaAdicionada, tarefas, setTarefas }) {
  const [escutando, setEscutando] = useState(false);

  const ligarComandoVoz = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta comandos de voz. Tente usar o Google Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setEscutando(true);
    recognition.onend = () => setEscutando(false);

    recognition.onresult = async (event) => {
      let textoCapturado = event.results[0][0].transcript.toLowerCase().trim();
      console.log("Texto bruto capturado:", textoCapturado);

      // ==========================================
      // 1. COMANDOS DE ALTERAÇÃO / EXCLUSÃO DE TAREFAS EXISTENTES
      // ==========================================
      
      // Comando A: Excluir/Deletar tarefa (Ex: "excluir prova de microeconomia")
      if (textoCapturado.startsWith('excluir ') || textoCapturado.startsWith('deletar ') || textoCapturado.startsWith('apagar ')) {
        const termoBusca = textoCapturado.replace(/^(excluir|deletar|apagar)\s+/g, '').trim();
        const tarefaEncontrada = tarefas.find(t => t.titulo.toLowerCase().includes(termoBusca));
        
        if (tarefaEncontrada) {
          setTarefas(prev => prev.filter(t => t.id !== tarefaEncontrada.id));
          await supabase.from('tarefas').delete().eq('id', tarefaEncontrada.id);
          console.log(`Tarefa "${tarefaEncontrada.titulo}" excluída por voz.`);
          return;
        }
      }

      // Comando B: Concluir/Finalizar tarefa (Ex: "concluir aula de microeconomia" ou "feito...")
      if (textoCapturado.startsWith('concluir ') || textoCapturado.startsWith('finalizar ') || textoCapturado.startsWith('marcar como feito ')) {
        const termoBusca = textoCapturado.replace(/^(concluir|finalizar|marcar como feito)\s+/g, '').trim();
        const tarefaEncontrada = tarefas.find(t => t.titulo.toLowerCase().includes(termoBusca));

        if (tarefaEncontrada) {
          setTarefas(prev => prev.map(t => t.id === tarefaEncontrada.id ? { ...t, status: 'concluida' } : t));
          await supabase.from('tarefas').update({ status: 'concluida' }).eq('id', tarefaEncontrada.id);
          console.log(`Tarefa "${tarefaEncontrada.titulo}" concluída por voz.`);
          return;
        }
      }

      // ==========================================
      // 2. PROCESSAMENTO DE CRIAÇÃO DE NOVA TAREFA
      // ==========================================
      let titulo = textoCapturado;
      let prazo = 'diaria';
      let tipo = 'livre';
      let hora_inicio = '';
      let hora_fim = '';
      let dataAlvo = dataSelecionada;

      // A. Extração de Longo Prazo
      if (textoCapturado.includes('longo prazo') || textoCapturado.includes('backlog') || textoCapturado.includes('meta')) {
        prazo = 'longo_prazo';
        dataAlvo = null;
        titulo = titulo.replace(/\b(longo prazo|backlog|meta)\b/g, '');
      }

      // B. Extração de Data Numérica Fixa (Ex: "09/06", "dia 9 do 6", "no dia 25 de 12")
      const regexDataFixa = /(?:no\s+dia\s+|dia\s+)?(\d{1,2})(?:\/|\s+de\s+|\s+do\s+)(\d{1,2})/i;
      const matchDataFixa = titulo.match(regexDataFixa);

      if (matchDataFixa && prazo === 'diaria') {
        const dia = matchDataFixa[1].padStart(2, '0');
        const mes = matchDataFixa[2].padStart(2, '0');
        const anoAtual = new Date().getFullYear();
        
        dataAlvo = `${anoAtual}-${mes}-${dia}`;
        titulo = titulo.replace(regexDataFixa, ''); // Remove a menção da data do título
      } 
      // C. Extração de Datas Relativas (Amanhã / Hoje)
      else if (textoCapturado.includes('amanhã')) {
        const amanhaDate = new Date(dataSelecionada + 'T00:00:00');
        amanhaDate.setDate(amanhaDate.getDate() + 1);
        
        dataAlvo = `${amanhaDate.getFullYear()}-${String(amanhaDate.getMonth() + 1).padStart(2, '0')}-${String(amanhaDate.getDate()).padStart(2, '0')}`;
        titulo = titulo.replace(/\bamanhã\b/g, '');
      } else if (textoCapturado.includes('hoje')) {
        titulo = titulo.replace(/\bhoje\b/g, '');
      }

      // D. Extração de Intervalo de Horários (Ex: "de 10 as 12", "das 14h às 15h30")
      if (prazo === 'diaria') {
        const regexIntervalo = /(?:\b(?:de|das|desde\s+as|desde\s+às)\s+)?(\d{1,2})(?:h|:|\s+horas?)?(\d{2})?\s*(?:as|às|ate|até|e)\s*(\d{1,2})(?:h|:|\s+horas?)?(\d{2})?/i;
        const matchIntervalo = titulo.match(regexIntervalo);

        const regexHoraUnica = /\b(?:as|às|atrais|a|à)\s+(\d{1,2})(?:h|:|\s+horas?)?(\d{2})?/i;
        const matchHoraUnica = titulo.match(regexHoraUnica);

        if (matchIntervalo) {
          tipo = 'horario';
          const hIni = matchIntervalo[1].padStart(2, '0');
          const mIni = matchIntervalo[2] ? matchIntervalo[2] : '00';
          hora_inicio = `${hIni}:${mIni}`;

          const hFim = matchIntervalo[3].padStart(2, '0');
          const mFim = matchIntervalo[4] ? matchIntervalo[4] : '00';
          hora_fim = `${hFim}:${mFim}`;

          titulo = titulo.replace(regexIntervalo, '');
        } else if (matchHoraUnica) {
          tipo = 'horario';
          const hora = matchHoraUnica[1].padStart(2, '0');
          const minuto = matchHoraUnica[2] ? matchHoraUnica[2] : '00';
          hora_inicio = `${hora}:${minuto}`;
          
          const horaTermino = String((parseInt(hora) + 1) % 24).padStart(2, '0');
          hora_fim = `${horaTermino}:${minuto}`;

          titulo = titulo.replace(regexHoraUnica, '');
        }
      }

      // ==========================================
      // 3. LIMPEZA SEMÂNTICA FINAL DO TÍTULO
      // ==========================================
      titulo = titulo
        .replace(/^(agendar|adicionar|criar|tarefa|colocar|por|lembrar|de|para|tenho|uma|um)\b/g, '')
        .replace(/\b(de|da|do|em|para|as|às|das|dos|com|no|na|no\s+dia|na\s+data)\s*$/, '')
        .replace(/^\s*(de|da|do|em|para|as|às|das|dos|com|no|na)/g, '')
        .replace(/\s+/g, ' ') 
        .trim();

      titulo = titulo.charAt(0).toUpperCase() + titulo.slice(1);

      if (!titulo) return;

      const novaTarefaVoz = {
        titulo: titulo,
        data: dataAlvo,
        tipo: tipo,
        hora_inicio: hora_inicio,
        hora_fim: hora_fim,
        prioridade: 'media',
        prazo: prazo,
        status: 'pendente',
        user_id: userId
      };

      try {
        const { data, error } = await supabase.from('tarefas').insert([novaTarefaVoz]).select();
        if (error) throw error;
        if (data && onTarefaAdicionada) {
          onTarefaAdicionada(data[0]); 
        }
      } catch (err) {
        console.error("Erro ao salvar comando de voz:", err);
      }
    };

    recognition.onerror = (event) => {
      console.error("Erro no reconhecimento de voz:", event.error);
      setEscutando(false);
    };

    recognition.start();
  };

  return (
    <button
      type="button"
      onClick={ligarComandoVoz}
      className={`fixed bottom-6 right-6 z-50 p-3 px-5 rounded-full font-bold flex items-center gap-2 shadow-2xl border transition-all active:scale-95 cursor-pointer ${
        escutando 
          ? 'bg-red-500 text-white border-red-600 animate-pulse ring-4 ring-red-500/30' 
          : 'bg-violet-600 hover:bg-violet-500 text-white border-violet-500 shadow-violet-600/20'
      }`}
      title="Ex: 'Prova de microeconomia no dia 09/06 de 10 as 12' ou 'Concluir prova...'"
    >
      <span className={escutando ? 'animate-bounce' : ''}>🎙️</span>
      <span className="text-xs tracking-wide">{escutando ? 'Ouvindo...' : 'Comando de Voz'}</span>
    </button>
  );
}