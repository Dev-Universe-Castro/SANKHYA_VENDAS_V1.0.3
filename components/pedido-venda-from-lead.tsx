"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Trash2, Save, Search, Edit, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { EstoqueModal } from "@/components/estoque-modal"
import { ProdutoSelectorModal } from "@/components/produto-selector-modal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

interface ItemPedido {
  CODPROD: string
  DESCRPROD?: string
  QTDNEG: number
  VLRUNIT: number
  PERCDESC: number
  CODLOCALORIG: string
  CONTROLE: string
  AD_QTDBARRA?: number
  CODVOL?: string
  IDALIQICMS?: string
  SEQUENCIA?: number // Adicionado para o ProdutoSelectorModal
}

interface PedidoVendaFromLeadProps {
  dadosIniciais: any
  onSuccess: () => void
  onCancel: () => void
  onSalvarPedido?: (salvarFn: () => Promise<boolean>) => void
}

export default function PedidoVendaFromLead({ dadosIniciais, onSuccess, onCancel, onSalvarPedido }: PedidoVendaFromLeadProps) {
  const [loading, setLoading] = useState(false)
  const [parceiros, setParceiros] = useState<any[]>([])
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [showItemModal, setShowItemModal] = useState(false)
  const [currentItemIndex, setCurrentItemIndex] = useState<number | null>(null)
  const [parceiroSearch, setParceiroSearch] = useState("")
  const [showParceirosDropdown, setShowParceirosDropdown] = useState(false)
  const [showEstoqueModal, setShowEstoqueModal] = useState(false)
  const [produtoEstoqueSelecionado, setProdutoEstoqueSelecionado] = useState<any | null>(null)
  const [removendoItem, setRemovendoItem] = useState<number | null>(null)
  const [vendedores, setVendedores] = useState<any[]>([])
  const [showVendedorModal, setShowVendedorModal] = useState(false)
  const [tiposNegociacao, setTiposNegociacao] = useState<any[]>([])
  const [tiposOperacao, setTiposOperacao] = useState<any[]>([])
  const [condicaoComercialBloqueada, setCondicaoComercialBloqueada] = useState(false)
  const [condicaoComercialPorModelo, setCondicaoComercialPorModelo] = useState(false)
  const [tipoOperacaoBloqueado, setTipoOperacaoBloqueado] = useState(false)
  const [modeloNota, setModeloNota] = useState<string>("")

  // Inicializar estado do pedido DIRETAMENTE no useState (SEM useMemo)
  const [pedido, setPedido] = useState(() => {
    console.log('🔧 Inicializando estado do pedido com dados:', dadosIniciais)

    const codParcLead = String(dadosIniciais.CODPARC || '').trim()
    const cpfCnpj = String(dadosIniciais.CPF_CNPJ || '').trim()
    const ieRg = String(dadosIniciais.IE_RG || '').trim()
    const razaoSocial = String(dadosIniciais.RAZAOSOCIAL || dadosIniciais.RAZAO_SOCIAL || '').trim()
    const tipoCliente = dadosIniciais.TIPO_CLIENTE || 'PJ'

    console.log('📋 Dados do parceiro para estado inicial:', {
      CODPARC: codParcLead,
      CPF_CNPJ: cpfCnpj,
      IE_RG: ieRg,
      RAZAO_SOCIAL: razaoSocial,
      TIPO_CLIENTE: tipoCliente
    })

    return {
      CODEMP: dadosIniciais.CODEMP || "1",
      CODCENCUS: dadosIniciais.CODCENCUS || "0",
      NUNOTA: dadosIniciais.NUNOTA || "",
      DTNEG: new Date().toISOString().split('T')[0],
      DTFATUR: dadosIniciais.DTFATUR || "",
      DTENTSAI: dadosIniciais.DTENTSAI || "",
      CODPARC: codParcLead,
      CODTIPOPER: dadosIniciais.CODTIPOPER || "974",
      TIPMOV: dadosIniciais.TIPMOV || "P",
      CODTIPVENDA: dadosIniciais.CODTIPVENDA || "1",
      CODVEND: dadosIniciais.CODVEND || "0",
      OBSERVACAO: dadosIniciais.OBSERVACAO || "",
      VLOUTROS: dadosIniciais.VLOUTROS || 0,
      VLRDESCTOT: dadosIniciais.VLRDESCTOT || 0,
      VLRFRETE: dadosIniciais.VLRFRETE || 0,
      TIPFRETE: dadosIniciais.TIPFRETE || "S",
      ORDEMCARGA: dadosIniciais.ORDEMCARGA || "",
      CODPARCTRANSP: dadosIniciais.CODPARCTRANSP || "0",
      CODNAT: dadosIniciais.CODNAT || "0",
      TIPO_CLIENTE: tipoCliente,
      CPF_CNPJ: cpfCnpj,
      IE_RG: ieRg,
      RAZAO_SOCIAL: razaoSocial,
      itens: [] as ItemPedido[]
    }
  })
  const [itens, setItens] = useState<ItemPedido[]>(() => {
    // Inicializar itens diretamente no useState
    if (dadosIniciais.itens && dadosIniciais.itens.length > 0) {
      return dadosIniciais.itens.map((item: any, index: number) => ({
        CODPROD: String(item.CODPROD),
        DESCRPROD: item.DESCRPROD || '',
        QTDNEG: Number(item.QTDNEG) || 1,
        VLRUNIT: Number(item.VLRUNIT) || 0,
        PERCDESC: Number(item.PERCDESC) || 0,
        CODLOCALORIG: item.CODLOCALORIG || "700",
        CONTROLE: item.CONTROLE || "007",
        AD_QTDBARRA: item.AD_QTDBARRA || 1,
        CODVOL: item.CODVOL || "UN",
        IDALIQICMS: item.IDALIQICMS || "0",
        SEQUENCIA: item.SEQUENCIA || index + 1
      }))
    }
    return []
  })

  // useEffect APENAS para inicialização da UI (campo de busca)
  useEffect(() => {
    console.log('🔄 Inicializando UI do componente')

    // Preencher campo de busca da UI (APENAS SE TEM CODPARC)
    const codParcLead = String(dadosIniciais.CODPARC || "").trim()
    const razaoSocialLead = dadosIniciais.RAZAOSOCIAL || dadosIniciais.RAZAO_SOCIAL || ""

    if (codParcLead !== "" && codParcLead !== "0") {
      setParceiroSearch(`${razaoSocialLead} (✓ Código: ${codParcLead})`)
    }

    // Garantir que a Condição Comercial não está bloqueada na inicialização
    setCondicaoComercialBloqueada(false)
    setCondicaoComercialPorModelo(false)
    setTipoOperacaoBloqueado(false)

  }, []) // Array vazio - executa APENAS UMA VEZ na montagem

  const [itemAtual, setItemAtual] = useState<ItemPedido>({
    CODPROD: "",
    QTDNEG: 1,
    VLRUNIT: 0,
    PERCDESC: 0,
    CODLOCALORIG: "700",
    CONTROLE: "007",
    AD_QTDBARRA: 1,
    CODVOL: "UN",
    IDALIQICMS: "0"
  })

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isAdminUser, setIsAdminUser] = useState(false) // Verificar se é administrador

  useEffect(() => {
    carregarDadosIniciais()
  }, [])

  const carregarDadosIniciais = async () => {
    setIsInitialLoading(true)
    try {
      // Carregar apenas vendedor do usuário inicialmente
      await carregarVendedorUsuario()

      // Carregar outros dados em background sem bloquear a UI
      Promise.all([
        carregarTiposNegociacao(),
        carregarTiposOperacao()
      ]).catch(error => {
        console.error('Erro ao carregar dados complementares:', error)
      })

      // Parceiros serão carregados sob demanda quando o usuário abrir o seletor
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error)
      toast.error('Erro ao carregar dados. Tente novamente.')
    } finally {
      setIsInitialLoading(false)
    }
  }

  const carregarVendedorUsuario = async () => {
    try {
      const userStr = document.cookie
        .split('; ')
        .find(row => row.startsWith('user='))
        ?.split('=')[1]

      if (userStr) {
        const user = JSON.parse(decodeURIComponent(userStr))

        // Verificar se é administrador
        const isAdmin = user.role === 'Administrador' || user.role === 'Admin'
        setIsAdminUser(isAdmin)

        if (user.codVendedor) {
          setPedido(prev => ({ ...prev, CODVEND: String(user.codVendedor) }))
          console.log('✅ Vendedor automático:', user.codVendedor, '| Admin:', isAdmin)
        } else if (!isAdmin) {
          console.warn('⚠️ Usuário sem vendedor vinculado')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar vendedor do usuário:', error)
    }
  }

  const carregarParceiros = async () => {
    try {
      // Tentar buscar do cache primeiro
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        try {
          const data = JSON.parse(cachedParceiros)
          // Garantir que é um array
          setParceiros(Array.isArray(data) ? data : [])
          console.log('✅ Parceiros carregados do cache (PedidoFromLead)')
          return
        } catch (e) {
          console.error('Erro ao parsear cache de parceiros:', e)
          sessionStorage.removeItem('cached_parceiros')
        }
      }

      const response = await fetch('/api/sankhya/parceiros?pageSize=100')
      const data = await response.json()
      const parceirosList = Array.isArray(data.parceiros) ? data.parceiros : []
      setParceiros(parceirosList)

      // Salvar no cache
      if (parceirosList.length > 0) {
        sessionStorage.setItem('cached_parceiros', JSON.stringify(parceirosList))
      }
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error)
      setParceiros([]) // Sempre garantir array vazio em caso de erro
    }
  }

  const carregarVendedores = async () => {
    try {
      const response = await fetch('/api/vendedores?tipo=vendedores')
      if (response.ok) {
        const data = await response.json()
        setVendedores(data)
        console.log('✅ Vendedores carregados:', data.length)
      }
    } catch (error) {
      console.error('Erro ao carregar vendedores:', error)
    }
  }

  const carregarTiposNegociacao = async () => {
    try {
      const response = await fetch('/api/sankhya/tipos-negociacao')
      const data = await response.json()
      setTiposNegociacao(data.tiposNegociacao || [])
    } catch (error) {
      console.error('Erro ao carregar tipos de negociação:', error)
    }
  }

  const carregarTiposOperacao = async () => {
    try {
      const response = await fetch('/api/sankhya/tipos-negociacao?tipo=operacao')
      const data = await response.json()
      setTiposOperacao(data.tiposOperacao || [])
    } catch (error) {
      console.error('Erro ao carregar tipos de operação:', error)
    }
  }

  const [searchParceiroTimeout, setSearchParceiroTimeout] = useState<NodeJS.Timeout | null>(null)

  const buscarParceiros = async (search: string) => {
    // Só buscar se tiver 2+ caracteres
    if (search.length < 2) {
      setParceiros([])
      setShowParceirosDropdown(false)
      return
    }

    try {
      // Buscar APENAS do cache local (vindo do prefetch)
      const cachedParceiros = sessionStorage.getItem('cached_parceiros')
      if (cachedParceiros) {
        const parsedCache = JSON.parse(cachedParceiros)
        // Lógica de filtragem
        const allParceiros = Array.isArray(parsedCache) ? parsedCache : parsedCache.parceiros || []
        const searchLower = search.toLowerCase()
        const filtered = allParceiros.filter((p: any) =>
          p.NOMEPARC?.toLowerCase().includes(searchLower) ||
          p.CGC_CPF?.includes(search) ||
          p.RAZAOSOCIAL?.toLowerCase().includes(searchLower) ||
          p.CODPARC?.toString().includes(search)
        )
        setParceiros(filtered)
        setShowParceirosDropdown(filtered.length > 0)
        console.log('✅ Parceiros filtrados do cache (PedidoFromLead):', filtered.length)
        return
      }

      // Se não houver cache de parceiros, não fazemos a busca na API Sankhya.
      console.log('⚠️ Cache de parceiros vazio. Nenhuma busca na API Sankhya realizada.')
      setParceiros([])
      setShowParceirosDropdown(false)

    } catch (error) {
      console.error('Erro ao buscar parceiros no cache:', error)
      setParceiros([])
      setShowParceirosDropdown(false)
    }
  }

  const handleParceiroSearchDebounced = (search: string) => {
    setParceiroSearch(search)

    // Limpar timeout anterior
    if (searchParceiroTimeout) {
      clearTimeout(searchParceiroTimeout)
    }

    // Se campo vazio ou menos de 2 caracteres, limpar parceiros e fechar dropdown
    if (search.length < 2) {
      setParceiros([])
      setShowParceirosDropdown(false)
      return
    }

    // Aguardar 500ms após parar de digitar
    setSearchParceiroTimeout(setTimeout(() => {
      buscarParceiros(search)
    }, 500))
  }





  const buscarDadosModeloNota = async (nunota: string) => {
    if (!nunota || nunota.trim() === '') {
      // Se limpar o modelo, desbloquear tipo de operação e condição comercial
      setTipoOperacaoBloqueado(false)
      if (!condicaoComercialBloqueada) {
        setCondicaoComercialPorModelo(false)
      }
      return;
    }

    try {
      console.log('🔍 Buscando dados do modelo NUNOTA:', nunota)
      const response = await fetch(`/api/sankhya/tipos-negociacao?nunota=${nunota}`)
      const data = await response.json()

      if (data.codTipOper) {
        console.log('✅ Dados do modelo encontrados:', data)

        // Atualizar APENAS os campos do modelo, preservando dados do parceiro
        setPedido(prev => {
          const novoEstado = {
            ...prev, // Preservar TODO o estado anterior
            CODTIPOPER: String(data.codTipOper)
          }

          // PRIORIDADE 1: Se tiver condição comercial do parceiro, NÃO atualiza
          if (!condicaoComercialBloqueada && data.codTipVenda) {
            novoEstado.CODTIPVENDA = String(data.codTipVenda)
          }

          console.log('🔄 Atualizando estado com dados do modelo (preservando parceiro):', {
            CODPARC: novoEstado.CODPARC,
            CPF_CNPJ: novoEstado.CPF_CNPJ,
            IE_RG: novoEstado.IE_RG,
            RAZAO_SOCIAL: novoEstado.RAZAO_SOCIAL,
            CODTIPOPER: novoEstado.CODTIPOPER,
            CODTIPVENDA: novoEstado.CODTIPVENDA
          })

          return novoEstado
        })

        // Bloquear tipo de operação quando vier do modelo
        setTipoOperacaoBloqueado(true)

        // PRIORIDADE 2: Só marca como "por modelo" se NÃO tiver do parceiro
        if (!condicaoComercialBloqueada && data.codTipVenda && data.codTipVenda !== '0') {
          setCondicaoComercialPorModelo(true)
          toast.success('Tipo de operação definido pelo modelo')
        } else if (condicaoComercialBloqueada) {
          toast.info('Tipo de operação definido pelo modelo. Condição comercial mantida do parceiro.')
        } else {
          toast.success('Tipo de operação definido pelo modelo')
          setCondicaoComercialPorModelo(false)
        }
      } else {
        console.log('ℹ️ Nenhum dado encontrado para este NUNOTA')
        toast.warning('Modelo da nota não encontrado')
        setTipoOperacaoBloqueado(false)
        setCondicaoComercialPorModelo(false)
      }
    } catch (error) {
      console.error('Erro ao buscar dados do modelo da nota:', error)
      toast.error('Erro ao buscar dados do modelo')
      setTipoOperacaoBloqueado(false)
    }
  }

  const selecionarParceiro = async (parceiro: any) => {
    console.log('✅ Parceiro selecionado:', parceiro)

    const codParc = String(parceiro.CODPARC).trim()
    const nomeParc = parceiro.NOMEPARC || parceiro.RAZAOSOCIAL || ''

    // Validar dados essenciais antes de prosseguir
    if (!parceiro.CGC_CPF || !parceiro.CGC_CPF.trim()) {
      console.error('⚠️ Parceiro sem CPF/CNPJ:', parceiro)
      toast.error("Este parceiro não possui CPF/CNPJ cadastrado. Complete o cadastro antes de continuar.")
      return
    }

    if (!parceiro.IDENTINSCESTAD || !parceiro.IDENTINSCESTAD.trim()) {
      console.error('⚠️ Parceiro sem IE/RG:', parceiro)
      toast.error("Este parceiro não possui IE/RG cadastrado. Complete o cadastro antes de continuar.")
      return
    }

    // Fechar dropdown e limpar lista PRIMEIRO
    setShowParceirosDropdown(false)
    setParceiros([])

    // Preencher dados básicos do parceiro
    const tipPessoa = parceiro.TIPPESSOA === 'J' ? 'PJ' : 'PF'
    const dadosParceiro = {
      CODPARC: codParc,
      TIPO_CLIENTE: tipPessoa,
      CPF_CNPJ: parceiro.CGC_CPF,
      IE_RG: parceiro.IDENTINSCESTAD,
      RAZAO_SOCIAL: parceiro.RAZAOSOCIAL || nomeParc
    }

    // Atualizar estado do pedido
    setPedido(prev => {
      const novoEstado = {
        ...prev,
        ...dadosParceiro
      }
      console.log('🔄 Estado ANTERIOR do pedido:', prev)
      console.log('🔄 Estado NOVO do pedido:', novoEstado)
      return novoEstado
    })

    // Atualizar campo de busca com nome do parceiro
    setParceiroSearch(`${nomeParc} (✓ Código: ${codParc})`)

    console.log('✅ Dados do parceiro salvos no estado:', dadosParceiro)

    // 🆕 SINCRONIZAR COM O LEAD NO BANCO
    if (dadosIniciais.CODLEAD) {
      try {
        console.log('🔄 Sincronizando parceiro com o lead:', dadosIniciais.CODLEAD)
        const response = await fetch('/api/leads/atualizar-parceiro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codLead: dadosIniciais.CODLEAD,
            codParc: codParc
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Erro ao atualizar parceiro do lead')
        }

        console.log('✅ Parceiro do lead atualizado no banco')
        toast.success(`Parceiro atualizado!`, {
          description: `${nomeParc} vinculado ao lead`
        })
      } catch (error: any) {
        console.error('❌ Erro ao sincronizar parceiro:', error)
        toast.error('Erro ao atualizar parceiro do lead', {
          description: error.message
        })
        // Não bloquear o fluxo se falhar a sincronização
      }
    } else {
      toast.success(`Parceiro selecionado: ${nomeParc}`, {
        description: `Código: ${codParc}`
      })
    }
  }

  const abrirModalNovoItem = () => {
    setItemAtual({
      CODPROD: "",
      QTDNEG: 1,
      VLRUNIT: 0,
      PERCDESC: 0,
      CODLOCALORIG: "700",
      CONTROLE: "007",
      AD_QTDBARRA: 1,
      CODVOL: "UN",
      IDALIQICMS: "0"
    })
    setCurrentItemIndex(null)
    // Abrir diretamente o modal de busca de produtos
    setShowProdutoModal(true)
  }

  const abrirModalEditarItem = (index: number) => {
    const itemParaEditar = itens[index]
    setItemAtual({ ...itemParaEditar })
    setCurrentItemIndex(index)
    // Abrir modal de busca para editar produto
    setShowProdutoModal(true)
  }

  const removerItem = async (index: number) => {
    const itemParaRemover = itens[index]
    setRemovendoItem(index)

    // 🆕 SINCRONIZAR COM O LEAD NO BANCO
    if (dadosIniciais.CODLEAD && itemParaRemover) {
      try {
        console.log('🔄 Buscando produto no lead para remover:', itemParaRemover.CODPROD)

        // Buscar produtos do lead para obter o CODITEM
        const responseProdutos = await fetch(`/api/leads/produtos?codLead=${dadosIniciais.CODLEAD}`)
        if (responseProdutos.ok) {
          const produtos = await responseProdutos.json()
          const produtoLead = produtos.find((p: any) => String(p.CODPROD) === String(itemParaRemover.CODPROD))

          if (produtoLead && produtoLead.CODITEM) {
            console.log('🔄 Removendo produto do lead:', produtoLead.CODITEM)
            const responseRemover = await fetch('/api/leads/produtos/remover', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                codItem: produtoLead.CODITEM,
                codLead: dadosIniciais.CODLEAD
              })
            })

            if (responseRemover.ok) {
              const result = await responseRemover.json()
              console.log('✅ Produto removido do lead. Novo total:', result.novoValorTotal)

              await new Promise(resolve => setTimeout(resolve, 300))
              setItens(itens.filter((_, i) => i !== index))
              setPedido(prev => ({ ...prev, itens: itens.filter((_, i) => i !== index) }))
              setRemovendoItem(null)

              toast.success("Item removido!", {
                description: `Valor total do lead: R$ ${result.novoValorTotal.toFixed(2)}`
              })
              return
            } else {
              throw new Error('Erro ao remover produto do lead')
            }
          }
        }
      } catch (error: any) {
        console.error('❌ Erro ao sincronizar remoção:', error)
        toast.error('Erro ao remover produto do lead', {
          description: error.message
        })
        setRemovendoItem(null)
        return
      }
    }

    // Se não tem CODLEAD, apenas remove localmente
    await new Promise(resolve => setTimeout(resolve, 300))
    setItens(itens.filter((_, i) => i !== index))
    setPedido(prev => ({ ...prev, itens: itens.filter((_, i) => i !== index) }))
    setRemovendoItem(null)
    toast.success("Item removido")
  }



  const selecionarProduto = async (produto: any) => {
    setShowProdutoModal(false)
    setProdutoEstoqueSelecionado(produto)
    setShowEstoqueModal(true)
  }

  const handleConfirmarProdutoEstoque = async (produto: any, preco: number, quantidade: number) => {
    setShowEstoqueModal(false)
    setShowProdutoModal(false)

    const novoItem: ItemPedido = {
      CODPROD: produto.CODPROD,
      DESCRPROD: produto.DESCRPROD,
      QTDNEG: quantidade, // Usar quantidade passada como argumento
      VLRUNIT: preco,
      PERCDESC: 0, // Resetar desconto ao adicionar/editar via estoque
      CODLOCALORIG: "700",
      CONTROLE: "007",
      AD_QTDBARRA: 1,
      CODVOL: "UN",
      IDALIQICMS: "0",
      SEQUENCIA: pedido.itens.length + 1
    }

    if (currentItemIndex !== null) {
      // Editando item existente
      const itemExistente = itens[currentItemIndex]
      novoItem.QTDNEG = quantidade // Garante que a quantidade selecionada no modal é usada
      novoItem.PERCDESC = itemExistente.PERCDESC // Preserva o desconto do item existente
      novoItem.CODLOCALORIG = itemExistente.CODLOCALORIG // Preserva o local de origem

      const novosItens = [...itens]
      novosItens[currentItemIndex] = novoItem
      setItens(novosItens)
      setPedido(prev => {
        const updatedItens = [...prev.itens]
        updatedItens[currentItemIndex] = novoItem
        return { ...prev, itens: updatedItens }
      })

      // 🆕 SINCRONIZAR EDIÇÃO COM O LEAD
      if (dadosIniciais.CODLEAD) {
        try {
          console.log('🔄 Buscando produto do lead para atualizar...');
          console.log('Editando item na posição:', currentItemIndex);

          const responseProdutos = await fetch(`/api/leads/produtos?codLead=${dadosIniciais.CODLEAD}`);

          if (!responseProdutos.ok) {
            throw new Error('Erro ao buscar produtos do lead');
          }

          const produtosLead = await responseProdutos.json();
          console.log('Produtos do lead encontrados:', produtosLead);

          // Buscar pelo índice/posição do produto na lista (mais confiável)
          const produtoLead = produtosLead[currentItemIndex];

          console.log('Produto do lead encontrado (por índice):', produtoLead);

          if (produtoLead?.CODITEM) {
            console.log('🔄 Atualizando produto CODITEM:', produtoLead.CODITEM);

            const response = await fetch('/api/leads/produtos/atualizar', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                codItem: produtoLead.CODITEM,
                codLead: dadosIniciais.CODLEAD,
                quantidade: quantidade,
                vlrunit: preco
              })
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Erro ao atualizar produto no lead');
            }

            const result = await response.json();
            console.log('✅ Produto e lead atualizados. Novo total:', result.novoValorTotal);

            toast.success("Produto e lead atualizados!", {
              description: `Novo valor total: R$ ${result.novoValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            });
          } else {
            console.warn('⚠️ Produto não encontrado no lead, apenas atualizando localmente');
            toast.success("Produto atualizado!");
          }
        } catch (error: any) {
          console.error('❌ Erro ao sincronizar edição:', error);
          toast.error('Erro ao atualizar lead: ' + error.message);
        }
      } else {
        toast.success("Produto atualizado!");
      }
    } else {
      // Adicionando novo item
      setItens([...itens, novoItem])
      setPedido(prev => ({ ...prev, itens: [...prev.itens, novoItem] }))

      // 🆕 SINCRONIZAR COM O LEAD NO BANCO
      if (dadosIniciais.CODLEAD) {
        try {
          console.log('🔄 Adicionando produto ao lead:', dadosIniciais.CODLEAD)
          const vlrTotal = preco * quantidade
          const response = await fetch('/api/leads/produtos/adicionar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              CODLEAD: dadosIniciais.CODLEAD,
              CODPROD: produto.CODPROD,
              DESCRPROD: produto.DESCRPROD,
              QUANTIDADE: quantidade,
              VLRUNIT: preco,
              VLRTOTAL: vlrTotal
            })
          })

          if (response.ok) {
            const result = await response.json()
            console.log('✅ Produto adicionado ao lead. Novo total do lead:', result.novoValorTotal)
            toast.success("Produto adicionado!", {
              description: `Valor total do lead: R$ ${result.novoValorTotal.toFixed(2)}`
            })
          } else {
            throw new Error('Erro ao adicionar produto ao lead')
          }
        } catch (error: any) {
          console.error('❌ Erro ao sincronizar produto:', error)
          toast.error('Produto adicionado localmente, mas houve erro ao sincronizar com o lead')
        }
      } else {
        toast.success("Item adicionado")
      }
    }

    setCurrentItemIndex(null)
  }

  const abrirModalEstoque = (produto: any) => {
    setProdutoEstoqueSelecionado(produto)
    setShowEstoqueModal(true)
  }

  const calcularTotal = (item: ItemPedido) => {
    const total = item.QTDNEG * item.VLRUNIT
    const desconto = total * (item.PERCDESC / 100)
    return total - desconto
  }

  const calcularTotalPedido = () => {
    return itens.reduce((acc, item) => acc + calcularTotal(item), 0)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const onClose = async () => {
    // Se tem CODLEAD, recarregar dados do lead antes de fechar
    if (dadosIniciais.CODLEAD) {
      try {
        console.log('🔄 Recarregando dados do lead antes de fechar modal...')
        // Disparar atualização do modal do lead via onSuccess (que atualiza o kanban)
        if (onSuccess) {
          await onSuccess()
        }
      } catch (error) {
        console.error('❌ Erro ao recarregar dados do lead:', error)
      }
    }
    onCancel()
  }

  const salvarPedido = useCallback(async (): Promise<boolean> => {
    console.log('🔍 Iniciando validação do pedido...')

    // Usar valores atuais dos estados diretamente (useCallback garante que serão os mais recentes)
    const dadosAtuaisPedido = { ...pedido }

    console.log('📋 Dados capturados da tela:', {
      CODPARC: dadosAtuaisPedido.CODPARC,
      CPF_CNPJ: dadosAtuaisPedido.CPF_CNPJ,
      IE_RG: dadosAtuaisPedido.IE_RG,
      RAZAO_SOCIAL: dadosAtuaisPedido.RAZAO_SOCIAL,
      TIPO_CLIENTE: dadosAtuaisPedido.TIPO_CLIENTE,
      CODVEND: dadosAtuaisPedido.CODVEND,
      CODTIPOPER: dadosAtuaisPedido.CODTIPOPER,
      CODTIPVENDA: dadosAtuaisPedido.CODTIPVENDA,
      DTNEG: dadosAtuaisPedido.DTNEG
    })

    // Validar dados diretamente dos dados capturados
    const codParc = String(dadosAtuaisPedido.CODPARC || '').trim()
    const cpfCnpj = String(dadosAtuaisPedido.CPF_CNPJ || '').trim()
    const ieRg = String(dadosAtuaisPedido.IE_RG || '').trim()
    const razaoSocial = String(dadosAtuaisPedido.RAZAO_SOCIAL || '').trim()

    console.log('📋 Dados extraídos para validação:', {
      CODPARC: codParc,
      CPF_CNPJ: cpfCnpj,
      IE_RG: ieRg,
      RAZAO_SOCIAL: razaoSocial
    })

    console.log('🔍 Verificando se dados do parceiro estão presentes:', {
      temCODPARC: !!codParc && codParc !== '0',
      temCPF_CNPJ: !!cpfCnpj,
      temIE_RG: !!ieRg,
      temRAZAO_SOCIAL: !!razaoSocial
    })

    console.log('\n🔍 DEBUG - Valores do modelo da nota:')
    console.log(`   - Estado modeloNota: "${modeloNota}"`)

    const modeloNotaTrimmed = String(modeloNota).trim()

    // Validar que modelo da nota foi preenchido
    if (!modeloNotaTrimmed || modeloNotaTrimmed === '' || modeloNotaTrimmed === '0') {
      console.error('❌ Validação falhou: Modelo da Nota vazio ou inválido')
      toast.error("Modelo da Nota é obrigatório", {
        description: "Preencha o número do modelo da nota antes de salvar."
      })
      return false
    }

    const modeloNotaNumero = Number(modeloNotaTrimmed)

    if (isNaN(modeloNotaNumero) || modeloNotaNumero <= 0) {
      console.error('❌ Validação falhou: Modelo da Nota com valor inválido:', modeloNotaTrimmed)
      toast.error("Modelo da Nota inválido", {
        description: "Informe um número válido para o modelo da nota."
      })
      return false
    }

    console.log(`✅ Modelo da Nota validado com sucesso: ${modeloNotaNumero}`)

    // Validar CODPARC
    if (!codParc || codParc === '0') {
      console.error('❌ Validação falhou: CODPARC inválido ou vazio')
      toast.error("Parceiro não selecionado", {
        description: "Selecione um parceiro válido antes de salvar."
      })
      return false
    }

    // Validar CPF/CNPJ
    if (!cpfCnpj) {
      console.error('❌ Validação falhou: CPF/CNPJ vazio')
      toast.error("CPF/CNPJ não encontrado", {
        description: "Preencha o CPF/CNPJ do parceiro."
      })
      return false
    }

    // Validar IE/RG
    if (!ieRg) {
      console.error('❌ Validação falhou: IE/RG vazio')
      toast.error("IE/RG não encontrado", {
        description: "Preencha a IE/RG do parceiro."
      })
      return false
    }

    // Validar Razão Social
    if (!razaoSocial) {
      console.error('❌ Validação falhou: Razão Social vazia')
      toast.error("Razão Social não encontrada", {
        description: "Preencha a Razão Social do parceiro."
      })
      return false
    }

    // Validar vendedor (usando dados capturados)
    if (!dadosAtuaisPedido.CODVEND || dadosAtuaisPedido.CODVEND === "0") {
      toast.error("Vendedor não vinculado. Entre em contato com o administrador.")
      return false
    }

    // Itens do pedido - usar itens do estado local
    const itensParaEnviar = itens.length > 0 ? itens : []

    if (itensParaEnviar.length === 0) {
      console.log('❌ Validação de itens falhou')
      toast.error("Adicione pelo menos um item ao pedido")
      return false
    }

    setLoading(true)

    try {
      console.log('📦 Criando pedido de venda...')
      console.log('📋 Dados CAPTURADOS DA TELA para envio:', {
        CODPARC: codParc,
        CPF_CNPJ: cpfCnpj,
        IE_RG: ieRg,
        RAZAO_SOCIAL: razaoSocial,
        TIPO_CLIENTE: dadosAtuaisPedido.TIPO_CLIENTE,
        CODVEND: dadosAtuaisPedido.CODVEND,
        CODTIPOPER: dadosAtuaisPedido.CODTIPOPER,
        CODTIPVENDA: dadosAtuaisPedido.CODTIPVENDA,
        DTNEG: dadosAtuaisPedido.DTNEG,
        MODELO_NOTA: modeloNotaNumero,
        itensCount: itensParaEnviar.length
      })

      // Montar payload com dados CAPTURADOS DA TELA
      const pedidoData = {
        CODEMP: dadosAtuaisPedido.CODEMP,
        CODCENCUS: dadosAtuaisPedido.CODCENCUS,
        NUNOTA: dadosAtuaisPedido.NUNOTA,
        DTNEG: dadosAtuaisPedido.DTNEG,
        DTFATUR: dadosAtuaisPedido.DTFATUR,
        DTENTSAI: dadosAtuaisPedido.DTENTSAI,
        CODPARC: codParc,
        CODTIPOPER: dadosAtuaisPedido.CODTIPOPER,
        TIPMOV: dadosAtuaisPedido.TIPMOV,
        CODTIPVENDA: dadosAtuaisPedido.CODTIPVENDA,
        CODVEND: dadosAtuaisPedido.CODVEND,
        OBSERVACAO: dadosAtuaisPedido.OBSERVACAO,
        VLOUTROS: dadosAtuaisPedido.VLOUTROS,
        VLRDESCTOT: dadosAtuaisPedido.VLRDESCTOT,
        VLRFRETE: dadosAtuaisPedido.VLRFRETE,
        TIPFRETE: dadosAtuaisPedido.TIPFRETE,
        ORDEMCARGA: dadosAtuaisPedido.ORDEMCARGA,
        CODPARCTRANSP: dadosAtuaisPedido.CODPARCTRANSP,
        CODNAT: dadosAtuaisPedido.CODNAT,
        TIPO_CLIENTE: dadosAtuaisPedido.TIPO_CLIENTE,
        CPF_CNPJ: cpfCnpj,
        IE_RG: ieRg,
        RAZAO_SOCIAL: razaoSocial,
        MODELO_NOTA: modeloNotaNumero,
        itens: itensParaEnviar.map(item => ({
          CODPROD: item.CODPROD,
          QTDNEG: item.QTDNEG,
          VLRUNIT: item.VLRUNIT,
          PERCDESC: item.PERCDESC,
          CODLOCALORIG: item.CODLOCALORIG,
          CONTROLE: item.CONTROLE,
          AD_QTDBARRA: item.AD_QTDBARRA,
          CODVOL: item.CODVOL,
          IDALIQICMS: item.IDALIQICMS
        }))
      }

      console.log('📦 Dados completos sendo enviados para API:', pedidoData)

      const responsePedido = await fetch('/api/sankhya/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pedidoData)
      })

      if (!responsePedido.ok) {
        const error = await responsePedido.json()
        throw new Error(error.error || 'Erro ao criar pedido')
      }

      const resultadoPedido = await responsePedido.json()
      console.log('✅ Pedido criado:', resultadoPedido)

      console.log('🔄 Atualizando lead para status GANHO...')
      console.log('📋 CODLEAD do lead:', dadosIniciais.CODLEAD)

      try {
        if (!dadosIniciais.CODLEAD) {
          throw new Error('CODLEAD não encontrado nos dados do lead')
        }

        // Produtos já foram editados durante a preparação do pedido
        // Não precisamos sincronizar novamente aqui

        console.log('🏆 Atualizando lead para status GANHO...')

        const responseStatus = await fetch('/api/leads/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            codLead: String(dadosIniciais.CODLEAD),
            status: 'GANHO'
          })
        })

        const statusResult = await responseStatus.json()

        if (!responseStatus.ok) {
          console.error('❌ Erro ao atualizar status do lead:', statusResult)
          throw new Error(statusResult.error || 'Erro ao atualizar status do lead')
        }

        console.log('✅ Lead atualizado para GANHO no Oracle:', statusResult)

        console.log('✅ Lead e produtos sincronizados com sucesso')

        toast.success("Pedido criado com sucesso!", {
          description: `Lead marcado como GANHO. Pedido: ${resultadoPedido.nunota}`,
          duration: 3000
        })

        await new Promise(resolve => setTimeout(resolve, 500))

        console.log('🔄 Chamando onSuccess para atualizar kanban...')
        await onSuccess?.()

        console.log('✅ onSuccess executado com sucesso')

      } catch (syncError: any) {
        console.error('❌ Erro ao sincronizar lead:', syncError)
        console.error('❌ Stack trace:', syncError.stack)
        toast.error('Erro ao atualizar lead', {
          description: syncError.message || 'O pedido foi criado mas houve erro ao atualizar o lead',
          duration: 5000
        })
        throw syncError
      }

      return true
    } catch (error: any) {
      console.error('❌ Erro ao criar pedido:', error)
      toast.error(`Erro ao criar pedido: ${error.message || 'Erro desconhecido'}`, {
        duration: 8000,
        description: 'Verifique os dados e tente novamente. O lead não foi marcado como ganho.'
      })
      return false
    } finally {
      setLoading(false)
    }
  }, [
    modeloNota,
    pedido,
    itens,
    dadosIniciais,
    onSuccess,
    setLoading
  ])

  // Passar a função salvarPedido para o componente pai quando disponível
  useEffect(() => {
    if (onSalvarPedido) {
      onSalvarPedido(salvarPedido)
    }
  }, [onSalvarPedido, salvarPedido])

  return (
    <div className="space-y-3 md:space-y-4">
      <Accordion type="multiple" defaultValue={["parceiro", "nota", "itens"]} className="space-y-3">
        {/* Dados do Parceiro */}
        <AccordionItem value="parceiro" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-3 md:px-4 py-2 md:py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-green-600 rounded"></div>
              <span className="text-sm md:text-base font-semibold text-green-800">Dados do Parceiro</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 md:px-4 pb-3 md:pb-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              <div className="space-y-1 md:space-y-2 md:col-span-2">
                <Label className="text-xs">
                  Parceiro *
                  {pedido.CODPARC && pedido.CODPARC !== "0" && (
                    <span className="ml-2 text-[10px] text-green-600 font-semibold">
                      (✓ Selecionado - Código: {pedido.CODPARC})
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    value={parceiroSearch}
                    onChange={(e) => {
                      const value = e.target.value
                      handleParceiroSearchDebounced(value)
                      // O estado do pedido (CODPARC, CPF_CNPJ, etc.) só deve ser
                      // alterado pela função 'selecionarParceiro' ou pelo 'useEffect'
                    }}
                    onFocus={() => {
                      if (parceiroSearch.length >= 2 && parceiros.length > 0) {
                        setShowParceirosDropdown(true)
                      }
                    }}
                    onBlur={() => {
                      // Aguardar um pouco antes de fechar para permitir o clique
                      setTimeout(() => setShowParceirosDropdown(false), 200)
                    }}
                    placeholder={pedido.CODPARC && pedido.CODPARC !== "0" ? "Parceiro selecionado - clique para alterar" : "Digite o nome do parceiro (min. 2 caracteres)..."}
                    className={`text-sm ${pedido.CODPARC && pedido.CODPARC !== "0" ? 'border-green-500 bg-green-50 font-medium' : ''}`}
                  />

                  {/* Dropdown de parceiros */}
                  {showParceirosDropdown && parceiros.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {parceiros.map((parceiro: any) => (
                        <div
                          key={parceiro.CODPARC}
                          onClick={() => selecionarParceiro(parceiro)}
                          className="p-2 hover:bg-gray-100 cursor-pointer text-sm"
                        >
                          <div className="font-medium">{parceiro.NOMEPARC || parceiro.RAZAOSOCIAL}</div>
                          <div className="text-xs text-gray-500">
                            Código: {parceiro.CODPARC} | {parceiro.CGC_CPF}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Tipo Cliente *</Label>
                <Select value={pedido.TIPO_CLIENTE} onValueChange={(value) => setPedido({ ...pedido, TIPO_CLIENTE: value })}>
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">CPF/CNPJ *</Label>
                <Input
                  value={pedido.CPF_CNPJ || ''}
                  onChange={(e) => {
                    const valor = e.target.value
                    setPedido(prev => ({ ...prev, CPF_CNPJ: valor }))
                    console.log('📝 CPF/CNPJ atualizado:', valor)
                  }}
                  placeholder="Digite o CPF/CNPJ"
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">IE/RG *</Label>
                <Input
                  value={pedido.IE_RG || ''}
                  onChange={(e) => {
                    const valor = e.target.value
                    setPedido(prev => ({ ...prev, IE_RG: valor }))
                    console.log('📝 IE/RG atualizado:', valor)
                  }}
                  placeholder="Digite a IE/RG"
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Razão Social *</Label>
                <Input
                  value={pedido.RAZAO_SOCIAL || ''}
                  onChange={(e) => {
                    const valor = e.target.value
                    setPedido(prev => ({ ...prev, RAZAO_SOCIAL: valor }))
                    console.log('📝 Razão Social atualizada:', valor)
                  }}
                  placeholder="Digite a Razão Social"
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Dados da Nota */}
        <AccordionItem value="nota" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-3 md:px-4 py-2 md:py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-green-600 rounded"></div>
              <span className="text-sm md:text-base font-semibold text-green-800">Dados da Nota</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 md:px-4 pb-3 md:pb-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Data Negociação *</Label>
                <Input
                  type="date"
                  value={pedido.DTNEG}
                  onChange={(e) => setPedido({ ...pedido, DTNEG: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">
                  Vendedor *
                  {!isAdminUser && pedido.CODVEND !== "0" && (
                    <span className="ml-2 text-[10px] text-orange-600 font-semibold">(🔒 Automático)</span>
                  )}
                  {isAdminUser && (
                    <span className="ml-2 text-[10px] text-green-600 font-semibold">(✅ Editável)</span>
                  )}
                </Label>
                <div className="flex gap-1">
                  <Input
                    value={pedido.CODVEND}
                    readOnly
                    placeholder={!isAdminUser ? "Vendedor vinculado ao usuário" : "Código do Vendedor"}
                    className={`text-xs md:text-sm h-8 md:h-10 ${!isAdminUser ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-50'}`}
                  />
                  {isAdminUser && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        await carregarVendedores()
                        setShowVendedorModal(true)
                      }}
                      className="h-8 w-8 md:h-10 md:w-10"
                    >
                      <Search className="w-3 h-3 md:w-4 md:h-4" />
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">
                  Tipo Operação *
                  {tipoOperacaoBloqueado && (
                    <span className="ml-2 text-[10px] text-blue-600 font-semibold">(🔒 Definido pelo Modelo)</span>
                  )}
                </Label>
                <Select
                  value={pedido.CODTIPOPER}
                  onValueChange={(value) => {
                    if (!tipoOperacaoBloqueado) {
                      setPedido({ ...pedido, CODTIPOPER: value })
                    }
                  }}
                  disabled={tipoOperacaoBloqueado}
                >
                  <SelectTrigger className={`text-xs md:text-sm h-8 md:h-10 ${tipoOperacaoBloqueado ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Selecione o tipo de operação" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposOperacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPOPER} value={String(tipo.CODTIPOPER)}>
                        {tipo.DESCROPER}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">
                  Modelo da Nota *
                </Label>
                <Input
                  type="number"
                  value={modeloNota}
                  onChange={(e) => {
                    const valor = e.target.value
                    console.log('📝 Modelo da Nota digitado (onChange):', valor)
                    setModeloNota(valor)
                  }}
                  onBlur={(e) => {
                    const valor = e.target.value
                    console.log('📝 Modelo da Nota onBlur:', valor)
                    if (valor && valor.trim() !== '' && valor.trim() !== '0') {
                      buscarDadosModeloNota(valor)
                    }
                  }}
                  placeholder="Digite o número do modelo (obrigatório)"
                  className="text-xs md:text-sm h-8 md:h-10 border-red-300 focus:border-green-500 focus:ring-green-500"
                  required
                  min="1"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Tipo de Movimento</Label>
                <Select value={pedido.TIPMOV} onValueChange={(value) => setPedido({ ...pedido, TIPMOV: value })}>
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P">Pedido</SelectItem>
                    <SelectItem value="V">Venda</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">
                  Condição Comercial *
                  {condicaoComercialBloqueada && pedido.CODTIPVENDA !== '0' && (
                    <span className="ml-2 text-[10px] text-orange-600 font-semibold">(🔒 Prioridade 1: Parceiro)</span>
                  )}
                  {!condicaoComercialBloqueada && condicaoComercialPorModelo && pedido.CODTIPVENDA !== '0' && (
                    <span className="ml-2 text-[10px] text-blue-600">(📋 Prioridade 2: Modelo)</span>
                  )}
                  {(!condicaoComercialBloqueada && !condicaoComercialPorModelo) || pedido.CODTIPVENDA === '0' ? (
                    <span className="ml-2 text-[10px] text-green-600">(✅ Seleção manual)</span>
                  ) : null}
                </Label>
                <Select
                  value={String(pedido.CODTIPVENDA)}
                  onValueChange={(value) => {
                    // Permitir alteração manual se:
                    // 1. Não estiver bloqueado pelo parceiro (OU valor for 0)
                    // 2. Não estiver bloqueado pelo modelo (OU valor for 0)
                    const podeAlterar = pedido.CODTIPVENDA === '0' || (!condicaoComercialBloqueada && !condicaoComercialPorModelo)
                    if (podeAlterar) {
                      setPedido({ ...pedido, CODTIPVENDA: value })
                    }
                  }}
                  disabled={pedido.CODTIPVENDA !== '0' && (condicaoComercialBloqueada || condicaoComercialPorModelo)}
                >
                  <SelectTrigger className={`text-xs md:text-sm h-8 md:h-10 ${(pedido.CODTIPVENDA !== '0' && (condicaoComercialBloqueada || condicaoComercialPorModelo)) ? 'bg-gray-100 cursor-not-allowed' : ''}`}>
                    <SelectValue placeholder="Selecione a condição comercial" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposNegociacao.map((tipo) => (
                      <SelectItem key={tipo.CODTIPVENDA} value={String(tipo.CODTIPVENDA)}>
                        {tipo.DESCRTIPVENDA}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2 md:col-span-2">
                <Label className="text-xs">Observação</Label>
                <Textarea
                  value={pedido.OBSERVACAO}
                  onChange={(e) => setPedido({ ...pedido, OBSERVACAO: e.target.value })}
                  className="text-xs md:text-sm resize-none"
                  rows={2}
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Valores */}
        <AccordionItem value="valores" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-3 md:px-4 py-2 md:py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-green-600 rounded"></div>
              <span className="text-sm md:text-base font-semibold text-green-800">Valores</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-3 md:px-4 pb-3 md:pb-4 pt-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Valor Frete (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pedido.VLRFRETE}
                  onChange={(e) => setPedido({ ...pedido, VLRFRETE: parseFloat(e.target.value) || 0 })}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Tipo Frete</Label>
                <Select value={pedido.TIPFRETE} onValueChange={(value) => setPedido({ ...pedido, TIPFRETE: value })}>
                  <SelectTrigger className="text-xs md:text-sm h-8 md:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="S">Sem Frete</SelectItem>
                    <SelectItem value="C">CIF</SelectItem>
                    <SelectItem value="F">FOB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Outros Valores (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pedido.VLOUTROS}
                  onChange={(e) => setPedido({ ...pedido, VLOUTROS: parseFloat(e.target.value) || 0 })}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Desconto (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pedido.PERCDESC}
                  onChange={(e) => setPedido({ ...pedido, PERCDESC: parseFloat(e.target.value) || 0 })}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>

              <div className="space-y-1 md:space-y-2">
                <Label className="text-xs">Desconto Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pedido.VLRDESCTOT}
                  onChange={(e) => setPedido({ ...pedido, VLRDESCTOT: parseFloat(e.target.value) || 0 })}
                  className="text-xs md:text-sm h-8 md:h-10"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Itens do Pedido */}
        <AccordionItem value="itens" className="border rounded-lg bg-white">
          <AccordionTrigger className="px-3 md:px-4 py-2 md:py-3 hover:no-underline bg-gradient-to-r from-green-50 to-green-100 rounded-t-lg [&[data-state=closed]]:rounded-b-lg">
            <div className="flex items-center justify-between w-full pr-4">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-green-600 rounded"></div>
                <span className="text-sm md:text-base font-semibold text-green-800">
                  Itens do Pedido
                  {itens.length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full">
                      {itens.length}
                    </span>
                  )}
                </span>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  abrirModalNovoItem()
                }}
                size="sm"
                className="bg-green-600 hover:bg-green-700 h-7 md:h-8 text-[10px] md:text-xs px-2 md:px-3"
              >
                <Plus className="w-3 h-3 mr-1" />
                <span className="hidden sm:inline">Adicionar</span>
                <span className="sm:hidden">+</span>
              </Button>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-2 md:px-4 pb-3 md:pb-4 pt-3">
            {itens.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhum item adicionado
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2 md:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[10px] md:text-xs px-1 md:px-4">#</TableHead>
                      <TableHead className="text-[10px] md:text-xs px-1 md:px-4">Produto</TableHead>
                      <TableHead className="text-right text-[10px] md:text-xs px-1 md:px-4">Qtd</TableHead>
                      <TableHead className="text-right text-[10px] md:text-xs px-1 md:px-4 hidden sm:table-cell">Vlr. Unit.</TableHead>
                      <TableHead className="text-right text-[10px] md:text-xs px-1 md:px-4">Total</TableHead>
                      <TableHead className="text-[10px] md:text-xs px-1 md:px-4">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="text-[10px] md:text-xs px-1 md:px-4">{item.SEQUENCIA}</TableCell>
                        <TableCell className="text-[10px] md:text-xs px-1 md:px-4">
                          <div className="font-medium">{item.DESCRPROD}</div>
                          <div className="text-[8px] md:text-[10px] text-muted-foreground">Cód: {item.CODPROD}</div>
                        </TableCell>
                        <TableCell className="text-right text-[10px] md:text-xs px-1 md:px-4">{item.QTDNEG}</TableCell>
                        <TableCell className="text-right text-[10px] md:text-xs px-1 md:px-4 hidden sm:table-cell">{formatCurrency(item.VLRUNIT)}</TableCell>
                        <TableCell className="text-right text-[10px] md:text-xs px-1 md:px-4 font-medium text-green-700">
                          {formatCurrency(calcularTotal(item))}
                        </TableCell>
                        <TableCell className="px-1 md:px-4">
                          <div className="flex gap-0.5 md:gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => abrirModalEditarItem(index)}
                              className="h-6 w-6 md:h-7 md:w-7"
                              disabled={removendoItem === index}
                            >
                              <Edit className="w-2.5 h-2.5 md:w-3 md:h-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removerItem(index)}
                              className="h-6 w-6 md:h-7 md:w-7 text-red-600"
                              disabled={removendoItem === index}
                            >
                              {removendoItem === index ? (
                                <div className="w-2.5 h-2.5 md:w-3 md:h-3 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Trash2 className="w-2.5 h-2.5 md:w-3 md:h-3" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Total do Pedido */}
      <Card className="border-green-200">
        <CardContent className="pt-3 md:pt-4 p-3 md:p-4">
          <div className="flex justify-between items-center p-2 md:p-3 bg-green-50 rounded-lg">
            <span className="font-bold text-xs md:text-sm">Total do Pedido:</span>
            <span className="text-base md:text-lg font-bold text-green-700">{formatCurrency(calcularTotalPedido())}</span>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Busca de Produto */}
      <ProdutoSelectorModal
        isOpen={showProdutoModal}
        onClose={() => setShowProdutoModal(false)}
        onConfirm={async (produto: any, preco: number, quantidade: number) => {
          if (currentItemIndex !== null) {
            // Editando item existente
            const itemExistente = itens[currentItemIndex]
            const novoItem: ItemPedido = {
              ...itemExistente, // Preserva outros campos como PERCDESC, CODLOCALORIG, etc.
              CODPROD: String(produto.CODPROD),
              DESCRPROD: produto.DESCRPROD,
              QTDNEG: quantidade,
              VLRUNIT: preco
            }

            const novosItens = [...itens]
            novosItens[currentItemIndex] = novoItem
            setItens(novosItens)
            setPedido(prev => {
              const updatedItens = [...prev.itens]
              updatedItens[currentItemIndex] = novoItem
              return { ...prev, itens: updatedItens }
            })

            // 🆕 SINCRONIZAR EDIÇÃO COM O LEAD
            if (dadosIniciais.CODLEAD) {
              try {
                console.log('🔄 Buscando produto do lead para atualizar...');
                console.log('Editando item na posição:', currentItemIndex);

                const responseProdutos = await fetch(`/api/leads/produtos?codLead=${dadosIniciais.CODLEAD}`);

                if (!responseProdutos.ok) {
                  throw new Error('Erro ao buscar produtos do lead');
                }

                const produtosLead = await responseProdutos.json();
                console.log('Produtos do lead encontrados:', produtosLead);

                // Buscar pelo índice/posição do produto na lista (mais confiável)
                const produtoLead = produtosLead[currentItemIndex];

                console.log('Produto do lead encontrado (por índice):', produtoLead);

                if (produtoLead?.CODITEM) {
                  console.log('🔄 Atualizando produto CODITEM:', produtoLead.CODITEM);

                  const response = await fetch('/api/leads/produtos/atualizar', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      codItem: produtoLead.CODITEM,
                      codLead: dadosIniciais.CODLEAD,
                      quantidade: quantidade,
                      vlrunit: preco
                    })
                  });

                  if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Erro ao atualizar produto no lead');
                  }

                  const result = await response.json();
                  console.log('✅ Produto e lead atualizados. Novo total:', result.novoValorTotal);

                  toast.success("Produto e lead atualizados!", {
                    description: `Novo valor total: R$ ${result.novoValorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  });
                } else {
                  console.warn('⚠️ Produto não encontrado no lead, apenas atualizando localmente');
                  toast.success("Produto atualizado!");
                }
              } catch (error: any) {
                console.error('❌ Erro ao sincronizar edição:', error);
                toast.error('Erro ao atualizar lead: ' + error.message);
              }
            } else {
              toast.success("Produto atualizado!");
            }
          } else {
            // Adicionando novo item
            const novoItem: ItemPedido = {
              CODPROD: String(produto.CODPROD),
              DESCRPROD: produto.DESCRPROD,
              QTDNEG: quantidade,
              VLRUNIT: preco,
              PERCDESC: 0, // Resetar desconto ao adicionar novo item
              CODLOCALORIG: "700",
              CONTROLE: "007",
              AD_QTDBARRA: 1,
              CODVOL: "UN",
              IDALIQICMS: "0",
              SEQUENCIA: pedido.itens.length + 1
            }
            setItens([...itens, novoItem])
            setPedido(prev => ({ ...prev, itens: [...prev.itens, novoItem] }))

            // 🆕 SINCRONIZAR NOVO PRODUTO COM O LEAD
            if (dadosIniciais.CODLEAD) {
              try {
                const vlrTotal = preco * quantidade
                const response = await fetch('/api/leads/produtos/adicionar', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    CODLEAD: dadosIniciais.CODLEAD,
                    CODPROD: produto.CODPROD,
                    DESCRPROD: produto.DESCRPROD,
                    QUANTIDADE: quantidade,
                    VLRUNIT: preco,
                    VLRTOTAL: vlrTotal
                  })
                })

                if (response.ok) {
                  const result = await response.json()
                  console.log('✅ Produto adicionado ao lead. Novo total do lead:', result.novoValorTotal)
                  toast.success("Produto adicionado!", {
                    description: `Valor total do lead: R$ ${result.novoValorTotal.toFixed(2)}`
                  })
                } else {
                  throw new Error('Erro ao adicionar produto ao lead')
                }
              } catch (error: any) {
                console.error('❌ Erro ao sincronizar produto:', error)
                toast.error('Produto adicionado localmente, mas houve erro ao sincronizar com o lead')
              }
            } else {
              toast.success("Item adicionado")
            }
          }
          setShowProdutoModal(false)
          setCurrentItemIndex(null)
        }}
        titulo="Buscar Produto"
      />

      {/* Modal de Estoque */}
      <EstoqueModal
        isOpen={showEstoqueModal}
        onClose={() => {
          setShowEstoqueModal(false)
          setShowProdutoModal(true) // Reabrir modal de produto após fechar estoque
        }}
        product={produtoEstoqueSelecionado}
        onConfirm={handleConfirmarProdutoEstoque}
      />

      {/* Modal de Seleção de Vendedor */}
      <Dialog open={showVendedorModal} onOpenChange={setShowVendedorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Selecionar Vendedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="max-h-96 overflow-y-auto space-y-2">
              {vendedores.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Nenhum vendedor encontrado
                </div>
              ) : (
                vendedores.map((vendedor) => (
                  <Card
                    key={vendedor.CODVEND}
                    className="cursor-pointer hover:bg-green-50 transition-colors"
                    onClick={() => {
                      setPedido({ ...pedido, CODVEND: String(vendedor.CODVEND) })
                      setShowVendedorModal(false)
                      toast.success(`Vendedor ${vendedor.APELIDO} selecionado`)
                    }}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-sm">{vendedor.APELIDO}</p>
                          <p className="text-xs text-muted-foreground">Cód: {vendedor.CODVEND}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}