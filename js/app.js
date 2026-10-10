import { histories, posters } from "/js/data.js";

const pageDetails = {
    home: { title: "Home", path: "/" },
    docs: { title: "Docs", path: "/docs" },
    historia: { title: "História", path: "/historia" },
    lambes: { title: "Lambes", path: "/lambes" },
    noticias: { title: "Notícias", path: "/noticias" },
    publicar: { title: "Publicar", path: "/publicar" }
};

const page = document.body.dataset.page || "home";
const pageContent = document.querySelector("#page-content");

function makeElement(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

async function loadCollection(name) {
    const response = await fetch(`/api/${name}`);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Não foi possível carregar o conteúdo.");
    return result;
}

function renderLoadError(container, error) {
    console.error("Falha ao carregar conteúdo:", error);
    const message = makeElement("p", "empty-state", "Não foi possível carregar o conteúdo agora. Tente novamente mais tarde.");
    message.setAttribute("role", "alert");
    container.replaceChildren(message);
}

function makeIcon(name) {
    const paths = {
        search: '<circle cx="11" cy="11" r="7"></circle><path d="m16 16 4 4"></path>',
        file: '<path d="M6 2h8l5 5v15H6z"></path><path d="M14 2v6h5M9 13h7M9 17h7"></path>',
        download: '<path d="M12 3v12m-5-5 5 5 5-5"></path><path d="M4 20h16"></path>',
        arrow: '<path d="M4 12h15m-6-6 6 6-6 6"></path>',
        menu: '<path d="M3 6h18M3 12h18M3 18h18"></path>',
        close: '<path d="m5 5 14 14M19 5 5 19"></path>'
    };

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("aria-hidden", "true");
    icon.setAttribute("focusable", "false");
    icon.innerHTML = paths[name] || "";
    return icon;
}

function renderHeader() {
    const host = document.querySelector("#site-header");
    const links = Object.entries(pageDetails).map(([key, item]) => {
        const active = key === page;
        const className = key === "publicar" ? ' class="publish-nav-link"' : "";
        return `<li><a${className} href="${item.path}"${active ? ' aria-current="page"' : ""}>${item.title}</a></li>`;
    }).join("");

    host.innerHTML = `
        <a class="skip-link" href="#page-content">Pular para o conteúdo</a>
        <header class="site-header">
            <a class="brand" href="/" aria-label="Antifa Move, página inicial">
                <img src="/imgs/revolution.ico.ico" alt="" width="38" height="38">
                <span>Antifa Move</span>
            </a>
            <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-navigation" aria-label="Abrir menu">
                <span class="menu-icon"></span>
                <span class="menu-label">Menu</span>
            </button>
            <nav class="site-navigation" id="site-navigation" aria-label="Navegação principal">
                <ul>${links}</ul>
            </nav>
        </header>`;

    const button = host.querySelector(".menu-toggle");
    const navigation = host.querySelector(".site-navigation");
    button.append(makeIcon("menu"));
    button.addEventListener("click", () => {
        const isOpen = button.getAttribute("aria-expanded") === "true";
        button.setAttribute("aria-expanded", String(!isOpen));
        button.setAttribute("aria-label", isOpen ? "Abrir menu" : "Fechar menu");
        button.querySelector("svg").replaceWith(makeIcon(isOpen ? "menu" : "close"));
        navigation.classList.toggle("is-open", !isOpen);
    });
    navigation.addEventListener("click", (event) => {
        if (!event.target.closest("a")) return;
        button.setAttribute("aria-expanded", "false");
        button.setAttribute("aria-label", "Abrir menu");
        button.querySelector("svg").replaceWith(makeIcon("menu"));
        navigation.classList.remove("is-open");
    });
}

function renderFooter() {
    document.querySelector("#site-footer").innerHTML = `
        <footer class="site-footer">
            <div class="footer-inner">
                <a class="footer-brand" href="/" aria-label="Antifa Move, página inicial">ANTIFA<br>MOVE</a>
                <p class="footer-message">Informação para quem quer<br>mudar o rumo das coisas.</p>
                <nav class="footer-links" aria-label="Navegação do rodapé">
                    <a href="/docs">Docs</a>
                    <a href="/historia">História</a>
                    <a href="/lambes">Lambes</a>
                    <a href="/noticias">Notícias</a>
                </nav>
                <small class="footer-copy">© 2025 — Conteúdo livre para circular</small>
            </div>
        </footer>`;
}

function renderPageHero(kicker, title, description) {
    const hero = makeElement("section", "page-hero");
    hero.setAttribute("aria-labelledby", "page-title");
    const inner = makeElement("div", "page-hero-inner");
    const text = makeElement("div", "page-hero-heading");
    text.append(makeElement("p", "eyebrow eyebrow-yellow", kicker));
    const heading = makeElement("h1", "page-title", title);
    heading.id = "page-title";
    text.append(heading);
    const copy = makeElement("p", "page-hero-description", description);
    inner.append(text, copy);
    hero.append(inner);
    return hero;
}

function createPhoto(source, alt, className = "editorial-photo") {
    const image = makeElement("img", className);
    image.src = source;
    image.alt = alt;
    image.loading = "lazy";
    image.decoding = "async";
    return image;
}

function makeArrowLink(label, href, className = "text-link") {
    const link = makeElement("a", className);
    link.href = href;
    link.append(makeElement("span", "", label));
    link.append(makeIcon("arrow"));
    return link;
}

function createNewsCard(item, options = {}) {
    const { featured = false, homeCard = false } = options;
    const article = makeElement("article", `news-card${featured ? " news-card-featured history-feature" : ""}${homeCard ? " news-card-home" : ""}`);
    const articlePath = `/noticias/${encodeURIComponent(item.slug || item.id)}`;
    article.id = `noticia-${item.slug || item.id}`;

    const imageLink = makeElement("a", `news-image-link${featured ? " history-feature-image" : ""}`);
    imageLink.href = articlePath;
    imageLink.setAttribute("aria-label", `Abrir notícia: ${item.title}`);
    imageLink.append(createPhoto(item.image, `Imagem editorial: ${item.title}`));
    imageLink.append(makeElement("span", "image-category", item.category));
    imageLink.append(makeElement("span", "tape", ""));

    const content = makeElement("div", `news-card-content${featured ? " history-feature-copy" : ""}`);
    content.append(makeElement("time", "news-date", item.date));
    content.querySelector("time").dateTime = item.isoDate;
    if (item.author) content.append(makeElement("p", "news-author", `Por ${item.author}`));
    content.append(makeElement("h3", "news-card-title", item.title));
    content.append(makeElement("p", "news-card-summary", item.summary));
    content.append(makeArrowLink("Ler matéria", articlePath));

    article.append(imageLink, content);
    return article;
}

async function renderHome() {
    const hero = makeElement("section", "home-hero");
    hero.setAttribute("aria-labelledby", "home-title");
    const poster = makeElement("div", "hero-poster");
    poster.append(makeElement("span", "tape hero-tape hero-tape-one", ""));
    poster.append(makeElement("span", "tape hero-tape hero-tape-two", ""));
    const slogan = makeElement("h1", "hero-slogan", "Contra a norma deles, pela vida nossa!");
    slogan.id = "home-title";
    poster.append(slogan);
    const intro = makeElement("p", "hero-intro", "Informação, memória e materiais para quem não aceita assistir de braços cruzados.");
    const edition = makeElement("p", "edition-note", "Edição 01 — Brasil");
    hero.append(poster, intro, edition);

    const section = makeElement("section", "home-news content-width");
    section.setAttribute("aria-labelledby", "latest-news-title");
    const headingRow = makeElement("div", "section-heading-row");
    const heading = makeElement("div", "section-heading");
    heading.append(makeElement("p", "eyebrow", "Agora"));
    heading.append(makeElement("h2", "hand-heading", "Últimas notícias"));
    heading.querySelector("h2").id = "latest-news-title";
    headingRow.append(heading);
    headingRow.append(makeArrowLink("Ver todas", "/noticias", "button-link"));
    const grid = makeElement("div", "home-news-grid");
    grid.append(makeElement("p", "empty-state", "Carregando notícias..."));
    try {
        const news = await loadCollection("news");
        grid.replaceChildren();
        if (!news.length) grid.append(makeElement("p", "empty-state", "Ainda não há notícias publicadas."));
        news.slice(0, 3).forEach((item) => grid.append(createNewsCard(item, { homeCard: true })));
    } catch (error) {
        renderLoadError(grid, error);
    }
    section.append(headingRow, grid);

    pageContent.append(hero, section);
}

function renderFilterButtons(categories, selected, onSelect, groupLabel) {
    const group = makeElement("div", "filter-list");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", groupLabel);
    categories.forEach((category) => {
        const button = makeElement("button", `filter-button${selected === category ? " is-active" : ""}`, category);
        button.type = "button";
        button.setAttribute("aria-pressed", String(selected === category));
        button.addEventListener("click", () => onSelect(category));
        group.append(button);
    });
    return group;
}

function updateFilterButtons(group, selected) {
    group.querySelectorAll(".filter-button").forEach((button) => {
        const isSelected = button.textContent === selected;
        button.classList.toggle("is-active", isSelected);
        button.setAttribute("aria-pressed", String(isSelected));
    });
}

async function renderDocumentsPage() {
    pageContent.append(renderPageHero(
        "Biblioteca popular",
        "Docs",
        "Materiais para consultar, guardar e compartilhar. Conhecimento útil não pode ficar trancado."
    ));

    const section = makeElement("section", "content-width document-library");
    section.setAttribute("aria-label", "Biblioteca de documentos");
    const controls = makeElement("div", "document-controls");
    const searchLabel = makeElement("label", "search-field");
    searchLabel.append(makeIcon("search"));
    const searchInput = makeElement("input");
    searchInput.type = "search";
    searchInput.placeholder = "Buscar documento...";
    searchInput.setAttribute("aria-label", "Buscar documento pelo nome");
    searchLabel.append(searchInput);
    controls.append(searchLabel);

    let documents;
    let categories = ["Todos"];
    let selected = "Todos";
    const results = makeElement("div", "document-results");
    const resultCount = makeElement("p", "visually-hidden", "");

    function updateDocuments() {
        const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
        const filtered = (documents || []).filter((item) => {
            const matchesCategory = selected === "Todos" || item.category === selected;
            return matchesCategory && item.title.toLocaleLowerCase("pt-BR").includes(query);
        });
        results.replaceChildren();
        resultCount.textContent = `${filtered.length} documentos encontrados.`;
        if (!filtered.length) {
            results.append(makeElement("p", "empty-state", "Nenhum documento encontrado."));
            return;
        }

        filtered.forEach((item) => {
            const row = makeElement("article", "document-row");
            row.append(makeElement("span", "document-number", String(documents.indexOf(item) + 1).padStart(2, "0")));
            const titleCell = makeElement("div", "document-name");
            const fileIcon = makeElement("span", "document-icon");
            fileIcon.append(makeIcon("file"));
            titleCell.append(fileIcon, makeElement("h3", "", item.title));
            titleCell.dataset.label = "Documento";
            const category = makeElement("span", "document-category", item.category);
            category.dataset.label = "Categoria";
            const details = makeElement("div", "document-details");
            details.dataset.label = "Detalhes";
            details.append(makeElement("strong", "", `${item.format} · ${item.pages} páginas`));
            details.append(makeElement("time", "", item.date));
            const action = makeElement("div", "document-action");
            action.dataset.label = "Ação";
            if (item.url) {
                const download = makeElement("a", "download-button", "Baixar");
                download.href = item.url;
                download.setAttribute("aria-label", `Baixar ${item.title}`);
                action.append(download);
            } else {
                const download = makeElement("button", "download-button", "Baixar");
                download.type = "button";
                download.disabled = true;
                download.title = "PDF ainda não disponível";
                download.setAttribute("aria-label", `Download indisponível: ${item.title}`);
                action.append(download);
            }
            if (!item.url) action.append(makeElement("span", "availability-note", "PDF indisponível"));
            row.append(titleCell, category, details, action);
            results.append(row);
        });
    }

    let filters = renderFilterButtons(categories, selected, (category) => {
        selected = category;
        updateFilterButtons(filters, selected);
        updateDocuments();
    }, "Filtrar documentos por categoria");
    controls.append(filters);
    searchInput.addEventListener("input", updateDocuments);
    section.append(controls, resultCount);

    const tableHeader = makeElement("div", "document-table-header");
    ["Documento", "Categoria", "Detalhes", "Ação"].forEach((label) => tableHeader.append(makeElement("span", "", label)));
    section.append(tableHeader, results);
    pageContent.append(section);
    results.append(makeElement("p", "empty-state", "Carregando documentos..."));
    try {
        documents = await loadCollection("documents");
        categories = ["Todos", ...new Set(documents.map((item) => item.category))];
        filters.replaceWith(filters = renderFilterButtons(categories, selected, (category) => {
            selected = category;
            updateFilterButtons(filters, selected);
            updateDocuments();
        }, "Filtrar documentos por categoria"));
        updateDocuments();
    } catch (error) {
        renderLoadError(results, error);
    }
}

function renderHistoryCard(item) {
    const card = makeElement("article", "history-card");
    card.id = item.id;
    const image = makeElement("a", "history-image");
    image.href = `#${item.id}`;
    image.setAttribute("aria-label", `Ler: ${item.title}`);
    image.append(createPhoto(item.image, `Registro visual relacionado a ${item.year}`));
    image.append(makeElement("span", "history-year", item.year));
    const content = makeElement("div", "history-card-content");
    content.append(makeElement("p", "eyebrow", item.category));
    content.append(makeElement("h3", "", item.title));
    content.append(makeElement("p", "", item.summary));
    content.append(makeArrowLink("Continuar lendo", `#${item.id}`));
    card.append(image, content);
    return card;
}

function renderHistoryPage() {
    pageContent.append(renderPageHero(
        "Memória em disputa",
        "História",
        "O Brasil não começou ontem. Voltamos ao passado para entender as forças que ainda movem o presente."
    ));

    const feature = makeElement("article", "history-feature content-width");
    feature.id = "historia-1964-85";
    const imagePanel = makeElement("div", "history-feature-image");
    imagePanel.append(createPhoto(
        "/imgs/Utilizadas/img4.avif",
        "Manifestação popular em memória das vítimas da ditadura militar"
    ));
    imagePanel.append(makeElement("span", "feature-year", "1964—85"));
    const copy = makeElement("div", "history-feature-copy");
    copy.append(makeElement("p", "eyebrow", "Especial / Ditadura"));
    copy.append(makeElement("h2", "", "O passado que não passa"));
    copy.append(makeElement("p", "", "Um especial sobre memória, silêncio e as marcas de 21 anos de ditadura militar na democracia brasileira."));
    copy.append(makeArrowLink("Ler especial", "#historia-1964-85", "button-link"));
    feature.append(imagePanel, copy);

    const section = makeElement("section", "content-width history-timeline");
    section.setAttribute("aria-labelledby", "other-histories-title");
    section.append(makeElement("p", "eyebrow", "Linha do tempo"));
    section.append(makeElement("h2", "hand-heading", "Outras histórias"));
    section.querySelector("h2").id = "other-histories-title";
    const grid = makeElement("div", "history-grid");
    histories.forEach((item) => grid.append(renderHistoryCard(item)));
    section.append(grid);
    pageContent.append(feature, section);
}

function escapeXml(value) {
    return value.replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;"
    })[character]);
}

