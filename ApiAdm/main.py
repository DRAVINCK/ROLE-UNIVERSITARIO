from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import redis
import json

import uvicorn

app = FastAPI()

# Configurações
API_BANCO_URL = "http://localhost:3000/eventos"
HEADERS = {"x-api-key": "api123"}

# Redis setup
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

# Modelo de entrada
class Evento(BaseModel):
    nome: str
    categoria: str
    nome_local: str
    rua: str
    numero: str
    bairro: str
    cidade: str
    uf: str
    valor: float
    data_inicio: str
    data_fim: str

# Utilitário para verificar resposta
def verificar_resposta(response):
    try:
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError:
        raise HTTPException(status_code=response.status_code, detail=response.text)

# Criar evento
@app.post("/admeventos")
def criar_evento(evento: Evento):
    response = requests.post(API_BANCO_URL, json=evento.dict(), headers=HEADERS)
    
    if response.status_code == 201:
        # Invalida o cache de listagem
        redis_client.delete("todos_eventos")
        return {"status": "Evento criado com sucesso", "data": response.json()}
    else:
        raise HTTPException(status_code= response.status_code, detail= "nao foi possivel criar.")

# Buscar evento por nome com cache
@app.get("/admeventos/{nome}")
def buscar_evento_por_nome(nome: str):
    cache_key = f"evento:{nome}"
    
    if redis_client.exists(cache_key):
        evento = json.loads(redis_client.get(cache_key))
        return {"status": "Evento encontrado (cache)", "data": evento}
    
    url = f"{API_BANCO_URL}/{nome}"
    response = requests.get(url, headers=HEADERS)
    evento = verificar_resposta(response)

    redis_client.set(cache_key, json.dumps(evento), ex=30) 
    return {"status": "Evento encontrado", "data": evento}

# Listar todos os eventos com cache
@app.get("/admeventos")
def listar_eventos():
    cache_key = "todos_eventos"
    
    if redis_client.exists(cache_key):
        eventos = json.loads(redis_client.get(cache_key))
        return {"status": "Eventos encontrados (cache)", "data": eventos}
    
    response = requests.get(API_BANCO_URL, headers=HEADERS)
    eventos = verificar_resposta(response)

    redis_client.set(cache_key, json.dumps(eventos), ex=30)  # cache 5 minutos
    return {"status": "Eventos encontrados", "data": eventos}

# Deletar evento
@app.delete("/admeventos/{nome}")
def deletar_evento(nome: str):
    url = f"{API_BANCO_URL}/{nome}"
    response = requests.delete(url, headers=HEADERS)
    
    if response.status_code == 200:
        # Limpa cache relacionado
        redis_client.delete(f"evento:{nome}", "todos_eventos")
        return {"status": "Evento deletado com sucesso"}
    else:
        raise HTTPException(status_code=response.status_code, detail=response.text)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001)

    
