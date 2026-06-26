const NUM_MIN = 0;
const NUM_MAX = 99;
const TOTAL_DEZ = NUM_MAX - NUM_MIN + 1;
const DEZ_JOGO_PADRAO = 50;
const HISTORICO_KEY = 'lotomania_historico';

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

const fixasSel = new Set();
let jogosGerados = [];

function getQtdFixasDesejada() {
    const el = document.getElementById('qtdFixas');
    const valor = parseInt(el && el.value, 10);
    return Number.isFinite(valor) ? Math.max(1, Math.min(TOTAL_DEZ - 1, valor)) : 49;
}

function getLivres() {
    const livres = [];
    for (let i = NUM_MIN; i <= NUM_MAX; i++) {
        if (!fixasSel.has(i)) livres.push(i);
    }
    return livres;
}

function mostrarAviso(texto) {
    const aviso = document.getElementById('aviso');
    aviso.style.display = 'block';
    aviso.textContent = texto;
}

function renderDezena(el, tipo) {
    const n = parseInt(el.dataset.n, 10);
    const paridade = n % 2 === 0 ? 'par' : 'impar';
    el.className = 'dez ' + (tipo ? tipo : paridade);
}

function sincronizarGrades() {
    document.querySelectorAll('#gridDez .dez').forEach(b => {
        const n = parseInt(b.dataset.n, 10);
        renderDezena(b, fixasSel.has(n) ? 'fixa' : '');
    });
}

