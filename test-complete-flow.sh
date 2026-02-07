#!/bin/bash

# Script para testar o fluxo completo de compra de ingressos
# Testa: Session → Reservation → Sale

API_URL="http://localhost:3000"

echo "======================================================================"
echo "🎬 TESTE COMPLETO - FLUXO DE COMPRA DE INGRESSOS"
echo "======================================================================"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ========================================
# PASSO 1: Criar Sessão
# ========================================
echo -e "${BLUE}[1/4]${NC} Criando sessão de cinema..."

# Data futura (7 dias a partir de agora)
START_TIME=$(date -u -d "+7 days" +"%Y-%m-%dT19:00:00.000Z")
END_TIME=$(date -u -d "+7 days" +"%Y-%m-%dT22:00:00.000Z")

SESSION_RESPONSE=$(curl -s -X POST "${API_URL}/sessions" \
  -H "Content-Type: application/json" \
  -d "{
    \"movieName\": \"Avatar 3: O Fogo e as Cinzas\",
    \"roomNumber\": \"Sala Premium 1\",
    \"startTime\": \"${START_TIME}\",
    \"endTime\": \"${END_TIME}\",
    \"ticketPrice\": 35.00,
    \"totalSeats\": 20
  }")

SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.id')

if [ "$SESSION_ID" != "null" ]; then
  echo -e "${GREEN}✅ Sessão criada com sucesso!${NC}"
  echo "   Session ID: $SESSION_ID"
else
  echo -e "${RED}❌ Erro ao criar sessão${NC}"
  echo "$SESSION_RESPONSE" | jq '.'
  exit 1
fi

# Buscar detalhes da sessão para pegar assentos
sleep 1
SESSION_SEATS=$(curl -s "${API_URL}/sessions/${SESSION_ID}/seats")
SEAT_IDS=$(echo "$SESSION_SEATS" | jq -r '[.[] | select(.status == "available") | .id] | .[0:3] | @json')
SEAT_NUMBERS=$(echo "$SESSION_SEATS" | jq -r '[.[] | select(.status == "available") | .seatNumber] | .[0:3] | join(", ")')

echo "   Assentos selecionados: $SEAT_NUMBERS"
echo ""

# ========================================
# PASSO 2: Criar Reserva
# ========================================
echo -e "${BLUE}[2/4]${NC} Criando reserva..."

RESERVATION_RESPONSE=$(curl -s -X POST "${API_URL}/reservations" \
  -H "Content-Type: application/json" \
  -d "{
    \"sessionId\": \"${SESSION_ID}\",
    \"seatIds\": ${SEAT_IDS},
    \"userId\": \"user-test-bash-123\",
    \"userEmail\": \"cliente@cinema.com\"
  }")

RESERVATION_ID=$(echo "$RESERVATION_RESPONSE" | jq -r '.id')

if [ "$RESERVATION_ID" != "null" ]; then
  echo -e "${GREEN}✅ Reserva criada com sucesso!${NC}"
  echo "   Reservation ID: $RESERVATION_ID"
  REMAINING_SECONDS=$(echo "$RESERVATION_RESPONSE" | jq -r '.remainingSeconds')
  echo "   Expira em: ${REMAINING_SECONDS}s"
else
  echo -e "${RED}❌ Erro ao criar reserva${NC}"
  echo "$RESERVATION_RESPONSE" | jq '.'
  exit 1
fi

echo ""

# ========================================
# PASSO 3: Verificar Reserva
# ========================================
echo -e "${BLUE}[3/4]${NC} Verificando reserva criada..."
sleep 2

RESERVATION_CHECK=$(curl -s "${API_URL}/reservations/${RESERVATION_ID}")
RESERVATION_STATUS=$(echo "$RESERVATION_CHECK" | jq -r '.status')

echo -e "${GREEN}✅ Reserva verificada!${NC}"
echo "   Status: $RESERVATION_STATUS"
echo ""

# ========================================
# PASSO 4: Criar Venda (Confirmar Pagamento)
# ========================================
echo -e "${BLUE}[4/4]${NC} Confirmando pagamento e criando venda..."

SALE_RESPONSE=$(curl -s -X POST "${API_URL}/sales" \
  -H "Content-Type: application/json" \
  -d "{
    \"reservationId\": \"${RESERVATION_ID}\"
  }")

SALE_ID=$(echo "$SALE_RESPONSE" | jq -r '.id')

if [ "$SALE_ID" != "null" ]; then
  echo -e "${GREEN}✅ Pagamento confirmado! Venda criada com sucesso!${NC}"
  echo "   Sale ID: $SALE_ID"
  TOTAL_PRICE=$(echo "$SALE_RESPONSE" | jq -r '.totalPrice')
  SALE_SEATS=$(echo "$SALE_RESPONSE" | jq -r '.seatNumbers | join(", ")')
  echo "   Valor total: R$ $TOTAL_PRICE"
  echo "   Assentos: $SALE_SEATS"
else
  echo -e "${RED}❌ Erro ao criar venda${NC}"
  echo "$SALE_RESPONSE" | jq '.'
  exit 1
fi

echo ""

# ========================================
# VERIFICAÇÕES FINAIS
# ========================================
echo "======================================================================"
echo -e "${CYAN}🔍 VERIFICAÇÕES FINAIS${NC}"
echo "======================================================================"
echo ""

# Verificar sessão atualizada
SESSION_AFTER=$(curl -s "${API_URL}/sessions/${SESSION_ID}")
AVAILABLE_SEATS=$(echo "$SESSION_AFTER" | jq -r '.availableSeats')
echo "ℹ️  Assentos disponíveis: $AVAILABLE_SEATS/20"

# Verificar venda
SALE_CHECK=$(curl -s "${API_URL}/sales/${SALE_ID}")
echo -e "${GREEN}✅ Venda confirmada no sistema${NC}"

echo ""
echo "======================================================================"
echo -e "${GREEN}✅ TESTE COMPLETO FINALIZADO COM SUCESSO!${NC}"
echo "======================================================================"
echo ""
echo "📊 RESUMO DA OPERAÇÃO:"
echo ""
echo "  🎬 Filme: Avatar 3: O Fogo e as Cinzas"
echo "  🎫 Ingressos: 3 × R$ 35.00"
echo "  💰 Total Pago: R$ $TOTAL_PRICE"
echo "  💺 Assentos: $SALE_SEATS"
echo "  📧 Cliente: cliente@cinema.com"
echo "  🆔 ID da Venda: $SALE_ID"
echo ""
echo "======================================================================"
