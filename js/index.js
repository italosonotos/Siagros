// Estado global
let produtosDisponiveis = []; // guarda os produtos vindos do JSON
let carrinho = []; // guarda { id, quantidade }
let categoriaAtiva = null; // null = mostrar todas
let termoBusca = "";

const PRODUTOS_POR_PAGINA = 10;
let paginaAtual = 1;

const FRETE_FIXO = 0;

// ---------- LOCAL STORAGE ----------

// Carrega o carrinho do localStorage
function carregarCarrinho() {
  const dados = localStorage.getItem("carrinho");

  if (dados) {
    carrinho = JSON.parse(dados);
    renderizarCarrinho();
  }
}

function salvarCarrinho() {
  localStorage.setItem("carrinho", JSON.stringify(carrinho));
}

// Aguarda o HTML ser carregado
document.addEventListener("DOMContentLoaded", async () => {
  setTimeout(() => {
    document.getElementById("loader").classList.add("hidden");
  }, 2000);
  await carregarProdutos(); // espera os produtos chegarem do JSON...
  carregarCarrinho(); // ...só então carrega o carrinho (precisa dos produtos pra exibir nome/preço)
  configurarEventosCarrinho();
  configurarFiltros();
  configurarHeroCarousel(); // inicia o carrossel do banner principal
});

async function carregarProdutos() {
  const catalogo = document.getElementById("produtos-container");

  if (!catalogo) {
    console.error("Container #produtos-container não encontrado.");
    return;
  }

  try {
    const resposta = await fetch("data/products.json");

    if (!resposta.ok) {
      throw new Error(`Erro HTTP: ${resposta.status}`);
    }

    const produtos = await resposta.json();
    produtosDisponiveis = produtos;

    renderizarProdutos(produtosDisponiveis);
  } catch (erro) {
    console.error("Erro ao carregar produtos:", erro);
    catalogo.innerHTML = `
            <div class="erro-produtos">
                Não foi possível carregar os produtos.
            </div>
        `;
  }
}

// ---------- CARRINHO ----------
// O carrinho guarda APENAS { id, quantidade }.
// Nome, preço e imagem são sempre buscados em produtosDisponiveis na hora de exibir.
// Isso evita dados desatualizados e problemas com itens antigos salvos no localStorage.

function adicionarCarrinho(id) {
  const produto = produtosDisponiveis.find((p) => p.id === id); // era "produtos", que não existia

  if (!produto) {
    console.error("Produto não encontrado.");
    return;
  }

  const itemExistente = carrinho.find((item) => item.id === id);

  if (itemExistente) {
    itemExistente.quantidade++;
  } else {
    carrinho.push({ id: id, quantidade: 1 });
  }

  salvarCarrinho();
  renderizarCarrinho();
}

function alterarQuantidade(id, delta) {
  const item = carrinho.find((item) => item.id === id);
  if (!item) return;

  item.quantidade += delta;

  if (item.quantidade <= 0) {
    removerItem(id);
    return;
  }

  salvarCarrinho();
  renderizarCarrinho();
}

function removerItem(id) {
  carrinho = carrinho.filter((item) => item.id !== id);
  salvarCarrinho();
  renderizarCarrinho();
}

function renderizarCarrinho() {
  const container = document.getElementById("carrinho-itens");

  if (!container) {
    console.error("Container #carrinho-itens não encontrado.");
    return;
  }

  if (carrinho.length === 0) {
    container.innerHTML = `<p class="carrinho-vazio">Seu carrinho está vazio.</p>`;
    atualizarResumo();
    atualizarBadge();
    return;
  }

  container.innerHTML = "";

  carrinho.forEach((item) => {
    const produto = produtosDisponiveis.find((p) => p.id === item.id);
    if (!produto) return; // produto pode ter sido removido do catálogo

    container.innerHTML += `
            <div class="cart-item">
                <img src="${produto.imagem}" alt="${produto.nome}" />
                <div class="cart-item-details">
                    <h4>${produto.nome}</h4>
                    <p class="cart-item-price">
                        R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}
                    </p>
                    <div class="quantity-selector">
                        <button class="qty-btn minus" onclick="alterarQuantidade(${produto.id}, -1)">-</button>
                        <span class="qty-number">${item.quantidade}</span>
                        <button class="qty-btn plus" onclick="alterarQuantidade(${produto.id}, 1)">+</button>
                    </div>
                </div>
                <button class="remove-item" title="Remover item" onclick="removerItem(${produto.id})">&times;</button>
            </div>
        `;
  });

  atualizarResumo();
  atualizarBadge();
}

