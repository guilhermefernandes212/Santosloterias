const TOTAL_DEZ = 60;
const DEZ_JOGO_PADRAO = 6;
const CAIXA_MEGA_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena';
const HISTORICO_KEY = 'mega_historico';

const CORS_PROXY_BUILDERS = [
  url => url,
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://proxy.corsfix.com/?url=${encodeURIComponent(url)}`,
];

// ── utilidades ────────────────────────────────────────────────
function fmt(n) { return n < 10 ? '0' + n : '' + n; }

function comb(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = r * (n - i) / (i + 1);
  return Math.round(r);
}

function combinations(arr, k) {
  const res = [];
  function bt(start, cur) {
    if (cur.length === k) { res.push([...cur]); return; }
    for (let i = start; i < arr.length; i++) {
      cur.push(arr[i]); bt(i + 1, cur); cur.pop();
    }
  }
  bt(0, []);
  return res;
}

function distancia(a, b) {
  const sa = new Set(a), sb = new Set(b);
  let d = 0;
  for (const x of sa) if (!sb.has(x)) d++;
  for (const x of sb) if (!sa.has(x)) d++;
  return d;
}

function selecionarDiversos(todos, n) {
  if (n >= todos.length) return todos.slice();
  const pool = [...todos];
  const inicio = pool[Math.floor(Math.random() * pool.length)];
  const sel = [inicio];
  pool.splice(pool.indexOf(inicio), 1);
  while (sel.length < n && pool.length) {
    const melhor = pool.reduce((best, x) => {
      const d = Math.min(...sel.map(s => distancia(x, s)));
      const db = Math.min(...sel.map(s => distancia(best, s)));
      return d > db ? x : best;
    }, pool[0]);
    sel.push(melhor);
    pool.splice(pool.indexOf(melhor), 1);
  }
  return sel;
}

// ── estado ────────────────────────────────────────────────────
const fixasSel = new Set();
let jogosGerados = [];
let ultimoResultado = null;
let ultimaAnaliseMega = null;

function getQtdFixasDesejada() {
  const el = document.getElementById('qtdFixas');
  const valor = parseInt(el && el.value, 10);
  return clamp(Number.isFinite(valor) ? valor : 12, 1, TOTAL_DEZ);
}

function getLivres() {
  const livres = [];
  for (let i = 1; i <= TOTAL_DEZ; i++) {
    if (!fixasSel.has(i)) livres.push(i);
  }
  return livres;
}

// ── aviso ─────────────────────────────────────────────────────
function mostrarAviso(texto) {
  const el = document.getElementById('aviso');
  el.style.display = 'block';
  el.textContent = texto;
}

// ── grade de dezenas ──────────────────────────────────────────
function renderDezena(el, tipo) {
  const n = parseInt(el.dataset.n);
  const paridade = n % 2 === 0 ? 'par' : 'impar';
  el.className = 'dez ' + (tipo ? tipo : paridade);
}

function sincronizarGrades() {
  document.querySelectorAll('#gridDez .dez').forEach(b => {
    const n = parseInt(b.dataset.n);
    renderDezena(b, fixasSel.has(n) ? 'fixa' : '');
  });
}

