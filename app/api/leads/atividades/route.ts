
import { NextResponse } from 'next/server';
import { consultarAtividades } from '@/lib/oracle-leads-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const codLead = searchParams.get('codLead') || '';
    const idEmpresa = 1; // ID_EMPRESA fixo
    const ativo = searchParams.get('ativo') || 'S';

    console.log('📥 Consultando atividades', codLead ? `para lead: ${codLead}` : 'de todos os leads');
    
    const atividades = await consultarAtividades(codLead, idEmpresa, ativo);
    
    // Serializar manualmente para evitar referências circulares
    const atividadesSerializadas = atividades.map(atividade => ({
      CODATIVIDADE: atividade.CODATIVIDADE,
      CODLEAD: atividade.CODLEAD,
      TIPO: atividade.TIPO,
      TITULO: atividade.TITULO,
      DESCRICAO: atividade.DESCRICAO,
      DATA_HORA: atividade.DATA_HORA,
      DATA_INICIO: atividade.DATA_INICIO,
      DATA_FIM: atividade.DATA_FIM,
      CODUSUARIO: atividade.CODUSUARIO,
      DADOS_COMPLEMENTARES: atividade.DADOS_COMPLEMENTARES,
      NOME_USUARIO: atividade.NOME_USUARIO,
      COR: atividade.COR,
      ORDEM: atividade.ORDEM,
      ATIVO: atividade.ATIVO,
      STATUS: atividade.STATUS
    }));
    
    console.log(`📤 Retornando ${atividadesSerializadas.length} atividades`);
    return NextResponse.json(atividadesSerializadas);
    
  } catch (error: any) {
    console.error('❌ Erro ao consultar atividades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao consultar atividades' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
