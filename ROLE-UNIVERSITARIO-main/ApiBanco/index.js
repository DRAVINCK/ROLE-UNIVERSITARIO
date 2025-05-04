require('dotenv').config();
const express = require('express');
const { PrismaClient } = require('./generated/prisma');
const redis = require('redis');
const app = express();
const port = 3000;

const prisma = new PrismaClient();

// Conectar ao Redis
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.connect();

// Middleware para fazer o parse de JSON
app.use(express.json());

// Middleware para proteger a rota com chave de API
function verifyApiKey(req, res, next) {
    const apiKey = req.headers['x-api-key'];
    if (apiKey !== process.env.API_KEY) {
        return res.status(403).json({ message: 'Acesso negado. Chave de API inválida.' });
    }
    next();
}

// Rota POST para criar um novo evento com cache
app.post('/eventos', verifyApiKey, async (req, res) => {
    const { nome, categoria, nome_local, rua, numero, bairro, cidade, uf, valor, data_inicio, data_fim } = req.body;

    try {
        // Verifica se o evento já está em cache
        const cacheKey = `evento:${nome}`;
        const cachedEvento = await redisClient.get(cacheKey);

        if (cachedEvento) {
            return res.status(200).json({ message: 'Evento recuperado do cache', evento: JSON.parse(cachedEvento) });
        }

        // Cria o evento no banco de dados
        const novoEvento = await prisma.evento.create({
            data: {
                nome,
                categoria,
                nome_local,
                rua,
                numero,
                bairro,
                cidade,
                uf,
                valor,
                data_inicio,
                data_fim
            }
        });


        await redisClient.del('todos_eventos');

        await redisClient.set(cacheKey, JSON.stringify(novoEvento), { EX: 60 });

        res.status(201).json({ message: 'Evento criado com sucesso', evento: novoEvento });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao criar evento', error: err });
    }
});


// Rota GET para listar eventos com cache
app.get('/eventos', async (req, res) => {
    try {
        // Verifica se os eventos já estão em cache
        const cachedEventos = await redisClient.get('todos_eventos');

        if (cachedEventos) {
            return res.status(200).json({ message: 'Eventos recuperados do cache', eventos: JSON.parse(cachedEventos) });
        }

        // Busca os eventos no banco de dados
        const eventos = await prisma.evento.findMany();

        await redisClient.set('todos_eventos', JSON.stringify(eventos), { EX: 60 });


        res.status(200).json({ message: 'Eventos recuperados com sucesso', eventos });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao listar eventos', error: err });
    }
});

// Rota GET para buscar um evento específico por NOME
app.get('/eventos/:nome', verifyApiKey, async (req, res) => {
    
    const { nome } = req.params;

    try {
        // Verifica se o evento já está em cache
        const cacheKey = `evento:${nome}`;
        const cachedEvento = await redisClient.get(cacheKey);

        if (cachedEvento) {
            return res.status(200).json({ message: 'Evento recuperado do cache', evento: JSON.parse(cachedEvento) });
        }

        // Busca o evento no banco de dados
        const evento = await prisma.evento.findFirst({
            where: { nome},
            
        });
        
        if (!evento) {
            return res.status(404).json({ message: 'Evento não encontrado' });
        }

        await redisClient.set(cacheKey, JSON.stringify(evento), { EX: 60 });

        console.log("aqui passou no banco 4");

        res.status(200).json({ message: 'Evento recuperado com sucesso', evento });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao buscar evento', error: err });
    }
});

// Rota DELETE para excluir um evento com confirmação de deletar
app.delete('/eventos/:nome', verifyApiKey, async (req, res) => {
    const { nome } = req.params;

    try {
        // Verifica se o evento existe
        const evento = await prisma.evento.findFirst({
            where: { nome }
        });

        if (!evento) {
            return res.status(404).json({ message: 'Evento não encontrado' });
        }

        // Exclui o evento do banco de dados
        await prisma.evento.delete({
            where: { id: evento.id }
        });

        // Remove o evento do cache
        const cacheKey = `evento:${nome}`;
        await redisClient.del(cacheKey);

        res.status(200).json({ message: 'Evento excluído com sucesso' });
    } catch (err) {
        res.status(500).json({ message: 'Erro ao excluir evento', error: err });
    }
});



// Iniciar o servidor
app.listen(port, () => {
    console.log(`API rodando na porta ${port}`);
});
