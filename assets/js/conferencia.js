/* =========================================================
   Resumo da conferência — compartilhado pelas 3 loterias.
   Mostra quantos jogos foram premiados e quais foram
   (ex.: "Jogo 104 — 14 pontos").
   Carregar ANTES do JS da loteria.
   ========================================================= */

/** Faixas premiadas de cada loteria, da maior para a menor.
 *  @type {Record<string, { pts: number; nome: string }[]>} */
const FAIXAS_PREMIO = {
  lotofacil: [
    { pts: 15, nome: '15 pontos' },
    { pts: 14, nome: '14 pontos' },
    { pts: 13, nome: '13 pontos' },
    { pts: 12, nome: '12 pontos' },
    { pts: 11, nome: '11 pontos' }
  ],
  megasena: [
    { pts: 6, nome: 'Sena (6)' },
    { pts: 5, nome: 'Quina (5)' },
    { pts: 4, nome: 'Quadra (4)' }
  ],
  lotomania: [
    { pts: 20, nome: '20 pontos' },
    { pts: 19, nome: '19 pontos' },
    { pts: 18, nome: '18 pontos' },
    { pts: 17, nome: '17 pontos' },
    { pts: 16, nome: '16 pontos' },
    { pts: 15, nome: '15 pontos' },
    { pts: 0, nome: '0 acertos' }
  ]
};

function loteriaDaPagina() {
  return ['lotofacil', 'megasena', 'lotomania'].find(c => document.body.classList.contains(c)) || 'lotofacil';
}

/** Faixa de prêmio para uma quantidade de acertos (ou null se não premia).
 *  @param {number} pts */
function faixaPremio(pts) {
  return (FAIXAS_PREMIO[loteriaDaPagina()] || []).find(f => f.pts === pts) || null;
}

/** Id do elemento de um jogo no histórico (para o link do resumo).
 *  @param {number} entradaIdx
 *  @param {number} jogoIdx */
function idJogoHist(entradaIdx, jogoIdx) {
  return `hist-jogo-${entradaIdx}-${jogoIdx}`;
}

/** Atributos extras para a linha de um jogo conferido: id + classe de premiado.
 *  @param {number} pts
 *  @param {number} entradaIdx
 *  @param {number} jogoIdx */
function attrsJogoConferido(pts, entradaIdx, jogoIdx) {
  const premiado = faixaPremio(pts) ? ' premiado' : '';
  return { id: idJogoHist(entradaIdx, jogoIdx), classe: premiado };
}

/* ---------- Escolha de qual jogo salvo conferir ---------- */

/** Chave que identifica um jogo salvo (não muda quando outro é salvo na frente).
 *  @param {{ data: string; jogos: number[][] }} entrada */
function chaveEntrada(entrada) {
  return `${entrada.data}|${(entrada.jogos || []).length}`;
}

/** Seleção atual: chave de um jogo salvo, 'todos', ou null (= o mais recente).
 *  @type {string | null} */
let selecaoConferencia = null;

/** Índices (no histórico) dos jogos salvos que devem ser conferidos.
 *  @param {{ data: string; jogos: number[][] }[]} historico
 *  @returns {number[]} */
function indicesParaConferir(historico) {
  if (!historico.length) return [];
  if (selecaoConferencia === 'todos') return historico.map((_, i) => i);
  const idx = historico.findIndex(e => chaveEntrada(e) === selecaoConferencia);
  return [idx >= 0 ? idx : 0];
}

/** Chamado pelos botões do seletor.
 *  @param {string} valor  chave do jogo salvo ou 'todos' */
function escolherConferencia(valor) {
  selecaoConferencia = valor;
  // renderHistorico é definida no JS de cada loteria
  if (typeof renderHistorico === 'function') renderHistorico();
}

/** HTML da pergunta "Qual jogo salvo você quer conferir?".
 *  @param {{ data: string; jogos: number[][]; fixas?: number[]; dezenas_por_jogo?: number; metodologia?: string }[]} historico
 *  @param {{ dezenas: Set<number> } | null} resultado */
