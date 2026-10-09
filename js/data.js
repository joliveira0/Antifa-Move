/** @typedef {{ id: string, category: string, date: string, isoDate: string, title: string, summary: string, image: string }} NewsItem */

/** Conteúdo editorial de demonstração. URLs podem ser conectadas ao CMS depois. */
export const news = [
    {
        id: "jornada-de-trabalho",
        category: "Trabalho",
        date: "18 jun 2025",
        isoDate: "2025-06-18",
        title: "O que muda na jornada de trabalho e por que isso importa",
        summary: "Entenda as propostas em debate e os efeitos reais na vida de quem trabalha.",
        image: "/imgs/Utilizadas/Img1.avif"
    },
    {
        id: "custo-de-vida",
        category: "Economia",
        date: "12 jun 2025",
        isoDate: "2025-06-12",
        title: "A conta não fecha: quem paga pelo aumento do custo de vida?",
        summary: "Uma leitura direta sobre preços, renda e as escolhas econômicas do país.",
        image: "/imgs/Utilizadas/img2.avif"
    },
    {
        id: "organizacao-popular",
        category: "Direitos",
        date: "04 jun 2025",
        isoDate: "2025-06-04",
        title: "Organização popular transforma território em resistência",
        summary: "Iniciativas locais mostram que ação coletiva também constrói futuros.",
        image: "/imgs/Utilizadas/img3.avif"
    },
    {
        id: "orcamento-nacional",
        category: "Economia",
        date: "29 mai 2025",
        isoDate: "2025-05-29",
        title: "Quem decide as prioridades do orçamento nacional?",
        summary: "Os caminhos do dinheiro público, da arrecadação ao gasto.",
        image: "/imgs/Utilizadas/img4.avif"
    },
    {
        id: "memoria-ferramenta",
        category: "História",
        date: "22 mai 2025",
        isoDate: "2025-05-22",
        title: "Memória não é passado: é ferramenta de transformação",
        summary: "Por que preservar arquivos também é uma forma de luta.",
        image: "/imgs/Utilizadas/Img1.avif"
    },
    {
        id: "historias-das-ruas",
        category: "Cidade",
        date: "14 mai 2025",
        isoDate: "2025-05-14",
        title: "As ruas contam histórias que os mapas não mostram",
        summary: "Território, pertencimento e as disputas pelo espaço urbano.",
        image: "/imgs/Utilizadas/img3.avif"
    },
    {
        id: "diretas-ja",
        category: "Política",
        date: "08 mai 2025",
        isoDate: "2025-05-08",
        title: "Diretas Já: quando as ruas tomaram a palavra",
        summary: "A campanha que reuniu milhões e mudou o horizonte político brasileiro.",
        image: "/imgs/Utilizadas/img4.avif"
    },
    {
        id: "trabalho-coletivo",
        category: "Trabalho",
        date: "30 abr 2025",
        isoDate: "2025-04-30",
        title: "Trabalho coletivo também constrói cidade",
        summary: "Histórias de quem organiza o cotidiano e reivindica novos direitos.",
        image: "/imgs/Utilizadas/img2.avif"
    }
];

export const documents = [
    { title: "Cartilha de direitos trabalhistas", category: "Trabalho", format: "PDF", pages: 42, date: "Jun 2025", url: null },
    { title: "Guia popular do orçamento público", category: "Economia", format: "PDF", pages: 28, date: "Mai 2025", url: null },
    { title: "Constituição Federal comentada", category: "Direitos", format: "PDF", pages: 96, date: "Abr 2025", url: null },
    { title: "Dossiê: moradia é um direito", category: "Cidade", format: "PDF", pages: 34, date: "Mar 2025", url: null },
    { title: "Manual de organização comunitária", category: "Trabalho", format: "PDF", pages: 51, date: "Fev 2025", url: null },
    { title: "Atlas da desigualdade brasileira", category: "Economia", format: "PDF", pages: 74, date: "Jan 2025", url: null },
    { title: "Guia de combate à desinformação", category: "Direitos", format: "PDF", pages: 22, date: "Dez 2024", url: null },
    { title: "Memória dos movimentos populares", category: "Direitos", format: "PDF", pages: 63, date: "Nov 2024", url: null }
];

export const histories = [
    {
        id: "constituicao-cidada",
        year: "1988",
        category: "Economia",
        title: "A Constituição Cidadã e a disputa pelos direitos sociais",
        summary: "Como a mobilização popular escreveu direitos fundamentais na lei maior do país.",
        image: "/imgs/Utilizadas/Img1.avif"
    },
    {
        id: "clt-conquista-controle",
        year: "1943",
        category: "Trabalho",
        title: "CLT: conquista, controle e as contradições do trabalho",
        summary: "Um olhar além das versões simplificadas sobre a formação dos direitos trabalhistas.",
        image: "/imgs/Utilizadas/img2.avif"
    },
    {
        id: "diretas-ja-historia",
        year: "1984",
        category: "Democracia",
        title: "Diretas Já: quando as ruas tomaram a palavra",
        summary: "A campanha que reuniu milhões e mudou o horizonte político brasileiro.",
        image: "/imgs/Utilizadas/img3.avif"
    },
    {
        id: "greve-geral-1917",
        year: "1917",
        category: "Cidade",
        title: "A greve geral que parou São Paulo",
        summary: "Trabalhadores, bairros operários e as raízes da organização sindical no Brasil.",
        image: "/imgs/Utilizadas/img4.avif"
    }
];

export const posters = [
    { title: "A cidade é nossa", lines: ["A CIDADE", "É NOSSA"], background: "#b90512", foreground: "#f2df75", border: "#f2df75", rotation: -1.5 },
    { title: "Trabalho não é favor", lines: ["TRABALHO", "NÃO É", "FAVOR"], background: "#181818", foreground: "#f6f3ec", border: "#b7b3a9", rotation: 1 },
    { title: "Sem memória não há futuro", lines: ["SEM", "MEMÓRIA", "NÃO HÁ", "FUTURO"], background: "#eee8dc", foreground: "#b90512", border: "#b90512", rotation: -1 },
    { title: "Direito não se negocia", lines: ["DIREITO", "NÃO SE", "NEGOCIA"], background: "#f2df75", foreground: "#181818", border: "#5c5752", rotation: 1.2 },
    { title: "Organizar é resistir", lines: ["ORGANIZAR", "É RESISTIR"], background: "#b90512", foreground: "#ffffff", border: "#f2df75", rotation: -0.6 },
    { title: "O povo faz história", lines: ["O POVO", "FAZ", "HISTÓRIA"], background: "#181818", foreground: "#b90512", border: "#b90512", rotation: 1.5 }
];