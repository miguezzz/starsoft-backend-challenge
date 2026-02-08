/**
 * Script de teste completo do fluxo de compra de ingressos
 * Testa: Session → Reservation → Sale
 */

const API_URL = 'http://localhost:3000';

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  console.log(`\n${colors.blue}[${step}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  log('green', `✅ ${message}`);
}

function logError(message) {
  log('red', `❌ ${message}`);
}

function logInfo(message) {
  log('cyan', `ℹ️  ${message}`);
}

// Função auxiliar para fazer requisições
async function request(method, endpoint, body = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_URL}${endpoint}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}: ${data.message || JSON.stringify(data)}`,
    );
  }

  return data;
}

// Delay helper
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function testCompleteFlow() {
  console.log('='.repeat(70));
  log('cyan', '🎬 TESTE COMPLETO - FLUXO DE COMPRA DE INGRESSOS');
  console.log('='.repeat(70));
  logInfo(`API: ${API_URL}`);
  console.log('');

  try {
    // ========================================
    // PASSO 1: Criar Sessão de Cinema
    // ========================================
    logStep('1/4', 'Criando sessão de cinema...');

    const sessionData = {
      movieName: 'Avatar 3: O Fogo e as Cinzas',
      roomNumber: 'Sala Premium 1',
      startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000).toISOString(), // +3h
      ticketPrice: 35.0,
      totalSeats: 20,
    };

    const session = await request('POST', '/sessions', sessionData);

    logSuccess('Sessão criada com sucesso!');
    logInfo(`  Session ID: ${session.id}`);
    logInfo(`  Filme: ${session.movieName}`);
    logInfo(`  Sala: ${session.roomNumber}`);
    logInfo(`  Preço: R$ ${session.ticketPrice}`);
    logInfo(`  Total de assentos: ${session.totalSeats}`);
    logInfo(`  Disponíveis: ${session.availableSeats}`);

    // Buscar assentos da sessão usando o endpoint correto
    await sleep(2000); // Esperar um pouco para garantir que os assentos foram criados
    const sessionSeats = await request('GET', `/sessions/${session.id}/seats`);
    
    if (!sessionSeats || sessionSeats.length === 0) {
      throw new Error('Sessão criada mas sem assentos disponíveis');
    }

    const availableSeats = sessionSeats.filter((s) => s.status === 'available');
    
    if (availableSeats.length === 0) {
      throw new Error('Nenhum assento disponível na sessão');
    }
    
    const selectedSeats = availableSeats.slice(0, 3); // Pegar 3 assentos

    logInfo(`  Assentos selecionados: ${selectedSeats.map((s) => s.seatNumber).join(', ')}`);

    // ========================================
    // PASSO 2: Criar Reserva
    // ========================================
    logStep('2/4', 'Criando reserva...');

    const reservationData = {
      sessionId: session.id,
      seatIds: selectedSeats.map((s) => s.id),
      userId: 'user-test-123',
      userEmail: 'cliente@cinema.com',
    };

    const reservation = await request('POST', '/reservations', reservationData);

    logSuccess('Reserva criada com sucesso!');
    logInfo(`  Reservation ID: ${reservation.id}`);
    logInfo(`  Assentos reservados: ${reservation.seatNumbers.join(', ')}`);
    logInfo(`  Status: ${reservation.status}`);
    logInfo(`  Expira em: ${reservation.remainingSeconds}s`);
    logInfo(`  Expira às: ${new Date(reservation.expiresAt).toLocaleString('pt-BR')}`);

    // ========================================
    // PASSO 3: Verificar Reserva
    // ========================================
    logStep('3/4', 'Verificando reserva criada...');
    await sleep(2000);
    const reservationCheck = await request('GET', `/reservations/${reservation.id}`);

    logSuccess('Reserva verificada!');
    logInfo(`  Status: ${reservationCheck.status}`);
    logInfo(`  Tempo restante: ${reservationCheck.remainingSeconds}s`);

    // ========================================
    // PASSO 4: Confirmar Pagamento (Criar Venda)
    // ========================================
    logStep('4/4', 'Confirmando pagamento e criando venda...');
    await sleep(2000);

    const saleData = {
      reservationId: reservation.id,
    };

    const sale = await request('POST', '/sales', saleData);

    logSuccess('Pagamento confirmado! Venda criada com sucesso!');
    logInfo(`  Sale ID: ${sale.id}`);
    logInfo(`  Assentos comprados: ${sale.seatNumbers.join(', ')}`);
    logInfo(`  Valor total: R$ ${sale.amount}`);
    logInfo(`  Email: ${sale.userEmail}`);
    logInfo(`  Data da compra: ${new Date(sale.createdAt).toLocaleString('pt-BR')}`);

    // ========================================
    // VERIFICAÇÕES FINAIS
    // ========================================
    console.log('\n' + '='.repeat(70));
    log('cyan', '🔍 VERIFICAÇÕES FINAIS');
    console.log('='.repeat(70));

    // Verificar se assentos estão vendidos
    logInfo('Verificando status dos assentos...');
    await sleep(500);
    const sessionSeatsAfterSale = await request('GET', `/sessions/${session.id}/seats`);
    
    const soldSeats = sessionSeatsAfterSale.filter((s) => s.status === 'sold');
    logSuccess(`${soldSeats.length} assentos marcados como vendidos`);
    
    const sessionAfterSale = await request('GET', `/sessions/${session.id}`);
    logInfo(`  Assentos disponíveis: ${sessionAfterSale.availableSeats}/${sessionAfterSale.totalSeats}`);

    // Verificar venda criada
    logInfo('Verificando venda criada...');
    await sleep(500);
    const saleCheck = await request('GET', `/sales/${sale.id}`);
    logSuccess('Venda confirmada no sistema');
    logInfo(`  Total: R$ ${saleCheck.amount}`);

    // Verificar histórico do usuário
    logInfo('Verificando histórico de compras do usuário...');
    await sleep(500);
    const userSales = await request('GET', `/sales/user/${reservationData.userId}`);
    logSuccess(`Usuário tem ${userSales.length} compra(s) no histórico`);

    // ========================================
    // RESUMO FINAL
    // ========================================
    console.log('\n' + '='.repeat(70));
    log('green', '✅ TESTE COMPLETO FINALIZADO COM SUCESSO!');
    console.log('='.repeat(70));
    console.log('');
    log('cyan', '📊 RESUMO DA OPERAÇÃO:');
    console.log('');
    console.log(`  🎬 Filme: ${session.movieName}`);
    console.log(`  🎫 Ingressos: ${selectedSeats.length} × R$ ${session.ticketPrice}`);
    console.log(`  💰 Total Pago: R$ ${sale.amount}`);
    console.log(`  💺 Assentos: ${sale.seatNumbers.join(', ')}`);
    console.log(`  📧 Cliente: ${sale.userEmail}`);
    console.log(`  🆔 ID da Venda: ${sale.id}`);
    console.log('');
    console.log('='.repeat(70));

    return {
      success: true,
      session,
      reservation,
      sale,
    };
  } catch (error) {
    console.log('\n' + '='.repeat(70));
    logError('ERRO NO TESTE!');
    console.log('='.repeat(70));
    console.error('');
    logError(`Mensagem: ${error.message}`);
    console.error('');
    
    if (error.stack) {
      log('yellow', 'Stack Trace:');
      console.error(error.stack);
    }
    
    console.log('');
    console.log('='.repeat(70));
    
    process.exit(1);
  }
}

// Executar teste
console.log('\n');
testCompleteFlow()
  .then((result) => {
    console.log('');
    log('green', '🎉 Todos os testes passaram!');
    console.log('');
    process.exit(0);
  })
  .catch((error) => {
    console.error('');
    logError('Erro fatal não capturado:');
    console.error(error);
    console.log('');
    process.exit(1);
  });
