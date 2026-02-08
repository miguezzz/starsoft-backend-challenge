#!/bin/bash

# Script para testar race condition em reservas
# Simula múltiplos usuários tentando reservar o mesmo assento simultaneamente

API_URL="http://localhost:3000"
SESSION_ID="550e8400-e29b-41d4-a716-446655440000"
SEAT_ID="ce928e2b-2e8a-4ab9-8830-8aea592ae9bb"

echo "🎬 Testando Race Condition - Reserva de Assentos"
echo "================================================"
echo ""
echo "⚠️  IMPORTANTE: Substitua SESSION_ID e SEAT_ID com valores reais!"
echo ""

# Função para fazer requisição de reserva
make_reservation() {
  local user_id=$1
  local user_email="user${user_id}@test.com"
  
  echo "👤 User $user_id tentando reservar..."
  
  response=$(curl -s -w "\n%{http_code}" -X POST "${API_URL}/reservations" \
    -H "Content-Type: application/json" \
    -d '{
      "sessionId": "'"${SESSION_ID}"'",
      "seatIds": ["'"${SEAT_ID}"'"],
      "userId": "user-'"${user_id}"'",
      "userEmail": "'"${user_email}"'"
    }')
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" = "201" ]; then
    echo "✅ User $user_id: RESERVA CRIADA (201)"
    echo "$body" | jq '.id' 2>/dev/null || echo "$body"
  elif [ "$http_code" = "409" ]; then
    echo "⚠️  User $user_id: CONFLITO (409) - Assento já sendo reservado"
  else
    echo "❌ User $user_id: Erro $http_code"
    echo "$body"
  fi
  echo ""
}

# Simular 10 usuários tentando reservar o MESMO assento SIMULTANEAMENTE
echo "🚀 Iniciando teste com 10 requisições simultâneas..."
echo ""

for i in {1..10}; do
  make_reservation $i &
done

# Aguardar todas as requisições terminarem
wait

echo ""
echo "✅ Teste concluído!"
echo ""
echo "📊 RESULTADO ESPERADO:"
echo "   - Apenas 1 usuário deve conseguir reservar (201)"
echo "   - Os outros 9 devem receber conflito (409)"
echo ""
echo "🔍 Se mais de 1 usuário conseguiu reservar = RACE CONDITION detectada!"