const grid = document.getElementById('gridDez');
for (let i = 1; i <= TOTAL_DEZ; i++) {
  const b = document.createElement('div');
  const paridade = i % 2 === 0 ? 'par' : 'impar';
  b.className = 'dez ' + paridade;
  b.textContent = fmt(i);
  b.dataset.n = i;
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

// ── atualizar stats ───────────────────────────────────────────
function atualizar() {
  const dezJogo = parseInt(document.getElementById('selDezJogo').value);
  const qtdFixas = getQtdFixasDesejada();
  const livresPool = getLivres();
  const livresPorJogo = dezJogo - fixasSel.size;
  const nComb = livresPorJogo >= 0 && livresPorJogo <= livresPool.length
    ? comb(livresPool.length, livresPorJogo) : 0;

  document.getElementById('sFixas').textContent = fixasSel.size;
  document.getElementById('sLivres').textContent = livresPool.length;
  document.getElementById('sComb').textContent = nComb > 999999
    ? (nComb / 1000000).toFixed(1) + 'M'
    : nComb > 9999
      ? (nComb / 1000).toFixed(1) + 'k'
      : nComb || '-';

  const aviso = document.getElementById('aviso');
  if (fixasSel.size === 0) {
    mostrarAviso('Selecione pelo menos 1 dezena fixa.');
  } else if (fixasSel.size > qtdFixas) {
    mostrarAviso(`Você selecionou ${fixasSel.size} fixas, mas a quantidade configurada é ${qtdFixas}. Remova algumas dezenas ou aumente a quantidade.`);
  } else if (livresPorJogo < 0) {
    mostrarAviso(`Fixas (${fixasSel.size}) maiores que dezenas por jogo (${dezJogo}). Aumente as dezenas por jogo.`);
  } else if (nComb === 0) {
    mostrarAviso('Sem combinações possíveis com essa configuração.');
  } else {
    aviso.style.display = 'none';
  }
}

document.getElementById('selDezJogo').addEventListener('change', atualizar);
document.getElementById('selJogos').addEventListener('change', atualizar);
document.getElementById('qtdFixas').addEventListener('input', atualizar);

// ── gerar jogos ───────────────────────────────────────────────
document.getElementById('btnGerar').addEventListener('click', () => {
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  const dezJogo = parseInt(document.getElementById('selDezJogo').value);
  const nJogos = parseInt(document.getElementById('selJogos').value);
  const qtdFixas = getQtdFixasDesejada();
  const livresPool = getLivres().sort((a, b) => a - b);
  const livresPorJogo = dezJogo - fixas.length;

  if (fixas.length === 0 || fixas.length > qtdFixas || livresPorJogo < 0) return;

  const combTotal = comb(livresPool.length, livresPorJogo);
  if (combTotal === 0) return;

  // Para pools muito grandes, gera aleatoriamente em vez de enumerar tudo
  let livresSelecionados;
  if (combTotal > 200000) {
    const set = new Set();
    while (set.size < Math.min(nJogos, combTotal)) {
      const shuffled = [...livresPool].sort(() => Math.random() - 0.5).slice(0, livresPorJogo).sort((a, b) => a - b);
      set.add(shuffled.join(','));
    }
    livresSelecionados = Array.from(set).map(s => s.split(',').map(Number));
  } else {
    const todos = combinations(livresPool, livresPorJogo);
    livresSelecionados = selecionarDiversos(todos, Math.min(nJogos, todos.length));
  }

  jogosGerados = livresSelecionados.map(livres =>
    [...fixas, ...livres].sort((a, b) => a - b));

  renderJogos(jogosGerados, fixas);
  document.getElementById('lblJogos').textContent =
    `${jogosGerados.length} jogos gerados - OK, sem repetição`;
  document.getElementById('secJogos').style.display = 'block';
  mostrarModal();
});

// ── render jogos ──────────────────────────────────────────────
function renderJogos(jogos, fixas) {
  const fs = new Set(fixas);
  const wrap = document.getElementById('jogosWrap');
  wrap.innerHTML = '';
  jogos.forEach((jogo, i) => {
    const card = document.createElement('div');
    card.className = 'jogo-card';
    card.innerHTML = `
      <span class="jogo-n">Jogo ${i + 1}</span>
      <div class="bolinhas">
        ${jogo.map(d => `<span class="b ${fs.has(d) ? 'b-mega-f' : 'b-mega-l'}">${fmt(d)}</span>`).join('')}
      </div>
    `;
    wrap.appendChild(card);
  });
}

// ── ações dos jogos ───────────────────────────────────────────
function limparJogos() {
  jogosGerados = [];
  document.getElementById('secJogos').style.display = 'none';
}

function copiarJogos() {
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  let txt = `MEGA-SENA - ${jogosGerados.length} jogos\n`;
  txt += `Fixas: ${fixas.map(fmt).join(' - ')}\n\n`;
  jogosGerados.forEach((j, i) => {
    txt += `Jogo ${i + 1}: ${j.map(fmt).join(' - ')}\n`;
  });
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById('btnCopiar');
    btn.textContent = 'Copiado!';
    setTimeout(() => btn.textContent = 'Copiar jogos', 2000);
  });
}