const grid = document.getElementById('gridDez');
for (let i = NUM_MIN; i <= NUM_MAX; i++) {
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

function fmtComb(n) {
    if (!n || !isFinite(n) || isNaN(n)) return '-';
    if (n >= 1e15) return '∞';
    if (n >= 1e12) return (n / 1e12).toFixed(1) + 'T';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return String(n);
}

function atualizar() {
    const dezJogo = DEZ_JOGO_PADRAO;
    const qtdFixas = getQtdFixasDesejada();
    const livresPool = getLivres();
    const livrosPorJogo = dezJogo - fixasSel.size;
    const nComb = livrosPorJogo >= 0 && livrosPorJogo <= livresPool.length ? comb(livresPool.length, livrosPorJogo) : 0;
    const LIMITE_DISPLAY = 1e15;

    document.getElementById('sFixas').textContent = String(fixasSel.size);
    document.getElementById('sLivres').textContent = String(livresPool.length);
    document.getElementById('sComb').textContent = nComb > LIMITE_DISPLAY ? '∞' : fmtComb(nComb);
    const btnGerar = document.getElementById('btnGerar');
    if (btnGerar) btnGerar.disabled = fixasSel.size === 0;

    const aviso = document.getElementById('aviso');
    if (fixasSel.size === 0) {
        mostrarAviso('Selecione pelo menos 1 dezena fixa.');
    } else if (fixasSel.size > qtdFixas) {
        mostrarAviso(`Você selecionou ${fixasSel.size} fixas, mas a quantidade configurada é ${qtdFixas}. Remova algumas dezenas ou aumente a quantidade.`);
    } else if (livrosPorJogo < 0) {
        mostrarAviso(`Fixas (${fixasSel.size}) maiores que dezenas por jogo (${dezJogo}). Remova fixas.`);
    } else if (nComb === 0) {
        mostrarAviso('Sem combinações possíveis com essa configuração.');
    } else {
        aviso.style.display = 'none';
    }
}

// ============================================================
// METODOLOGIA 29+63 — 9 GRUPOS DE 7 VARIÁVEIS
// MODO A: 84 apostas — C(9,3) completo
// MODO B: 12 apostas — Covering design t=2 (ótimo)
// ============================================================

const GRUPOS_KEY = 'lotomania_grupos_v1';
const QTD_FIXOS_METOD = 29;
const QTD_GRUPOS = 9;
const QTD_VAR_GRUPO = 7;

// Modo atual: 'c93' = 84 apostas | 'cover2' = 12 apostas cobrindo todos os pares
let modoMetod = 'c93';

let gruposMetod = [];

// C(9,3) completo — 84 apostas
function gerarCombinacoes9C3() {
    const combos = [];
    for (let a = 0; a < QTD_GRUPOS - 2; a++)
        for (let b = a + 1; b < QTD_GRUPOS - 1; b++)
            for (let c = b + 1; c < QTD_GRUPOS; c++)
                combos.push([a, b, c]);
    return combos;
}

// Covering design t=2 ótimo — 12 apostas
// Garante: qualquer par de grupos (i,j) aparece junto em >=1 aposta
// Solução ótima provada por backtracking (lower bound = ceil(36/3) = 12)
function gerarCombinacoesCover2() {
    return [
        [0,1,2],[0,3,4],[0,5,6],[0,7,8],
        [1,3,5],[1,4,7],[1,6,8],
        [2,3,8],[2,4,6],[2,5,7],
        [3,6,7],[4,5,8]
    ];
}

function getCombosAtivos() {
    return modoMetod === 'cover2' ? gerarCombinacoesCover2() : gerarCombinacoes9C3();
}

function setModoMetod(modo) {
    modoMetod = modo;
    document.querySelectorAll('.btn-modo-metod').forEach(b => {
        const ativo = b.dataset.modo === modo;
        b.style.background = ativo ? 'var(--orange)' : 'var(--bg)';
        b.style.color = ativo ? '#fff' : 'var(--text)';
        b.style.borderColor = ativo ? 'var(--orange-dark)' : 'var(--border2)';
    });
    const el = document.getElementById('metodApostasInfo');
    if (el) el.textContent = modo === 'cover2'
        ? '12 apostas — covering design t=2 (cobre todos os pares de grupos)'
        : '84 apostas — C(9,3) completo';
}

function distribuirGruposAuto(fixos) {
    const livres = [];
    for (let i = NUM_MIN; i <= NUM_MAX; i++) {
        if (!fixos.has(i)) livres.push(i);
    }
    const shuffled = [...livres].sort(() => Math.random() - 0.5);
    const grupos = [];
    for (let g = 0; g < QTD_GRUPOS; g++) {
        grupos.push(shuffled.slice(g * QTD_VAR_GRUPO, (g + 1) * QTD_VAR_GRUPO).sort((a, b) => a - b));
    }
    return grupos;
}

function obterFixosMetod() {
    if (window.dicaAplicavel && window.dicaAplicavel.top && window.dicaAplicavel.top.length >= QTD_FIXOS_METOD) {
        return new Set(window.dicaAplicavel.top.slice(0, QTD_FIXOS_METOD));
    }
    if (fixasSel.size >= QTD_FIXOS_METOD) {
        return new Set(Array.from(fixasSel).slice(0, QTD_FIXOS_METOD));
    }
    return null;
}

function gerarJogosMetodologia(fixos, grupos) {
    const combos = getCombosAtivos();
    return combos.map(([a, b, c]) => {
        const dez = [...fixos, ...grupos[a], ...grupos[b], ...grupos[c]];
        return [...new Set(dez)].sort((x, y) => x - y);
    });
}

function salvarGrupos(grupos) {
    try { localStorage.setItem(GRUPOS_KEY, JSON.stringify(grupos)); } catch {}
}

function lerGrupos() {
    try {
        const g = JSON.parse(localStorage.getItem(GRUPOS_KEY) || 'null');
        if (Array.isArray(g) && g.length === QTD_GRUPOS) return g;
    } catch {}
    return null;
}

function renderSecaoGrupos() {
    const sec = document.getElementById('secMetodologia');
    if (!sec) return;

    const fixos = obterFixosMetod();
    if (!fixos) {
        document.getElementById('metodStatus').textContent =
            'Carregue a análise e clique em "Aplicar dica" para definir os 29 fixos.';
        document.getElementById('metodCorpo').style.display = 'none';
        return;
    }

    document.getElementById('metodStatus').textContent = '';
    document.getElementById('metodCorpo').style.display = 'block';

    if (!gruposMetod.length) {
        const saved = lerGrupos();
        gruposMetod = saved || distribuirGruposAuto(fixos);
    }

    renderFixosMetod(fixos);
    renderGruposMetod();
}

// === PAINEL DE FIXAS DA METODOLOGIA ===
// Usa os dados já carregados da análise para sugerir os 29 melhores fixos

let opcaoFixasSelecionada = 'combinado';

function renderPainelFixas() {
    if (!window.dicaAplicavel || !window.dicaAplicavel.top) {
        const st = document.getElementById('painelFixasStatus');
        if (st) { st.style.display = 'block'; st.textContent = 'Carregue a análise para ver sugestões de fixas.'; }
        return;
    }

    const st = document.getElementById('painelFixasStatus');
    if (st) st.style.display = 'none';

    // Obtém listas da análise já carregada
    const combinado = window.dicaAplicavel.top.slice(0, 29);
    const quentes = window.dicaAplicavel.quentes ? window.dicaAplicavel.quentes.slice(0, 29) : combinado;
    const atrasadas = window.dicaAplicavel.atrasadas ? window.dicaAplicavel.atrasadas.slice(0, 29) : combinado;

    renderPreviewFixas('previewCombinado', combinado);
    renderPreviewFixas('previewQuentes', quentes);
    renderPreviewFixas('previewAtrasadas', atrasadas);
}

function renderPreviewFixas(elId, dezenas) {
    const el = document.getElementById(elId);
    if (!el) return;
    // Mostra só as primeiras 10 no preview para não poluir
    el.innerHTML = dezenas.slice(0, 10).map(n =>
        '<span class="b b-f" style="width:20px;height:20px;font-size:9px">' + fmt(n) + '</span>'
    ).join('') + (dezenas.length > 10 ? '<span style="font-size:10px;color:var(--text2);margin-left:2px">+' + (dezenas.length - 10) + '</span>' : '');
}

function selecionarOpcaoFixas(tipo, el) {
    opcaoFixasSelecionada = tipo;
    document.querySelectorAll('.fixas-opcao').forEach(o => o.classList.remove('selecionada'));
    if (el) el.classList.add('selecionada');
}

function aplicarFixosMetodologia(tipo) {
    tipo = tipo || opcaoFixasSelecionada;
    if (!window.dicaAplicavel || !window.dicaAplicavel.top) {
        mostrarAviso('Carregue a análise antes de aplicar fixas na metodologia.');
        return;
    }

    let dezenas;
    if (tipo === 'quentes' && window.dicaAplicavel.quentes) {
        dezenas = window.dicaAplicavel.quentes.slice(0, 29);
    } else if (tipo === 'atrasadas' && window.dicaAplicavel.atrasadas) {
        dezenas = window.dicaAplicavel.atrasadas.slice(0, 29);
    } else {
        dezenas = window.dicaAplicavel.top.slice(0, 29);
    }

    // Aplica no fixasSel global também para manter sincronia
    fixasSel.clear();
    dezenas.forEach(n => fixasSel.add(n));
    sincronizarGrades();
    atualizar();

    // Reseta grupos e re-renderiza metodologia
    gruposMetod = [];
    renderSecaoGrupos();

    const st = document.getElementById('painelFixasStatus');
    if (st) { st.style.display = 'block'; st.textContent = 'Fixas aplicadas: ' + dezenas.map(fmt).join(', '); }
}


function renderFixosMetod(fixos) {
    const el = document.getElementById('metodFixasWrap');
    if (!el) return;
    el.innerHTML = Array.from(fixos).sort((a, b) => a - b)
        .map(n => `<span class="b b-f">${fmt(n)}</span>`).join('');
}

function renderGruposMetod() {
    const wrap = document.getElementById('metodGruposWrap');
    if (!wrap) return;
    wrap.innerHTML = gruposMetod.map((grupo, gi) => `
        <div class="grupo-card">
            <div class="grupo-header">
                <span class="grupo-label">G${gi + 1}</span>
                <button class="btn btn-sm" onclick="redistribuirGrupo(${gi})" title="Redistribuir">
                    <i class="ti ti-refresh" aria-hidden="true"></i>
                </button>
            </div>
            <div class="grupo-dez">
                ${grupo.map((n, ni) => `
                    <span class="b b-var b-grupo-${gi % 4}"
                          onclick="editarDezenaGrupo(${gi},${ni})"
                          title="Clique para trocar">${fmt(n)}</span>
                `).join('')}
            </div>
        </div>
    `).join('');
}

function redistribuirGrupo(gi) {
    const fixos = obterFixosMetod();
    if (!fixos) return;
    const usados = new Set([...fixos]);
    gruposMetod.forEach((g, i) => { if (i !== gi) g.forEach(n => usados.add(n)); });
    const livres = [];
    for (let i = NUM_MIN; i <= NUM_MAX; i++) {
        if (!usados.has(i)) livres.push(i);
    }
    if (livres.length < QTD_VAR_GRUPO) {
        mostrarAviso(`Não há dezenas livres suficientes para redistribuir o grupo ${gi + 1}.`);
        return;
    }
    gruposMetod[gi] = livres.sort(() => Math.random() - 0.5).slice(0, QTD_VAR_GRUPO).sort((a, b) => a - b);
    salvarGrupos(gruposMetod);
    renderGruposMetod();
}

function redistribuirTodosGrupos() {
    const fixos = obterFixosMetod();
    if (!fixos) return;
    gruposMetod = distribuirGruposAuto(fixos);
    salvarGrupos(gruposMetod);
    renderGruposMetod();
}

function editarDezenaGrupo(gi, ni) {
    const atual = gruposMetod[gi][ni];
    const fixos = obterFixosMetod() || new Set();
    const usados = new Set([...fixos]);
    gruposMetod.forEach((g, i) => {
        g.forEach((n, j) => { if (!(i === gi && j === ni)) usados.add(n); });
    });

    const novaStr = prompt(`Grupo ${gi + 1} — posição ${ni + 1}\nAtual: ${fmt(atual)}\nDigite a nova dezena (00–99):`);
    if (novaStr === null) return;
    const nova = parseInt(novaStr, 10);
    if (!Number.isFinite(nova) || nova < NUM_MIN || nova > NUM_MAX) {
        alert('Dezena inválida.'); return;
    }
    if (usados.has(nova)) {
        alert(`Dezena ${fmt(nova)} já está nos fixos ou em outro grupo.`); return;
    }
    gruposMetod[gi][ni] = nova;
    gruposMetod[gi].sort((a, b) => a - b);
    salvarGrupos(gruposMetod);
    renderGruposMetod();
}

let jogosMetodGerados = [];

function gerarJogosMetodologiaAction() {
    const fixos = obterFixosMetod();
    if (!fixos) {
        mostrarAviso('Carregue a análise antes de gerar os 84 jogos.');
        return;
    }
    if (!gruposMetod.length || gruposMetod.some(g => g.length !== QTD_VAR_GRUPO)) {
        mostrarAviso('Configure os 9 grupos de 7 dezenas antes de gerar.');
        return;
    }

    const todos = new Set([...fixos]);
    for (let g = 0; g < QTD_GRUPOS; g++) {
        for (const n of gruposMetod[g]) {
            if (todos.has(n)) {
                mostrarAviso(`Dezena ${fmt(n)} do grupo ${g + 1} está duplicada nos fixos ou em outro grupo.`);
                return;
            }
            todos.add(n);
        }
    }

    jogosMetodGerados = gerarJogosMetodologia(fixos, gruposMetod);
    renderJogosMetod(jogosMetodGerados, fixos);

    const sec = document.getElementById('secJogosMetod');
    if (sec) sec.style.display = 'block';
    const lbl = document.getElementById('lblJogosMetod');
    if (lbl) lbl.textContent = `${jogosMetodGerados.length} jogos — ${modoMetod === 'cover2' ? 'covering t=2 (12)' : 'C(9,3) (84)'}  · metodologia 29+63`;
    mostrarModal();
}

function renderJogosMetod(jogos, fixos) {
    const wrap = document.getElementById('jogosWrapMetod');
    if (!wrap) return;
    const combos = getCombosAtivos();
    wrap.innerHTML = '';
    jogos.forEach((jogo, i) => {
        const [a, b, c] = combos[i];
        const card = document.createElement('div');
        card.className = 'jogo-card';
        card.innerHTML = `
            <span class="jogo-n">Jogo ${i + 1}
                <small style="font-size:10px;opacity:.55;margin-left:4px">G${a+1}+G${b+1}+G${c+1}</small>
            </span>
            <div class="bolinhas">
                ${jogo.map(d => {
                    const isFixa = fixos.has(d);
                    if (isFixa) return `<span class="b b-f">${fmt(d)}</span>`;
                    const gi = gruposMetod.findIndex(g => g.includes(d));
                    return `<span class="b b-var b-grupo-${gi >= 0 ? gi % 4 : 0}">${fmt(d)}</span>`;
                }).join('')}
            </div>`;
        wrap.appendChild(card);
    });
}

function copiarJogosMetod() {
    const fixos = obterFixosMetod();
    let txt = `LOTOMANIA — METODOLOGIA 29+63 — ${jogosMetodGerados.length} jogos\n`;
    txt += `Fixos (${QTD_FIXOS_METOD}): ${Array.from(fixos).sort((a, b) => a - b).map(fmt).join(' - ')}\n`;
    gruposMetod.forEach((g, i) => { txt += `Grupo ${i + 1}: ${g.map(fmt).join(' - ')}\n`; });
    txt += '\n';
    jogosMetodGerados.forEach((j, i) => { txt += `Jogo ${i + 1}: ${j.map(fmt).join(' - ')}\n`; });
    navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById('btnCopiarMetod');
        if (btn) { btn.textContent = 'Copiado!'; setTimeout(() => btn.textContent = 'Copiar jogos', 2000); }
    });
}