function createPosterSvg(poster, index) {
    const fontSize = Math.max(27, Math.min(41, 330 / Math.max(...poster.lines.map((line) => line.length))));
    const lineHeight = fontSize * 1.08;
    const firstLineY = 212 - ((poster.lines.length - 1) * lineHeight) / 2;
    const text = poster.lines.map((line, lineIndex) =>
        `<text x="148.5" y="${firstLineY + lineIndex * lineHeight}" text-anchor="middle">${escapeXml(line)}</text>`
    ).join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="297mm" height="420mm" viewBox="0 0 297 420">
        <rect width="297" height="420" fill="${poster.background}"/>
        <rect x="13" y="13" width="271" height="394" fill="none" stroke="${poster.border}" stroke-width="1.5"/>
        <text x="25" y="38" fill="${poster.foreground}" font-family="Arial, sans-serif" font-size="8" font-weight="900" letter-spacing="1">ANTIFA MOVE / ${String(index + 1).padStart(2, "0")}</text>
        <g fill="${poster.foreground}" font-family="Arial Black, Arial, sans-serif" font-size="${fontSize}" font-weight="900">${text}</g>
        <circle cx="148.5" cy="342" r="32" fill="none" stroke="${poster.foreground}" stroke-width="4"/>
        <text x="148.5" y="353" text-anchor="middle" fill="${poster.foreground}" font-family="Arial Black, Arial, sans-serif" font-size="35" font-weight="900">A</text>
    </svg>`;
}

function createPosterCard(poster, index) {
    const card = makeElement("article", `poster-card poster-variation-${index + 1}`);
    const preview = makeElement("div", "poster-preview");
    const tape = makeElement("span", "tape poster-tape", "");
    const image = makeElement("img", "poster-artwork");
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createPosterSvg(poster, index))}`;
    image.alt = `Prévia do lambe: ${poster.title}`;
    image.width = 297;
    image.height = 420;
    preview.append(tape, image);

    const details = makeElement("div", "poster-details");
    const name = makeElement("div", "poster-name");
    name.append(makeElement("h3", "", poster.title));
    name.append(makeElement("p", "", `Lambe ${String(index + 1).padStart(2, "0")}`));
    const meta = makeElement("span", "poster-format", "A3 · SVG · Vetorial");
    const download = makeElement("a", "poster-download");
    download.href = URL.createObjectURL(new Blob([createPosterSvg(poster, index)], { type: "image/svg+xml" }));
    download.download = `lambe-antifa-move-${String(index + 1).padStart(2, "0")}.svg`;
    download.setAttribute("aria-label", `Baixar lambe ${String(index + 1).padStart(2, "0")}: ${poster.title}`);
    download.append(makeIcon("download"));
    details.append(name, meta, download);
    card.append(preview, details);
    return card;
}

