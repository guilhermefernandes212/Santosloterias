/**
 * @template T
 * @param {string} id
 * @returns {T}
 */
function getEl(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return /** @type {T} */ (el);
}

/**
 * @param {string} id
 * @returns {HTMLInputElement}
 */
function getInput(id) {
  return getEl(id);
}

/**
 * @param {string} id
 * @returns {HTMLSelectElement}
 */
function getSelect(id) {
  return getEl(id);
}
/** @param {string} id
 * @returns {HTMLButtonElement}
 */
function getButton(id) {
  return getEl(id);
}
/** @typedef {{ top: number[] }} DicaAplicavel */
/** @typedef {{ data: string; fixas: number[]; dezenas_por_jogo: number; jogos: number[][] }} HistoryEntry */

const CACHE_HISTORICO_KEY = 'loto_resultados_online_v2';
const CORS_PROXY_BUILDERS = [
  /** @param {string} url */
  url => url,
  /** @param {string} url */
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  /** @param {string} url */
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  /** @param {string} url */
  url => `https://proxy.corsfix.com/?url=${encodeURIComponent(url)}`,
  /** @param {string} url */
  url => `https://bypass.cors.rest/proxy?url=${encodeURIComponent(url)}`
];
/** @type {Set<string>} */
const hostsComCorsBloqueado = new Set();
const LOTOFACIL_SEEDS = [
  {
    nome: 'loteria.json',
    url: 'https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/lotofacil.json'
  },
  {
    nome: 'jsDelivr loteria.json',
    url: 'https://cdn.jsdelivr.net/gh/guilhermeasn/loteria.json@master/data/lotofacil.json'
  }
];
/** @type {Record<number, { 13: number; 14: number }>} */
const PROB_OFICIAL = {
  15: { 13: 692, 14: 21792 },
  16: { 13: 162, 14: 3027 },
  17: { 13: 49, 14: 601 },
  18: { 13: 18, 14: 153 },
  19: { 13: 8, 14: 47 },
  20: { 13: 4.2, 14: 17 }
};
const MOLDURA = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
/** @type {Set<number>} */
const fixasSel = new Set();
/** @type {number[][]} */
let jogosGerados = [];
/** Fixas e dezenas por jogo usadas na última geração (não as atuais da tela).
 *  @type {number[]} */
let fixasGeradas = [];
let dezJogoGerado = 0;
let jogosJaSalvos = false;
/** @type {number[][]} */
let livresSelecionados = [];
/** @type {DicaAplicavel | null} */
let dicaAplicavel = null;

/** @returns {number} */
function getQtdFixasDesejada() {
  const el = /** @type {HTMLInputElement | null} */ (document.getElementById('qtdFixas'));
  const valor = parseInt(el?.value ?? '', 10);
  return Number.isFinite(valor) ? Math.max(1, Math.min(25, valor)) : 14;
}

/** @returns {number[]} */
function getLivres() {
  const livres = [];
  for (let i = 1; i <= 25; i++) {
    if (!fixasSel.has(i)) livres.push(i);
  }
  return livres;
}

/** @param {number} n */
function fmt(n) { return n < 10 ? '0' + n : '' + n; }

/** @param {number} n
 *  @param {number} k */
function comb(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}

/** @param {number[]} arr
 *  @param {number} k
 *  @returns {number[][]} */
function combinations(arr, k) {
  /** @type {number[][]} */
  const res = [];
  /**
   * @param {number} start
   * @param {number[]} cur
   */
  function bt(start, cur) {
    if (cur.length === k) { res.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]); bt(i + 1, cur); cur.pop();
    }
  }
  bt(0, []);
  return res;
}

/** @param {number[]} a
 *  @param {number[]} b
 *  @returns {number} */
function distancia(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let d = 0;
  for (const x of sa) if (!sb.has(x)) d++;
  for (const x of sb) if (!sa.has(x)) d++;
  return d;
}

/** Embaralhamento uniforme (Fisher-Yates). Retorna uma cópia.
 *  @param {number[]} arr
 *  @returns {number[]} */
