import { NextResponse } from 'next/server';
import { adicionarProdutoLead } from '@/lib/oracle-leads-service';
import { oracleService } from '@/lib/oracle-db';

export async function POST(request: Request) {
  try {
    const produtoData = await request.json();

    const idEmpresa = 1; // ID_EMPRESA fixo

    console.log('➕ Adicionando produto ao lead:', produtoData);

    const novoProduto = await adicionarProdutoLead(produtoData, idEmpresa);

    // Recalcular o valor total do lead após adicionar o produto
    const totalResult = await oracleService.executeOne<{ TOTAL: number }>(
      `SELECT NVL(SUM(VLRTOTAL), 0) AS TOTAL 
       FROM AD_ADLEADSPRODUTOS 
       WHERE CODLEAD = :codLead 
         AND ID_EMPRESA = :idEmpresa 
         AND ATIVO = 'S'`,
      { codLead: produtoData.CODLEAD, idEmpresa }
    );

    const novoValorTotal = totalResult?.TOTAL || 0;
    console.log('💰 Novo valor total calculado após adição:', novoValorTotal);

    return NextResponse.json({ 
      ...novoProduto,
      novoValorTotal 
    });
  } catch (error: any) {
    console.error('❌ Erro ao adicionar produto:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao adicionar produto' },
      { status: 500 }
    );
  }
}