function renderSeletorConferencia(historico, resultado) {
  if (!historico.length) return '';
  const esc2 = (/** @type {unknown} */ s) => String(s ?? '').replace(/[&<>"']/g, c =>
    /** @type {Record<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dois = (/** @type {number} */ n) => (n < 10 ? '0' : '') + n;
  const selecionados = indicesParaConferir(historico);
  const todos = selecaoConferencia === 'todos';

  const opcoes = historico.map((entrada, i) => {
    const qtd = (entrada.jogos || []).length;
    const fixas = (entrada.fixas || []);
    const fixasTxt = fixas.length
      ? `Fixas: ${fixas.slice(0, 10).map(dois).join(' ')}${fixas.length > 10 ? ' …' : ''}`
      : 'Sem fixas';
    const premiados = resultado ? contarPremiadosEntrada(entrada.jogos, resultado) : 0;
    const marcado = !todos && selecionados[0] === i;
    return `
      <label class="sel-opcao${marcado ? ' marcada' : ''}">
        <input type="radio" name="selConferencia" ${marcado ? 'checked' : ''}
          onchange="escolherConferencia(this.value)" value="${esc2(chaveEntrada(entrada))}">
        <span class="sel-info">
          <span class="sel-titulo">${i === 0 ? '<em>Mais recente</em> · ' : ''}${esc2(entrada.data)}</span>
          <span class="sel-detalhe">${qtd} jogo${qtd !== 1 ? 's' : ''}${entrada.dezenas_por_jogo ? ` · ${entrada.dezenas_por_jogo} dezenas` : ''}${entrada.metodologia ? ' · ' + esc2(entrada.metodologia) : ''} · ${fixasTxt}</span>
        </span>
        ${premiados ? `<span class="sel-premio">🏆 ${premiados}</span>` : ''}
      </label>`;
  }).join('');

  const totalJogos = historico.reduce((acc, e) => acc + (e.jogos || []).length, 0);
  const opcaoTodos = historico.length > 1 ? `
      <label class="sel-opcao sel-todos${todos ? ' marcada' : ''}">
        <input type="radio" name="selConferencia" ${todos ? 'checked' : ''}
          onchange="escolherConferencia('todos')" value="todos">
        <span class="sel-info">
          <span class="sel-titulo">Conferir todos</span>
          <span class="sel-detalhe">${historico.length} salvos · ${totalJogos} jogos</span>
        </span>
      </label>` : '';

  return `
    <div class="sel-conferencia">
      <div class="sel-pergunta">Qual jogo salvo você quer conferir?</div>
      <div class="sel-lista">${opcoes}${opcaoTodos}</div>
    </div>`;
}

/** Confere os jogos salvos escolhidos e devolve os premiados, do maior para o menor.
 *  @param {{ data: string; jogos: number[][] }[]} historico
 *  @param {{ dezenas: Set<number> }} resultado
 *  @param {number[]=} indices  quais entradas conferir (padrão: todas) */
function conferirHistorico(historico, resultado, indices) {
  /** @type {{ entradaIdx: number; jogoIdx: number; data: string; pts: number; nome: string }[]} */
  const premiados = [];
  let totalJogos = 0;
  const usar = new Set(indices || historico.map((_, i) => i));
  historico.forEach((entrada, entradaIdx) => {
    if (!usar.has(entradaIdx)) return;
    (entrada.jogos || []).forEach((jogo, jogoIdx) => {
      totalJogos++;
      const pts = jogo.filter(n => resultado.dezenas.has(n)).length;
      const faixa = faixaPremio(pts);
      if (faixa) premiados.push({ entradaIdx, jogoIdx, data: entrada.data, pts, nome: faixa.nome });
    });
  });
  const ordem = (FAIXAS_PREMIO[loteriaDaPagina()] || []).map(f => f.pts);
  premiados.sort((a, b) => ordem.indexOf(a.pts) - ordem.indexOf(b.pts) || a.entradaIdx - b.entradaIdx || a.jogoIdx - b.jogoIdx);
  return { premiados, totalJogos };
}

/** Quantos premiados há em uma entrada (para o selo no cabeçalho).
 *  @param {number[][]} jogos
 *  @param {{ dezenas: Set<number> }} resultado */
function contarPremiadosEntrada(jogos, resultado) {
  return (jogos || []).filter(j => faixaPremio(j.filter(n => resultado.dezenas.has(n)).length)).length;
}

/** HTML do selo "N premiados" para o cabeçalho de cada jogo salvo.
 *  @param {number[][]} jogos
 *  @param {{ dezenas: Set<number> } | null} resultado */
function seloPremiadosEntrada(jogos, resultado) {
  if (!resultado) return '';
  const n = contarPremiadosEntrada(jogos, resultado);
  return n
    ? `<span class="hist-badge badge-premiado">🏆 ${n} premiado${n > 1 ? 's' : ''}</span>`
    : '';
}

/** HTML do painel de resumo da conferência.
 *  @param {{ data: string; jogos: number[][] }[]} historico
 *  @param {{ dezenas: Set<number>; numero: number }} resultado
 *  @param {number[]=} indices  quais entradas conferir (padrão: todas) */
function renderResumoConferencia(historico, resultado, indices) {
  const { premiados, totalJogos } = conferirHistorico(historico, resultado, indices);
  const variasEntradas = (indices ? indices.length : historico.length) > 1;
  const esc2 = (/** @type {unknown} */ s) => String(s ?? '').replace(/[&<>"']/g, c =>
    /** @type {Record<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  if (!premiados.length) {
    return `
      <div class="conf-resumo conf-vazio">
        <strong>Nenhum jogo premiado</strong> no concurso ${resultado.numero}
        <span>${totalJogos} jogo${totalJogos !== 1 ? 's' : ''} conferido${totalJogos !== 1 ? 's' : ''}.</span>
      </div>`;
  }

  /** @type {Record<number, number>} */
  const porFaixa = {};
  premiados.forEach(p => { porFaixa[p.pts] = (porFaixa[p.pts] || 0) + 1; });
  const chips = (FAIXAS_PREMIO[loteriaDaPagina()] || [])
    .filter(f => porFaixa[f.pts])
    .map(f => `<span class="conf-chip"><b>${porFaixa[f.pts]}</b> × ${f.nome}</span>`)
    .join('');

  const lista = premiados.map(p => `
      <a class="conf-item" href="#${idJogoHist(p.entradaIdx, p.jogoIdx)}">
        <span class="conf-jogo">Jogo ${p.jogoIdx + 1}</span>
        ${variasEntradas ? `<span class="conf-data">salvo em ${esc2(p.data)}</span>` : ''}
        <span class="conf-pts">${p.nome}</span>
      </a>`).join('');

  return `
    <div class="conf-resumo">
      <div class="conf-topo">
        <div>
          <div class="conf-titulo">🏆 ${premiados.length} jogo${premiados.length > 1 ? 's' : ''} premiado${premiados.length > 1 ? 's' : ''}</div>
          <div class="conf-sub">de ${totalJogos} conferido${totalJogos !== 1 ? 's' : ''} no concurso ${resultado.numero}</div>
        </div>
        <label class="conf-filtro">
          <input type="checkbox" onchange="document.getElementById('histConteudo').classList.toggle('so-premiados', this.checked)">
          Só premiados
        </label>
      </div>
      <div class="conf-chips">${chips}</div>
      <div class="conf-lista">${lista}</div>
    </div>`;
}