function embaralhar(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Escolhe até n combinações bem diferentes entre si (greedy max-min).
 *  Mantém a menor distância de cada candidato já calculada, então custa
 *  O(candidatos × n) em vez de O(candidatos × n²).
 *  @param {number[][]} todos
 *  @param {number} n
 *  @returns {number[][]} */
function selecionarDiversos(todos, n) {
  if (n >= todos.length) return todos.slice();
  const minDist = new Array(todos.length).fill(Infinity);
  const usado = new Array(todos.length).fill(false);
  const sel = [];
  let idx = Math.floor(Math.random() * todos.length);
  while (sel.length < n && idx >= 0) {
    usado[idx] = true;
    sel.push(todos[idx]);
    const escolhido = new Set(todos[idx]);
    let melhor = -1;
    let melhorDist = -1;
    for (let i = 0; i < todos.length; i++) {
      if (usado[i]) continue;
      let iguais = 0;
      for (const x of todos[i]) if (escolhido.has(x)) iguais++;
      const d = (todos[i].length - iguais) * 2;
      if (d < minDist[i]) minDist[i] = d;
      if (minDist[i] > melhorDist) { melhorDist = minDist[i]; melhor = i; }
    }
    idx = melhor;
  }
  return sel;
}

/** Gera n combinações de k dezenas do pool, diversas entre si, sem
 *  enumerar milhões de combinações (amostra aleatória quando o total é grande).
 *  @param {number[]} pool
 *  @param {number} k
 *  @param {number} n
 *  @returns {number[][]} */
function gerarLivresDiversos(pool, k, n) {
  const total = comb(pool.length, k);
  if (total === 0) return [];
  /** @type {number[][]} */
  let candidatos;
  if (total <= 3000) {
    candidatos = combinations(pool, k);
  } else {
    const alvo = Math.min(total, Math.max(n * 40, 1500));
    const vistos = new Set();
    candidatos = [];
    for (let t = 0; candidatos.length < alvo && t < alvo * 20; t++) {
      const c = embaralhar(pool).slice(0, k).sort((a, b) => a - b);
      const chave = c.join(',');
      if (!vistos.has(chave)) { vistos.add(chave); candidatos.push(c); }
    }
  }
  return selecionarDiversos(candidatos, Math.min(n, candidatos.length));
}

/** Formata números grandes de forma legível (pt-BR).
 *  @param {number} n */
function fmtComb(n) {
  if (!n || !Number.isFinite(n)) return '-';
  const um = (/** @type {number} */ v) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  if (n >= 1e18) return n.toExponential(1).replace('.', ',').replace('e+', ' × 10^');
  if (n >= 1e15) return um(n / 1e15) + ' quatri';
  if (n >= 1e12) return um(n / 1e12) + ' tri';
  if (n >= 1e9) return um(n / 1e9) + ' bi';
  if (n >= 1e6) return um(n / 1e6) + ' mi';
  if (n >= 1e4) return um(n / 1e3) + ' mil';
  return n.toLocaleString('pt-BR');
}

/** Escapa texto vindo de fontes externas antes de usar em innerHTML.
 *  @param {unknown} s */
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => /** @type {Record<string,string>} */ ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** @param {number} ms */
function sinalTimeout(ms) {
  return (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(ms) : undefined;
}

/**
 * Gera jogos otimizados quando há exatamente 14 fixas.
 * @param {number[]} fixas
 * @param {number[]} poolLivres
 * @param {number} qtdJogos
 * @param {{ dezenas: number[] }} ultimoResultado
 * @returns {number[][]}
 */
function gerarJogosOtimizados(fixas, poolLivres, qtdJogos, ultimoResultado) {
  const somaFixas = fixas.reduce((a, b) => a + b, 0);
  const paresFixas = fixas.filter(n => n % 2 === 0).length;

  // Com 14 fixas em Lotofácil, sobra exatamente 1 número livre por jogo.
  const todasCombinacoesLivres = combinations(poolLivres, 1);
  const combinacoesFiltradas = todasCombinacoesLivres.filter(livres => {
    const somaLivres = livres[0];
    const somaTotal = somaFixas + somaLivres;
    if (somaTotal < 180 || somaTotal > 220) return false;

    const paresLivres = livres[0] % 2 === 0 ? 1 : 0;
    const totalPares = paresFixas + paresLivres;
    if (totalPares < 7 || totalPares > 9) return false;

    return true;
  });

  const jogosParaUsar = combinacoesFiltradas.length >= qtdJogos
    ? combinacoesFiltradas
    : todasCombinacoesLivres;

  const candidatos = jogosParaUsar.filter(livres => {
    const jogoCompleto = [...fixas, ...livres].sort((a, b) => a - b);
    return distancia(jogoCompleto, ultimoResultado.dezenas || []) > 0;
  });

  const finalPool = candidatos.length ? candidatos : jogosParaUsar;
  const selecionados = selecionarDiversos(finalPool, Math.min(qtdJogos, finalPool.length));
  return selecionados.map(livres => [...fixas, ...livres].sort((a, b) => a - b));
}

/** @param {string} texto */
function mostrarAviso(texto) {
  const aviso = /** @type {HTMLElement | null} */ (document.getElementById('aviso'));
  if (!aviso) return;
  aviso.style.display = 'block';
  aviso.textContent = texto;
}

/** @param {HTMLElement} el
 *  @param {string=} tipo */
function renderDezena(el, tipo) {
  const n = parseInt(el.dataset.n ?? '0', 10);
  const paridade = n % 2 === 0 ? 'par' : 'impar';
  el.className = 'dez ' + (tipo ? tipo : paridade);
}

function sincronizarGrades() {
  document.querySelectorAll('#gridDez .dez').forEach((b) => {
    const el = /** @type {HTMLElement} */ (b);
    const n = parseInt(el.dataset.n ?? '0', 10);
    renderDezena(el, fixasSel.has(n) ? 'fixa' : '');
  });
}

// Grade de dezenas fixas
const grid = getEl('gridDez');
for (let i = 1; i <= 25; i++) {
  const b = document.createElement('div');
  const paridade = i % 2 === 0 ? 'par' : 'impar';
  b.className = 'dez ' + paridade;
  b.textContent = fmt(i);
  b.dataset.n = String(i);
  b.addEventListener('click', () => {
    if (fixasSel.has(i)) {
      fixasSel.delete(i);
    } else {
      const limiteFixas = getQtdFixasDesejada();
      if (fixasSel.size >= limiteFixas) {
        mostrarAviso(`Máximo de ${limiteFixas} dezenas fixas atingido. Altere a quantidade de fixas para selecionar mais.`);
        return;
      }
      fixasSel.add(i);
    }
    renderDezena(b, fixasSel.has(i) ? 'fixa' : '');
    atualizar();
  });
  grid.appendChild(b);
}


function atualizar() {
  const dezJogo = parseInt(getSelect('selDezJogo').value, 10);
  const qtdFixas = getQtdFixasDesejada();
  const livresPool = getLivres();
  const livresPorJogo = dezJogo - fixasSel.size;
  const nComb = livresPorJogo >= 0 && livresPorJogo <= livresPool.length
    ? comb(livresPool.length, livresPorJogo) : 0;

  getEl('sFixas').textContent = String(fixasSel.size);
  getEl('sLivres').textContent = String(livresPool.length);
  getEl('sComb').textContent = fmtComb(nComb);
  atualizarOdds();

  getButton('btnGerar').disabled = fixasSel.size > qtdFixas || livresPorJogo < 0 || nComb === 0;

  const aviso = getEl('aviso');
  if (fixasSel.size > qtdFixas) {
    mostrarAviso(`Você selecionou ${fixasSel.size} fixas, mas a quantidade configurada é ${qtdFixas}. Remova algumas dezenas ou aumente a quantidade.`);
  } else if (livresPorJogo < 0) {
    mostrarAviso(`Fixas (${fixasSel.size}) maiores que dezenas por jogo (${dezJogo}). Aumente as dezenas por jogo.`);
  } else if (nComb === 0) {
    mostrarAviso('Sem combinacoes possiveis com essa configuracao.');
  } else if (fixasSel.size === 0) {
    mostrarAviso('Nenhuma dezena fixa selecionada. Os jogos serão gerados apenas com números livres.');
  } else {
    aviso.style.display = 'none';
  }
}

getSelect('selDezJogo').addEventListener('change', atualizar);
/** Quantidade de jogos digitada (1 a QTD_JOGOS_MAX). Vazio/inválido usa o padrão. */
const QTD_JOGOS_MAX = 200;
function getQtdJogos() {
  const el = /** @type {HTMLInputElement} */ (document.getElementById('selJogos'));
  const v = parseInt(el.value, 10);
  return Number.isFinite(v) ? Math.max(1, Math.min(QTD_JOGOS_MAX, v)) : 15;
}
// Ao sair do campo, mostra o valor que realmente será usado.
document.getElementById('selJogos').addEventListener('change', (e) => {
  /** @type {HTMLInputElement} */ (e.target).value = String(getQtdJogos());
});
getInput('selJogos').addEventListener('input', atualizar);
getInput('qtdFixas').addEventListener('input', atualizar);

// login removed - app opens directly

getEl('btnGerar').addEventListener('click', () => {
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  const dezJogo = parseInt(getSelect('selDezJogo').value, 10);
  const nJogos = getQtdJogos();
  const qtdFixas = getQtdFixasDesejada();
  const livresPool = getLivres().sort((a, b) => a - b);
  const livrosPorJogo = dezJogo - fixas.length;

  if (fixas.length > qtdFixas) {
    mostrarAviso(`Você selecionou ${fixas.length} fixas, mas a quantidade configurada é ${qtdFixas}. Ajuste a quantidade de fixas ou remova algumas dezenas.`);
    return;
  }

  if (livrosPorJogo < 0) {
    mostrarAviso(`Fixas (${fixas.length}) maiores que dezenas por jogo (${dezJogo}). Aumente as dezenas por jogo ou remova fixas.`);
    return;
  }

  if (comb(livresPool.length, livrosPorJogo) === 0) {
    mostrarAviso('Sem combinações possíveis com essa configuração. Verifique a quantidade de fixas e dezenas por jogo.');
    return;
  }

  if (fixas.length === 14 && dezJogo === 15) {
    jogosGerados = gerarJogosOtimizados(fixas, livresPool, nJogos, { dezenas: ultimoResultado ? ultimoResultado.lista : [] });
  } else {
    livresSelecionados = gerarLivresDiversos(livresPool, livrosPorJogo, nJogos);
    jogosGerados = livresSelecionados.map(livres =>
      [...fixas, ...livres].sort((a, b) => a - b));
  }
  fixasGeradas = fixas;
  dezJogoGerado = dezJogo;
  jogosJaSalvos = false;

  renderJogos(jogosGerados, fixas);
  getEl('lblJogos').textContent =
    `${jogosGerados.length} jogos gerados - OK, sem repetição`;
  getEl('secJogos').style.display = 'block';
  if (jogosGerados.length < nJogos) {
    mostrarAviso(`Só existem ${jogosGerados.length} jogos diferentes com ${fixas.length} fixas em jogos de ${dezJogo} dezenas — foram gerados ${jogosGerados.length} em vez de ${nJogos}. Para mais jogos, remova fixas ou aumente as dezenas por jogo.`);
  }
  mostrarModal();
});

/** @param {number[][]} jogos
 *  @param {number[]} fixas */
function renderJogos(jogos, fixas) {
  const fs = new Set(fixas);
  const wrap = getEl('jogosWrap');
  wrap.innerHTML = '';
  jogos.forEach((jogo, i) => {
    const card = document.createElement('div');
    card.className = 'jogo-card';
    card.innerHTML = `
      <span class="jogo-n">Jogo ${i + 1}</span>
      <div class="bolinhas">
        ${jogo.map(d => `<span class="b ${fs.has(d) ? 'b-f' : 'b-l'}">${fmt(d)}</span>`).join('')}
      </div>
    `;
    wrap.appendChild(card);
  });
}

function limparJogos() {
  jogosGerados = [];
  livresSelecionados = [];
  getEl('secJogos').style.display = 'none';
}

function copiarJogos() {
  const fixas = fixasGeradas;
  let txt = `LOTOFACIL - ${jogosGerados.length} jogos\n`;
  txt += `Fixas: ${fixas.map(fmt).join(' - ')}\n\n`;
  jogosGerados.forEach((j, i) => {
    txt += `Jogo ${i + 1}: ${j.map(fmt).join(' - ')}\n`;
  });
  const btn = getButton('btnCopiar');
  /** @param {string} msg */
  const feedback = (msg) => {
    btn.textContent = msg;
    setTimeout(() => btn.textContent = 'Copiar jogos', 2000);
  };
  copiarTexto(txt)
    .then(() => feedback('Copiado!'))
    .catch(() => feedback('Não foi possível copiar'));
}

/** Copia texto usando a Clipboard API e, se não houver/for bloqueada,
 *  o método antigo com textarea + execCommand.
 *  @param {string} txt
 *  @returns {Promise<void>} */
function copiarTexto(txt) {
  const fallback = () => new Promise((resolve, reject) => {
    const ta = document.createElement('textarea');
    ta.value = txt;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    document.body.removeChild(ta);
    ok ? resolve(undefined) : reject(new Error('copy falhou'));
  });
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(txt).catch(fallback);
  }
  return fallback();
}

// Historico no localStorage
function getHistorico() {
  try { return JSON.parse(localStorage.getItem('loto_historico') || '[]'); }
  catch { return []; }
}

/** @param {unknown[]} h */
function setHistorico(h) {
  localStorage.setItem('loto_historico', JSON.stringify(h));
}

function salvarHistorico() {
  if (!jogosGerados.length) return;
  const btn = getEl('btnSalvar');
  if (jogosJaSalvos) {
    btn.textContent = 'Já está no histórico';
    setTimeout(() => btn.textContent = 'Salvar no histórico', 2000);
    return;
  }
  const h = getHistorico();
  h.unshift({
    data: new Date().toLocaleString('pt-BR'),
    fixas: fixasGeradas,
    dezenas_por_jogo: dezJogoGerado,
    jogos: jogosGerados
  });
  setHistorico(h);
  jogosJaSalvos = true;
  renderHistorico();
  btn.textContent = 'Salvo!';
  setTimeout(() => btn.textContent = 'Salvar no histórico', 2000);
}

function limparHistorico() {
  if (confirm('Limpar todo o historico?')) {
    setHistorico([]);
    renderHistorico();
  }
}

/** @typedef {{ numero: number; data: string; dezenas: Set<number>; lista: number[] }} ResultadoConcurso */
/** @type {ResultadoConcurso | null} */
let ultimoResultado = null;

/** @param {string} msg
 *  @param {string} cor */
function setStatusConcurso(msg, cor) {
  const el = getEl('concursoStatus');
  el.style.display = msg ? 'block' : 'none';
  el.textContent = msg || '';
  el.style.color = cor || 'var(--text2)';
}

/** Busca um concurso (ou o último, se numero = null). Um concurso específico
 *  é procurado primeiro no cache local, sem precisar de internet.
 *  Usa fetchJson, que já pula o acesso direto quando a CAIXA bloqueia CORS.
 *  @param {number|null} numero
 *  @returns {Promise<ResultadoConcurso | null>} */
async function buscarConcurso(numero) {
  try {
    let c = numero ? lerCacheHistorico().find(x => x.numero === numero) : undefined;
    if (!c) c = numero ? await buscarConcursoCaixa(numero) : await buscarUltimoCaixa();
    if (!c || c.dezenas.length !== 15) return null;
    return { numero: c.numero, data: c.data, dezenas: new Set(c.dezenas), lista: c.dezenas };
  } catch {
    return null;
  }
}

async function buscarUltimo() {
  setStatusConcurso('Buscando último concurso...', 'var(--text2)');
  const res = await buscarConcurso(null);
  if (res) {
    ultimoResultado = res;
    getInput('inputConcurso').value = String(res.numero);
    setStatusConcurso(`Concurso ${res.numero}${res.data ? ' — ' + res.data : ''} carregado.`, 'var(--cor)');
    renderHistorico();
  } else {
    setStatusConcurso('Não foi possível buscar o resultado. Tente novamente ou digite o número do concurso.', '#c0392b');
  }
}

async function buscarConcursoManual() {
  const input = getInput('inputConcurso');
  const num = parseInt(input.value, 10);
  if (!num || num < 1) {
    setStatusConcurso('Digite um número de concurso válido.', '#c0392b');
    return;
  }
  setStatusConcurso(`Buscando concurso ${num}...`, 'var(--text2)');
  const res = await buscarConcurso(num);
  if (res) {
    ultimoResultado = res;
    setStatusConcurso(`Concurso ${res.numero}${res.data ? ' — ' + res.data : ''} carregado.`, 'var(--cor)');
    renderHistorico();
  } else {
    setStatusConcurso(`Concurso ${num} não encontrado.`, '#c0392b');
  }
}

/** @param {number[]} jogo
 *  @param {number} idx
 *  @param {{ dezenas: Set<number>; numero: number; data: string; lista: number[] }} resultado */
function renderJogoComAcertos(jogo, idx, resultado, entradaIdx = 0) {
  const acertos = jogo.filter(n => resultado.dezenas.has(n));
  const pts = acertos.length;
  const linha = attrsJogoConferido(pts, entradaIdx, idx);
  let badgeClass = 'acerto-badge';
  if (pts >= 15) badgeClass += ' acerto-15';
  else if (pts >= 14) badgeClass += ' acerto-14';
  else if (pts >= 13) badgeClass += ' acerto-13';
  else badgeClass += ' acerto-ok';

  const dezenas = jogo.map(n => {
    const hit = resultado.dezenas.has(n);
    return `<span class="dez-inline${hit ? ' dez-hit' : ''}">${fmt(n)}</span>`;
  }).join('');

  return `
    <div class="hist-jogo-row${linha.classe}" id="${linha.id}">
      <span class="hist-jogo-num">Jogo ${idx + 1}</span>
      <div class="hist-dez-wrap">${dezenas}</div>
      <span class="${badgeClass}">${pts} pts</span>
    </div>`;
}

/** @param {{ dezenas: Set<number>; numero: number; data: string; lista: number[] }=} resultado */
function renderHistorico(resultado) {
  const h = /** @type {HistoryEntry[]} */ (getHistorico());
  const el = getEl('histConteudo');
  if (!h.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text2);text-align:center;padding:1rem 0">Nenhum jogo salvo ainda.</p>';
    return;
  }

  const res = resultado || ultimoResultado;
  const resultadoHTML = res
    ? `<div class="hist-resultado">
        <span class="hist-resultado-label">Concurso ${res.numero}${res.data ? ' — ' + esc(res.data) : ''}</span>
        <div class="hist-resultado-dez">${res.lista.map(n => `<span class="dez-inline dez-sorteada">${fmt(n)}</span>`).join('')}</div>
       </div>`
    : '';

  const idxs = indicesParaConferir(h);
  el.innerHTML = renderSeletorConferencia(h, res) + resultadoHTML + (res ? renderResumoConferencia(h, res, idxs) : '') + h.map((/** @type {HistoryEntry} */ entrada, ei) => !idxs.includes(ei) ? '' : `
    <div class="hist-item">
      <div class="hist-header">
        <span class="hist-data">${esc(entrada.data)}</span>
        <span class="hist-badge">${entrada.jogos.length} jogos · ${entrada.dezenas_por_jogo} dez.</span>
        ${seloPremiadosEntrada(entrada.jogos, res)}
      </div>
      <div class="hist-fixas">Fixas: ${entrada.fixas.map(fmt).join(' · ')}</div>
      <div class="hist-jogos-lista">
        ${res
          ? entrada.jogos.map((j, i) => renderJogoComAcertos(j, i, res, ei)).join('')
          : entrada.jogos.map((j, i) => `<div class="hist-jogo-row"><span class="hist-jogo-num">Jogo ${i+1}</span><span style="font-family:var(--mono);font-size:11px">${j.map(fmt).join(' · ')}</span></div>`).join('')
        }
      </div>
    </div>
  `).join('');
}

