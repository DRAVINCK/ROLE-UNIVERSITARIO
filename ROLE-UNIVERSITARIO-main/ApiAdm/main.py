from fastapi import FastAPI
import requests

app = FastAPI()

# Configurações
API_BANCO_URL = "http://localhost:8002/eventos"
HEADERS = {"x-api-key": "adm-secret-key"}

# Dados do evento
data = {
  "nome": "Feira de Tecnologia",
  "categoria": "Tecnologia",
  "nome_local": "Centro de Eventos IFSP",
  "rua": "Rua Central",
  "numero": "123",
  "bairro": "Universitário",
  "cidade": "São Paulo",
  "uf": "SP",
  "valor": 25.50,
  "data_inicio": "2025-05-10T18:00:00",
  "data_fim": "2025-05-10T23:00:00"
}

# Rota para criar evento
@app.post("/criar-evento")
def criar_evento():
    # Fazendo a requisição para a API_BANCO para criar o evento
    response = requests.post(API_BANCO_URL, json=data, headers=HEADERS)
    
    # Verificando se a resposta foi bem-sucedida
    if response.status_code == 201:  # Sucesso na criação
        return {"status": "Evento criado com sucesso", "data": response.json()}
    else:
        return {"status": "Erro ao criar evento", "error": response.json()}

# Rota para atualizar evento
@app.put("/atualizar-evento/{id_evento}")
def atualizar_evento(id_evento: int):
    # Atualiza os dados do evento (no caso, é só um exemplo com os mesmos dados)
    url = f"{API_BANCO_URL}/{id_evento}"
    response = requests.put(url, json=data, headers=HEADERS)
    
    # Verificando se a atualização foi bem-sucedida
    if response.status_code == 200:  # Sucesso na atualização
        return {"status": "Evento atualizado com sucesso", "data": response.json()}
    else:
        return {"status": "Erro ao atualizar evento", "error": response.json()}

# Rota para deletar evento
@app.delete("/deletar-evento/{id_evento}")
def deletar_evento(id_evento: int):
    url = f"{API_BANCO_URL}/{id_evento}"
    response = requests.delete(url, headers=HEADERS)
    
    # Verificando se a exclusão foi bem-sucedida
    if response.status_code == 200:  # Sucesso na exclusão
        return {"status": "Evento deletado com sucesso"}
    else:
        return {"status": "Erro ao deletar evento", "error": response.json()}
