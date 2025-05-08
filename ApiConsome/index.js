const express = require('express');
const axios = require('axios');
const redis = require('redis');

const app = express();
const PORT = 8003;

// Redis client
const redisClient = redis.createClient();
redisClient.connect().catch(console.error);

// Rota: GET /eventos
app.get('/Consomeeventos', async (req, res) => {
  const cacheKey = 'eventos_todos';

  try {
    // Tenta retornar do cache
    const cachedData = await redisClient.get(cacheKey);
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    // Busca da API origem
    const response = await axios.get('http://localhost:3000/eventos');
    let eventos = response.data.eventos;

    // Verifique se a resposta contém um array de eventos
    if (Array.isArray(eventos)) {
      // Armazenar no cache por 60 segundos
      await redisClient.set(cacheKey, JSON.stringify(eventos), { EX: 60 });

      return res.json(eventos);
    } else {
      console.error('Dados da API não são um array', eventos);
      return res.status(500).json({ erro: 'Erro ao formatar eventos, dados inválidos' });
    }
  } catch (err) {
    console.error('Erro ao buscar eventos:', err);
    return res.status(500).json({ erro: 'Erro ao buscar eventos' });
  }
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`API_CONSOME rodando em http://localhost:${PORT}`);
});
