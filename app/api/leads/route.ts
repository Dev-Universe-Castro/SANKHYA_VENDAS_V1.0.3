import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { consultarLeads } from '@/lib/oracle-leads-service';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const userCookie = cookieStore.get('user');

    if (!userCookie) {
      console.log('❌ Cookie de usuário não encontrado');
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = JSON.parse(userCookie.value);
    console.log('👤 Usuário autenticado:', user.name, '(ID:', user.id, ', Role:', user.role, ', Admin:', user.isAdmin, ')');

    const idEmpresa = 1; // ID_EMPRESA fixo
    const isAdmin = user.isAdmin || user.role === 'Administrador';
    
    const leads = await consultarLeads(idEmpresa, user.id, isAdmin);
    console.log(`✅ API - ${leads.length} leads retornados do Oracle`);

    return NextResponse.json(leads, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar leads:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar leads' },
      { status: 500 }
    );
  }
}

// Desabilitar cache para esta rota
export const dynamic = 'force-dynamic';
export const revalidate = 0;