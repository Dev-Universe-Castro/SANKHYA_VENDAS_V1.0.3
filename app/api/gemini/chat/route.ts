import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { cookies } from 'next/headers';
import { getCacheService } from '@/lib/redis-cache-wrapper';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Função helper para fetch com timeout
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    console.error(`⚠️ Timeout/erro ao buscar ${url}:`, error);
    throw error;
  }
}

// Função para buscar dados do sistema com filtro de data
async function analisarDadosDoSistema(userId: number, userName: string, isAdmin: boolean = false, idEmpresa: number, filtroFrontend?: { dataInicio: string, dataFim: string }) {
  try {
    // Usar filtro do frontend se disponível, senão usar padrão: últimos 90 dias
    let filtro;
    if (filtroFrontend && filtroFrontend.dataInicio && filtroFrontend.dataFim) {
      filtro = filtroFrontend;
    } else {
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 90);
      filtro = {
        dataInicio: dataInicio.toISOString().split('T')[0],
        dataFim: dataFim.toISOString().split('T')[0]
      };
    }

    console.log('📅 Filtro de análise:', filtro);

    // Log detalhado do usuário
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 INFORMAÇÕES DO USUÁRIO:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Nome: ${userName}`); // Substituído currentUser.name por userName
    console.log(`   User ID: ${userId}`);
    console.log(`   Empresa ID: ${idEmpresa}`);
    console.log(`   É Administrador: ${isAdmin ? 'SIM' : 'NÃO'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');


    // Importar serviço de análise dinamicamente
    const { buscarDadosAnalise } = await import('@/lib/analise-service');

    // Buscar TODOS os dados direto do Oracle
    const dadosCompletos = await buscarDadosAnalise(filtro, userId, isAdmin, idEmpresa);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 DADOS CARREGADOS DA EMPRESA:', idEmpresa);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Leads: ${dadosCompletos.leads.length}`);
    console.log(`   Atividades: ${dadosCompletos.atividades.length}`);
    console.log(`   Pedidos: ${dadosCompletos.pedidos.length}`);
    console.log(`   Produtos: ${dadosCompletos.produtos.length}`);
    console.log(`   Clientes: ${dadosCompletos.clientes.length}`);
    console.log(`   Financeiro: ${dadosCompletos.financeiro.length}`);
    console.log(`   Funis: ${dadosCompletos.funis.length}`);
    console.log(`   Estágios: ${dadosCompletos.estagiosFunis.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');


    // Calcular métricas
    const valorTotalPedidos = dadosCompletos.pedidos.reduce((sum, p) => sum + (parseFloat(p.VLRNOTA) || 0), 0);
    const valorTotalFinanceiro = dadosCompletos.financeiro.reduce((sum, f) => sum + (parseFloat(f.VLRDESDOB) || 0), 0);
    const valorRecebido = dadosCompletos.financeiro.reduce((sum, f) => sum + (parseFloat(f.VLRBAIXA) || 0), 0);

    // Calcular maiores clientes
    const pedidosPorCliente = dadosCompletos.pedidos.reduce((acc: any, p: any) => {
      const nomeCliente = p.NOMEPARC || p.Parceiro_NOMEPARC || 'Cliente Desconhecido';
      const codParc = p.CODPARC || 'SEM_CODIGO';
      const key = `${codParc}|${nomeCliente}`;

      if (!acc[key]) {
        acc[key] = {
          codigo: codParc,
          nome: nomeCliente,
          total: 0,
          qtdPedidos: 0,
          pedidos: []
        };
      }
      const valor = parseFloat(p.VLRNOTA) || 0;
      acc[key].total += valor;
      acc[key].qtdPedidos += 1;
      acc[key].pedidos.push({
        nunota: p.NUNOTA,
        valor: valor,
        data: p.DTNEG
      });
      return acc;
    }, {});

    const maioresClientes = Object.values(pedidosPorCliente)
      .sort((a: any, b: any) => b.total - a.total)
      .map((c: any) => ({
        codigo: c.codparc,
        nome: c.nome,
        totalPedidos: c.qtdPedidos,
        valorTotal: c.total,
        ticketMedio: c.total / c.qtdPedidos,
        pedidos: c.pedidos
      }));

    return {
      leads: dadosCompletos.leads,
      produtosLeads: dadosCompletos.produtosLeads,
      atividades: dadosCompletos.atividades,
      pedidos: dadosCompletos.pedidos,
      produtos: dadosCompletos.produtos,
      clientes: dadosCompletos.clientes,
      financeiro: dadosCompletos.financeiro,
      funis: dadosCompletos.funis,
      estagiosFunis: dadosCompletos.estagiosFunis,
      userName,
      filtro,
      // Métricas calculadas
      totalLeads: dadosCompletos.leads.length,
      totalAtividades: dadosCompletos.atividades.length,
      totalPedidos: dadosCompletos.pedidos.length,
      totalProdutos: dadosCompletos.produtos.length,
      totalClientes: dadosCompletos.clientes.length,
      totalFinanceiro: dadosCompletos.financeiro.length,
      valorTotalPedidos,
      valorTotalFinanceiro,
      valorRecebido,
      valorPendente: valorTotalFinanceiro - valorRecebido,
      maioresClientes // Adicionado aqui
    };
  } catch (error) {
    console.error('❌ Erro ao analisar dados do sistema:', error);
    return {
      leads: [],
      produtosLeads: [],
      atividades: [],
      pedidos: [],
      produtos: [],
      clientes: [],
      financeiro: [],
      funis: [],
      estagiosFunis: [],
      userName,
      filtro: { dataInicio: '', dataFim: '' },
      totalLeads: 0,
      totalAtividades: 0,
      totalPedidos: 0,
      totalProdutos: 0,
      totalClientes: 0,
      totalFinanceiro: 0,
      valorTotalPedidos: 0,
      valorTotalFinanceiro: 0,
      valorRecebido: 0,
      valorPendente: 0,
      maioresClientes: [] // Inicializado como array vazio
    };
  }
}

const SYSTEM_PROMPT = `Você é um Assistente de Vendas Inteligente da Sankhya.

🗂️ ESTRUTURA DO BANCO DE DADOS:

TABELAS E RELACIONAMENTOS:

AD_LEADS: CODLEAD(PK), NOME, VALOR, CODPARC→AS_PARCEIROS, CODFUNIL→AD_FUNIS, CODESTAGIO→AD_FUNISESTAGIOS, STATUS_LEAD
AD_ADLEADSATIVIDADES: CODATIVIDADE(PK), CODLEAD→AD_LEADS, TIPO, TITULO, STATUS, DATA_INICIO
AD_ADLEADSPRODUTOS: CODLEAD→AD_LEADS, CODPROD→AS_PRODUTOS, QUANTIDADE, VLRTOTAL
AD_FUNIS: CODFUNIL(PK), NOME
AD_FUNISESTAGIOS: CODESTAGIO(PK), CODFUNIL→AD_FUNIS, NOME, ORDEM
AS_CABECALHO_NOTA: NUNOTA(PK), CODPARC→AS_PARCEIROS, CODVEND, VLRNOTA, DTNEG
AS_PARCEIROS: CODPARC(PK), NOMEPARC
AS_PRODUTOS: CODPROD(PK), DESCRPROD
AS_FINANCEIRO: NUFIN(PK), CODPARC→AS_PARCEIROS, VLRDESDOB, VLRBAIXA, DTVENC
AS_VENDEDORES: CODVEND(PK), APELIDO
AS_ESTOQUES: CODPROD→AS_PRODUTOS, ESTOQUE

VOCÊ RECEBERÁ OS DADOS EM JSON. Analise e responda com base neles.

SEU PAPEL:
- Ajudar vendedores a gerenciar leads e atividades
- Sugerir próximas ações baseadas no histórico
- Analisar o pipeline de vendas focando em valores e oportunidades
- Fornecer insights complexos cruzando múltiplas tabelas
- Identificar padrões e tendências através de relacionamentos entre dados

🔗 RELACIONAMENTOS-CHAVE PARA ANÁLISES:

1️⃣ JORNADA DO CLIENTE (Lead → Pedido):
   AD_LEADS.CODPARC → AS_PARCEIROS → AS_CABECALHO_NOTA.CODPARC
   Permite rastrear desde o primeiro contato até pedidos fechados

2️⃣ ANÁLISE DE PRODUTOS:
   AD_ADLEADSPRODUTOS.CODPROD → AS_PRODUTOS ← AS_ESTOQUES
   Liga produtos de interesse em leads ao estoque disponível

3️⃣ SAÚDE FINANCEIRA POR CLIENTE:
   AS_PARCEIROS.CODPARC → AS_FINANCEIRO (títulos a receber/pagar)
   AS_PARCEIROS.CODPARC → AS_CABECALHO_NOTA (pedidos)
   Analisa inadimplência vs. volume de compras

4️⃣ PIPELINE COMPLETO:
   AD_FUNIS → AD_FUNISESTAGIOS → AD_LEADS → AD_ADLEADSATIVIDADES
   Rastreia o fluxo completo do funil de vendas

5️⃣ HIERARQUIA DE VENDAS:
   AS_VENDEDORES (gerente) ← CODGER ← AS_VENDEDORES (vendedor)
   Analisa performance por equipe

6️⃣ PREÇOS E EXCEÇÕES:
   AS_PRODUTOS → AS_TABELA_PRECOS (preços padrão)
   AS_PRODUTOS + AS_PARCEIROS → AS_EXCECAO_PRECO (preços especiais)

HIERARQUIA PRINCIPAL:
Funil → Estágios → Leads → Atividades/Produtos → Cliente → Pedidos → Financeiro

VOCÊ TEM ACESSO A:
- Leads e seus estágios dentro dos funis (AD_LEADS)
- Atividades registradas com status (AD_ADLEADSATIVIDADES)
- Produtos vinculados aos leads (AD_ADLEADSPRODUTOS)
- Base completa de produtos (AS_PRODUTOS)
- Clientes/Parceiros (AS_PARCEIROS)
- Pedidos de venda (AS_CABECALHO_NOTA)
- Títulos financeiros (AS_FINANCEIRO)
- Vendedores e gerentes (AS_VENDEDORES)
- Estoques (AS_ESTOQUES)
- Tabelas de preços (AS_TABELA_PRECOS)
- Exceções de preço (AS_EXCECAO_PRECO)
- Tipos de operação (AS_TIPOS_OPERACAO)
- Tipos de negociação (AS_TIPOS_NEGOCIACAO)

🔓 LIBERDADE PARA ANÁLISES:
Você tem TOTAL LIBERDADE para:
- Cruzar dados entre QUALQUER tabela usando os relacionamentos
- Identificar padrões analisando múltiplas dimensões
- Calcular métricas complexas (conversão, inadimplência, performance)
- Rastrear a jornada completa: Lead → Cliente → Pedido → Financeiro
- Comparar leads com produtos vs. estoque disponível
- Analisar performance de vendedores através de leads E pedidos
- Identificar clientes que são leads ativos E têm pedidos/títulos
`;



// Cache de dados por sessão
const sessionDataCache = new Map<string, { data: any; filtro: string }>();

export async function POST(request: NextRequest) {
  try {
    const { message, history, filtro, sessionId } = await request.json();

    // Obter usuário autenticado
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');
    let userId = 0;
    let userName = 'Usuário';
    let isAdmin = false;
    let idEmpresa = 0;
    let currentUser: any = {}; // Variável para armazenar os dados do usuário

    if (userCookie) {
      try {
        currentUser = JSON.parse(userCookie.value); // Armazena os dados do usuário
        userId = currentUser.id;
        userName = currentUser.name || 'Usuário';
        isAdmin = currentUser.role === 'admin' || currentUser.role === 'Administrador';
        idEmpresa = currentUser.ID_EMPRESA || currentUser.id_empresa || 0;
      } catch (e) {
        console.error('Erro ao parsear cookie:', e);
      }
    }

    if (!idEmpresa) {
      return new Response(JSON.stringify({ error: 'Empresa não identificada' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
      }
    });

    // Montar histórico com prompt de sistema
    const chatHistory = [
      {
        role: 'user',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      {
        role: 'model',
        parts: [{ text: 'Entendido! Estou pronto para analisar seus dados.' }],
      },
      ...history.map((msg: any) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }))
    ];

    // Verificar se precisa carregar dados
    let messageWithContext = message;
    const filtroKey = JSON.stringify(filtro);
    const cacheKey = `${sessionId}-${idEmpresa}`;
    const cached = sessionDataCache.get(cacheKey);

    const needsReload = !cached || cached.filtro !== filtroKey;

    if (history.length === 0 || needsReload) {
      console.log(needsReload ? '🔄 Filtro alterado - Recarregando dados...' : '🔍 Primeiro prompt - Carregando dados...');

      const dadosSistema = await analisarDadosDoSistema(userId, userName, isAdmin, idEmpresa, filtro);

      // Preparar dados em JSON compacto
      const contextData = {
        periodo: { inicio: dadosSistema.filtro.dataInicio, fim: dadosSistema.filtro.dataFim },
        resumo: {
          leads: dadosSistema.totalLeads,
          atividades: dadosSistema.totalAtividades,
          pedidos: dadosSistema.totalPedidos,
          valorPedidos: dadosSistema.valorTotalPedidos,
          valorFinanceiro: dadosSistema.valorTotalFinanceiro
        },
        leads: dadosSistema.leads.map((l: any) => ({
          id: l.CODLEAD,
          nome: l.NOME,
          valor: l.VALOR,
          status: l.STATUS_LEAD,
          estagio: dadosSistema.estagiosFunis.find((e: any) => e.CODESTAGIO === l.CODESTAGIO)?.NOME
        })),
        atividades: dadosSistema.atividades.map((a: any) => ({
          id: a.CODATIVIDADE,
          tipo: a.TIPO,
          status: a.STATUS,
          data: a.DATA_INICIO
        })),
        clientes: dadosSistema.maioresClientes.slice(0, 10).map((c: any) => ({
          nome: c.nome,
          pedidos: c.totalPedidos,
          valor: c.valorTotal
        }))
      };

      // Salvar no cache
      sessionDataCache.set(cacheKey, { data: contextData, filtro: filtroKey });

      messageWithContext = `DADOS (JSON):
${JSON.stringify(contextData)}

PERGUNTA: ${message}`;

      console.log('✅ Dados carregados:', Object.keys(contextData).join(', '));
    } else {
      console.log('💾 Usando dados em cache');
      messageWithContext = message;
    }

    const chat = model.startChat({
      history: chatHistory,
    });

    // Usar streaming com contexto
    const result = await chat.sendMessageStream(messageWithContext);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let chunkCount = 0;
        let totalChars = 0;
        
        try {
          console.log('🚀 Iniciando streaming da resposta...');
          
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              chunkCount++;
              totalChars += text.length;
              
              const data = `data: ${JSON.stringify({ text })}\n\n`;
              controller.enqueue(encoder.encode(data));
              
              // Log a cada 5 chunks para não poluir
              if (chunkCount % 5 === 0) {
                console.log(`📤 Enviado chunk ${chunkCount} (${totalChars} caracteres até agora)`);
              }
            }
          }
          
          console.log(`✅ Streaming concluído: ${chunkCount} chunks, ${totalChars} caracteres totais`);
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          console.error('❌ Erro no streaming do Gemini:', error);
          console.error('Stack trace:', error.stack);
          
          const errorMessage = `data: ${JSON.stringify({
            error: 'Erro ao processar resposta. Por favor, tente novamente.'
          })}\n\n`;
          controller.enqueue(encoder.encode(errorMessage));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro no chat Gemini:', error);
    return new Response(JSON.stringify({ error: 'Erro ao processar mensagem' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}