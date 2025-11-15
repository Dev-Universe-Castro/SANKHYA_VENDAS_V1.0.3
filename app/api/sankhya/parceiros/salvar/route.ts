import { NextResponse } from 'next/server';
import { sankhyaDynamicAPI } from '@/lib/sankhya-dynamic-api';
import { cacheService } from '@/lib/cache-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-service';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();

    // Obter ID_EMPRESA do usuário da sessão
    const idEmpresa = (session.user as any).idEmpresa;

    if (!idEmpresa) {
      return NextResponse.json({ 
        error: 'Usuário não possui empresa vinculada'
      }, { status: 400 });
    }

    console.log(`🔄 API Route - Salvando parceiro para empresa ${idEmpresa}:`, body);

    const payload = {
      serviceName: 'CRUDServiceProvider.saveRecord',
      requestBody: {
        dataSet: {
          rootEntity: 'Parceiro',
          includePresentationFields: 'S',
          entity: {
            fieldset: {
              list: Object.keys(body).join(', ')
            },
            ...body
          }
        }
      }
    };

    const resultado = await sankhyaDynamicAPI.fazerRequisicao(
      idEmpresa,
      '/service.sbr?serviceName=CRUDServiceProvider.saveRecord',
      'POST',
      payload
    );

    // Invalidar cache de parceiros
    cacheService.invalidateParceiros();
    console.log('✅ Cache de parceiros invalidado após salvar');

    return NextResponse.json(resultado, { status: 200 });
  } catch (error: any) {
    console.error('❌ API Route - Erro ao salvar parceiro:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    return NextResponse.json(
      { error: error.message || 'Erro ao salvar parceiro' },
      { status: 500 }
    );
  }
}