function salvarHistoricoMetod() {
    if (!jogosMetodGerados.length) return;
    const fixos = Array.from(obterFixosMetod() || []).sort((a, b) => a - b);
    const h = getHistorico();
    h.unshift({
        data: new Date().toLocaleString('pt-BR'),
        fixas: fixos,
        dezenas_por_jogo: DEZ_JOGO_PADRAO,
        jogos: jogosMetodGerados,
        metodologia: '29+63'
    });
    setHistorico(h);
    renderHistorico();
    const btn = document.getElementById('btnSalvarMetod');
    if (btn) { btn.textContent = 'Salvo!'; setTimeout(() => btn.textContent = 'Salvar no histórico', 2000); }
}

function limparJogosMetod() {
    jogosMetodGerados = [];
    const sec = document.getElementById('secJogosMetod');
    if (sec) sec.style.display = 'none';
}

// ============================================================
// OTIMIZADOR DE SCORE ESPERADO — ABORDAGEM C
// Usa o histórico real de concursos para encontrar a distribuição
// de grupos que maximiza o score médio esperado por sorteio.
// ============================================================

// Calcula score máximo de uma jogada da metodologia dado um sorteio (Set)
function calcScoreUm(fixos, grupos, combos, sorteado) {
    const acFixos = [...fixos].filter(n => sorteado.has(n)).length;
    const acGrupos = grupos.map(g => g.filter(n => sorteado.has(n)).length);
    let melhor = 0;
    for (const [a, b, c] of combos) {
        const s = acFixos + acGrupos[a] + acGrupos[b] + acGrupos[c];
        if (s > melhor) melhor = s;
    }
    return { melhor, acFixos, acGrupos };
}

// Calcula score esperado médio sobre todo o histórico
function calcScoreEsperado(fixos, grupos, combos, historico) {
    let total = 0;
    for (const sorteado of historico) {
        total += calcScoreUm(fixos, grupos, combos, sorteado).melhor;
    }
    return total / historico.length;
}

// Distribuição completa de scores sobre o histórico
function calcDistScores(fixos, grupos, combos, historico) {
    const dist = {};
    let soma = 0;
    for (const sorteado of historico) {
        const s = calcScoreUm(fixos, grupos, combos, sorteado).melhor;
        dist[s] = (dist[s] || 0) + 1;
        soma += s;
    }
    return { dist, media: soma / historico.length };
}

// Otimização por swap greedy:
// Em cada iteração, troca 2 dezenas entre grupos diferentes.
// Aceita a troca se melhora o score esperado.
async function otimizarGruposEsperado(fixosSet, gruposInicial, combos, historico, maxIter, onProgress) {
    let atual = gruposInicial.map(g => [...g]);
    let scoreAtual = calcScoreEsperado(fixosSet, atual, combos, historico);
    let melhorias = 0;

    for (let iter = 0; iter < maxIter; iter++) {
        // Pausa a cada 50 iterações para não travar a UI
        if (iter % 50 === 0 && iter > 0) {
            await new Promise(r => setTimeout(r, 0));
            if (onProgress) onProgress(iter, maxIter, scoreAtual);
        }

        const g1 = Math.floor(Math.random() * 9);
        let g2 = Math.floor(Math.random() * 9);
        while (g2 === g1) g2 = Math.floor(Math.random() * 9);
        const p1 = Math.floor(Math.random() * 7);
        const p2 = Math.floor(Math.random() * 7);

        const novo = atual.map(g => [...g]);
        const tmp = novo[g1][p1];
        novo[g1][p1] = novo[g2][p2];
        novo[g2][p2] = tmp;

        const scoreNovo = calcScoreEsperado(fixosSet, novo, combos, historico);
        if (scoreNovo > scoreAtual) {
            atual = novo;
            scoreAtual = scoreNovo;
            melhorias++;
        }
    }

    return { grupos: atual, score: scoreAtual, melhorias };
}