function renderPostersPage() {
    pageContent.append(renderPageHero(
        "Material de rua",
        "Lambes",
        "Escolha um modelo, baixe em alta resolução e ocupe os muros com ideia. Formato pronto para impressão."
    ));

    const section = makeElement("section", "content-width poster-gallery");
    section.setAttribute("aria-label", "Modelos de lambe para impressão");
    const notes = makeElement("ul", "poster-notes");
    ["Todos os arquivos em A3", "Impressão colorida ou P&B", "Download livre"].forEach((note) => {
        const item = makeElement("li", "", note);
        notes.append(item);
    });
    const grid = makeElement("div", "poster-grid");
    posters.forEach((poster, index) => grid.append(createPosterCard(poster, index)));
    section.append(notes, grid);
    pageContent.append(section);
}

async function renderNewsArticle(slug) {
    const article = makeElement("article", "content-width news-article");
    article.append(makeElement("p", "empty-state", "Carregando matéria..."));
    pageContent.append(article);
    try {
        const response = await fetch(`/api/news/${encodeURIComponent(slug)}`);
        const item = await response.json();
        if (!response.ok) throw new Error(item.error || "Notícia não encontrada.");

        const content = makeElement("div", "news-article-content");
        content.append(makeElement("p", "eyebrow", item.category));
        content.append(makeElement("h1", "hand-heading", item.title));
        const date = makeElement("time", "news-date", item.date);
        date.dateTime = item.isoDate;
        content.append(date);
        if (item.author) content.append(makeElement("p", "news-author", `Por ${item.author}`));
        content.append(createPhoto(item.image, `Imagem editorial: ${item.title}`, "news-article-image"));
        content.append(makeElement("p", "news-article-summary", item.summary));
        (item.body || item.summary || "").split(/\n{2,}/).filter(Boolean).forEach((paragraph) => {
            content.append(makeElement("p", "news-article-paragraph", paragraph));
        });
        article.replaceChildren(makeArrowLink("Voltar para notícias", "/noticias", "button-link"), content);
        document.title = `${item.title} — Antifa Move`;
    } catch (error) {
        renderLoadError(article, error);
        if (error.message === "Notícia não encontrada.") article.querySelector(".empty-state").textContent = error.message;
    }
}

