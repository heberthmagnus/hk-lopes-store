# HK Lopes Store — plano administrativo V2

Atualização: 01/11/2026. Fase 0. Nenhuma reconstrução autorizada nesta entrega.

## Escopo e evidências

Referência analisada: arquivo fornecido `hk_lopes_admin_vision_360.html`, em Downloads/HK Lopes Store. O caminho solicitado `docs/references/hk-lopes-admin-v2.html` ainda não está versionado; antes da Fase 1, incorporar uma cópia fiel e registrar seu hash. O HTML é referência de experiência, não fonte de regras nem de dados.

A árvore contém **13 páginas administrativas**: 1 + 3 + 4 + 3 + 2. Correção da contagem registrada inicialmente. Todas estão contempladas abaixo. Visualizar Loja não conta como página administrativa.

Inspeção baseada no código local, schema SQL e HTML. O schema remoto, índices efetivos, volumes, triggers, grants e políticas RLS não foram consultados; não afirmar que o SQL local representa o banco implantado. Essa verificação é dependência obrigatória antes de migrations ou operações novas. Não houve acesso a dados pessoais, alteração de banco nem deploy.

Fontes: `src/components/admin-dashboard.tsx`, `admin-navigation.tsx`, `admin-report-charts.tsx`, `src/lib/store-data.ts`, `supabase.ts`, `auth.ts`, `src/types/store.ts`, `src/app/api`, `middleware.ts`, `supabase/schema.sql`.

## Inventário, comparação e aceite por página

| Página | Hoje | Referência e entrega futura | Aceite específico |
|---|---|---|---|
| Dashboard Executivo | `/admin?secao=dashboard`; relatório extenso, filtros 7/30/90 dias e personalizado | Cabeçalho executivo, KPIs, evolução, radar operacional, mix, ranking e ações | Valores conciliados com vendas; período anterior equivalente; pedidos indisponíveis até integração, nunca zero fictício |
| Vendas | `?secao=sales`; formulário multi-item, desconto, taxa, parcelamento, baixa de estoque | Indicadores e gráficos acima do histórico filtrável; detalhes em drawer | Cadastro preservado; filtros combinados; uma venda/baixa por evento; canal desconhecido explicitado |
| Pedidos | Ausente | Tabela/Kanban, contadores, detalhe e timeline | Estados/transições aprovados; pedido pendente não gera receita; conclusão idempotente |
| Clientes | `?secao=customers`; criar/editar nome, telefone, aniversário, origem, observações | CRM pesquisável, ficha e histórico comercial | Identificação por ID, acesso restrito, histórico correto; sem rótulos VIP/retido inventados |
| Produtos | `?secao=products`; criar/editar, ativar, categorias, URL de imagem e variações | Cards/tabela e edição lateral | Preservar preços, estoque e variações históricas; alternância não perde filtros/formulário |
| Categorias | Leitura para select; sem CRUD | Cards com contagem e associação | CRUD validado; categoria usada não removida sem política; preservar grupos da vitrine |
| Estoque | Saldo por variação; edição no produto | Radar de reposição, saldos e ações | Limites configurados; unidades distintas; sob demanda separado de saldo pronto; sem baixa automática de filamento |
| Movimentações | Ausente; alterações diretas no saldo | Tabela por tipo, motivo, responsável, período e detalhe | Evento auditável e transacional; saldo anterior/posterior; sem duplicação |
| Resultados | Parte do dashboard | Demonstrativo, curva e mix | Receita, CMV, bruto e taxas conciliados; líquido indisponível sem despesas completas |
| Custos e Margens | Custo simples por produto | Simulador 3D + composição + comparação por produto | Parâmetros editáveis; margem diferente de markup; simulação não altera preço/saldo |
| Relatórios | Parte do dashboard; sem exportação | Catálogo de análises e resultados filtráveis | CSV corresponde aos mesmos filtros e cálculos; proteção de fórmulas CSV e autorização |
| Usuários e Permissões | Login/logout, sem gestão nem papéis | Lista real e matriz aprovada | Supabase Auth; autorização no servidor; impedir autoelevação; nenhuma senha personalizada |
| Configurações | Variáveis de ambiente e constantes públicas | Blocos identidade, atendimento, operação e preferências | Global separado de individual; validação e auditoria quando disponível; nenhum segredo exposto |

