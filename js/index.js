// Estado global
let produtosDisponiveis = []; // guarda os produtos vindos do JSON
let carrinho = []; // guarda { id, quantidade }
let categoriaAtiva = null; // null = mostrar todas
let termoBusca = "";

const FRETE_FIXO = 45.0;

// Aguarda o HTML ser carregado
document.addEventListener("DOMContentLoaded", () => {
    carregarProdutos();
    configurarEventosCarrinho();
    configurarFiltros();
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

function adicionarCarrinho(id) {
    const itemExistente = carrinho.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.quantidade += 1;
    } else {
        carrinho.push({ id: id, quantidade: 1 });
    }

    renderizarCarrinho();
}

function alterarQuantidade(id, delta) {
    const item = carrinho.find(item => item.id === id);
    if (!item) return;

    item.quantidade += delta;

    if (item.quantidade <= 0) {
        removerItem(id);
        return;
    }

    renderizarCarrinho();
}

function removerItem(id) {
    carrinho = carrinho.filter(item => item.id !== id);
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

    carrinho.forEach(item => {
        const produto = produtosDisponiveis.find(p => p.id === item.id);
        if (!produto) return;

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

    carrinho.forEach(item => {
        const produto = produtosDisponiveis.find(p => p.id === item.id);
        if (produto) {
            subtotal += Number(produto.preco) * item.quantidade;
        }
    });

    const frete = carrinho.length > 0 ? FRETE_FIXO : 0;
    const total = subtotal + frete;

    if (subtotalEl) subtotalEl.textContent = `R$ ${subtotal.toFixed(2).replace(".", ",")}`;
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

// ---------- FILTROS: CATEGORIA + BUSCA ----------

function configurarFiltros() {
    // Categorias
    const cards = document.querySelectorAll(".category-card");

    cards.forEach(card => {
        card.addEventListener("click", () => {
            const categoria = card.dataset.categoria;

            if (categoriaAtiva === categoria) {
                // clicou de novo na mesma -> desativa (mostra todas)
                categoriaAtiva = null;
                cards.forEach(c => c.classList.remove("categoria-ativa"));
            } else {
                categoriaAtiva = categoria;
                cards.forEach(c => c.classList.remove("categoria-ativa"));
                card.classList.add("categoria-ativa");
            }

            aplicarFiltros();
        });
    });

    // Busca
    const inputBusca = document.getElementById("campo-busca");

    if (inputBusca) {
        inputBusca.addEventListener("input", (e) => {
            termoBusca = e.target.value.trim().toLowerCase();
            aplicarFiltros();
        });
    }
}

function aplicarFiltros() {
    let produtosFiltrados = produtosDisponiveis;

    if (categoriaAtiva) {
        produtosFiltrados = produtosFiltrados.filter(
            p => p.categoria === categoriaAtiva
        );
    }

    if (termoBusca) {
        produtosFiltrados = produtosFiltrados.filter(p =>
            p.nome.toLowerCase().includes(termoBusca) ||
            p.descricao.toLowerCase().includes(termoBusca)
        );
    }

    renderizarProdutos(produtosFiltrados);
}

function renderizarProdutos(produtos) {
    const catalogo = document.getElementById("produtos-container");
    if (!catalogo) return;

    if (produtos.length === 0) {
        catalogo.innerHTML = `
            <div class="erro-produtos">
                Nenhum produto encontrado.
            </div>
        `;
        return;
    }

    catalogo.innerHTML = "";

    produtos.forEach(produto => {
        catalogo.innerHTML += `
            <div class="product-card">
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
                        onclick="adicionarCarrinho(${produto.id})">
                        Adicionar ao Carrinho
                    </button>
                </div>
            </div>
        `;
    });
}