// ── histórico ─────────────────────────────────────────────────
function getHistorico() {
  try { return JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]'); }
  catch { return []; }
}
function setHistorico(h) { localStorage.setItem(HISTORICO_KEY, JSON.stringify(h)); }

function salvarHistorico() {
  if (!jogosGerados.length) return;
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  const dezJogo = parseInt(document.getElementById('selDezJogo').value);
  const h = getHistorico();
  h.unshift({ data: new Date().toLocaleString('pt-BR'), fixas, dezenas_por_jogo: dezJogo, jogos: jogosGerados });
  setHistorico(h);
  renderHistorico();
  const btn = document.getElementById('btnSalvar');
  btn.textContent = 'Salvo!';
  setTimeout(() => btn.textContent = 'Salvar no histórico', 2000);
}

function limparHistorico() {
  if (confirm('Limpar todo o histórico?')) { setHistorico([]); renderHistorico(); }
}

// ── conferência ───────────────────────────────────────────────
function setStatusConcurso(msg, cor) {
  const el = document.getElementById('concursoStatus');
  el.style.display = msg ? 'block' : 'none';
  el.textContent = msg || '';
  el.style.color = cor || 'var(--text2)';
}

function normalizarResultadoMega(data) {
  const lista = data.listaDezenas || data.dezenas || data.dezenasSorteadasOrdemSorteio || [];
  const dezenas = lista.map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 60).sort((a, b) => a - b);
  const numero = parseInt(data.numero || data.concurso, 10) || 0;
  return { numero, data: data.dataApuracao || data.data || '', dezenas };
}

async function buscarConcurso(numero) {
  const base = numero ? `${CAIXA_MEGA_API}/${numero}` : CAIXA_MEGA_API;
  const urls = CORS_PROXY_BUILDERS.map(b => b(base));
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const data = await r.json();
      const norm = normalizarResultadoMega(data);
      if (norm.dezenas.length === 6) return { ...norm, dezenas: new Set(norm.dezenas), lista: norm.dezenas };
    } catch { /* próximo proxy */ }
  }
  return null;
}

async function buscarUltimo() {
  setStatusConcurso('Buscando último concurso...', 'var(--text2)');
  const res = await buscarConcurso(null);
  if (res) {
    ultimoResultado = res;
    document.getElementById('inputConcurso').value = res.numero;
    setStatusConcurso(`Concurso ${res.numero}${res.data ? ' — ' + res.data : ''} carregado.`, 'var(--verde)');
    renderHistorico();
  } else {
    setStatusConcurso('Não foi possível buscar o resultado. Tente novamente.', '#c0392b');
  }
}

async function buscarConcursoManual() {
  const input = document.getElementById('inputConcurso');
  const num = parseInt(input.value);
  if (!num || num < 1) { setStatusConcurso('Digite um número de concurso válido.', '#c0392b'); return; }
  setStatusConcurso(`Buscando concurso ${num}...`, 'var(--text2)');
  const res = await buscarConcurso(num);
  if (res) {
    ultimoResultado = res;
    setStatusConcurso(`Concurso ${res.numero}${res.data ? ' — ' + res.data : ''} carregado.`, 'var(--verde)');
    renderHistorico();
  } else {
    setStatusConcurso(`Concurso ${num} não encontrado.`, '#c0392b');
  }
}

function renderJogoComAcertos(jogo, idx, resultado) {
  const acertos = jogo.filter(n => resultado.dezenas.has(n));
  const pts = acertos.length;
  let badgeClass = 'acerto-badge';
  if (pts >= 6) badgeClass += ' acerto-6';
  else if (pts >= 5) badgeClass += ' acerto-5';
  else if (pts >= 4) badgeClass += ' acerto-4';
  else badgeClass += ' acerto-ok';

  const dezenas = jogo.map(n => {
    const hit = resultado.dezenas.has(n);
    return `<span class="dez-inline${hit ? ' dez-hit' : ''}">${fmt(n)}</span>`;
  }).join('');

  return `
    <div class="hist-jogo-row">
      <span class="hist-jogo-num">Jogo ${idx + 1}</span>
      <div class="hist-dez-wrap">${dezenas}</div>
      <span class="${badgeClass}">${pts} pts</span>
    </div>`;
}