async function renderNewsPage() {
    const slug = window.location.pathname.replace(/^\/noticias\/?/, "").replace(/\/$/, "");
    if (slug) {
        await renderNewsArticle(slug);
        return;
    }

    pageContent.append(renderPageHero(
        "Informação para agir",
        "Notícias",
        "Notícias, análises e vozes que ajudam a ler o Brasil sem atalhos nem neutralidade de fachada."
    ));

    const section = makeElement("section", "content-width news-archive");
    section.setAttribute("aria-label", "Arquivo de notícias");
    let news;
    let categories = ["Todas"];
    let selected = "Todas";
    const grid = makeElement("div", "news-archive-grid");
    let filters;

    function updateNews() {
        const visible = (news || []).filter((item) => selected === "Todas" || item.category === selected);
        grid.replaceChildren();
        if (!visible.length) {
            grid.append(makeElement("p", "empty-state", "Nenhuma notícia encontrada nesta categoria."));
            return;
        }
        visible.forEach((item, index) => grid.append(createNewsCard(item, { featured: selected === "Todas" && index === 0 })));
    }

    filters = renderFilterButtons(categories, selected, (category) => {
        selected = category;
        updateFilterButtons(filters, selected);
        updateNews();
    }, "Filtrar notícias por categoria");
    section.append(filters, grid);
    pageContent.append(section);
    grid.append(makeElement("p", "empty-state", "Carregando notícias..."));
    try {
        news = await loadCollection("news");
        categories = ["Todas", ...new Set(news.map((item) => item.category))];
        filters.replaceWith(filters = renderFilterButtons(categories, selected, (category) => {
            selected = category;
            updateFilterButtons(filters, selected);
            updateNews();
        }, "Filtrar notícias por categoria"));
        updateNews();
    } catch (error) {
        renderLoadError(grid, error);
    }
}