## Rotas e arquitetura existentes

Uma única página server `/admin` valida usuário e carrega `getAdminStorePayload`; um componente client grande contém as quatro telas. A sidebar navega por `Link` e query `secao`, mantendo refresh/back/forward. Preservar logo, controle superior, drawer e Visualizar Loja no topo. `/login` usa Supabase Auth; `/` e `/teste-template` são públicos.

APIs: GET `/api/products` catálogo; GET/POST/PATCH `/api/admin/store` lista/salva/ativa; POST `/api/admin/sales` registra; POST `/api/admin/customers` salva; POST `/api/auth/login` e `/logout`. POST públicos `/api/products` e `/api/sales` devolvem 405.

Proposta incremental: layout server autenticado e páginas `/admin/vendas`, `/pedidos`, `/clientes`, `/produtos`, `/categorias`, `/estoque`, `/movimentacoes`, `/resultados`, `/custos`, `/relatorios`, `/usuarios`, `/configuracoes`; `/admin` executivo. Manter compatibilidade com URLs `?secao=` durante migração. Extrair cada processo antes de substituir sua tela; sidebar continua sendo a implementação existente.

## Dados e integridade

SQL local: products → product_variants; customers → sales; sales → sale_items; sale_items referencia produto e variante. Custo unitário é snapshot, preço unitário também. Exclusão de variantes referenciadas é RESTRICT no SQL local. O código de editar produto apaga/recria variantes: risco de falha após atualizar parcialmente o produto e de incompatibilidade histórica.

O código espera categories/subcategories, category_id/subcategory_id/is_featured ausentes no schema versionado. Customer.created_at existe no SQL, mas não chega ao payload para medir novos clientes. Customer_id existe na venda, mas o histórico client omite esse ID e agrega clientes pelo nome: homônimos podem se misturar. Categoria histórica não é snapshot; alterações atuais podem reclassificar vendas antigas.

Venda atual: subtotal = quantidade × (preço base + adicional da variante); total = subtotal − desconto; total_profit = total − custo snapshot − taxa. Parcelamento é informativo, não contas a receber ou confirmação de pagamento. Não há status, canal da venda, cancelamento ou devolução no modelo inspecionado. Origem do cliente não equivale ao canal de cada venda.

Registro de venda cria cliente/venda, depois itens e baixas via chamadas REST separadas. Falhas parciais e concorrência podem desalinhar estoque. Antes de novos pedidos/movimentos, projetar operação transacional com trava/atualização condicionada e chave de idempotência. Não reconstruir histórico de movimentos fictício a partir de saldos atuais.

Entidades candidatas, somente após introspecção remota: pedidos/itens/eventos; movimentos de estoque com origem única; materiais/unidades/produção; parâmetros de custo versionados; configurações globais e preferências; perfis/permissões/auditoria. Despesas e recebíveis exigem definição de escopo. Migrations aditivas, backfill validado, rollout e reversão documentados; nenhuma exclusão destrutiva.

## Segurança e performance

Cookies HTTP-only, sameSite lax e secure em produção; servidor verifica usuário nas rotas administrativas. Middleware só verifica presença de cookie; validação final server deve permanecer. Refresh token é armazenado, mas renovação não está implementada. Não há papéis no código.

`supabaseRequest` envia anon key como Bearer inclusive em gravações. Não propaga sessão autenticada. RLS/grants reais precisam ser auditados: endpoints autenticados não provam proteção direta do REST. Não corrigir isso trocando indiscriminadamente por service role. Remover logs de bodies pessoais e evitar erros internos enviados ao cliente na fase correspondente.

Hoje todo histórico é carregado, filtros e agregações duplicados no cliente/servidor. Planejar paginação server, DTOs mínimos e agregações por intervalo; avaliar limite REST e IN com muitos IDs. Índices por datas/FKs/filtros só após inspeção e planos de execução. Não transportar base inteira para novos indicadores.

## Leitura detalhada do protótipo