function renderHistorico() {
  const h = getHistorico();
  const el = document.getElementById('histConteudo');
  if (!h.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text2);text-align:center;padding:1rem 0">Nenhum jogo salvo ainda.</p>';
    return;
  }
  const res = ultimoResultado;
  const resultadoHTML = res
    ? `<div class="hist-resultado">
        <span class="hist-resultado-label">Concurso ${res.numero}${res.data ? ' — ' + res.data : ''}</span>
        <div class="hist-resultado-dez">${res.lista.map(n => `<span class="dez-inline dez-sorteada">${fmt(n)}</span>`).join('')}</div>
       </div>`
    : '';

  el.innerHTML = resultadoHTML + h.map(entrada => `
    <div class="hist-item">
      <div class="hist-header">
        <span class="hist-data">${entrada.data}</span>
        <span class="hist-badge">${entrada.jogos.length} jogos · ${entrada.dezenas_por_jogo} dez.</span>
      </div>
      <div class="hist-fixas">Fixas: ${entrada.fixas.map(fmt).join(' · ')}</div>
      <div class="hist-jogos-lista">
        ${res
          ? entrada.jogos.map((j, i) => renderJogoComAcertos(j, i, res)).join('')
          : entrada.jogos.map((j, i) => `<div class="hist-jogo-row"><span class="hist-jogo-num">Jogo ${i+1}</span><span style="font-family:var(--mono);font-size:11px">${j.map(fmt).join(' · ')}</span></div>`).join('')
        }
      </div>
    </div>
  `).join('');
}

function setTab(id, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('ativo'));
  el.classList.add('ativo');
  document.getElementById('tab-' + id).classList.add('ativo');
  if (id === 'historico') carregarHistorico();
}

async function carregarHistorico() {
  const h = getHistorico();
  if (!h.length) { renderHistorico(); return; }
  if (!ultimoResultado) {
    setStatusConcurso('Buscando último resultado...', 'var(--text2)');
    const res = await buscarConcurso(null);
    if (res) {
      ultimoResultado = res;
      document.getElementById('inputConcurso').value = res.numero;
      setStatusConcurso(`Concurso ${res.numero}${res.data ? ' — ' + res.data : ''} carregado.`, 'var(--verde)');
    } else {
      setStatusConcurso('Não foi possível buscar o resultado. Use o campo acima para buscar manualmente.', '#c0392b');
    }
  }
  renderHistorico();
}

// ── modal download ────────────────────────────────────────────
function mostrarModal() {
  document.getElementById('modalDownload').classList.add('ativa');
}
function fecharModal() {
  document.getElementById('modalDownload').classList.remove('ativa');
}
function confirmarDownload() {
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  let conteudo = `MEGA-SENA - ${jogosGerados.length} jogos\n`;
  conteudo += `Fixas: ${fixas.map(fmt).join(' - ')}\n`;
  conteudo += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
  jogosGerados.forEach((jogo, i) => { conteudo += `Jogo ${i + 1}: ${jogo.map(fmt).join(' - ')}\n`; });
  const a = document.createElement('a');
  a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(conteudo);
  a.download = `megasena_${Date.now()}.txt`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  fecharModal();
}

document.getElementById('modalDownload').addEventListener('click', e => {
  if (e.target.id === 'modalDownload') fecharModal();
});

// ── init ──────────────────────────────────────────────────────
atualizar();

// ── estatísticas históricas ───────────────────────────────────
const CACHE_KEY_MEGA = 'mega_resultados_cache_v2';
const MEGA_SEEDS = [
  { nome: 'loteria.json', url: 'https://cdn.jsdelivr.net/gh/guilhermeasn/loteria.json@master/data/megasena.json' },
  { nome: 'loteria.json (raw)', url: 'https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/megasena.json' }
];

function setStatusAnalise(texto) {
  const el = document.getElementById('analiseStatus');
  if (el) el.textContent = texto;
}