// Converte histórico de concursos para array de Sets (cache para performance)
function buildHistoricoSets(concursos) {
    return concursos.map(c => new Set(c.dezenas));
}

// Estado do otimizador
let otimizadorRodando = false;
let historicoSets = null;
let resultadoOtimizacao = null;

async function rodarOtimizador() {
    if (otimizadorRodando) return;

    const fixos = obterFixosMetod();
    if (!fixos) {
        mostrarAviso('Carregue a análise e aplique a dica antes de otimizar.');
        return;
    }
    if (!gruposMetod.length) {
        mostrarAviso('Configure os grupos antes de otimizar.');
        return;
    }

    // Precisa do histórico carregado
    if (!historicoSets) {
        const cacheRaw = localStorage.getItem('lotomania_resultados_online_v1');
        if (!cacheRaw) {
            mostrarAviso('Carregue a análise histórica antes de otimizar (botão "Carregar análise").');
            return;
        }
        try {
            const cache = JSON.parse(cacheRaw);
            if (!cache.concursos || cache.concursos.length < 50) throw new Error('Histórico insuficiente');
            historicoSets = buildHistoricoSets(cache.concursos);
        } catch (e) {
            mostrarAviso('Histórico inválido. Recarregue a análise.');
            return;
        }
    }

    otimizadorRodando = true;
    const btnOtim = document.getElementById('btnOtimizar');
    const statusOtim = document.getElementById('otimStatus');
    const maxIter = 400;
    if (btnOtim) { btnOtim.disabled = true; btnOtim.textContent = 'Otimizando...'; }
    if (statusOtim) statusOtim.style.display = 'block';

    // Score inicial (grupos atuais)
    const combos = getCombosAtivos();
    const scoreInicial = calcScoreEsperado(fixos, gruposMetod, combos, historicoSets);
    const distInicial = calcDistScores(fixos, gruposMetod, combos, historicoSets);

    if (statusOtim) statusOtim.textContent = `Score inicial: ${scoreInicial.toFixed(2)} pts médios — otimizando...`;

    const { grupos: gruposOtim, score: scoreFinal, melhorias } = await otimizarGruposEsperado(
        fixos,
        gruposMetod.map(g => [...g]),
        combos,
        historicoSets,
        maxIter,
        (iter, total, scoreAtual) => {
            if (statusOtim) statusOtim.textContent = `Otimizando... ${iter}/${total} — score atual: ${scoreAtual.toFixed(3)}`;
        }
    );

    const distFinal = calcDistScores(fixos, gruposOtim, combos, historicoSets);
    resultadoOtimizacao = { scoreInicial, scoreFinal, melhorias, distInicial, distFinal, grupos: gruposOtim };

    // Aplica os grupos otimizados
    gruposMetod = gruposOtim;
    salvarGrupos(gruposMetod);
    renderGruposMetod();
    renderResultadoOtimizacao(resultadoOtimizacao);

    if (statusOtim) statusOtim.textContent =
        `Otimização concluída: ${scoreInicial.toFixed(2)} → ${scoreFinal.toFixed(2)} pts médios (+${((scoreFinal-scoreInicial)/scoreInicial*100).toFixed(2)}%) | ${melhorias} melhorias em ${maxIter} iterações`;

    if (btnOtim) { btnOtim.disabled = false; btnOtim.textContent = 'Otimizar grupos'; }
    otimizadorRodando = false;
}

function renderResultadoOtimizacao(res) {
    const el = document.getElementById('otimResultado');
    if (!el) return;
    el.style.display = 'block';

    const { scoreInicial, scoreFinal, melhorias, distFinal } = res;
    const ganho = scoreFinal - scoreInicial;
    const total = Object.values(distFinal.dist).reduce(function(s, v) { return s + v; }, 0);

    function pctAcima(min) {
        return Object.entries(distFinal.dist)
            .filter(function(e) { return Number(e[0]) >= min; })
            .reduce(function(s, e) { return s + e[1]; }, 0) / total * 100;
    }

    // Métricas
    var html = '<div class="otim-metricas">';
    html += '<div class="otim-metrica"><span class="otim-val">' + scoreFinal.toFixed(2) + '</span><span class="otim-label">Score m\u00e9dio esperado</span></div>';
    html += '<div class="otim-metrica' + (ganho > 0 ? ' otim-ganho' : '') + '"><span class="otim-val">' + (ganho >= 0 ? '+' : '') + ganho.toFixed(2) + '</span><span class="otim-label">Ganho vs. anterior</span></div>';
    html += '<div class="otim-metrica"><span class="otim-val">' + pctAcima(15).toFixed(1) + '%</span><span class="otim-label">% sorteios com \u2265 15 pts</span></div>';
    html += '<div class="otim-metrica"><span class="otim-val">' + pctAcima(18).toFixed(1) + '%</span><span class="otim-label">% sorteios com \u2265 18 pts</span></div>';
    html += '</div>';

    // Distribuição
    html += '<div class="mini-label" style="margin-top:12px">Distribui\u00e7\u00e3o de scores (hist\u00f3rico)</div>';
    html += '<div class="otim-dist">';
    var entradas = Object.entries(distFinal.dist).sort(function(a, b) { return Number(a[0]) - Number(b[0]); });
    for (var i = 0; i < entradas.length; i++) {
        var k = entradas[i][0];
        var v = entradas[i][1];
        var p = (v / total * 100);
        var cls = Number(k) >= 18 ? 'fill-verde' : Number(k) >= 15 ? 'fill-orange' : 'fill-cinza';
        var largura = Math.min(100, p * 4);
        html += '<div class="otim-dist-row">';
        html += '<span class="otim-dist-label">' + k + ' pts</span>';
        html += '<div class="otim-bar-wrap"><div class="otim-bar ' + cls + '" style="width:' + largura + '%"></div></div>';
        html += '<span class="otim-dist-pct">' + p.toFixed(1) + '%</span>';
        html += '</div>';
    }
    html += '</div>';

    el.innerHTML = html;
}

// ============================================================
// ANÁLISE HISTÓRICA
// ============================================================

const btnCarregarAnalise = document.getElementById('btnCarregarAnalise');
const btnAplicarDicas = document.getElementById('btnAplicarDicas');
const melhoresFixasEl = document.getElementById('melhoresFixas') || document.getElementById('melhoresDezenas');
const analiseStatus = document.getElementById('analiseStatus');

btnCarregarAnalise?.addEventListener('click', async () => {
    if (analiseStatus) analiseStatus.textContent = 'Carregando análise online...';
    try {
        const { concursos, fonte, faltantes } = await carregarHistoricoOnline();
        if (!concursos || concursos.length === 0) throw new Error('Nenhum concurso disponível');
        const analise = analisarConcursosFull(concursos);
        preencherResumoAnalise(concursos, analise, fonte, { faltantes });
    } catch (err) {
        console.error(err);
        if (analiseStatus) analiseStatus.textContent = `Erro ao carregar análise: ${err && err.message ? err.message : err}`;
    }
    if (btnAplicarDicas) btnAplicarDicas.disabled = false;
});