/** @param {string} id
 *  @param {HTMLElement} el */
function setTab(id, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('ativo'));
  el.classList.add('ativo');
  getEl('tab-' + id).classList.add('ativo');
  if (id === 'historico') carregarHistorico();
}

async function carregarHistorico() {
  const h = getHistorico();
  if (!h.length) { renderHistorico(); return; }

  if (!ultimoResultado) await buscarUltimo();
  renderHistorico();
}

/** @param {number} n */
function fmtDenominador(n) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

/** @param {number} n */
function fmtProb(n) {
  return (100 / n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 10 ? 2 : 4
  }) + '%';
}

function atualizarOdds() {
  const sel = getSelect('selDezJogo');
  const dezJogo = parseInt(sel.value, 10);
  const odds = PROB_OFICIAL[dezJogo];
  const titulo = getEl('oddsTitulo');
  const odds13 = getEl('odds13');
  const odds14 = getEl('odds14');
  if (!odds) return;
  titulo.textContent = `Chance oficial com ${dezJogo} dezenas`;
  odds13.textContent = `1 em ${fmtDenominador(odds[13])} (${fmtProb(odds[13])})`;
  odds14.textContent = `1 em ${fmtDenominador(odds[14])} (${fmtProb(odds[14])})`;
}

/** @param {any} valor
 *  @param {number=} fallbackNumero
 *  @returns {{ numero: number; data: string; dezenas: number[] }} */