function pctTexto(v) {
  return (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}

function addDist(dist, chave) { dist[chave] = (dist[chave] || 0) + 1; }

function topDist(dist, total) {
  const [label, count] = Object.entries(dist).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  return { label, count, pct: total ? count / total : 0 };
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function parsePrimeiroNumero(label, fallback) {
  const m = String(label || '').match(/\d+/);
  return m ? parseInt(m[0], 10) : fallback;
}

function parseFaixaSoma(label) {
  const m = String(label || '').match(/(\d+)-(\d+)/);
  return m ? { min: parseInt(m[1], 10), max: parseInt(m[2], 10) } : { min: 150, max: 230 };
}

function chanceMegaTexto(dezenasNoJogo) {
  const totalComb = comb(TOTAL_DEZ, 6);
  const cobertas = comb(dezenasNoJogo, 6);
  const umaEm = Math.round(totalComb / cobertas);
  return {
    umaEm: `1 em ${umaEm.toLocaleString('pt-BR')}`,
    pct: pctTexto(cobertas / totalComb)
  };
}

function contarConsecutivas(dezenas) {
  let pares = 0;
  for (let i = 1; i < dezenas.length; i++) {
    if (dezenas[i] === dezenas[i - 1] + 1) pares++;
  }
  return pares;
}

function faixaDezena(n) {
  return Math.ceil(n / 10);
}

function scoreJogoMega(jogo, analise) {
  const setAnterior = new Set(analise.ultimo.dezenas);
  const paresDesejados = parsePrimeiroNumero(analise.padroes.pares.label, 3);
  const baixasDesejadas = parsePrimeiroNumero(analise.padroes.faixas.label, 3);
  const repetidasDesejadas = parsePrimeiroNumero(analise.padroes.repetidos.label, 1);
  const consecutivasDesejadas = parsePrimeiroNumero(analise.padroes.consecutivas.label, 1);
  const somaDesejada = parseFaixaSoma(analise.padroes.soma.label);

  const pares = jogo.filter(n => n % 2 === 0).length;
  const baixas = jogo.filter(n => n <= 30).length;
  const repetidas = jogo.filter(n => setAnterior.has(n)).length;
  const consecutivas = contarConsecutivas(jogo);
  const soma = jogo.reduce((a, b) => a + b, 0);
  const faixas = new Set(jogo.map(faixaDezena)).size;
  const scoreBase = jogo.reduce((acc, n) => acc + analise.porNumero[n].score, 0);
  const somaOk = soma >= somaDesejada.min && soma <= somaDesejada.max;

  let score = scoreBase;
  score -= Math.abs(pares - paresDesejados) * 16;
  score -= Math.abs(baixas - baixasDesejadas) * 12;
  score -= Math.abs(repetidas - repetidasDesejadas) * 10;
  score -= Math.abs(consecutivas - consecutivasDesejadas) * 8;
  score += somaOk ? 18 : -Math.min(28, Math.abs(soma - ((somaDesejada.min + somaDesejada.max) / 2)) / 3);
  score += faixas >= 4 ? 8 : -10;
  return { score, pares, baixas, repetidas, consecutivas, soma, faixas };
}

function gerarSugestaoMega(analise) {
  const top = analise.melhores.slice(0, 24).map(d => d.n);
  let melhor = null;

  for (let i = 0; i < top.length; i++) {
    for (let j = i + 1; j < top.length; j++) {
      for (let k = j + 1; k < top.length; k++) {
        for (let l = k + 1; l < top.length; l++) {
          for (let m = l + 1; m < top.length; m++) {
            for (let o = m + 1; o < top.length; o++) {
              const jogo = [top[i], top[j], top[k], top[l], top[m], top[o]].sort((a, b) => a - b);
              const aval = scoreJogoMega(jogo, analise);
              if (!melhor || aval.score > melhor.avaliacao.score) melhor = { jogo, avaliacao: aval };
            }
          }
        }
      }
    }
  }

  return melhor;
}

function normalizarMegaConcurso(valor, fallback) {
  const lista = valor && (valor.listaDezenas || valor.dezenas || valor.dezenasSorteadasOrdemSorteio || []);
  const dezenas = [...new Set((lista || []).map(n => parseInt(n, 10)).filter(n => n >= 1 && n <= 60))].sort((a, b) => a - b);
  const numero = parseInt(valor && (valor.numero || valor.concurso), 10) || fallback || 0;
  return { numero, data: valor && (valor.dataApuracao || valor.data || ''), dezenas };
}

function normalizarMegaLista(data) {
  if (data && data.listaDezenas && data.numero) {
    const u = normalizarMegaConcurso(data);
    return u.dezenas.length === 6 ? [u] : [];
  }
  const entradas = Array.isArray(data) ? data.map((v, i) => [i + 1, v]) : Object.entries(data || {});
  return entradas.map(([k, v]) => Array.isArray(v)
    ? normalizarMegaConcurso({ numero: k, listaDezenas: v }, parseInt(k))
    : normalizarMegaConcurso(v || {}, parseInt(k))
  ).filter(c => c.numero > 0 && c.dezenas.length === 6).sort((a, b) => a.numero - b.numero);
}

async function fetchJsonMega(url) {
  for (const build of CORS_PROXY_BUILDERS) {
    try {
      const r = await fetch(build(url), { cache: 'no-store', signal: AbortSignal.timeout(10000) });
      if (!r.ok) continue;
      return JSON.parse(await r.text());
    } catch { /* próximo */ }
  }
  throw new Error('falha ao buscar ' + url);
}

function lerCacheMega() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY_MEGA) || 'null');
    if (!c || !Array.isArray(c.concursos)) return [];
    return normalizarMegaLista(c.concursos);
  } catch { return []; }
}

