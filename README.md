# Santosloterias

Gerador e conferidor de jogos para Lotofácil, Mega-Sena e Lotomania.

## Estrutura

```
index.html                 Tela de boas-vindas (entrada do site)
paginas/
  lotofacil.html
  megasena.html
  lotomania.html
assets/
  css/
    style.css              Estilos base compartilhados
    tema-loterias.css      Cores de cada loteria (carregar depois do style.css)
    megasena.css           Ajustes específicos da Mega-Sena
  js/
    lotofacil.js
    megasena.js
    lotomania.js
```

As páginas em `paginas/` redirecionam para `index.html` enquanto o aviso não for aceito na sessão.