function atualizarResumo() {
  const subtotalEl = document.getElementById("cart-subtotal");
  const freteEl = document.getElementById("cart-frete");
  const totalEl = document.getElementById("cart-total");

  let subtotal = 0;

  carrinho.forEach((item) => {
    const produto = produtosDisponiveis.find((p) => p.id === item.id);
    if (produto) {
      subtotal += Number(produto.preco) * item.quantidade;
    }
  });

  const frete = carrinho.length > 0 ? FRETE_FIXO : 0;
  const total = subtotal + frete;

  if (subtotalEl)
    subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;
  if (freteEl) freteEl.textContent = `R$ ${frete.toFixed(2).replace(".", ",")}`;
  if (totalEl) totalEl.textContent = `R$ ${total.toFixed(2).replace(".", ",")}`;
}

function atualizarBadge() {
  const totalItens = carrinho.reduce((soma, item) => soma + item.quantidade, 0);

  const badgeDesktop = document.querySelector(".cart-badge");
  const badgeMobile = document.querySelector(".mobile-cart-badge");

  if (badgeDesktop) badgeDesktop.textContent = totalItens;
  if (badgeMobile) badgeMobile.textContent = totalItens;
}

// ---------- ABRIR/FECHAR CARRINHO ----------

function configurarEventosCarrinho() {
  const cartSidebar = document.getElementById("cart-sidebar");
  const toggleBtn = document.querySelector(".toggle-cart");
  const closeBtn = document.querySelector(".close-cart-btn");
  const mobileFab = document.getElementById("mobile-cart-fab");

  if (toggleBtn && cartSidebar) {
    toggleBtn.addEventListener("click", () => {
      cartSidebar.classList.toggle("aberto");
    });
  }

  if (mobileFab && cartSidebar) {
    mobileFab.addEventListener("click", () => {
      cartSidebar.classList.toggle("aberto");
    });
  }

  if (closeBtn && cartSidebar) {
    closeBtn.addEventListener("click", () => {
      cartSidebar.classList.remove("aberto");
    });
  }
}

// ---------- CARROSSEL DO HERO BANNER ----------
// Alterna automaticamente entre os slides do #hero-banner a cada 5s.
// Os dots (.carousel-dots .dot) também permitem trocar de slide manualmente.

let heroSlideAtual = 0;
let heroIntervalId = null;

function configurarHeroCarousel() {
  const heroSlides = document.querySelectorAll("#hero-banner .hero-slide");
  const heroDots = document.querySelectorAll("#hero-banner .dot");

  if (heroSlides.length === 0) return; // sem slides, não faz nada

  function mostrarHeroSlide(index) {
    heroSlides.forEach((slide) => slide.classList.remove("active"));
    heroDots.forEach((dot) => dot.classList.remove("active"));

    heroSlides[index].classList.add("active");
    if (heroDots[index]) heroDots[index].classList.add("active");

    heroSlideAtual = index;
  }

  function proximoHeroSlide() {
    mostrarHeroSlide((heroSlideAtual + 1) % heroSlides.length);
  }

  function iniciarAutoPlay() {
    clearInterval(heroIntervalId);
    heroIntervalId = setInterval(proximoHeroSlide, 5000);
  }

  heroDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      mostrarHeroSlide(index);
      iniciarAutoPlay(); // reinicia o timer ao clicar manualmente
    });
  });

  iniciarAutoPlay();
}

// ---------- FILTROS: CATEGORIA + BUSCA ----------

function configurarFiltros() {
  // Categorias
  const cards = document.querySelectorAll(".category-card");

  cards.forEach((card) => {
    card.addEventListener("click", () => {
      const categoria = card.dataset.categoria;

      if (categoriaAtiva === categoria) {
        categoriaAtiva = null;
        cards.forEach((c) => c.classList.remove("categoria-ativa"));
      } else {
        categoriaAtiva = categoria;
        cards.forEach((c) => c.classList.remove("categoria-ativa"));
        card.classList.add("categoria-ativa");
      }

      paginaAtual = 1;
      aplicarFiltros();
    });
  });

  // Busca
  const inputBusca = document.getElementById("campo-busca");

  if (inputBusca) {
    inputBusca.addEventListener("input", (e) => {
      termoBusca = e.target.value.trim().toLowerCase();
      paginaAtual = 1;
      aplicarFiltros();
    });
  }
}

