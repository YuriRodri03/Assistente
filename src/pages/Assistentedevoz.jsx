import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AssistenteVoz({ userId, dataSelecionada, onTarefaAdicionada }) {
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
      const textoCapturado = event.results[0][0].transcript.toLowerCase();
      console.log("Texto bruto capturado:", textoCapturado);

      let titulo = textoCapturado;
      let prazo = 'diaria';
      let tipo = 'livre';
      let hora_inicio = '';
      let hora_fim = '';
      let dataAlvo = dataSelecionada;

      // ==========================================
      // 1. DETECTOR DE LONGO PRAZO (BACKLOG)
      // ==========================================
      if (textoCapturado.includes('longo prazo') || textoCapturado.includes('backlog') || textoCapturado.includes('meta')) {
        prazo = 'longo_prazo';
        dataAlvo = null;
        titulo = titulo.replace(/longo prazo|backlog|meta/g, '');
      }

      // ==========================================
      // 2. PROCESSAMENTO DE DATA (Com limpeza de conectivos grudados)
      // ==========================================
      if (textoCapturado.includes('amanhã')) {
        const hoje = new Date(dataSelecionada + 'T00:00:00');
        hoje.setDate(hoje.getDate() + 1);
        
        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const dia = String(hoje.getDate()).padStart(2, '0');
        dataAlvo = `${ano}-${mes}-${dia}`;

        // Limpa "amanhã de", "amanhã as", "amanhã às" ou apenas "amanhã"
        titulo = titulo.replace(/\bamanhã\s*(?:de|das|as|às|pt)?\b/g, '');
      } else if (textoCapturado.includes('hoje')) {
        titulo = titulo.replace(/\bhoje\s*(?:de|das|as|às)?\b/g, '');
      }

      // ==========================================
      // 3. DETECTOR DE INTERVALOS E HORÁRIOS
      // ==========================================
      if (prazo === 'diaria') {
        // Padrão A: Intervalos como "de 10 as 12", "das 14h às 15:30"
        const regexIntervalo = /(?:\b(?:de|das)\s+)?(\d{1,2})(?:h|:|\s+horas?)?(\d{2})?\s*(?:as|às|ate|até|e)\s*(\d{1,2})(?:h|:|\s+horas?)?(\d{2})?/i;
        const matchIntervalo = titulo.match(regexIntervalo);

        // Padrão B: Horários únicos como "as 15h", "às 09:30"
        const regexHoraUnica = /\b(?:as|às)\s+(\d{1,2})(?:h|:|\s+horas?)?(\d{2})?/i;
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
      // 4. FAXINA RIGOROSA DE SOBRAS NO TÍTULO
      // ==========================================
      titulo = titulo
        // Remove verbos de comando operacionais no início da frase
        .replace(/^(agendar|adicionar|criar|tarefa|colocar|por|lembrar|de|para|tenho)\b/g, '')
        // Remove conectivos e preposições que ficaram perdidos no meio ou fim do texto
        .replace(/\b(de|da|do|em|para|as|às|das|dos|com)\s*$/, '')
        .replace(/^\s*(de|da|do|em|para|as|às|das|dos|com)\b/g, '')
        // Remove espaços múltiplos gerados pelos cortes
        .replace(/\s+/g, ' ') 
        .trim();

      // Capitaliza a primeira letra do título limpo
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
      title="Ex: 'Aula de microeconomia amanhã de 10 as 12' ou 'Estudar para a prova de longo prazo'"
    >
      <span className={escutando ? 'animate-bounce' : ''}>🎙️</span>
      <span className="text-xs tracking-wide">{escutando ? 'Ouvindo...' : 'Comando de Voz'}</span>
    </button>
  );
}