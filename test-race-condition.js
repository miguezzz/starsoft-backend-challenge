/**
 * Script de teste de race condition para reservas
 * Simula múltiplos usuários tentando reservar o mesmo assento
 */

const API_URL = 'http://localhost:3000';

// ⚠️ CONFIGURE ESTES VALORES COM DADOS REAIS DO SEU BANCO
const SESSION_ID = '550e8400-e29b-41d4-a716-446655440000';
const SEAT_ID = 'ce928e2b-2e8a-4ab9-8830-8aea592ae9bb';
const NUM_CONCURRENT_USERS = 20;

async function createReservation(userId) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_URL}/reservations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId: SESSION_ID,
        seatIds: [SEAT_ID],
        userId: `user-${userId}`,
        userEmail: `user${userId}@test.com`,
      }),
    });

    const duration = Date.now() - startTime;
    const data = await response.json();

    return {
      userId,
      status: response.status,
      duration,
      success: response.status === 201,
      data: response.status === 201 ? data.id : data.message,
    };
  } catch (error) {
    return {
      userId,
      status: 'ERROR',
      duration: Date.now() - startTime,
      success: false,
      data: error.message,
    };
  }
}

async function testRaceCondition() {
  console.log('🎬 Teste de Race Condition - Reserva de Assentos');
  console.log('='.repeat(60));
  console.log('');
  console.log(`📍 API: ${API_URL}`);
  console.log(`🎫 Session ID: ${SESSION_ID}`);
  console.log(`💺 Seat ID: ${SEAT_ID}`);
  console.log(`👥 Usuários simultâneos: ${NUM_CONCURRENT_USERS}`);
  console.log('');
  console.log('🚀 Iniciando teste...');
  console.log('');

  const startTime = Date.now();

  // Criar todas as promises simultaneamente
  const promises = Array.from({ length: NUM_CONCURRENT_USERS }, (_, i) =>
    createReservation(i + 1)
  );

  // Executar todas ao mesmo tempo
  const results = await Promise.all(promises);

  const totalDuration = Date.now() - startTime;

  // Analisar resultados
  const successful = results.filter((r) => r.success);
  const conflicts = results.filter((r) => r.status === 409);
  const errors = results.filter((r) => r.status === 'ERROR' || (r.status !== 201 && r.status !== 409));

  console.log('📊 RESULTADOS:');
  console.log('='.repeat(60));
  console.log('');
  console.log(`✅ Reservas criadas (201):     ${successful.length}`);
  console.log(`⚠️  Conflitos detectados (409): ${conflicts.length}`);
  console.log(`❌ Erros:                       ${errors.length}`);
  console.log(`⏱️  Tempo total:                ${totalDuration}ms`);
  console.log('');

  if (successful.length > 0) {
    console.log('✅ Reservas bem-sucedidas:');
    successful.forEach((r) => {
      console.log(`   - User ${r.userId}: ${r.data} (${r.duration}ms)`);
    });
    console.log('');
  }

  if (conflicts.length > 0) {
    console.log(`⚠️  ${conflicts.length} usuários receberam conflito (esperado!)`);
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ Erros encontrados:');
    errors.forEach((r) => {
      console.log(`   - User ${r.userId} (${r.status}): ${r.data}`);
    });
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('');
  console.log('🎯 ANÁLISE DO TESTE:');
  console.log('');

  if (successful.length === 0) {
    console.log('❌ FALHA: Nenhuma reserva foi criada!');
    console.log('   Verifique se SESSION_ID e SEAT_ID estão corretos.');
  } else if (successful.length === 1) {
    console.log('✅ SUCESSO: Apenas 1 reserva foi criada!');
    console.log('   O Redis está prevenindo race conditions corretamente.');
    console.log(`   Os outros ${conflicts.length} usuários receberam conflito (409).`);
  } else {
    console.log(`🚨 RACE CONDITION DETECTADA!`);
    console.log(`   ${successful.length} usuários conseguiram reservar o MESMO assento!`);
    console.log('   O lock distribuído NÃO está funcionando corretamente.');
  }

  console.log('');
  console.log('='.repeat(60));

  process.exit(successful.length === 1 ? 0 : 1);
}

// Executar teste
testRaceCondition().catch((error) => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