function aplicarFiltros() {
  let produtosFiltrados = produtosDisponiveis;

  if (categoriaAtiva) {
    produtosFiltrados = produtosFiltrados.filter(
      (p) => p.categoria === categoriaAtiva,
    );
  }

  if (termoBusca) {
    produtosFiltrados = produtosFiltrados.filter(
      (p) =>
        p.nome.toLowerCase().includes(termoBusca) ||
        p.descricao.toLowerCase().includes(termoBusca),
    );
  }

  renderizarProdutos(produtosFiltrados);
}

// ---------- RENDERIZAÇÃO DE PRODUTOS + PAGINAÇÃO ----------

function renderizarProdutos(produtos) {
  const catalogo = document.getElementById("produtos-container");
  if (!catalogo) return;

  if (produtos.length === 0) {
    catalogo.innerHTML = `
            <div class="erro-produtos">
                Nenhum produto encontrado.
            </div>
        `;
    renderizarPaginacao(0);
    return;
  }

  const totalPaginas = Math.ceil(produtos.length / PRODUTOS_POR_PAGINA);
  if (paginaAtual > totalPaginas) paginaAtual = 1;

  const inicio = (paginaAtual - 1) * PRODUTOS_POR_PAGINA;
  const fim = inicio + PRODUTOS_POR_PAGINA;
  const produtosDaPagina = produtos.slice(inicio, fim);

  catalogo.innerHTML = "";

  produtosDaPagina.forEach((produto) => {
    // COMENTÁRIO: O card inteiro abre a página de detalhe do produto ao ser clicado
    // (onclick="abrirProduto(...)"). O botão "Adicionar ao Carrinho" usa
    // event.stopPropagation() para que o clique nele NÃO abra a página de detalhe,
    // apenas adicione o item direto pelo card, como já funcionava antes.
    catalogo.innerHTML += `
            <div class="product-card" onclick="abrirProduto(${produto.id})">
                <div class="product-image-container">
                    <img
                        src="${produto.imagem}"
                        alt="${produto.nome}"
                        loading="lazy"
                    >
                </div>

                <div class="product-info">
                    <h3 class="product-name">${produto.nome}</h3>
                    <p class="product-desc">${produto.descricao}</p>
                    <p class="product-price">
                        R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}
                    </p>
                    <button
                        class="btn-secondary btn-add-cart"
                        onclick="event.stopPropagation(); adicionarCarrinho(${produto.id})">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        `;
  });

  renderizarPaginacao(totalPaginas);
}

function renderizarPaginacao(totalPaginas) {
  const container = document.getElementById("pagination-container");
  if (!container) return;

  if (totalPaginas <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = "";

  html += `
        <button
            class="page-btn page-nav"
            onclick="irParaPagina(${paginaAtual - 1})"
            ${paginaAtual === 1 ? "disabled" : ""}>
            &laquo;
        </button>
    `;

  for (let i = 1; i <= totalPaginas; i++) {
    html += `
            <button
                class="page-btn ${i === paginaAtual ? "page-ativa" : ""}"
                onclick="irParaPagina(${i})">
                ${i}
            </button>
        `;
  }

  html += `
        <button
            class="page-btn page-nav"
            onclick="irParaPagina(${paginaAtual + 1})"
            ${paginaAtual === totalPaginas ? "disabled" : ""}>
            &raquo;
        </button>
    `;

  container.innerHTML = html;
}

function irParaPagina(pagina) {
  paginaAtual = pagina;
  aplicarFiltros();
  document
    .querySelector(".products-section")
    ?.scrollIntoView({ behavior: "smooth" });
}

// ---------- TROCA DE "PÁGINA" (HOME / DETALHE / CONFIRMAÇÃO) ----------
// COMENTÁRIO: Como é tudo em uma página só (sem framework), "navegar" aqui
// significa esconder um desses três blocos e mostrar outro:
//   - conteudo-home        -> busca + categorias + produtos
//   - conteudo-detalhe     -> página de um produto específico
//   - conteudo-confirmacao -> revisão do pedido antes de enviar pro WhatsApp
// O carrinho (#cart-sidebar) e o cabeçalho ficam DE FORA dessa troca de
// propósito, então continuam acessíveis em qualquer uma das "páginas".
function mostrarConteudo(idParaMostrar) {
  ["conteudo-home", "conteudo-detalhe", "conteudo-confirmacao"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = id === idParaMostrar ? "block" : "none";
    },
  );

  // O banner hero só faz sentido na home
  const hero = document.getElementById("hero-banner");
  if (hero) hero.style.display = idParaMostrar === "conteudo-home" ? "" : "none";

  window.scrollTo({ top: 0, behavior: "instant" });
}