btnAplicarDicas?.addEventListener('click', () => {
    aplicarDicas();
});

const LOTOMANIA_SEEDS = [
    { nome: 'loteria.json', url: 'https://raw.githubusercontent.com/guilhermeasn/loteria.json/master/data/lotomania.json' },
    { nome: 'jsDelivr loteria.json', url: 'https://cdn.jsdelivr.net/gh/guilhermeasn/loteria.json@master/data/lotomania.json' }
];

const CAIXA_LOTOMANIA_API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotomania';
const CORS_PROXY_BUILDERS = [
    url => url,
    url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    url => `https://proxy.corsfix.com/?url=${encodeURIComponent(url)}`,
    url => `https://bypass.cors.rest/proxy?url=${encodeURIComponent(url)}`
];

const hostsComCorsBloqueado = new Set();
const CACHE_HIST_KEY = 'lotomania_resultados_online_v1';

function setStatusConcurso(msg, cor) {
    const el = document.getElementById('concursoStatus');
    if (!el) return;
    el.style.display = msg ? 'block' : 'none';
    el.textContent = msg || '';
    el.style.color = cor || 'var(--text2)';
}

function normalizarConcursoApiLotomania(valor, fallbackNumero = 0) {
    const lista = valor && (valor.listaDezenas || valor.dezenas || valor.resultado || valor.dezenasSorteadasOrdemSorteio || valor.numeros);
    const dezenas = [...new Set((lista || []).map(n => parseInt(n, 10)).filter(n => Number.isInteger(n) && n >= NUM_MIN && n <= NUM_MAX))].sort((a, b) => a - b);
    const numero = parseInt(valor && (valor.numero || valor.concurso), 10) || fallbackNumero || 0;
    return { numero, data: valor && (valor.dataApuracao || valor.data || ''), dezenas };
}

async function buscarConcurso(numero) {
    try {
        const res = await fetch('concursos-lotomania.json');
        if (!res.ok) throw new Error('no-file');
        const data = await res.json();
        const concursos = Array.isArray(data) ? data.map((c, i) => normalizarConcursoApiLotomania(c, i + 1)) : [];
        if (!concursos.length) return null;
        if (numero) {
            const found = concursos.find(c => c.numero === Number(numero));
            return found || null;
        }
        return concursos[concursos.length - 1];
    } catch (e) {
        try { return await buscarConcursoCaixa(numero); } catch { return null; }
    }
}

async function buscarConcursoCaixa(numero) {
    const base = numero ? `${CAIXA_LOTOMANIA_API}/${numero}` : CAIXA_LOTOMANIA_API;
    const urls = CORS_PROXY_BUILDERS.map(b => b(base));
    for (const url of urls) {
        try {
            try { setStatusAnalise(`Tentando: ${url}`); } catch {}
            const r = await fetch(url, { signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(8000) : undefined });
            if (!r.ok) continue;
            const data = await r.json();
            const norm = normalizarConcursoApiLotomania(data);
            if (norm.dezenas && norm.dezenas.length >= 1) {
                setStatusAnalise('Concurso obtido via CAIXA.');
                return { numero: norm.numero, data: norm.data, dezenas: norm.dezenas, lista: norm.dezenas };
            }
        } catch (err) {
            console.warn('buscarConcursoCaixa erro em', url, err);
        }
    }
    throw new Error('Concurso CAIXA não disponível');
}

function setStatusAnalise(texto) {
    const status = document.getElementById('analiseStatus');
    if (status) status.textContent = texto;
}

async function fetchJson(url) {
    const host = new URL(url).host;
    const builders = hostsComCorsBloqueado.has(host) ? CORS_PROXY_BUILDERS.slice(1) : CORS_PROXY_BUILDERS;
    let erroFinal = null;
    const tentativas = [];
    for (const buildUrl of builders) {
        const finalUrl = buildUrl(url);
        tentativas.push(finalUrl);
        try { setStatusAnalise(`Tentando ${new URL(finalUrl).host}...`); } catch {}
        try {
            const resp = await fetch(finalUrl, { cache: 'no-store' });
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const texto = await resp.text();
            try { return JSON.parse(texto); } catch (e) { throw new Error('invalid-json:' + e.message); }
        } catch (e) {
            erroFinal = e;
            if (finalUrl === url) hostsComCorsBloqueado.add(host);
        }
    }
    const msg = `falha ao buscar JSON. URLs tentadas: ${tentativas.join(' | ')}. erro: ${erroFinal && erroFinal.message ? erroFinal.message : erroFinal}`;
    setStatusAnalise(msg);
    throw new Error(msg);
}

function lerCacheHistorico() {
    try {
        const cache = JSON.parse(localStorage.getItem(CACHE_HIST_KEY) || 'null');
        if (!cache || !Array.isArray(cache.concursos)) return [];
        return normalizarConcursos(cache.concursos);
    } catch { return []; }
}

function salvarCacheHistorico(concursos) {
    try {
        const limpo = concursos.map(c => ({ numero: c.numero, data: c.data || '', dezenas: c.dezenas }));
        localStorage.setItem(CACHE_HIST_KEY, JSON.stringify({ salvoEm: new Date().toISOString(), concursos: limpo }));
    } catch {}
}

function mesclarConcursos(listas) {
    const mapa = new Map();
    listas.flat().forEach((concurso) => {
        if (concurso && concurso.numero && concurso.dezenas && concurso.dezenas.length >= 1) {
            mapa.set(concurso.numero, concurso);
        }
    });
    return mapa;
}

async function buscarUltimoCaixa() {
    const data = await fetchJson(CAIXA_LOTOMANIA_API);
    const concursos = normalizarConcursos(data);
    if (!concursos.length) throw new Error('ultimo concurso da CAIXA sem dezenas');
    return concursos[0];
}

