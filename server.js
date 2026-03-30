const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();

// Configuração CORS para aceitar qualquer origem (para todos os clientes)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configurações da API
const API_URL = 'https://api.propixbr.com/api/v1/deposit';
const CLIENT_ID = 'live_e9894e67d82a9c04a4b3529e06c9822c';
const CLIENT_SECRET = 'sk_d0e980b0de660495ede2ca121475d50510a19155ea865d64910bd81996fad48f';

// Rota para gerar PIX
app.post('/api/generate-pix', async (req, res) => {
    // Configurar CORS explicitamente
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    try {
        const { amount, description, payerName, payerDocument, payerEmail } = req.body;
        
        // Validar dados
        if (!amount || !payerName || !payerDocument) {
            return res.status(400).json({ 
                success: false, 
                message: 'Dados incompletos' 
            });
        }
        
        const requestData = {
            amount: amount,
            description: description || `Pagamento #${Date.now()}`,
            payerName: payerName,
            payerDocument: payerDocument,
            ...(payerEmail && { payerEmail: payerEmail })
        };
        
        console.log('📤 Enviando requisição para PropixBR:', {
            amount: requestData.amount,
            payerName: requestData.payerName,
            payerDocument: requestData.payerDocument
        });
        
        const response = await axios.post(API_URL, requestData, {
            headers: {
                'x-client-id': CLIENT_ID,
                'x-client-secret': CLIENT_SECRET,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        
        console.log('✅ Resposta da PropixBR recebida');
        
        // Retornar exatamente os dados que a API retornou
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ Erro na API PropixBR:', error.response?.data || error.message);
        
        let statusCode = 500;
        let errorMessage = 'Erro ao processar pagamento';
        
        if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data?.message || error.response.data?.error || error.message;
            
            if (statusCode === 401) {
                errorMessage = 'Credenciais da API inválidas';
            } else if (statusCode === 403) {
                errorMessage = 'Acesso negado pela API';
            } else if (statusCode === 429) {
                errorMessage = 'Muitas requisições. Aguarde um momento';
            }
            
            return res.status(statusCode).json({
                success: false,
                message: errorMessage
            });
        }
        
        res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: error.message
        });
    }
});

// Rota de saúde do servidor
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'online', 
        timestamp: new Date().toISOString(),
        message: 'Servidor funcionando perfeitamente!'
    });
});

// Rota raiz
app.get('/', (req, res) => {
    res.json({ 
        message: 'Servidor PIX Proxy está rodando!',
        endpoints: {
            health: '/api/health',
            generatePix: '/api/generate-pix'
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
    console.log(`📍 API disponível em: https://seu-app.railway.app/api`);
});