function normalizarConcursoApi(valor, fallbackNumero = 0) {
  const lista = valor && (valor.listaDezenas || valor.dezenas || valor.resultado || valor.dezenasSorteadasOrdemSorteio);
  const dezenas = [...new Set((lista || [])
    .map((/** @type {any} */ n) => parseInt(n, 10))
    .filter((/** @type {number} */ n) => Number.isInteger(n) && n >= 1 && n <= 25))]
    .sort((a, b) => a - b);
  const numero = parseInt(valor && (valor.numero || valor.concurso), 10) || fallbackNumero || 0;
  return {
    numero,
    data: valor && (valor.dataApuracao || valor.data || ''),
    dezenas
  };
}

/** @param {any} data
 *  @returns {{ numero: number; data: string; dezenas: number[] }[]} */
function normalizarConcursos(data) {
  if (data && data.listaDezenas && data.numero) {
    const unico = normalizarConcursoApi(data);
    return unico.dezenas.length === 15 ? [unico] : [];
  }

  const entradas = Array.isArray(data) ? data.map((valor, i) => [i + 1, valor]) : Object.entries(data || {});
  return entradas.map(([chave, valor]) => {
    if (Array.isArray(valor)) {
      return normalizarConcursoApi({ numero: chave, listaDezenas: valor }, parseInt(chave, 10));
    }
    return normalizarConcursoApi(valor || {}, parseInt(chave, 10));
  })
    .filter(c => c.numero > 0 && c.dezenas.length === 15)
    .sort((a, b) => a.numero - b.numero);
}