async function buscarSeedHistorico() {
    for (const fonte of LOTOMANIA_SEEDS) {
        try {
            setStatusAnalise(`Carregando base histórica auxiliar: ${fonte.nome}...`);
            const data = await fetchJson(fonte.url);
            const concursos = normalizarConcursos(data);
            if (concursos.length >= 100) return concursos;
        } catch {}
    }
    return [];
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function completarHistoricoCaixa(mapa, numeroUltimo) {
    const faltantes = [];
    for (let n = 1; n <= numeroUltimo; n++) if (!mapa.has(n)) faltantes.push(n);
    if (!faltantes.length) return [];
    const concorrencia = 4; const pausaLote = 250; const falhas = []; let baixados = 0;
    for (let i = 0; i < faltantes.length; i += concorrencia) {
        const lote = faltantes.slice(i, i + concorrencia);
        const resultados = await Promise.all(lote.map(async (numero) => {
            try { return await buscarConcursoCaixa(numero); } catch { falhas.push(numero); return null; }
        }));
        resultados.filter(Boolean).forEach((concurso) => mapa.set(concurso.numero, concurso));
        baixados += lote.length;
        if (baixados === faltantes.length || baixados % (concorrencia * 4) === 0) {
            setStatusAnalise(`Baixando concursos da CAIXA: ${baixados}/${faltantes.length} faltantes...`);
        }
        if (i + concorrencia < faltantes.length) await sleep(pausaLote);
    }
    if (falhas.length) {
        const retry = [...falhas]; falhas.length = 0;
        for (let i = 0; i < retry.length; i += concorrencia) {
            const lote = retry.slice(i, i + concorrencia); await sleep(500);
            const resultados = await Promise.all(lote.map(async (numero) => {
                try { return await buscarConcursoCaixa(numero); } catch { falhas.push(numero); return null; }
            }));
            resultados.filter(Boolean).forEach((concurso) => mapa.set(concurso.numero, concurso));
        }
    }
    return falhas;
}

async function carregarHistoricoOnline() {
    setStatusAnalise('Consultando último concurso oficial da CAIXA...');
    const ultimo = await buscarUltimoCaixa();
    const numeroUltimo = ultimo.numero;
    const cache = lerCacheHistorico();
    const cacheCompleto = cache.length >= numeroUltimo && cache[cache.length - 1].numero >= numeroUltimo;
    if (cacheCompleto) return { concursos: cache, fonte: { nome: 'cache local + CAIXA' }, faltantes: 0 };
    const seed = cache.length ? [] : await buscarSeedHistorico();
    const mapa = mesclarConcursos([seed, cache, [ultimo]]);
    const falhas = await completarHistoricoCaixa(mapa, numeroUltimo);
    const concursos = Array.from(mapa.values()).sort((a, b) => a.numero - b.numero);
    salvarCacheHistorico(concursos);
    return { concursos, fonte: { nome: 'API oficial da CAIXA' }, faltantes: falhas.length };
}

function normalizarConcursos(data) {
    if (data && data.listaDezenas && data.numero) {
        const unico = normalizarConcursoApiLotomania(data);
        return unico.dezenas.length >= 1 ? [unico] : [];
    }
    const entradas = Array.isArray(data) ? data.map((valor, i) => [i + 1, valor]) : Object.entries(data || {});
    return entradas.map(([chave, valor]) => {
        if (Array.isArray(valor)) return normalizarConcursoApiLotomania({ numero: chave, listaDezenas: valor }, parseInt(chave, 10));
        return normalizarConcursoApiLotomania(valor || {}, parseInt(chave, 10));
    }).filter(c => c.numero > 0 && c.dezenas.length >= 1).sort((a, b) => a.numero - b.numero);
}

function addDist(dist, chave) { dist[chave] = (dist[chave] || 0) + 1; }

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
    let paresLigados = 0; let maiorGrupo = 1; let grupo = 1;
    for (let i = 1; i < dezenas.length; i++) {
        if (dezenas[i] === dezenas[i - 1] + 1) { paresLigados++; grupo++; maiorGrupo = Math.max(maiorGrupo, grupo); } else { grupo = 1; }
    }
    return { paresLigados, maiorGrupo };
}

function renderRank(id, itens, tipo) {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = itens.map((item) => {
        const extra = tipo === 'atraso' ? `${item.atraso} conc.` : `${(item.histPct * 100).toFixed(1)}%`;
        return `<span class="rank-pill"><strong>${fmt(item.n)}</strong><small>${extra}</small></span>`;
    }).join('');
}

function renderPadroes(padroes) {
    const linhas = [['Pares / ímpares', padroes.pares], ['Repetidas do anterior', padroes.repetidos], ['Baixas / altas', padroes.baixas || { label: '-', pct: 0 }], ['Soma por faixa', padroes.soma || { label: '-', pct: 0 }], ['Sequências', padroes.sequencia || { label: '-', pct: 0 }]];
    const el = document.getElementById('listaPadroes'); if (!el) return;
    el.innerHTML = linhas.map(([nome, dado]) => `
    <div class="padrao-row">
      <strong>${nome}</strong>
      <span>${dado.label} - ${(dado.pct !== undefined) ? ((dado.pct * 100).toFixed(1) + '%') : ''}</span>
    </div>
  `).join('');
}

function renderDicas(analise) {
    const { padroes } = analise;
    const el = document.getElementById('dicasTexto'); if (!el) return;
    el.innerHTML = `<p>Para filtrar jogos, use os filtros mais recorrentes: ${padroes.pares.label || '-'}, ${padroes.repetidos.label || '-'}.</p>`;
}

function analisarConcursosFull(concursos) {
    const total = concursos.length;
    const recorte = concursos.slice(-Math.min(100, total));
    const freq = Array(TOTAL_DEZ + 1).fill(0);
    const freqRecente = Array(TOTAL_DEZ + 1).fill(0);
    const ultimoIndice = Array(TOTAL_DEZ + 1).fill(0);
    const distPares = {}, distRepetidos = {}, distBaixas = {}, distSoma = {}, distSeq = {};
    const somas = [];
    concursos.forEach((concurso, idx) => {
        const setAtual = new Set(concurso.dezenas);
        concurso.dezenas.forEach((n) => { freq[n]++; ultimoIndice[n] = idx + 1; });
        const pares = concurso.dezenas.filter(n => n % 2 === 0).length;
        const baixas = concurso.dezenas.filter(n => n < TOTAL_DEZ / 2).length;
        const soma = concurso.dezenas.reduce((acc, n) => acc + n, 0);
        const somaFaixa = Math.floor(soma / 10) * 10;
        const seq = contarSequencias(concurso.dezenas || []);
        addDist(distPares, `${pares} pares / ${concurso.dezenas.length - pares} ímpares`);
        addDist(distBaixas, `${baixas} baixas / ${concurso.dezenas.length - baixas} altas`);
        addDist(distSoma, `${somaFaixa}-${somaFaixa + 9}`);
        addDist(distSeq, `${seq.paresLigados} ligações seguidas`);
        somas.push(soma);
        if (idx > 0) {
            const anterior = new Set(concursos[idx - 1].dezenas);
            let repetidos = 0; setAtual.forEach(n => { if (anterior.has(n)) repetidos++; });
            addDist(distRepetidos, `${repetidos} repetidas do anterior`);
        }
    });
    recorte.forEach((concurso) => concurso.dezenas.forEach(n => { freqRecente[n]++; }));
    const dezenas = Array.from({ length: TOTAL_DEZ }, (_, i) => i + NUM_MIN).map((n) => {
        const histPct = freq[n] / total;
        const recPct = freqRecente[n] / recorte.length;
        return { n, freq: freq[n], freqRecente: freqRecente[n], histPct, recPct, atraso: total - ultimoIndice[n], score: (histPct * 0.55) + (recPct * 0.45) };
    });
    const melhores = [...dezenas].sort((a, b) => b.score - a.score || a.n - b.n);
    const quentes = [...dezenas].sort((a, b) => b.freqRecente - a.freqRecente || b.freq - a.freq || a.n - b.n);
    const atrasadas = [...dezenas].sort((a, b) => b.atraso - a.atraso || a.n - b.n);
    const padroes = { pares: topDist(distPares, total), repetidos: topDist(distRepetidos, Math.max(1, total - 1)), somaQ1: percentile(somas, 0.25), somaQ3: percentile(somas, 0.75) };
    return { total, recorte: recorte.length, dezenas, melhores, quentes, atrasadas, padroes };
}