function salvarCacheMega(concursos) {
  try {
    localStorage.setItem(CACHE_KEY_MEGA, JSON.stringify({
      salvoEm: new Date().toISOString(),
      concursos: concursos.map(c => ({ numero: c.numero, data: c.data || '', dezenas: c.dezenas }))
    }));
  } catch { /* storage cheio */ }
}

async function carregarHistoricoMega() {
  setStatusAnalise('Consultando último concurso da CAIXA...');
  const ultimo = normalizarMegaConcurso(await fetchJsonMega(CAIXA_MEGA_API));
  if (ultimo.dezenas.length !== 6) throw new Error('Último concurso sem dezenas válidas');

  const cache = lerCacheMega();
  if (cache.length && cache[cache.length - 1].numero >= ultimo.numero) {
    return { concursos: cache, fonte: 'cache local' };
  }

  // tenta seed com histórico completo
  let base = cache.length ? cache : [];
  if (!base.length) {
    for (const seed of MEGA_SEEDS) {
      try {
        setStatusAnalise(`Carregando base histórica: ${seed.nome}...`);
        const data = await fetchJsonMega(seed.url);
        const lista = normalizarMegaLista(data);
        if (lista.length >= 200) { base = lista; break; }
      } catch { /* próximo seed */ }
    }
  }

  // mescla com último e completa todo o histórico desde o concurso 1
  const mapa = new Map();
  base.forEach(c => mapa.set(c.numero, c));
  mapa.set(ultimo.numero, ultimo);

  const faltantes = [];
  for (let n = 1; n <= ultimo.numero; n++) {
    if (!mapa.has(n)) faltantes.push(n);
  }
  if (faltantes.length) {
    let baixados = 0;
    const tamanhoLote = 10;
    setStatusAnalise(`Baixando histórico completo: 0/${faltantes.length} concursos faltantes...`);
    for (let i = 0; i < faltantes.length; i += tamanhoLote) {
      const lote = faltantes.slice(i, i + tamanhoLote);
      await Promise.all(lote.map(async n => {
        try {
          const d = await fetchJsonMega(`${CAIXA_MEGA_API}/${n}`);
          const c = normalizarMegaConcurso(d, n);
          if (c.dezenas.length === 6) mapa.set(c.numero, c);
        } catch { /* ignora falhas pontuais */ }
      }));
      baixados += lote.length;
      if (baixados % 50 === 0 || baixados >= faltantes.length) {
        setStatusAnalise(`Baixando histórico completo: ${baixados}/${faltantes.length} concursos faltantes...`);
      }
    }
  }

  const concursos = Array.from(mapa.values()).sort((a, b) => a.numero - b.numero);
  salvarCacheMega(concursos);
  const completo = concursos.length >= ultimo.numero && concursos[0] && concursos[0].numero === 1;
  return { concursos, fonte: completo ? 'API CAIXA desde o concurso 1' : 'API CAIXA com base parcial' };
}