Superfícies claras (#f3f6f9/#fff), navegação navy, bordas #e4eaf0, raio 18px, sombra discreta; fonte Inter com fallback system; hierarquia de título, subtítulo e eyebrow. Grid de KPIs em quatro colunas; painéis assimétricos 1.7:1, grids de duas/três colunas. Breakpoints 1250/970/650. Tabelas densas com scroll interno, toolbar e badges; drawer direito de até 510px e modal central. Adoptar composição e contraste; escopar CSS para não atingir catálogo público.

Dashboard combina receita/radar e mix/ranking/funil. Vendas combina receita e canal antes da tabela. Pedidos alterna tabela e quadro; clientes combina segmentação e oportunidade; produtos alterna cards/tabela. Categorias usa cards; estoque usa mapa de risco; movimentos usa tabela auditável; resultados usa demonstrativo; custos usa formulário/calculadora; relatórios usa catálogo; usuários usa matriz; configurações usa blocos de formulário.

Comportamentos reais do protótipo: busca textual local, filtro rápido, drawer de detalhe/cadastro simulado, comando Ctrl/Cmd+K por páginas, navegação hash, menu persistido em localStorage, fechamento por overlay/Escape para modal/drawer. Salvar apenas dispara toast; filtros avançados são placeholder; tema apenas toast; exportação sempre usa vendas demonstrativas, independentemente da tela. Kanban é consulta sem transição persistida. Não copiar esses limites para produção.

Charts têm séries fixas, donut CSS com percentuais fixos e barras ilustrativas. Calculadora fixa tarifa de energia e máquina/hora implicitamente; precisa parâmetros editáveis, unidades explícitas e custos ausentes. Perfis Root/Comercial/Estoque são proposta, não autorização aprovada. Estoque mínimo, canal, e-mail/segmento de cliente e estados de pedido do protótipo não existem no modelo inspecionado.

## Componentes e cálculo compartilhados

Criar tokens escopados, PageHeader/Breadcrumb, MetricCard, Panel, Toolbar, SearchField, PeriodFilter, StatusBadge, DataTable paginada, Tabs, Empty/Error/Skeleton, Toast, ConfirmationDialog, FormField, Drawer e Modal com foco preso, retorno de foco e Escape. Gráficos SVG reutilizáveis com escala comum, negativos, zero, datas contínuas, tooltip/alternativa tabular e movimento reduzido. Sem biblioteca externa prevista.

Centralizar analytics no servidor e funções puras testáveis. Remover truncamento silencioso de tendências aos últimos 12 pontos e ausência de dias sem venda. Não usar curvas que alterem valores observados nem esconder produtos com lucro negativo. Manter formatação pt-BR e moeda BRL.

## Contrato de indicadores

Aplicável a todas as telas: período por America/Sao_Paulo, limites UTC derivados; filtros de cliente por ID, produto e categoria explícita. Vendas legadas representam registros de venda, não prova de pagamento conciliado. Nenhuma conversa WhatsApp gera venda. Pedido não é receita. Cancelamentos/devoluções não são suportados hoje: após modelo aprovado, excluir não realizados e registrar estornos uma única vez com política de data definida.

| Indicador/finalidade | Fórmula/fonte | Regras |
|---|---|---|
| Receita / desempenho | Σ sales.total_amount | Já descontada; não descontar duas vezes |
| Vendas / volume | count vendas elegíveis | Sem contar itens ou pedidos |
| Ticket / valor médio | receita / vendas | Sem vendas: indisponível |
| CMV / custo direto | Σ quantity × cost_price_snapshot | sale_items; não custo atual |
| Lucro bruto estimado | receita − CMV | Antes de taxas e despesas |
| Margem bruta | bruto / receita × 100 | Receita zero: indisponível; perdas preservadas |
| Resultado após taxas | bruto − taxas registradas | Não chamar lucro líquido; reconciliar total_profit |
| Descontos | subtotal − total | Dados legados; investigar discrepâncias, não mascarar |
| Produto/categoria | ratear desconto/taxa pelo subtotal do item | Tratamento de subtotal zero; categoria histórica pendente |
| Recorrência | clientes com >1 venda / clientes compradores | Por ID e período; não denominar retenção |
| Estoque valorizado | saldo × custo atual | Estimativa; separar materiais e produtos/unidades |
| Evolução | (atual − anterior) / anterior | Mesmo tamanho de período; base zero/ausente: sem percentual |
| Markup | (preço − custo) / custo | Custo zero: indisponível; diferente de margem |

Pedidos/status, novos clientes, canal, despesas e movimentos só aparecem com fontes disponíveis. Ausência de fonte é indisponibilidade, não zero. Simulação 3D: material = gramas/1000 × preço/kg; energia = kW × horas × tarifa; máquina = horas × custo/h; somar auxiliares, embalagem e perdas conforme definição aprovada; taxa sobre preço conforme canal. Margem-alvo e preço requerem denominador válido. Referências editáveis: PLA 94,90; Silk 116,00; energia 0,85858; máquina 1,00; cartão 4,98%. Nunca gravar preço automaticamente.

## Plano por fase e dependências

0. Diagnóstico documental presente; registrar lacunas remotas e decisões. Encerrar e aguardar autorização.
1. Versionar referência; tokens/componentes isolados e página de validação com dados de teste fora de produção. Preservar sidebar; testar teclado, foco, drawer, mobile e catálogo. Não mudar regras.
2. Extrair analytics server, definir DTOs e períodos, reconstruir dashboard com fontes existentes. Pedidos/alertas sem fonte ficam indisponíveis. Aceite: comparação manual e testes de fórmulas/limites de datas.
3. Primeiro extrair vendas e preservar operação; paginação/filtros/detalhes. Introspecção e revisão transacional antes de novas gravações. Clientes por ID. Pedidos após definição formal dos estados, pagamento, cancelamento, reserva e conversão única. Aceite: cadastro ponta a ponta e falhas concorrentes em ambiente de teste.
4. Produtos cards/tabela/drawer sem recriar variantes referenciadas; categorias; estoque/material/unidades; movimentos auditáveis. Dependências: migrations revisadas e regras de reposição/produção. Aceite: conciliação saldo/eventos, isolamento público/admin e ausência de baixa duplicada.
5. Resultados com analytics comum, simulador editável e catálogo de relatórios/CSV. Persistência de parâmetros precisa contrato global/permissões antes da tela Configurações. PDF inicialmente via impressão só se layout e controle de acesso forem validados. Aceite: exportação igual à tela, arredondamento monetário e simulação sem efeitos.
6. Usuários com APIs server autorizadas e matriz aprovada; configurações globais/individuais. Dependências de segurança são antecipadas quando necessárias nas fases anteriores, sem antecipar UI. Aceite: negação por operação, proteção contra escalonamento e ausência de segredos no browser.
7. Regressão integral, visual em 360/768/1440px, acessibilidade, indicadores, segurança, performance e documentação; build e testes. Deploy somente após autorização explícita.

Cada fase terá alteração isolada, registro de evidências no progresso e revisão antes de avançar. Substituir telas por módulo, com caminho de retorno ao componente anterior; migrations compatíveis durante transição. Aceite global: nenhuma funcionalidade perdida; sem dados demonstrativos; operações reais e verificadas; sem rolagem horizontal da página; tabelas/quadro com scroll localizado; loading/erro/empty consistentes.

## Riscos, decisões e validações pendentes

Prioridade alta: RLS real desconhecida; operações REST não atômicas; exclusão de variantes; ausência de identidade estável nos relatórios. Mitigar antes de expandir gravações. Prioridade média: CSS global conflita com protótipo; cliente recebe histórico inteiro; gráficos cortam série/negativos; margem atual chamada líquida indevidamente; edição de categoria pode mudar histórico.

Decisões necessárias: contagem 14 aceita; momento de reconhecimento de venda; estados e transições de pedidos; política de estorno/devolução/reserva; estoque mínimo e unidades; produção sob demanda e consumo/perdas; categoria histórica; papéis/permissões; despesas e recebíveis; persistência e auditoria de parâmetros. Não usar valores do protótipo como resposta.

Validação executada nesta fase: leitura de código/SQL/HTML e inventário estático. Sem teste de navegador ou inspeção visual renderizada; sem testes de banco remoto. Antes de migrations obter introspecção read-only de information_schema, pg_policies, grants, triggers, funções, índices e constraints com acesso autorizado. Usar ambiente de teste e dados sintéticos claramente isolados para falhas, concorrência, autorização e idempotência. Não testar vendas escrevendo em produção.