function preencherResumoAnalise(concursos, analise, fonte, detalhes = {}) {
    const ultimo = concursos[concursos.length - 1];
    const top = analise.melhores.map(item => item.n);
    const dataUltimo = ultimo.data ? ` (${ultimo.data})` : '';
    const avisoFaltantes = detalhes.faltantes ? ` Faltaram ${detalhes.faltantes} concursos na carga.` : '';
    window.dicaAplicavel = { top };
    const dConc = document.getElementById('dConcursos'); if (dConc) dConc.textContent = analise.total.toLocaleString('pt-BR');
    const dUlt = document.getElementById('dUltimo'); if (dUlt) dUlt.textContent = ultimo.numero.toLocaleString('pt-BR');
    const dRec = document.getElementById('dRecorte'); if (dRec) dRec.textContent = analise.recorte.toLocaleString('pt-BR');
    const anStatus = document.getElementById('analiseStatus'); if (anStatus) anStatus.textContent = `Análise carregada de ${fonte.nome}: concurso ${ultimo.numero}${dataUltimo}.${avisoFaltantes}`;
    const md = document.getElementById('melhoresDezenas'); if (md) renderRank('melhoresDezenas', analise.melhores.slice(0, 14), 'score');
    renderRank('quentesRecentes', analise.quentes.slice(0, 8), 'quente');
    renderRank('atrasadasDezenas', analise.atrasadas.slice(0, 8), 'atraso');
    renderPadroes(analise.padroes);
    renderDicas(analise);
    const btnApp = document.getElementById('btnAplicarDicas'); if (btnApp) btnApp.disabled = false;
    // atualiza seção de metodologia automaticamente
    renderSecaoGrupos();
}

async function buscarUltimo() {
    setStatusConcurso('Buscando último concurso...', 'var(--text2)');
    const res = await buscarConcurso(null);
    if (res) {
        const dezenas = Array.isArray(res.dezenas) ? res.dezenas : [...res.dezenas || []];
        window.ultimoResultado = { numero: res.numero, data: res.data, dezenas: new Set(dezenas), lista: dezenas };
        document.getElementById('inputConcurso').value = String(res.numero);
        setStatusConcurso(`Concurso ${res.numero}${res.data ? ' — ' + res.data : ''} carregado.`, 'var(--verde)');
        renderHistorico();
    } else {
        setStatusConcurso('Não foi possível buscar o resultado. Tente novamente.', '#c0392b');
    }
}

async function buscarConcursoManual() {
    const input = document.getElementById('inputConcurso');
    const num = parseInt(input && input.value, 10);
    if (!num || num < 1) { setStatusConcurso('Digite um número de concurso válido.', '#c0392b'); return; }
    setStatusConcurso(`Buscando concurso ${num}...`, 'var(--text2)');
    const res = await buscarConcurso(num);
    if (res) {
        const dezenas = Array.isArray(res.dezenas) ? res.dezenas : [...res.dezenas || []];
        window.ultimoResultado = { numero: res.numero, data: res.data, dezenas: new Set(dezenas), lista: dezenas };
        setStatusConcurso(`Concurso ${res.numero}${res.data ? ' — ' + res.data : ''} carregado.`, 'var(--verde)');
        renderHistorico();
    } else {
        setStatusConcurso(`Concurso ${num} não encontrado.`, '#c0392b');
    }
}

function renderJogoComAcertos(jogo, idx, resultado) {
    const acertos = jogo.filter(n => resultado.dezenas.has(n));
    const pts = acertos.length;
    const dezenas = jogo.map(n => {
        const hit = resultado.dezenas.has(n);
        return `<span class="dez-inline${hit ? ' dez-sorteada' : ''}">${fmt(n)}</span>`;
    }).join('');
    return `
    <div class="hist-jogo-row">
      <span class="hist-jogo-num">Jogo ${idx + 1}</span>
      <div class="hist-dez-wrap">${dezenas}</div>
      <span class="acerto-badge">${pts} pts</span>
    </div>`;
}

async function buscarUltimoResultado() {
    const res = await buscarConcurso(null);
    if (res) {
        const dezenas = Array.isArray(res.dezenas) ? res.dezenas : [...res.dezenas || []];
        window.ultimoResultado = { numero: res.numero, data: res.data, dezenas: new Set(dezenas), lista: dezenas };
        return true;
    }
    return false;
}

function aplicarDicas() {
    const dica = window.dicaAplicavel;
    if (!dica || !dica.top || !dica.top.length) {
        mostrarAviso('Carregue a análise antes de aplicar as dicas.');
        return;
    }
    const qtd = Math.min(getQtdFixasDesejada(), dica.top.length);
    fixasSel.clear();
    for (let i = 0; i < qtd; i++) {
        const n = dica.top[i];
        if (Number.isFinite(n) && n >= NUM_MIN && n <= NUM_MAX) fixasSel.add(n);
    }
    sincronizarGrades();
    atualizar();
    mostrarAviso(`Dica aplicada: ${fixasSel.size} melhores dezenas marcadas como fixas.`);
    // atualiza metodologia depois de aplicar dica
    gruposMetod = [];
    renderPainelFixas();
    renderSecaoGrupos();
}

document.getElementById('selJogos').addEventListener('change', atualizar);
document.getElementById('qtdFixas').addEventListener('input', atualizar);

document.getElementById('btnGerar').addEventListener('click', () => {
    const fixas = Array.from(fixasSel).sort((a, b) => a - b);
    const nJogos = parseInt(document.getElementById('selJogos').value, 10);
    const qtdFixas = getQtdFixasDesejada();
    const livresPool = getLivres().sort((a, b) => a - b);
    const livrosPorJogo = DEZ_JOGO_PADRAO - fixas.length;
    if (fixas.length === 0 || fixas.length > qtdFixas || livrosPorJogo < 0) return;
    const combTotal = comb(livresPool.length, livrosPorJogo);
    if (combTotal === 0) return;
    let livresSelecionados;
    if (combTotal > 200000) {
        const set = new Set();
        while (set.size < Math.min(nJogos, combTotal)) {
            const shuffled = [...livresPool].sort(() => Math.random() - 0.5).slice(0, livrosPorJogo).sort((a, b) => a - b);
            set.add(shuffled.join(','));
        }
        livresSelecionados = Array.from(set).map(s => s.split(',').map(Number));
    } else {
        const todos = combinations(livresPool, livrosPorJogo);
        livresSelecionados = selecionarDiversos(todos, Math.min(nJogos, todos.length));
    }
    jogosGerados = livresSelecionados.map(livres => [...fixas, ...livres].sort((a, b) => a - b));
    renderJogos(jogosGerados, fixas);
    document.getElementById('lblJogos').textContent = `${jogosGerados.length} jogos gerados - OK, sem repetição`;
    document.getElementById('secJogos').style.display = 'block';
    mostrarModal();
});