function createPublishField(labelText, type, options = {}) {
    const label = makeElement("label", "publish-field");
    label.append(makeElement("span", "publish-label", labelText));

    let control;
    if (type === "textarea") {
        control = makeElement("textarea");
        control.rows = options.rows || 4;
    } else if (type === "select") {
        control = makeElement("select");
        options.values.forEach((value) => {
            const option = makeElement("option", "", value);
            option.value = value;
            control.append(option);
        });
    } else {
        control = makeElement("input");
        control.type = type;
    }

    control.name = options.name;
    control.required = Boolean(options.required);
    if (options.maxLength) control.maxLength = Number(options.maxLength);
    if (options.accept) control.accept = options.accept;
    if (options.min) control.min = options.min;
    if (options.placeholder) control.placeholder = options.placeholder;
    if (options.wide) label.classList.add("publish-field-wide");
    label.append(control);
    return label;
}

async function renderPublishPage() {
    pageContent.append(renderPageHero(
        "Espaço aberto",
        "Envie uma publicação",
        "Envie notícias e documentos sem criar uma conta. A equipe revisa cada envio antes de publicar."
    ));

    const section = makeElement("section", "content-width publish-workspace");
    section.setAttribute("aria-label", "Preparação de conteúdo");
    pageContent.append(section);
    const notice = makeElement("p", "publish-notice", "Não é necessário criar uma conta. Os envios ficam privados até a aprovação da equipe. Arquivos de até 4 MB; envie apenas materiais que você tem autorização para compartilhar.");
    notice.setAttribute("role", "status");
    const modes = makeElement("div", "publish-types");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "Ações da área de publicação");
    const submissionButton = makeElement("button", "publish-type is-active", "Enviar conteúdo");
    const moderationButton = makeElement("button", "publish-type", "Moderação");
    [submissionButton, moderationButton].forEach((button) => {
        button.type = "button";
        button.setAttribute("aria-pressed", String(button === submissionButton));
    });
    section.append(notice, modes);
    modes.append(submissionButton, moderationButton);

    function selectMode(selectedButton) {
        [submissionButton, moderationButton].forEach((button) => {
            const selected = button === selectedButton;
            button.classList.toggle("is-active", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
    }

    function showSubmissionForm(type = "news") {
        selectMode(submissionButton);
        const selector = makeElement("div", "publish-types");
        selector.setAttribute("role", "group");
        selector.setAttribute("aria-label", "Tipo de envio");
        const fields = makeElement("div", "publish-fields");
        const form = makeElement("form", "publish-form");
        const submit = makeElement("button", "publish-submit", "");
        submit.type = "submit";
        const feedback = makeElement("p", "publish-feedback", "");
        feedback.setAttribute("role", "status");
        let selectedType = type;

        function renderFields(contentType) {
            selectedType = contentType;
            fields.replaceChildren();
            fields.append(createPublishField("Título", "text", {
                name: "title",
                placeholder: "Escreva um título",
                required: true,
                maxLength: "180",
                wide: true
            }));
            if (contentType === "news") {
                fields.append(
                    createPublishField("Seu nome (opcional)", "text", { name: "author", maxLength: "100" }),
                    createPublishField("Categoria", "select", { name: "category", values: ["Trabalho", "Economia", "Direitos", "Política", "História", "Cidade"] }),
                    createPublishField("Imagem de capa", "file", { name: "image", accept: "image/jpeg,image/png,image/webp", required: true }),
                    createPublishField("Resumo", "textarea", { name: "summary", required: true, maxLength: "300", wide: true }),
                    createPublishField("Texto da notícia", "textarea", { name: "body", rows: 10, required: true, maxLength: "30000", wide: true })
                );
                submit.textContent = "Enviar notícia para revisão";
            } else {
                fields.append(
                    createPublishField("Categoria", "select", { name: "category", values: ["Trabalho", "Economia", "Direitos", "Cidade", "História"] }),
                    createPublishField("Número de páginas", "number", { name: "pages", min: "1", required: true }),
                    createPublishField("Arquivo PDF", "file", { name: "file", accept: "application/pdf,.pdf", required: true, wide: true })
                );
                submit.textContent = "Enviar documento para revisão";
            }
        }

        const contentTypes = [
            { id: "news", label: "Notícia" },
            { id: "document", label: "Documento" }
        ];
        contentTypes.forEach((contentType) => {
            const button = makeElement("button", `publish-type${contentType.id === type ? " is-active" : ""}`, contentType.label);
            button.type = "button";
            button.setAttribute("aria-pressed", String(contentType.id === type));
            button.addEventListener("click", () => {
                selector.querySelectorAll("button").forEach((item) => {
                    const selected = item === button;
                    item.classList.toggle("is-active", selected);
                    item.setAttribute("aria-pressed", String(selected));
                });
                feedback.textContent = "";
                renderFields(contentType.id);
            });
            selector.append(button);
        });

        form.append(fields, submit, feedback);
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            submit.disabled = true;
            feedback.textContent = "Enviando para revisão...";
            try {
                const data = new FormData(form);
                const file = data.get(selectedType === "news" ? "image" : "file");
                const uploadResponse = await fetch("/api/uploads", {
                    method: "POST",
                    headers: { "Content-Type": file.type || (selectedType === "document" ? "application/pdf" : "") },
                    body: file
                });
                const upload = await uploadResponse.json();
                if (!uploadResponse.ok) throw new Error(upload.error || "Falha ao enviar o arquivo.");

                const payload = selectedType === "news"
                    ? {
                        title: data.get("title"),
                        author: data.get("author"),
                        category: data.get("category"),
                        summary: data.get("summary"),
                        body: data.get("body"),
                        image: upload.url
                    }
                    : {
                        title: data.get("title"),
                        category: data.get("category"),
                        pages: Number(data.get("pages")),
                        url: upload.url
                    };
                const endpoint = selectedType === "news" ? "news" : "documents";
                const response = await fetch(`/api/submissions/${endpoint}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || "Não foi possível enviar o conteúdo.");
                form.reset();
                feedback.textContent = result.message;
            } catch (error) {
                feedback.textContent = error.message;
            } finally {
                submit.disabled = false;
            }
        });

        section.replaceChildren(notice, modes, selector, form);
        renderFields(type);
    }

    async function showModeration() {
        selectMode(moderationButton);
        const panel = makeElement("section", "moderation-panel");
        panel.setAttribute("aria-label", "Moderação dos envios recebidos");
        panel.append(makeElement("p", "empty-state", "Verificando acesso..."));
        section.replaceChildren(notice, modes, panel);

        function showLocked() {
            panel.replaceChildren();
            panel.append(makeElement("p", "publish-notice", "Área restrita. Para moderar, abra o link secreto fornecido pela equipe responsável."));
        }

        async function loadPendingSubmissions() {
            const response = await fetch("/api/moderation/pending");
            const result = await response.json();
            if (response.status === 401) {
                showLocked();
                return;
            }
            if (!response.ok) throw new Error(result.error || "Não foi possível carregar os envios.");
            panel.replaceChildren();
            const toolbar = makeElement("div", "publish-toolbar");
            toolbar.append(makeElement("p", "publish-notice", "Fila de revisão: aprove para publicar ou rejeite para remover o envio."));
            const logout = makeElement("button", "publish-logout", "Sair");
            logout.type = "button";
            logout.addEventListener("click", async () => {
                const logoutResponse = await fetch("/api/editor/logout", { method: "POST" });
                if (!logoutResponse.ok) {
                    panel.append(makeElement("p", "publish-feedback", "Não foi possível encerrar a sessão."));
                    return;
                }
                showLocked();
            });
            toolbar.append(logout);
            panel.append(toolbar);
            const entries = [
                ...result.news.map((item) => ({ ...item, kind: "news" })),
                ...result.documents.map((item) => ({ ...item, kind: "documents" }))
            ];
            if (!entries.length) {
                panel.append(makeElement("p", "empty-state", "Nenhum envio aguardando aprovação."));
                return;
            }
            entries.forEach((item) => {
                const card = makeElement("article", "moderation-card");
                card.append(makeElement("p", "eyebrow", `${item.kind === "news" ? "Notícia" : "Documento"} · ${item.category}`));
                card.append(makeElement("h2", "", item.title));
                if (item.author) card.append(makeElement("p", "", `Enviado por ${item.author}`));
                if (item.kind === "news") {
                    card.append(makeElement("p", "", item.summary));
                    card.append(makeElement("p", "moderation-body", item.body));
                }
                const fileName = item.kind === "news" ? item.image.split("/").pop() : item.url.split("/").pop();
                const fileUrl = `/api/moderation/uploads/${encodeURIComponent(fileName)}`;
                if (item.kind === "news") {
                    card.append(createPhoto(fileUrl, `Imagem enviada: ${item.title}`, "moderation-image"));
                } else {
                    const fileLink = makeArrowLink("Abrir PDF enviado", fileUrl);
                    fileLink.target = "_blank";
                    fileLink.rel = "noopener noreferrer";
                    card.append(fileLink, makeElement("p", "", `${item.pages} páginas`));
                }
                const actions = makeElement("div", "moderation-actions");
                [["approve", "Aprovar e publicar"], ["reject", "Rejeitar"]].forEach(([action, label]) => {
                    const button = makeElement("button", action === "approve" ? "publish-submit" : "publish-logout", label);
                    button.type = "button";
                    button.addEventListener("click", async () => {
                        button.disabled = true;
                        try {
                            const moderationResponse = await fetch(`/api/moderation/${item.kind}/${item.id}/${action}`, { method: "POST" });
                            const moderationResult = await moderationResponse.json();
                            if (!moderationResponse.ok) throw new Error(moderationResult.error || "Falha ao moderar.");
                            await loadPendingSubmissions();
                        } catch (error) {
                            button.disabled = false;
                            card.append(makeElement("p", "publish-feedback", error.message));
                        }
                    });
                    actions.append(button);
                });
                card.append(actions);
                panel.append(card);
            });
        }

        try {
            const sessionResponse = await fetch("/api/editor/session");
            const session = await sessionResponse.json();
            if (session.authenticated) await loadPendingSubmissions();
            else showLocked();
        } catch (error) {
            panel.replaceChildren(makeElement("p", "empty-state", error.message));
        }
    }

    submissionButton.addEventListener("click", () => showSubmissionForm());
    moderationButton.addEventListener("click", showModeration);
    if (new URLSearchParams(window.location.search).has("moderar")) showModeration();
    else showSubmissionForm();
}

renderHeader();
renderFooter();

const renderers = {
    home: renderHome,
    docs: renderDocumentsPage,
    historia: renderHistoryPage,
    lambes: renderPostersPage,
    noticias: renderNewsPage,
    publicar: renderPublishPage
};

document.title = `${pageDetails[page]?.title || "Home"} — Antifa Move`;
(renderers[page] || renderHome)();