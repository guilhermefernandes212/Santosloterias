const MAX_FIXAS = 14;
const CAIXA_LOTOFACIL_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil';
const CACHE_HISTORICO_KEY = 'loto_resultados_online_v2';
const CORS_PROXY_BUILDERS = [
  url => url,
  url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
  url => `https://proxy.corsfix.com/?url=${encodeURIComponent(url)}`,
  url => `https://bypass.cors.rest/proxy?url=${encodeURIComponent(url)}`
];
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
const PROB_OFICIAL = {
  15: { 13: 692, 14: 21792 },
  16: { 13: 162, 14: 3027 },
  17: { 13: 49, 14: 601 },
  18: { 13: 18, 14: 153 },
  19: { 13: 8, 14: 47 },
  20: { 13: 4.2, 14: 17 }
};
const MOLDURA = new Set([1, 2, 3, 4, 5, 6, 10, 11, 15, 16, 20, 21, 22, 23, 24, 25]);
const fixasSel = new Set();
let jogosGerados = [];
let livresSelecionados = [];
let dicaAplicavel = null;

function getLivres() {
  const livres = [];
  for (let i = 1; i <= 25; i++) {
    if (!fixasSel.has(i)) livres.push(i);
  }
  return livres;
}

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
  const inicio = pool.reduce((best, x) =>
    distancia(x, pool[0]) > distancia(best, pool[0]) ? x : best, pool[1]);
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

function mostrarAviso(texto) {
  const aviso = document.getElementById('aviso');
  aviso.style.display = 'block';
  aviso.textContent = texto;
}

function renderDezena(el, tipo) {
  const n = parseInt(el.dataset.n);
  const paridade = n % 2 === 0 ? 'par' : 'impar';
  el.className = 'dez ' + (tipo ? tipo : paridade);
}

function sincronizarGrades() {
  document.querySelectorAll('#gridDez .dez').forEach((b) => {
    const n = parseInt(b.dataset.n);
    renderDezena(b, fixasSel.has(n) ? 'fixa' : '');
  });
}