// ---------- PÁGINA DE DETALHE DO PRODUTO ----------

function abrirProduto(id) {
  const produto = produtosDisponiveis.find((p) => p.id === id);

  if (!produto) {
    console.error("Produto não encontrado.");
    return;
  }

  // Preenche a página de detalhe com os dados do produto clicado
  const imagem = document.getElementById("detalhe-imagem");
  imagem.src = produto.imagem;
  imagem.alt = produto.nome;

  document.getElementById("detalhe-nome").textContent = produto.nome;
  document.getElementById("detalhe-preco").textContent =
    `R$ ${Number(produto.preco).toFixed(2).replace(".", ",")}`;
  document.getElementById("detalhe-descricao").textContent = produto.descricao;

  // Esconde qualquer confirmação de uma visita anterior
  const confirmacao = document.getElementById("confirmacao-adicionado");
  confirmacao.classList.remove("show");

  // Configura o botão "Adicionar ao Carrinho" desta página para o produto atual.
  // Ao clicar, adiciona ao carrinho e MOSTRA a confirmação, mas continua
  // na mesma página do produto (não navega para lugar nenhum).
  const btnAdd = document.getElementById("btn-add-detalhe");
  btnAdd.onclick = () => {
    adicionarCarrinho(produto.id);
    confirmacao.classList.add("show");

    // Esconde a mensagem de novo depois de um tempo
    clearTimeout(btnAdd._timeoutConfirmacao);
    btnAdd._timeoutConfirmacao = setTimeout(() => {
      confirmacao.classList.remove("show");
    }, 2500);
  };

  mostrarConteudo("conteudo-detalhe");
}

function voltarInicio() {
  mostrarConteudo("conteudo-home");
}

// ---------- AVISO DE CRÉDITO ----------

document.addEventListener("DOMContentLoaded", () => {
  const pagamento = document.getElementById("forma-pagamento");
  const aviso = document.getElementById("aviso-credito");

  if (pagamento) {
    pagamento.addEventListener("change", () => {
      aviso.style.display = pagamento.value === "Crédito" ? "block" : "none";
    });
  }
});

// ---------- REVISÃO E CONFIRMAÇÃO DO PEDIDO ----------
// COMENTÁRIO: Ao clicar em "Finalizar Pedido" no carrinho, NÃO vamos mais
// direto pro WhatsApp. Primeiro validamos os campos e mostramos uma página
// de revisão (#conteudo-confirmacao) com os itens e os dados preenchidos.
// A pessoa então escolhe: "Confirmar e enviar pelo WhatsApp" (dispara a
// mensagem, igual antes) ou "Voltar e revisar" (volta pra home com o
// carrinho aberto, pra ajustar quantidade ou adicionar mais produtos).

// Guarda os dados já validados, prontos pra virar mensagem quando confirmados.
let pedidoParaConfirmar = null;