/** @param {{ [key: string]: number }} dist
 *  @param {string} chave */
function addDist(dist, chave) {
  dist[chave] = (dist[chave] || 0) + 1;
}

/** @param {{ [key: string]: number }} dist
 *  @param {number} total */
function topDist(dist, total) {
  const [label, count] = Object.entries(dist).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || ['-', 0];
  return { label, count, pct: total ? count / total : 0 };
}

/** @param {number[]} lista
 *  @param {number} p */
function percentile(lista, p) {
  if (!lista.length) return 0;
  const sorted = [...lista].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

/** @param {number[]} dezenas */
function contarSequencias(dezenas) {
  let paresLigados = 0;
  let maiorGrupo = 1;
  let grupo = 1;
  for (let i = 1; i < dezenas.length; i++) {
    if (dezenas[i] === dezenas[i - 1] + 1) {
      paresLigados++;
      grupo++;
      maiorGrupo = Math.max(maiorGrupo, grupo);
    } else {
      grupo = 1;
    }
  }
  return { paresLigados, maiorGrupo };
}

/** @param {{ numero: number; data: string; dezenas: number[] }[]} concursos */
function analisarConcursos(concursos) {
  const total = concursos.length;
  const recorte = concursos.slice(-Math.min(100, total));
  const freq = Array(26).fill(0);
  const freqRecente = Array(26).fill(0);
  // Número do último concurso em que cada dezena saiu (usa o número real do
  // concurso, não a posição na lista, para não errar quando faltar algum concurso).
  const ultimoNumeroSaiu = Array(26).fill(0);
  const numeroMaisRecente = total ? concursos[total - 1].numero : 0;
  const numeroMaisAntigo = total ? concursos[0].numero : 0;
  /** @type {{ [key: string]: number }} */
  const distPares = {};
  /** @type {{ [key: string]: number }} */
  const distRepetidos = {};
  /** @type {{ [key: string]: number }} */
  const distBaixas = {};
  /** @type {{ [key: string]: number }} */
  const distMoldura = {};
  /** @type {{ [key: string]: number }} */
  const distSoma = {};
  /** @type {{ [key: string]: number }} */
  const distSeq = {};
  /** @type {number[]} */
  const somas = [];

  concursos.forEach((concurso, idx) => {
    const setAtual = new Set(concurso.dezenas);
    concurso.dezenas.forEach((n) => {
      freq[n]++;
      ultimoNumeroSaiu[n] = concurso.numero;
    });

    const pares = concurso.dezenas.filter(n => n % 2 === 0).length;
    const baixas = concurso.dezenas.filter(n => n <= 13).length;
    const moldura = concurso.dezenas.filter(n => MOLDURA.has(n)).length;
    const soma = concurso.dezenas.reduce((acc, n) => acc + n, 0);
    const somaFaixa = Math.floor(soma / 10) * 10;
    const seq = contarSequencias(concurso.dezenas);

    addDist(distPares, `${pares} pares / ${15 - pares} impares`);
    addDist(distBaixas, `${baixas} baixas / ${15 - baixas} altas`);
    addDist(distMoldura, `${moldura} moldura / ${15 - moldura} miolo`);
    addDist(distSoma, `${somaFaixa}-${somaFaixa + 9}`);
    addDist(distSeq, `${seq.paresLigados} ligacoes seguidas`);
    somas.push(soma);

    // Só compara com o anterior se ele for mesmo o concurso imediatamente anterior.
    if (idx > 0 && concursos[idx - 1].numero === concurso.numero - 1) {
      const anterior = new Set(concursos[idx - 1].dezenas);
      let repetidos = 0;
      setAtual.forEach(n => { if (anterior.has(n)) repetidos++; });
      addDist(distRepetidos, `${repetidos} repetidas do anterior`);
    }
  });

  recorte.forEach((concurso) => {
    concurso.dezenas.forEach(n => { freqRecente[n]++; });
  });

  const dezenas = Array.from({ length: 25 }, (_, i) => i + 1).map((n) => {
    const histPct = freq[n] / total;
    const recPct = freqRecente[n] / recorte.length;
    return {
      n,
      freq: freq[n],
      freqRecente: freqRecente[n],
      histPct,
      recPct,
      atraso: numeroMaisRecente - (ultimoNumeroSaiu[n] || numeroMaisAntigo - 1),
      score: (histPct * 0.55) + (recPct * 0.45)
    };
  });

  const melhores = [...dezenas].sort((a, b) => b.score - a.score || a.n - b.n);
  const quentes = [...dezenas].sort((a, b) => b.freqRecente - a.freqRecente || b.freq - a.freq || a.n - b.n);
  const atrasadas = [...dezenas].sort((a, b) => b.atraso - a.atraso || a.n - b.n);
  const padroes = {
    pares: topDist(distPares, total),
    repetidos: topDist(distRepetidos, Math.max(1, Object.values(distRepetidos).reduce((a, b) => a + b, 0))),
    baixas: topDist(distBaixas, total),
    moldura: topDist(distMoldura, total),
    soma: topDist(distSoma, total),
    sequencia: topDist(distSeq, total),
    somaQ1: percentile(somas, 0.25),
    somaQ3: percentile(somas, 0.75)
  };

  return { total, recorte: recorte.length, dezenas, melhores, quentes, atrasadas, padroes };
}

function pctTexto(valor) {
  return (valor * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

function renderRank(id, itens, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = itens.map((item) => {
    const extra = tipo === 'atraso'
      ? `${item.atraso} conc.`
      : `${pctTexto(item.histPct)} hist.`;
    return `<span class="rank-pill"><strong>${fmt(item.n)}</strong><small>${extra}</small></span>`;
  }).join('');
}

function renderPadroes(padroes) {
  const linhas = [
    ['Pares / impares', padroes.pares],
    ['Repetidas do anterior', padroes.repetidos],
    ['Baixas / altas', padroes.baixas],
    ['Moldura / miolo', padroes.moldura],
    ['Soma por faixa', padroes.soma],
    ['Sequencias', padroes.sequencia]
  ];
  const el = document.getElementById('listaPadroes');
  el.innerHTML = linhas.map(([nome, dado]) => `
    <div class="padrao-row">
      <strong>${nome}</strong>
      <span>${dado.label} - ${pctTexto(dado.pct)}</span>
    </div>
  `).join('');
}

function renderDicas(analise) {
  const { padroes } = analise;
  const el = document.getElementById('dicasTexto');
  el.innerHTML = `
    <p>Para buscar 13/14 pontos, use os filtros mais recorrentes: ${padroes.pares.label}, ${padroes.repetidos.label} e soma entre ${padroes.somaQ1} e ${padroes.somaQ3}.</p>
    <p>Esses padroes reduzem jogos muito fora do historico, mas nao garantem previsao: cada combinacao continua tendo chance matematica propria no sorteio.</p>
  `;
}

function preencherResumoAnalise(concursos, analise, fonte, detalhes = {}) {
  const ultimo = concursos[concursos.length - 1];
  const top = analise.melhores.map(item => item.n);
  const dataUltimo = ultimo.data ? ` (${ultimo.data})` : '';
  const avisoFaltantes = detalhes.faltantes ? ` Faltaram ${detalhes.faltantes} concursos na carga.` : '';
  dicaAplicavel = { top };

  document.getElementById('dConcursos').textContent = analise.total.toLocaleString('pt-BR');
  document.getElementById('dUltimo').textContent = ultimo.numero.toLocaleString('pt-BR');
  document.getElementById('dRecorte').textContent = analise.recorte.toLocaleString('pt-BR');
  document.getElementById('analiseStatus').textContent = `Analise carregada de ${fonte.nome}: concurso ${ultimo.numero}${dataUltimo}.${avisoFaltantes}`;
  document.getElementById('btnAplicarDicas').disabled = false;

  renderRank('melhoresDezenas', analise.melhores.slice(0, 14), 'score');
  renderRank('quentesRecentes', analise.quentes.slice(0, 8), 'quente');
  renderRank('atrasadasDezenas', analise.atrasadas.slice(0, 8), 'atraso');
  renderPadroes(analise.padroes);
  renderDicas(analise);
}

function setStatusAnalise(texto) {
  const status = document.getElementById('analiseStatus');
  if (status) status.textContent = texto;
}

async function fetchJson(url) {
  const host = new URL(url).host;
  const builders = hostsComCorsBloqueado.has(host)
    ? CORS_PROXY_BUILDERS.slice(1)
    : CORS_PROXY_BUILDERS;
  let erroFinal = null;

  for (const buildUrl of builders) {
    const finalUrl = buildUrl(url);
    try {
      const resp = await fetch(finalUrl, { cache: 'no-store', signal: sinalTimeout(10000) });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const texto = await resp.text();
      return JSON.parse(texto);
    } catch (e) {
      erroFinal = e;
      if (finalUrl === url) hostsComCorsBloqueado.add(host);
    }
  }

  throw erroFinal || new Error('falha ao buscar JSON');
}

function lerCacheHistorico() {
  try {
    const cache = JSON.parse(localStorage.getItem(CACHE_HISTORICO_KEY) || 'null');
    if (!cache || !Array.isArray(cache.concursos)) return [];
    return normalizarConcursos(cache.concursos);
  } catch {
    return [];
  }
}

function salvarCacheHistorico(concursos) {
  try {
    const limpo = concursos.map(c => ({ numero: c.numero, data: c.data || '', dezenas: c.dezenas }));
    localStorage.setItem(CACHE_HISTORICO_KEY, JSON.stringify({ salvoEm: new Date().toISOString(), concursos: limpo }));
  } catch {
    // Cache e conveniencia; se lotar o armazenamento, a analise ainda funciona na sessao.
  }
}

function mesclarConcursos(listas) {
  const mapa = new Map();
  listas.flat().forEach((concurso) => {
    if (concurso && concurso.numero && concurso.dezenas && concurso.dezenas.length === 15) {
      mapa.set(concurso.numero, concurso);
    }
  });
  return mapa;
}

async function buscarUltimoCaixa() {
  const c = normalizarConcursoApi(await ApiLoterias.ultimo('lotofacil'));
  if (c.dezenas.length !== 15 || !c.numero) throw new Error('ultimo concurso sem dezenas');
  return c;
}

async function buscarSeedHistorico() {
  // Fonte rápida: todos os concursos em uma única requisição.
  setStatusAnalise('Baixando todos os concursos de uma vez...');
  const todos = normalizarConcursos(await ApiLoterias.todos('lotofacil'));
  if (todos.length >= 100) return todos;

  for (const fonte of LOTOFACIL_SEEDS) {
    try {
      setStatusAnalise(`Carregando base historica auxiliar: ${fonte.nome}...`);
      const data = await fetchJson(fonte.url);
      const concursos = normalizarConcursos(data);
      if (concursos.length >= 100) return concursos;
    } catch {
      // Continua para a proxima fonte ou para a API oficial concurso a concurso.
    }
  }
  return [];
}

async function buscarConcursoCaixa(numero) {
  const c = normalizarConcursoApi(await ApiLoterias.concurso('lotofacil', numero), numero);
  if (c.dezenas.length !== 15) throw new Error(`concurso ${numero} sem dezenas`);
  return c;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function completarHistoricoCaixa(mapa, numeroUltimo) {
  const faltantes = [];
  for (let n = 1; n <= numeroUltimo; n++) {
    if (!mapa.has(n)) faltantes.push(n);
  }
  if (!faltantes.length) return [];

  const concorrencia = ApiLoterias.paralelo;
  const pausaLote = 50;
  const salvarACada = 10; // lotes — salva o progresso para não perder se a página fechar
  const falhas = [];
  let baixados = 0;
  let lotes = 0;

  const salvarProgresso = () =>
    salvarCacheHistorico(Array.from(mapa.values()).sort((a, b) => a.numero - b.numero));

  // Salva o que já temos (base auxiliar + cache) antes de começar a baixar.
  salvarProgresso();

  for (let i = 0; i < faltantes.length; i += concorrencia) {
    const lote = faltantes.slice(i, i + concorrencia);
    const resultados = await Promise.all(lote.map(async (numero) => {
      try {
        return await buscarConcursoCaixa(numero);
      } catch {
        falhas.push(numero);
        return null;
      }
    }));
    resultados.filter(Boolean).forEach((concurso) => mapa.set(concurso.numero, concurso));
    baixados += lote.length;
    if (++lotes % salvarACada === 0) salvarProgresso();
    if (baixados === faltantes.length || baixados % (concorrencia * 4) === 0) {
      setStatusAnalise(`Baixando concursos: ${baixados}/${faltantes.length} faltantes...`);
    }
    if (i + concorrencia < faltantes.length) await sleep(pausaLote);
  }

  if (falhas.length) {
    const retry = [...falhas];
    falhas.length = 0;
    for (let i = 0; i < retry.length; i += concorrencia) {
      const lote = retry.slice(i, i + concorrencia);
      await sleep(500);
      const resultados = await Promise.all(lote.map(async (numero) => {
        try {
          return await buscarConcursoCaixa(numero);
        } catch {
          falhas.push(numero);
          return null;
        }
      }));
      resultados.filter(Boolean).forEach((concurso) => mapa.set(concurso.numero, concurso));
    }
  }

  return falhas;
}

async function carregarHistoricoOnline() {
  setStatusAnalise('Consultando último concurso...');
  const cache = lerCacheHistorico();

  /** @type {{ numero: number; data: string; dezenas: number[] }} */
  let ultimo;
  try {
    ultimo = await buscarUltimoCaixa();
  } catch (e) {
    // CAIXA/proxies fora do ar: usa o que já está salvo no navegador.
    if (cache.length >= 100) {
      return {
        concursos: cache,
        fonte: { nome: 'cache local (CAIXA indisponivel, pode estar desatualizado)' },
        faltantes: 0
      };
    }
    throw e;
  }

  const numeroUltimo = ultimo.numero;
  const cacheCompleto = cache.length >= numeroUltimo && cache[cache.length - 1].numero >= numeroUltimo;

  if (cacheCompleto) {
    return { concursos: cache, fonte: { nome: 'cache local + CAIXA' }, faltantes: 0 };
  }

  // Quando faltam muitos concursos (primeira visita, cache antigo ou download
  // interrompido), baixa tudo de uma vez em vez de um por um.
  const seed = numeroUltimo - cache.length > 20 ? await buscarSeedHistorico() : [];
  const mapa = mesclarConcursos([seed, cache, [ultimo]]);
  const falhas = await completarHistoricoCaixa(mapa, numeroUltimo);
  const concursos = Array.from(mapa.values()).sort((a, b) => a.numero - b.numero);
  salvarCacheHistorico(concursos);

  return {
    concursos,
    fonte: { nome: 'resultados oficiais da CAIXA' },
    faltantes: falhas.length
  };
}

async function carregarAnalise() {
  const btn = document.getElementById('btnAnalise');
  const btnAplicar = document.getElementById('btnAplicarDicas');
  if (btn) btn.disabled = true;
  if (btnAplicar) btnAplicar.disabled = true;
  setStatusAnalise('Buscando resultados online...');

  try {
    const { concursos, fonte, faltantes } = await carregarHistoricoOnline();
    if (concursos.length < 100) throw new Error('historico insuficiente para analisar');
    const analise = analisarConcursos(concursos);
    preencherResumoAnalise(concursos, analise, fonte, { faltantes });
  } catch (e) {
    dicaAplicavel = null;
    setStatusAnalise(`Nao consegui carregar os resultados online agora. Erro: ${e.message || e}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function aplicarDicas() {
  if (!dicaAplicavel || !Array.isArray(dicaAplicavel.top)) return;
  const qtdFixas = getQtdFixasDesejada();
  const dezJogo = parseInt(getSelect('selDezJogo').value, 10);
  // Deixa pelo menos 1 dezena livre por jogo, senão o botão Gerar fica travado.
  const qtd = Math.min(qtdFixas, dezJogo - 1);
  const fixas = dicaAplicavel.top.slice(0, qtd).sort((a, b) => a - b);
  fixasSel.clear();
  fixas.forEach(n => fixasSel.add(n));
  sincronizarGrades();
  atualizar();
  const ajuste = qtd < qtdFixas
    ? ` (limitado a ${qtd} para caber em jogos de ${dezJogo} dezenas)`
    : '';
  mostrarAviso(`Dica aplicada: ${fixas.length} melhores dezenas marcadas como fixas${ajuste}.`);
}

// Modal de download
function mostrarModal() {
  const modal = document.getElementById('modalDownload');
  modal.classList.add('ativa');
}

function fecharModal() {
  const modal = document.getElementById('modalDownload');
  modal.classList.remove('ativa');
}

function confirmarDownload() {
  const fixas = fixasGeradas;
  let conteudo = `LOTOFACIL - ${jogosGerados.length} jogos\n`;
  conteudo += `Fixas: ${fixas.map(fmt).join(' - ')}\n`;
  conteudo += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;

  jogosGerados.forEach((jogo, i) => {
    conteudo += `Jogo ${i + 1}: ${jogo.map(fmt).join(' - ')}\n`;
  });

  const elemento = document.createElement('a');
  elemento.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(conteudo);
  elemento.download = `lotofacil_${new Date().getTime()}.txt`;
  document.body.appendChild(elemento);
  elemento.click();
  document.body.removeChild(elemento);

  fecharModal();
}

document.getElementById('modalDownload').addEventListener('click', (e) => {
  if (e.target.id === 'modalDownload') {
    fecharModal();
  }
});

atualizar();
carregarAnalise();