// Grade de dezenas fixas
const grid = document.getElementById('gridDez');
for (let i = 1; i <= 25; i++) {
  const b = document.createElement('div');
  const paridade = i % 2 === 0 ? 'par' : 'impar';
  b.className = 'dez ' + paridade;
  b.textContent = fmt(i);
  b.dataset.n = i;
  b.addEventListener('click', () => {
    if (fixasSel.has(i)) {
      fixasSel.delete(i);
    } else {
      if (fixasSel.size >= MAX_FIXAS) {
        mostrarAviso('As fixas estao travadas em no maximo 14 dezenas.');
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
  const dezJogo = parseInt(document.getElementById('selDezJogo').value);
  const livresPool = getLivres();
  const livresPorJogo = dezJogo - fixasSel.size;
  const nComb = livresPorJogo >= 0 && livresPorJogo <= livresPool.length
    ? comb(livresPool.length, livresPorJogo) : 0;

  document.getElementById('sFixas').textContent = fixasSel.size;
  document.getElementById('sLivres').textContent = livresPool.length;
  document.getElementById('sComb').textContent = nComb > 9999
    ? (nComb / 1000).toFixed(1) + 'k' : nComb || '-';
  atualizarOdds();

  const aviso = document.getElementById('aviso');
  if (fixasSel.size === 0) {
    mostrarAviso('Selecione pelo menos 1 dezena fixa.');
  } else if (livresPorJogo < 0) {
    mostrarAviso(`Fixas (${fixasSel.size}) maiores que dezenas por jogo (${dezJogo}). Aumente as dezenas por jogo.`);
  } else if (nComb === 0) {
    mostrarAviso('Sem combinacoes possiveis com essa configuracao.');
  } else {
    aviso.style.display = 'none';
  }
}

document.getElementById('selDezJogo').addEventListener('change', atualizar);
document.getElementById('selJogos').addEventListener('change', atualizar);

// login removed - app opens directly

document.getElementById('btnGerar').addEventListener('click', () => {
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  const dezJogo = parseInt(document.getElementById('selDezJogo').value);
  const nJogos = parseInt(document.getElementById('selJogos').value);
  const livresPool = getLivres().sort((a, b) => a - b);
  const livresPorJogo = dezJogo - fixas.length;

  if (fixas.length === 0 || fixas.length > MAX_FIXAS || livresPorJogo < 0 || comb(livresPool.length, livresPorJogo) === 0) return;

  const todos = combinations(livresPool, livresPorJogo);
  const n = Math.min(nJogos, todos.length);
  livresSelecionados = selecionarDiversos(todos, n);
  jogosGerados = livresSelecionados.map(livres =>
    [...fixas, ...livres].sort((a, b) => a - b));

  renderJogos(jogosGerados, fixas);
  document.getElementById('lblJogos').textContent =
    `${jogosGerados.length} jogos gerados - OK, sem repeticao`;
  document.getElementById('secJogos').style.display = 'block';
  mostrarModal();
});

function renderCartao(marcados, fixas, acertos) {
  // marcados = Set de dezenas marcadas no jogo
  // fixas = Set de fixas (cor diferente)
  // acertos = Set de dezenas sorteadas (para conferência, opcional)
  let html = '<div class="cartao-grid">';
  for (let n = 1; n <= 25; n++) {
    const marcado = marcados.has(n);
    const fixa = fixas && fixas.has(n);
    const acertou = acertos && acertos.has(n) && marcado;
    const sorteada = acertos && acertos.has(n) && !marcado;
    let cls = 'cartao-cel';
    if (acertou) cls += ' cartao-acerto';
    else if (fixa && marcado) cls += ' cartao-fixa';
    else if (marcado) cls += ' cartao-marcado';
    else if (sorteada) cls += ' cartao-sorteada-miss';
    html += `<div class="${cls}">${fmt(n)}</div>`;
  }
  html += '</div>';
  return html;
}

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
        ${jogo.map(d => `<span class="b ${fs.has(d) ? 'b-f' : 'b-l'}">${fmt(d)}</span>`).join('')}
      </div>
    `;
    wrap.appendChild(card);
  });
}

function limparJogos() {
  jogosGerados = [];
  livresSelecionados = [];
  document.getElementById('secJogos').style.display = 'none';
}

function copiarJogos() {
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  let txt = `LOTOFACIL - ${jogosGerados.length} jogos\n`;
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

// Historico no localStorage
function getHistorico() {
  try { return JSON.parse(localStorage.getItem('loto_historico') || '[]'); }
  catch { return []; }
}

function setHistorico(h) {
  localStorage.setItem('loto_historico', JSON.stringify(h));
}

function salvarHistorico() {
  if (!jogosGerados.length) return;
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
  const dezJogo = parseInt(document.getElementById('selDezJogo').value);
  const h = getHistorico();
  h.unshift({
    data: new Date().toLocaleString('pt-BR'),
    fixas,
    dezenas_por_jogo: dezJogo,
    jogos: jogosGerados
  });
  setHistorico(h);
  renderHistorico();
  const btn = document.getElementById('btnSalvar');
  btn.textContent = 'Salvo!';
  setTimeout(() => btn.textContent = 'Salvar no historico', 2000);
}

function limparHistorico() {
  if (confirm('Limpar todo o historico?')) {
    setHistorico([]);
    renderHistorico();
  }
}

let ultimoResultado = null;

function setStatusConcurso(msg, cor) {
  const el = document.getElementById('concursoStatus');
  el.style.display = msg ? 'block' : 'none';
  el.textContent = msg || '';
  el.style.color = cor || 'var(--text2)';
}

async function buscarConcurso(numero) {
  const base = numero
    ? `${CAIXA_LOTOFACIL_API}/${numero}`
    : CAIXA_LOTOFACIL_API;
  const urls = CORS_PROXY_BUILDERS.map(b => b(base));
  for (const url of urls) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const data = await r.json();
      const norm = normalizarConcursoApi(data);
      if (norm.dezenas.length === 15) {
        return { numero: norm.numero, data: norm.data, dezenas: new Set(norm.dezenas), lista: norm.dezenas };
      }
    } catch { /* tenta próximo */ }
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
  if (!num || num < 1) {
    setStatusConcurso('Digite um número de concurso válido.', '#c0392b');
    return;
  }
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

async function buscarUltimoResultado() {
  const res = await buscarConcurso(null);
  if (res) { ultimoResultado = res; return true; }
  return false;
}

function renderJogoComAcertos(jogo, idx, resultado) {
  const acertos = jogo.filter(n => resultado.dezenas.has(n));
  const pts = acertos.length;
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
    <div class="hist-jogo-row">
      <span class="hist-jogo-num">Jogo ${idx + 1}</span>
      <div class="hist-dez-wrap">${dezenas}</div>
      <span class="${badgeClass}">${pts} pts</span>
    </div>`;
}

function renderHistorico(resultado) {
  const h = getHistorico();
  const el = document.getElementById('histConteudo');
  if (!h.length) {
    el.innerHTML = '<p style="font-size:13px;color:var(--text2);text-align:center;padding:1rem 0">Nenhum jogo salvo ainda.</p>';
    return;
  }

  const res = resultado || ultimoResultado;
  const resultadoHTML = res
    ? `<div class="hist-resultado">
        <span class="hist-resultado-label">Concurso ${res.numero}${res.data ? ' — ' + res.data : ''}</span>
        <div class="hist-resultado-dez">${res.lista.map(n => `<span class="dez-inline dez-sorteada">${fmt(n)}</span>`).join('')}</div>
       </div>`
    : '';

  el.innerHTML = resultadoHTML + h.map((entrada) => `
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
    const ok = await buscarUltimoResultado();
    if (ok) {
      document.getElementById('inputConcurso').value = ultimoResultado.numero;
      setStatusConcurso(`Concurso ${ultimoResultado.numero}${ultimoResultado.data ? ' — ' + ultimoResultado.data : ''} carregado.`, 'var(--verde)');
    } else {
      setStatusConcurso('Não foi possível buscar o resultado. Use o campo acima para buscar manualmente.', '#c0392b');
    }
  }
  renderHistorico();
}

function fmtDenominador(n) {
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

function fmtProb(n) {
  return (100 / n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: n < 10 ? 2 : 4
  }) + '%';
}

function atualizarOdds() {
  const sel = document.getElementById('selDezJogo');
  const dezJogo = parseInt(sel.value);
  const odds = PROB_OFICIAL[dezJogo];
  const titulo = document.getElementById('oddsTitulo');
  const odds13 = document.getElementById('odds13');
  const odds14 = document.getElementById('odds14');
  if (!odds || !titulo || !odds13 || !odds14) return;
  titulo.textContent = `Chance oficial com ${dezJogo} dezenas`;
  odds13.textContent = `1 em ${fmtDenominador(odds[13])} (${fmtProb(odds[13])})`;
  odds14.textContent = `1 em ${fmtDenominador(odds[14])} (${fmtProb(odds[14])})`;
}

function normalizarConcursoApi(valor, fallbackNumero) {
  const lista = valor && (valor.listaDezenas || valor.dezenas || valor.resultado || valor.dezenasSorteadasOrdemSorteio);
  const dezenas = [...new Set((lista || [])
    .map(n => parseInt(n, 10))
    .filter(n => Number.isInteger(n) && n >= 1 && n <= 25))]
    .sort((a, b) => a - b);
  const numero = parseInt(valor && (valor.numero || valor.concurso), 10) || fallbackNumero || 0;
  return {
    numero,
    data: valor && (valor.dataApuracao || valor.data || ''),
    dezenas
  };
}

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

function addDist(dist, chave) {
  dist[chave] = (dist[chave] || 0) + 1;
}

function topDist(dist, total) {
  const [label, count] = Object.entries(dist).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0] || ['-', 0];
  return { label, count, pct: total ? count / total : 0 };
}

function percentile(lista, p) {
  if (!lista.length) return 0;
  const sorted = [...lista].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[idx];
}

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

function analisarConcursos(concursos) {
  const total = concursos.length;
  const recorte = concursos.slice(-Math.min(100, total));
  const freq = Array(26).fill(0);
  const freqRecente = Array(26).fill(0);
  const ultimoIndice = Array(26).fill(0);
  const distPares = {};
  const distRepetidos = {};
  const distBaixas = {};
  const distMoldura = {};
  const distSoma = {};
  const distSeq = {};
  const somas = [];

  concursos.forEach((concurso, idx) => {
    const setAtual = new Set(concurso.dezenas);
    concurso.dezenas.forEach((n) => {
      freq[n]++;
      ultimoIndice[n] = idx + 1;
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

    if (idx > 0) {
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
      atraso: total - ultimoIndice[n],
      score: (histPct * 0.55) + (recPct * 0.45)
    };
  });

  const melhores = [...dezenas].sort((a, b) => b.score - a.score || a.n - b.n);
  const quentes = [...dezenas].sort((a, b) => b.freqRecente - a.freqRecente || b.freq - a.freq || a.n - b.n);
  const atrasadas = [...dezenas].sort((a, b) => b.atraso - a.atraso || a.n - b.n);
  const padroes = {
    pares: topDist(distPares, total),
    repetidos: topDist(distRepetidos, Math.max(1, total - 1)),
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
  dicaAplicavel = {
    fixas: top.slice(0, MAX_FIXAS).sort((a, b) => a - b),
    mistura: top.slice(MAX_FIXAS).sort((a, b) => a - b)
  };

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
      const resp = await fetch(finalUrl, { cache: 'no-store' });
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
  const data = await fetchJson(CAIXA_LOTOFACIL_API);
  const concursos = normalizarConcursos(data);
  if (!concursos.length) throw new Error('ultimo concurso da CAIXA sem dezenas');
  return concursos[0];
}

async function buscarSeedHistorico() {
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
  const data = await fetchJson(`${CAIXA_LOTOFACIL_API}/${numero}`);
  const concursos = normalizarConcursos(data);
  if (!concursos.length) throw new Error(`concurso ${numero} sem dezenas`);
  return concursos[0];
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

  const concorrencia = 4;
  const pausaLote = 250;
  const falhas = [];
  let baixados = 0;

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
    if (baixados === faltantes.length || baixados % (concorrencia * 4) === 0) {
      setStatusAnalise(`Baixando concursos da CAIXA: ${baixados}/${faltantes.length} faltantes...`);
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
  setStatusAnalise('Consultando ultimo concurso oficial da CAIXA...');
  const ultimo = await buscarUltimoCaixa();
  const numeroUltimo = ultimo.numero;
  const cache = lerCacheHistorico();
  const cacheCompleto = cache.length >= numeroUltimo && cache[cache.length - 1].numero >= numeroUltimo;

  if (cacheCompleto) {
    return { concursos: cache, fonte: { nome: 'cache local + CAIXA' }, faltantes: 0 };
  }

  const seed = cache.length ? [] : await buscarSeedHistorico();
  const mapa = mesclarConcursos([seed, cache, [ultimo]]);
  const falhas = await completarHistoricoCaixa(mapa, numeroUltimo);
  const concursos = Array.from(mapa.values()).sort((a, b) => a.numero - b.numero);
  salvarCacheHistorico(concursos);

  return {
    concursos,
    fonte: { nome: 'API oficial da CAIXA' },
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
  if (!dicaAplicavel) return;
  fixasSel.clear();
  dicaAplicavel.fixas.forEach(n => fixasSel.add(n));
  sincronizarGrades();
  atualizar();
  mostrarAviso('Dica aplicada: 14 melhores dezenas marcadas como fixas.');
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
  const fixas = Array.from(fixasSel).sort((a, b) => a - b);
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