function analisarMega(concursos) {
  const total = concursos.length;
  const recorte = concursos.slice(-Math.min(100, total));
  const freq = Array(61).fill(0);
  const freqRec = Array(61).fill(0);
  const ultimoIdx = Array(61).fill(0);
  const distPares = {}, distSoma = {}, distFaixas = {}, distRepetidos = {}, distConsecutivas = {}, distGrupos = {};

  concursos.forEach((c, idx) => {
    const setAtual = new Set(c.dezenas);
    c.dezenas.forEach(n => { freq[n]++; ultimoIdx[n] = idx + 1; });
    const pares = c.dezenas.filter(n => n % 2 === 0).length;
    const impares = 6 - pares;
    const soma = c.dezenas.reduce((a, b) => a + b, 0);
    const faixaL = c.dezenas.filter(n => n <= 30).length;
    const consecutivas = contarConsecutivas(c.dezenas);
    const grupos = new Set(c.dezenas.map(faixaDezena)).size;
    addDist(distPares, `${pares} pares / ${impares} ímpares`);
    addDist(distSoma, `${Math.floor(soma / 20) * 20}-${Math.floor(soma / 20) * 20 + 19}`);
    addDist(distFaixas, `${faixaL} baixas (1-30) / ${6 - faixaL} altas`);
    addDist(distConsecutivas, `${consecutivas} pares consecutivos`);
    addDist(distGrupos, `${grupos} grupos de dezena`);
    if (idx > 0) {
      const ant = new Set(concursos[idx - 1].dezenas);
      let rep = 0; setAtual.forEach(n => { if (ant.has(n)) rep++; });
      addDist(distRepetidos, `${rep} repetidas do anterior`);
    }
  });

  recorte.forEach(c => c.dezenas.forEach(n => freqRec[n]++));

  const esperado = total * (6 / TOTAL_DEZ);
  const desvio = Math.sqrt(total * (6 / TOTAL_DEZ) * (1 - (6 / TOTAL_DEZ)));
  const ultimo = concursos[concursos.length - 1];
  const dezenas = Array.from({ length: 60 }, (_, i) => i + 1).map(n => {
    const histPct = freq[n] / total;
    const recPct = freqRec[n] / recorte.length;
    const atraso = total - ultimoIdx[n];
    const z = desvio ? (freq[n] - esperado) / desvio : 0;
    const atrasoScore = 1 - clamp(Math.abs(atraso - 9) / 35, 0, 1);
    const score = (histPct * 520) + (recPct * 360) + (clamp(z, -2.5, 2.5) * 7) + (atrasoScore * 12);
    return { n, freq: freq[n], freqRecente: freqRec[n], histPct, recPct, atraso, z, score };
  });

  const porNumero = {};
  dezenas.forEach(d => { porNumero[d.n] = d; });

  return {
    total, recorte: recorte.length,
    ultimo,
    porNumero,
    melhores: [...dezenas].sort((a, b) => b.score - a.score),
    quentes: [...dezenas].sort((a, b) => b.freqRecente - a.freqRecente || b.freq - a.freq),
    atrasadas: [...dezenas].sort((a, b) => b.atraso - a.atraso),
    padroes: {
      pares: topDist(distPares, total),
      repetidos: topDist(distRepetidos, Math.max(1, total - 1)),
      soma: topDist(distSoma, total),
      faixas: topDist(distFaixas, total),
      consecutivas: topDist(distConsecutivas, total),
      grupos: topDist(distGrupos, total),
    }
  };
}

function renderRankMega(id, itens, tipo) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = itens.map(item => {
    const extra = tipo === 'atraso' ? `${item.atraso} conc.` : `${pctTexto(item.histPct)} hist.`;
    return `<span class="rank-pill"><strong>${fmt(item.n)}</strong><small>${extra}</small></span>`;
  }).join('');
}

