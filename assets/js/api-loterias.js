/* =========================================================
   Busca de concursos — compartilhado pelas 3 loterias.
   Carregar ANTES do JS da loteria.

   Ordem das fontes (da mais rápida para a mais lenta):
   1. loteriascaixa-api (projeto aberto da comunidade, espelho dos dados
      da CAIXA): tem CORS liberado e devolve TODOS os concursos em uma
      única requisição.
   2. API oficial da CAIXA via proxies de CORS (lento e instável;
      só como reserva). O proxy que funcionar é lembrado e tentado
      primeiro nas próximas buscas.

   Os objetos devolvidos são o JSON "cru" da fonte; cada loteria
   continua usando o próprio normalizador (que já entende os dois
   formatos: {concurso, data, dezenas} e {numero, dataApuracao, listaDezenas}).
   ========================================================= */

const ApiLoterias = (() => {
  const COMUNIDADE = 'https://loteriascaixa-api.herokuapp.com/api';
  const CAIXA = 'https://servicebus2.caixa.gov.br/portaldeloterias/api';

  /** Proxies de CORS para a API da CAIXA (a chamada direta é bloqueada pelo navegador). */
  const PROXIES = [
    (/** @type {string} */ u) => `https://proxy.corsfix.com/?url=${encodeURIComponent(u)}`,
    (/** @type {string} */ u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    (/** @type {string} */ u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    (/** @type {string} */ u) => `https://bypass.cors.rest/proxy?url=${encodeURIComponent(u)}`
  ];

  /** Índice do proxy que funcionou por último (tentado primeiro). */
  let proxyBom = 0;
  /** Se a fonte da comunidade falhar, para de insistir nela nesta visita. */
  let comunidadeFora = false;

  /** @param {number} ms */
  function timeout(ms) {
    return (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(ms) : undefined;
  }

  /** @param {string} url  @param {number} ms */
  async function getJson(url, ms) {
    const r = await fetch(url, { cache: 'no-store', signal: timeout(ms) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  /** Busca na fonte da comunidade; marca como fora do ar se falhar por rede.
   *  @param {string} caminho  @param {number} ms */
  async function daComunidade(caminho, ms) {
    if (comunidadeFora) throw new Error('fonte da comunidade indisponível');
    try {
      return await getJson(`${COMUNIDADE}/${caminho}`, ms);
    } catch (e) {
      // 404 = concurso ainda não existe lá; não derruba a fonte inteira.
      if (!String(e && /** @type {Error} */ (e).message).includes('HTTP 404')) comunidadeFora = true;
      throw e;
    }
  }

  /** Busca na CAIXA passando pelos proxies, começando pelo último que funcionou.
   *  @param {string} caminho */
  async function daCaixa(caminho) {
    const url = `${CAIXA}/${caminho}`;
    const ordem = PROXIES.map((_, i) => (proxyBom + i) % PROXIES.length);
    let erro = null;
    for (const i of ordem) {
      try {
        const data = await getJson(PROXIES[i](url), 7000);
        proxyBom = i;
        return data;
      } catch (e) { erro = e; }
    }
    throw erro || new Error('CAIXA indisponível');
  }

  return {
    /** Último concurso (JSON cru).
     *  @param {string} loteria  'lotofacil' | 'megasena' | 'lotomania' */
    async ultimo(loteria) {
      try { return await daComunidade(`${loteria}/latest`, 6000); }
      catch { return daCaixa(loteria); }
    },

    /** Um concurso específico (JSON cru).
     *  @param {string} loteria  @param {number} numero */
    async concurso(loteria, numero) {
      try { return await daComunidade(`${loteria}/${numero}`, 6000); }
      catch { return daCaixa(`${loteria}/${numero}`); }
    },

    /** Todos os concursos em uma requisição (array cru), ou [] se indisponível.
     *  @param {string} loteria */
    async todos(loteria) {
      try {
        const data = await daComunidade(loteria, 30000);
        return Array.isArray(data) ? data : [];
      } catch { return []; }
    },

    /** Quantas buscas fazer em paralelo ao completar concursos faltantes. */
    get paralelo() { return comunidadeFora ? 4 : 8; }
  };
})();