function abrirConfirmacaoPedido() {
  if (carrinho.length === 0) {
    alert("Seu carrinho está vazio!");
    return;
  }

  const nome = document.getElementById("cliente-nome").value.trim();
  const telefone = document.getElementById("cliente-telefone").value.trim();
  const endereco = document.getElementById("cliente-endereco").value.trim();
  const entrega = document.getElementById("forma-entrega").value;
  const pagamento = document.getElementById("forma-pagamento").value;

  if (!nome || !telefone || !endereco) {
    alert("Preencha nome, telefone e endereço.");
    return;
  }

  // Monta a lista de itens junto com o total, a partir do carrinho atual
  const itens = [];
  let total = 0;

  carrinho.forEach((item) => {
    const produto = produtosDisponiveis.find((p) => p.id === item.id);
    if (!produto) return;

    const subtotal = produto.preco * item.quantidade;
    total += subtotal;

    itens.push({
      nome: produto.nome,
      quantidade: item.quantidade,
      precoUnitario: produto.preco,
      subtotal: subtotal,
    });
  });

  const frete = FRETE_FIXO;
  const totalComFrete = total + frete;

  // Guarda tudo pra usar quando a pessoa confirmar de fato
  pedidoParaConfirmar = { nome, telefone, endereco, entrega, pagamento, itens, totalComFrete };

  preencherPaginaConfirmacao(pedidoParaConfirmar);

  // Fecha o carrinho (se estiver aberto no mobile) e mostra a página de revisão
  document.getElementById("cart-sidebar")?.classList.remove("aberto");
  mostrarConteudo("conteudo-confirmacao");
}

function preencherPaginaConfirmacao(pedido) {
  const listaEl = document.getElementById("confirmacao-itens-lista");

  listaEl.innerHTML = pedido.itens
    .map(
      (item) => `
        <div class="confirmacao-item">
            <span class="confirmacao-item-nome">${item.quantidade}x ${item.nome}</span>
            <span class="confirmacao-item-valor">R$ ${item.subtotal.toFixed(2).replace(".", ",")}</span>
        </div>
    `,
    )
    .join("");

  document.getElementById("confirmacao-total-valor").textContent =
    `R$ ${pedido.totalComFrete.toFixed(2).replace(".", ",")}`;

  document.getElementById("confirmacao-nome").textContent = pedido.nome;
  document.getElementById("confirmacao-telefone").textContent = pedido.telefone;
  document.getElementById("confirmacao-endereco").textContent = pedido.endereco;
  document.getElementById("confirmacao-entrega").textContent = pedido.entrega;
  document.getElementById("confirmacao-pagamento").textContent = pedido.pagamento;
}

// Volta pra home (com o carrinho já aberto) pra pessoa revisar/ajustar o pedido
function voltarParaCarrinho() {
  mostrarConteudo("conteudo-home");
  document.getElementById("cart-sidebar")?.classList.add("aberto");
}

// Monta a mensagem final e abre o WhatsApp - só roda quando a pessoa
// realmente confirma na página de revisão.
function confirmarEnvioPedido() {
  if (!pedidoParaConfirmar) return;

  const { nome, telefone, endereco, entrega, pagamento, itens, totalComFrete } =
    pedidoParaConfirmar;

  let mensagem = "*NOVO PEDIDO - SIAGRO MUDAS*\n\n";

  mensagem += `*Cliente:* ${nome}\n`;
  mensagem += `*Telefone:* ${telefone}\n`;
  mensagem += `*Endereço:* ${endereco}\n`;
  mensagem += `*Entrega:* ${entrega}\n`;
  mensagem += `*Pagamento:* ${pagamento}\n`;

  if (pagamento === "Crédito") {
    mensagem +=
      "*Obs.:* Pagamentos no cartão de crédito podem ter uma pequena taxa adicional.\n";
  }

  mensagem += "\n----------------------------------------\n";
  mensagem += "*ITENS DO PEDIDO*\n";
  mensagem += "----------------------------------------\n\n";

  itens.forEach((item) => {
    mensagem += `${item.nome}\n`;
    mensagem += `Quantidade: ${item.quantidade}\n`;
    mensagem += `Valor: R$ ${item.subtotal.toFixed(2).replace(".", ",")}\n`;
    mensagem += "----------------------------------------\n";
  });

  mensagem += `\n*TOTAL DO PEDIDO:* R$ ${totalComFrete.toFixed(2).replace(".", ",")}`;

  const mensagemCodificada = encodeURIComponent(mensagem);

  window.open(
    `https://wa.me/5579999614125?text=${mensagemCodificada}`,
    "_blank",
  );

  pedidoParaConfirmar = null;
  carrinho = [];
  salvarCarrinho();
  renderizarCarrinho();

  mostrarConteudo("conteudo-home");
}