function renderPadroesMega(padroes) {
  const linhas = [
    ['Pares / ímpares', padroes.pares],
    ['Repetidas do anterior', padroes.repetidos],
    ['Soma por faixa', padroes.soma],
    ['Baixas / altas (1-30)', padroes.faixas],
    ['Consecutivas', padroes.consecutivas],
    ['Grupos de 10 dezenas', padroes.grupos],
  ];
  const el = document.getElementById('listaPadroes');
  if (!el) return;
  el.innerHTML = linhas.map(([nome, dado]) => `
    <div class="padrao-row">
      <strong>${nome}</strong>
      <span>${dado.label} — ${pctTexto(dado.pct)}</span>
    </div>
  `).join('');
}

function renderSugestaoMega(sugestao) {
  const el = document.getElementById('sugestaoMatematica');
  if (!el || !sugestao) return;
  const a = sugestao.avaliacao;
  el.innerHTML = `
    <div class="sugestao-bolas">${sugestao.jogo.map(n => `<span class="b">${fmt(n)}</span>`).join('')}</div>
    <div class="sugestao-meta">
      <span>${a.pares} pares</span>
      <span>${6 - a.pares} ímpares</span>
      <span>soma ${a.soma}</span>
      <span>${a.baixas} baixas</span>
      <span>${a.repetidas} repetidas</span>
      <span>${a.consecutivas} consecutivas</span>
    </div>
    <div>Calculado por frequência histórica, recência, atraso e aderência aos padrões mais comuns. O botão abaixo aplica automaticamente a quantidade de fixas digitada na caixa acima.</div>
  `;
}

async function carregarAnalise() {
  const btn = document.getElementById('btnAnalise');
  const btnAplicar = document.getElementById('btnAplicarDicas');
  if (btn) btn.disabled = true;
  if (btnAplicar) btnAplicar.disabled = true;

  try {
    const { concursos, fonte } = await carregarHistoricoMega();
    if (concursos.length < 50) throw new Error('histórico insuficiente');
    const analise = analisarMega(concursos);
    const ultimo = concursos[concursos.length - 1];
    ultimaAnaliseMega = analise;

    document.getElementById('dConcursos').textContent = analise.total.toLocaleString('pt-BR');
    document.getElementById('dUltimo').textContent = ultimo.numero.toLocaleString('pt-BR');
    document.getElementById('dRecorte').textContent = analise.recorte.toLocaleString('pt-BR');
    const chance = chanceMegaTexto(6);
    const chanceJogoAtual = chanceMegaTexto(parseInt(document.getElementById('selDezJogo').value, 10) || 6);
    document.getElementById('dChanceSena').textContent = chance.umaEm;
    document.getElementById('dProbSena').textContent = chanceJogoAtual.pct;
    setStatusAnalise(`Análise carregada (${fonte}): ${analise.total} concursos até o nº ${ultimo.numero}${ultimo.data ? ' — ' + ultimo.data : ''}.`);

    renderRankMega('melhoresDezenas', analise.melhores.slice(0, 15), 'score');
    renderRankMega('quentesRecentes', analise.quentes.slice(0, 10), 'quente');
    renderRankMega('atrasadasDezenas', analise.atrasadas.slice(0, 10), 'atraso');
    renderPadroesMega(analise.padroes);
    renderSugestaoMega(gerarSugestaoMega(analise));
    if (btnAplicar) btnAplicar.disabled = false;
  } catch (e) {
    setStatusAnalise(`Não foi possível carregar os dados: ${e.message || e}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

function aplicarDicas() {
  if (!ultimaAnaliseMega) {
    setStatusAnalise('Atualize a análise antes de aplicar fixas automáticas.');
    return;
  }

  const qtd = getQtdFixasDesejada();
  const fixas = ultimaAnaliseMega.melhores
    .slice(0, qtd)
    .map(d => d.n)
    .sort((a, b) => a - b);

  fixasSel.clear();
  fixas.forEach(n => fixasSel.add(n));
  sincronizarGrades();
  atualizar();
  setStatusAnalise(`${fixas.length} fixas automáticas aplicadas pela análise. Você ainda pode ajustar manualmente na grade.`);
}