document.getElementById('btnZeroAcertos').addEventListener('click', async () => {
    await gerarZeroAcertos();
});

async function gerarZeroAcertos() {
    if (!window.ultimoResultado || !window.ultimoResultado.dezenas || !window.ultimoResultado.dezenas.size) {
        const ok = await buscarUltimoResultado();
        if (!ok) { mostrarAviso('Carregue ou busque o último concurso antes de gerar zero acertos.'); return; }
    }
    const sorteadas = window.ultimoResultado.dezenas;
    const naoSorteadas = Array.from({ length: TOTAL_DEZ }, (_, i) => i + NUM_MIN).filter(n => !sorteadas.has(n));
    if (naoSorteadas.length < DEZ_JOGO_PADRAO) { mostrarAviso('Não há números suficientes para gerar zero acertos.'); return; }
    const shuffle = [...naoSorteadas].sort(() => Math.random() - 0.5).slice(0, DEZ_JOGO_PADRAO).sort((a, b) => a - b);
    jogosGerados = [shuffle];
    renderJogos(jogosGerados, []);
    document.getElementById('lblJogos').textContent = '1 jogo zero acertos gerado';
    document.getElementById('secJogos').style.display = 'block';
    mostrarModal();
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
      </div>`;
        wrap.appendChild(card);
    });
}

function limparJogos() {
    jogosGerados = [];
    document.getElementById('secJogos').style.display = 'none';
}

function copiarJogos() {
    const fixas = Array.from(fixasSel).sort((a, b) => a - b);
    let txt = `LOTOMANIA - ${jogosGerados.length} jogos\n`;
    txt += `Fixas: ${fixas.map(fmt).join(' - ')}\n\n`;
    jogosGerados.forEach((j, i) => { txt += `Jogo ${i + 1}: ${j.map(fmt).join(' - ')}\n`; });
    navigator.clipboard.writeText(txt).then(() => {
        const btn = document.getElementById('btnCopiar');
        btn.textContent = 'Copiado!';
        setTimeout(() => btn.textContent = 'Copiar jogos', 2000);
    });
}

function getHistorico() {
    try { return JSON.parse(localStorage.getItem(HISTORICO_KEY) || '[]'); } catch { return []; }
}

function setHistorico(h) { localStorage.setItem(HISTORICO_KEY, JSON.stringify(h)); }

function salvarHistorico() {
    if (!jogosGerados.length) return;
    const fixas = Array.from(fixasSel).sort((a, b) => a - b);
    const h = getHistorico();
    h.unshift({ data: new Date().toLocaleString('pt-BR'), fixas, dezenas_por_jogo: DEZ_JOGO_PADRAO, jogos: jogosGerados });
    setHistorico(h);
    renderHistorico();
    const btn = document.getElementById('btnSalvar');
    btn.textContent = 'Salvo!';
    setTimeout(() => btn.textContent = 'Salvar no histórico', 2000);
}

function limparHistorico() {
    if (confirm('Limpar todo o histórico?')) { setHistorico([]); renderHistorico(); }
}

function renderHistorico() {
    const h = getHistorico();
    const el = document.getElementById('histConteudo');
    if (!h.length) {
        el.innerHTML = '<p style="font-size:13px;color:var(--text2);text-align:center;padding:1rem 0">Nenhum jogo salvo ainda.</p>';
        return;
    }
    const res = window.ultimoResultado || null;
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
        <span class="hist-badge">${entrada.jogos.length} jogos · ${entrada.dezenas_por_jogo} dez.${entrada.metodologia ? ' · ' + entrada.metodologia : ''}</span>
      </div>
      <div class="hist-fixas">Fixas: ${entrada.fixas.map(fmt).join(' · ')}</div>
      <div class="hist-jogos-lista">
        ${res
            ? entrada.jogos.map((j, i) => renderJogoComAcertos(j, i, res)).join('')
            : entrada.jogos.map((j, i) => `<div class="hist-jogo-row"><span class="hist-jogo-num">Jogo ${i + 1}</span><span style="font-family:var(--mono);font-size:11px">${j.map(fmt).join(' · ')}</span></div>`).join('')
        }
      </div>
    </div>
  `).join('');
}

function mostrarModal() {
    document.getElementById('modalDownload').classList.add('ativa');
}

function fecharModal() {
    document.getElementById('modalDownload').classList.remove('ativa');
}

function confirmarDownload() {
    const fixas = Array.from(fixasSel).sort((a, b) => a - b);
    let conteudo = `LOTOMANIA - ${jogosGerados.length} jogos\n`;
    conteudo += `Fixas: ${fixas.map(fmt).join(' - ')}\n`;
    conteudo += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n\n`;
    jogosGerados.forEach((jogo, i) => { conteudo += `Jogo ${i + 1}: ${jogo.map(fmt).join(' - ')}\n`; });
    const elemento = document.createElement('a');
    elemento.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(conteudo);
    elemento.download = `lotomania_${new Date().getTime()}.txt`;
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
    fecharModal();
}

document.getElementById('modalDownload').addEventListener('click', (e) => {
    if (e.target.id === 'modalDownload') fecharModal();
});

window.addEventListener('error', (ev) => {
    console.error('Uncaught error:', ev.error || ev.message || ev);
    const status = document.getElementById('analiseStatus') || document.getElementById('aviso');
    if (status) status.textContent = 'Erro na inicialização: ' + (ev.error && ev.error.message ? ev.error.message : (ev.message || String(ev)));
});

try {
    atualizar();
    renderHistorico();
    renderSecaoGrupos();
} catch (e) {
    console.error('Erro durante init:', e);
    const status = document.getElementById('analiseStatus') || document.getElementById('aviso');
    if (status) status.textContent = 'Erro na inicialização: ' + (e && e.message ? e.message : String(e));
}

function setTab(id, el) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('ativo'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('ativo'));
    if (el && el.classList) el.classList.add('ativo');
    const tab = document.getElementById('tab-' + id);
    if (tab) tab.classList.add('ativo');
    if (id === 'historico') carregarHistorico();
}

async function carregarHistorico() {
    const h = getHistorico();
    if (!h.length) { renderHistorico(); return; }
    if (!window.ultimoResultado) {
        setStatusConcurso('Buscando último resultado...', 'var(--text2)');
        const ok = await buscarUltimoResultado();
        if (ok && window.ultimoResultado) {
            const inp = document.getElementById('inputConcurso');
            if (inp) inp.value = String(window.ultimoResultado.numero);
            setStatusConcurso(`Concurso ${window.ultimoResultado.numero}${window.ultimoResultado.data ? ' — ' + window.ultimoResultado.data : ''} carregado.`, 'var(--verde)');
        } else {
            setStatusConcurso('Não foi possível buscar o resultado. Use o campo acima para buscar manualmente.', '#c0392b');
        }
    }
    renderHistorico();
}

document.querySelectorAll('.modo-link').forEach(link => {
    link.addEventListener('click', () => {
        document.querySelectorAll('.modo-link').forEach(l => l.classList.remove('clicado'));
        link.classList.add('clicado');
    });
});
