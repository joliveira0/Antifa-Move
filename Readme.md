# Antifa Move

Opa! Esse arquivo é uma "passagem de bastão" pros devs que entrarem nessa ao longo do tempo. A ideia é mostrar o que já está pronto e o que precisamos combinar antes de ligar uma publicação real.

Última atualização: 09:10 13:00

## Resumo rápido

O projeto está um frontend estático feito com HTML, CSS e JavaScript em módulos. Não há framework, `package.json`, API, banco de dados, login ou painel de publicação configurado neste repositório.

As notícias, documentos, histórias e lambes que aparecem hoje são exemplos escritos no arquivo `js/data.js`. Eles não são enviados a lugar algum e se perdem como fonte de conteúdo assim que forem substituídos por dados reais do CMS.

## O que já está funcionando

- As cinco páginas: `/`(Home), `/docs`, `/historia`, `/lambes` e `/noticias`.
- Navegação entre páginas, link ativo e botão de menu para telas pequenas.
- Busca e filtros locais na biblioteca de documentos.
- Filtros locais na página de notícias.
- Cartazes de lambe gerados no navegador e baixados como SVG A3.
- Imagens, layout responsivo e estados de hover/foco.

Essas interações trabalham apenas com os exemplos carregados no navegador. Ainda não existe publicação, edição, exclusão ou envio de arquivos ao servidor.

## Onde encontrar cada coisa

- `index.html` e as pastas `docs/`, `historia/`, `lambes/` e `noticias/`: entradas das páginas. Cada pasta tem um `index.html` para que o servidor possa atender sua URL.
- `js/app.js`: monta cabeçalho, rodapé e conteúdo das páginas; também liga busca, filtros, menu e downloads.
- `js/data.js`: exemplos de notícias, documentos, histórias e cartazes.
- `css/style.css`: cores, fontes, layout, responsividade e estados de interação.
- `imgs/Utilizadas/`: fotografias usadas pelo site.
- `imgs/Base/`: capturas que serviram de referência visual; não são as fotos dos cards.

## Como os dados estão organizados hoje

Os campos abaixo descrevem o que o frontend consome agora. Eles são um ponto de partida para a integração, não uma exigência sobre como o banco precisa ser modelado.

### Notícias

Em `js/data.js`, cada notícia de exemplo tem:

```js
{
	id: "jornada-de-trabalho",
	category: "Trabalho",
	date: "18 jun 2025",
	isoDate: "2025-06-18",
	title: "O que muda na jornada de trabalho",
	summary: "Um resumo curto para aparecer no card.",
	image: "/imgs/Utilizadas/Img1.avif"
}
```

O card mostra categoria, data, título, resumo e foto. O campo `image` é atualmente um caminho de imagem local. Quando vier do CMS, a API pode fornecer uma URL pública, por exemplo `imageUrl`; o nome final pode ser combinado durante a integração.

O link “Ler matéria” ainda não abre uma página completa de artigo: ele aponta para a notícia dentro de `/noticias`. Se o site precisar exibir a matéria integral, será necessário criar também um campo de conteúdo, como `body`, e uma rota de detalhe, por exemplo `/noticias/slug-da-materia`.

### Lambes

Os seis cartazes atuais são montados a partir de frases e cores em `js/data.js`. O navegador gera a prévia e o SVG para download. Isso não é um formulário para publicar novos cartazes.

Para receber lambes enviados por pessoas, o frontend vai precisar da URL da prévia e da URL do arquivo final, além do título e formato. Uma ideia de registro para a API seria:

```js
{
	id: "lambe-123",
	title: "A cidade é nossa",
	previewUrl: "/uploads/lambes/a-cidade-preview.jpg",
	downloadUrl: "/uploads/lambes/a-cidade.svg",
	format: "A3",
	status: "published"
}
```

A pessoa enviará um arquivo pronto (SVG/PDF). O modelo atual só gera os seis cartazes de demonstração.

### Documentos

Os documentos também são exemplos locais. Os campos atuais são título, categoria, formato, quantidade de páginas, data e `url`. Como os PDFs ainda não existem, `url` é `null` e o botão Baixar fica desabilitado.

Quando houver arquivos, a API deve fornecer uma URL válida para download.

## Como pode funcionar o envio de notícias

O fluxo abaixo é uma sugestão para conversarmos, não algo já implementado:

1. Uma pessoa autorizada abre o CMS ou formulário de publicação.
2. Preenche título, foto de capa e texto complementar. Para uma matéria completa, também envia o conteúdo integral.
3. Escolhe a categoria. A data pode ser definida pelo sistema, com possibilidade de agendar a publicação.
4. O arquivo da foto é enviado para armazenamento de mídia. O banco guarda a URL e os metadados, não precisa guardar a imagem como texto/base64.
5. A notícia fica como rascunho ou aguardando revisão.
6. Depois da aprovação, ela aparece na Home e na página Notícias; notícias não publicadas não devem aparecer publicamente.

Para o frontend atual, os campos mínimos do card são título, foto e texto complementar. A página Notícias também usa categoria e data para montar os cards e filtrar resultados. Para uma experiência editorial completa, recomendamos incluir um identificador/slug e o texto integral da matéria.

## Como pode funcionar o envio de lambes

O CMS pode permitir que a pessoa envie o arquivo pronto e uma imagem de prévia. Depois da validação e, se necessário, da revisão, a listagem pública apresenta a prévia e oferece o arquivo para download.

Antes de implementar, precisamos decidir:

- Quais formatos serão aceitos para envio e para download (por exemplo, SVG e PDF).
- Se todos os arquivos precisam estar em A3.
- Se os envios são publicados imediatamente ou passam por revisão.

## Decisões para alinhar com o responsável pelo backend

1. Quem pode publicar: equipe editorial, usuários com conta ou qualquer pessoa? (preferência apenas pelos "adms", pessoas selecionadas com acesso a login no CMS. Mas vale o que for mais facil)
2. As notícias e os lambes passam por aprovação antes de aparecer no site?
4. Qual CMS/API será usado e quais serão os endereços das rotas?
5. Onde as imagens, PDFs e arquivos de lambe serão armazenados? Quais formatos e limites de tamanho serão aceitos?
6. Como será feita a página própria da notícia? O card de resumo pegará o primeiro parágrafo ou sera necessário colocar um texto preparado?
7. Quais categorias estarão disponíveis e quem poderá alterá-las?

## Cuidados importantes na integração

- Validar permissões, tamanho e tipo dos arquivos no servidor; validação apenas no navegador não protege o sistema.
- Não publicar diretamente conteúdo enviado por qualquer pessoa sem antes decidir como será a moderação.
- Tratar textos vindos do CMS como conteúdo, nunca como HTML confiável. No frontend, preferir `textContent` para texto simples.
- Incluir estados de carregamento, lista vazia e erro quando os dados vierem da API.
- Manter a busca e os filtros ligados aos dados recebidos do CMS, sem duplicar notícias em HTML fixo.
- Para downloads, mostrar uma ação apenas quando houver um arquivo real disponível.


## Próximo passo sugerido

Antes de conectar o CMS, alinhar as decisões da seção acima, principalmente quem pode enviar conteúdo e se haverá moderação. Com isso definido, o backend pode compartilhar os formatos de resposta e rotas; então o frontend troca os exemplos de `js/data.js` por chamadas à API e liga os formulários ao fluxo de publicação.

## Importante!

Quaisquer alterações de layout devem ser conversadas antes de se tornarem alterações finais, porém há bastante flexibilidade principalmente para questões de backend
