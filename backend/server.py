from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
import httpx
import hashlib
import hmac
import secrets
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = os.environ.get('JWT_SECRET', secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

class UserCreate(BaseModel):
    codigo_indicador: Optional[str] = None
    senha: str
    nome: str
    email: str
    cpf_cnpj: Optional[str] = None
    whatsapp: Optional[str] = None

class UserLogin(BaseModel):
    codigo: str
    senha: str

class UserUpdate(BaseModel):
    nome: Optional[str] = None
    email: Optional[str] = None
    whatsapp: Optional[str] = None
    pagina_personalizada: Optional[dict] = None

class AdminUserUpdate(BaseModel):
    taxa_percentual: Optional[float] = None
    taxa_fixa: Optional[float] = None
    indicacoes_liberadas: Optional[int] = None
    status: Optional[str] = None

class TransactionCreate(BaseModel):
    valor: float
    cpf_cnpj: Optional[str] = None
    descricao: Optional[str] = None

class WithdrawalCreate(BaseModel):
    valor: float
    chave_pix: str
    tipo_chave: str

class WithdrawalApprove(BaseModel):
    status: str
    motivo: Optional[str] = None

class TicketCreate(BaseModel):
    assunto: str
    mensagem: str
    prioridade: Optional[str] = "normal"

class TicketResponse(BaseModel):
    mensagem: str

class AdminConfig(BaseModel):
    fastdepix_api_key: Optional[str] = None
    fastdepix_webhook_secret: Optional[str] = None
    taxa_percentual_padrao: Optional[float] = None
    taxa_fixa_padrao: Optional[float] = None
    valor_minimo_indicacao: Optional[float] = None
    comissao_indicacao: Optional[float] = None
    nome_sistema: Optional[str] = None
    logo_url: Optional[str] = None

class PublicPaymentCreate(BaseModel):
    valor: float
    nome_pagador: str
    cpf_pagador: str

class ExternalTransactionCreate(BaseModel):
    amount: float
    description: Optional[str] = None
    payer_name: Optional[str] = None
    payer_cpf_cnpj: Optional[str] = None
    custom_id: Optional[str] = None

# ===================== UTILITIES =====================

def generate_code():
    return secrets.token_hex(4).upper()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="Usuário não encontrado")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Acesso negado")
    return user

async def get_config():
    config = await db.config.find_one({"type": "system"}, {"_id": 0})
    if not config:
        config = {
            "type": "system",
            "fastdepix_api_key": "",
            "fastdepix_webhook_secret": "",
            "taxa_percentual_padrao": 2.0,
            "taxa_fixa_padrao": 0.99,
            "valor_minimo_indicacao": 1000.0,
            "comissao_indicacao": 1.0,
            "nome_sistema": "FastPay",
            "logo_url": ""
        }
        await db.config.insert_one(config)
    return config

def validate_cpf_cnpj(value: str) -> bool:
    clean = re.sub(r'[^\d]', '', value)
    return len(clean) == 11 or len(clean) == 14

# ===================== INITIALIZATION =====================

async def init_admin():
    admin = await db.users.find_one({"role": "admin"})
    if not admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "codigo": "ADMIN001",
            "nome": "Administrador",
            "email": "admin@sistema.com",
            "senha": hash_password("admin123"),
            "role": "admin",
            "status": "active",
            "saldo_disponivel": 0.0,
            "saldo_comissoes": 0.0,
            "valor_movimentado": 0.0,
            "indicacoes_liberadas": 999,
            "indicacoes_usadas": 0,
            "taxa_percentual": 2.0,
            "taxa_fixa": 0.99,
            "indicador_id": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created: ADMIN001 / admin123")
    
    await get_config()

@app.on_event("startup")
async def startup():
    await init_admin()

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register")
async def register(data: UserCreate):
    # Código de indicador é OBRIGATÓRIO
    if not data.codigo_indicador:
        raise HTTPException(status_code=400, detail="Código de indicador é obrigatório")
    
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    indicador = await db.users.find_one({"codigo": data.codigo_indicador}, {"_id": 0})
    if not indicador:
        raise HTTPException(status_code=400, detail="Código de indicador inválido")
    if indicador.get("role") != "admin" and indicador.get("indicacoes_usadas", 0) >= indicador.get("indicacoes_liberadas", 0):
        raise HTTPException(status_code=400, detail="Indicador não tem mais indicações disponíveis")
    
    config = await get_config()
    
    new_user = {
        "id": str(uuid.uuid4()),
        "codigo": generate_code(),
        "nome": data.nome,
        "email": data.email,
        "cpf_cnpj": data.cpf_cnpj,
        "whatsapp": data.whatsapp,
        "senha": hash_password(data.senha),
        "role": "user",
        "status": "active",
        "saldo_disponivel": 0.0,
        "saldo_comissoes": 0.0,
        "valor_movimentado": 0.0,
        "indicacoes_liberadas": 0,
        "indicacoes_usadas": 0,
        "taxa_percentual": config.get("taxa_percentual_padrao", 2.0),
        "taxa_fixa": config.get("taxa_fixa_padrao", 0.99),
        "indicador_id": indicador["id"] if indicador else None,
        "pagina_personalizada": {"titulo": data.nome, "cor_primaria": "#22c55e"},
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    if indicador:
        await db.users.update_one(
            {"id": indicador["id"]},
            {"$inc": {"indicacoes_usadas": 1}}
        )
        
        await db.referrals.insert_one({
            "id": str(uuid.uuid4()),
            "indicador_id": indicador["id"],
            "indicado_id": new_user["id"],
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    del new_user["_id"]
    del new_user["senha"]
    token = create_access_token({"sub": new_user["id"]})
    
    return {"user": new_user, "token": token}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"codigo": data.codigo}, {"_id": 0})
    if not user or not verify_password(data.senha, user["senha"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Conta desativada")
    
    token = create_access_token({"sub": user["id"]})
    del user["senha"]
    
    return {"user": user, "token": token}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "senha": 0})
    return user_data

@api_router.put("/auth/me")
async def update_me(data: UserUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user["id"]}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0, "senha": 0})
    return updated

@api_router.put("/auth/password")
async def change_password(current_password: str, new_password: str, user: dict = Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]})
    if not verify_password(current_password, full_user["senha"]):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"senha": hash_password(new_password), "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Senha alterada com sucesso"}

# ===================== DASHBOARD ROUTES =====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    config = await get_config()
    
    transactions = await db.transactions.find({"parceiro_id": user["id"]}).to_list(1000)
    today = datetime.now(timezone.utc).date()
    
    total_transacoes = len(transactions)
    total_recebido = sum(t.get("valor", 0) for t in transactions if t.get("status") == "paid")
    transacoes_hoje = sum(1 for t in transactions if datetime.fromisoformat(t.get("created_at", "")).date() == today)
    valor_hoje = sum(t.get("valor", 0) for t in transactions if t.get("status") == "paid" and datetime.fromisoformat(t.get("created_at", "")).date() == today)
    
    referrals = await db.referrals.find({"indicador_id": user["id"]}).to_list(1000)
    
    can_refer = user_data.get("valor_movimentado", 0) >= config.get("valor_minimo_indicacao", 1000)
    indicacoes_disponiveis = user_data.get("indicacoes_liberadas", 0) - user_data.get("indicacoes_usadas", 0)
    
    recent_transactions = await db.transactions.find(
        {"parceiro_id": user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    chart_data = []
    for i in range(7):
        date = (datetime.now(timezone.utc) - timedelta(days=6-i)).date()
        day_total = sum(t.get("valor", 0) for t in transactions if t.get("status") == "paid" and datetime.fromisoformat(t.get("created_at", "")).date() == date)
        chart_data.append({"date": date.strftime("%d/%m"), "valor": day_total})
    
    return {
        "saldo_disponivel": user_data.get("saldo_disponivel", 0),
        "saldo_comissoes": user_data.get("saldo_comissoes", 0),
        "valor_movimentado": user_data.get("valor_movimentado", 0),
        "total_transacoes": total_transacoes,
        "total_recebido": total_recebido,
        "transacoes_hoje": transacoes_hoje,
        "valor_hoje": valor_hoje,
        "total_indicados": len(referrals),
        "indicacoes_disponiveis": indicacoes_disponiveis,
        "can_refer": can_refer,
        "valor_minimo_indicacao": config.get("valor_minimo_indicacao", 1000),
        "recent_transactions": recent_transactions,
        "chart_data": chart_data,
        "taxa_percentual": user_data.get("taxa_percentual", 2.0),
        "taxa_fixa": user_data.get("taxa_fixa", 0.99)
    }

# ===================== TRANSACTION ROUTES =====================

@api_router.post("/transactions")
async def create_transaction(data: TransactionCreate, user: dict = Depends(get_current_user)):
    config = await get_config()
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    first_deposit = await db.transactions.find_one({"parceiro_id": user["id"], "status": "paid"})
    first_deposit_time = datetime.fromisoformat(first_deposit["created_at"]) if first_deposit else None
    
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    today_transactions = await db.transactions.find({
        "parceiro_id": user["id"],
        "status": "paid",
        "created_at": {"$gte": today_start.isoformat()}
    }).to_list(1000)
    today_total = sum(t.get("valor", 0) for t in today_transactions)
    
    if data.cpf_cnpj:
        if first_deposit_time and (now - first_deposit_time) < timedelta(hours=24):
            if data.valor < 10 or data.valor > 500:
                raise HTTPException(status_code=400, detail="Primeiro depósito deve ser entre R$10,00 e R$500,00")
        else:
            if today_total + data.valor > 5000:
                raise HTTPException(status_code=400, detail="Limite diário de R$5.000,00 excedido")
    else:
        if today_total + data.valor > 500:
            raise HTTPException(status_code=400, detail="Depósitos anônimos limitados a R$500,00/dia")
    
    taxa_percentual = user_data.get("taxa_percentual", 2.0)
    taxa_fixa = user_data.get("taxa_fixa", 0.99)
    taxa_total = (data.valor * taxa_percentual / 100) + taxa_fixa
    valor_liquido = data.valor - taxa_total
    
    transaction = {
        "id": str(uuid.uuid4()),
        "parceiro_id": user["id"],
        "valor": data.valor,
        "valor_liquido": valor_liquido,
        "taxa_percentual": taxa_percentual,
        "taxa_fixa": taxa_fixa,
        "taxa_total": taxa_total,
        "cpf_cnpj": data.cpf_cnpj,
        "descricao": data.descricao or f"Pagamento para {user_data.get('nome', 'Parceiro')}",
        "status": "pending",
        "qr_code": None,
        "qr_code_base64": None,
        "pix_copia_cola": None,
        "fastdepix_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    api_key = config.get("fastdepix_api_key")
    if api_key:
        try:
            async with httpx.AsyncClient() as client_http:
                response = await client_http.post(
                    "https://api.fastdepix.com/api/v1/transactions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={
                        "amount": data.valor,
                        "description": transaction["descricao"],
                        "payer_cpf_cnpj": data.cpf_cnpj,
                        "custom_id": transaction["id"]
                    },
                    timeout=30.0
                )
                if response.status_code == 200 or response.status_code == 201:
                    result = response.json()
                    transaction["fastdepix_id"] = result.get("id")
                    transaction["qr_code"] = result.get("qr_code")
                    transaction["qr_code_base64"] = result.get("qr_code_base64")
                    transaction["pix_copia_cola"] = result.get("pix_copy_paste")
        except Exception as e:
            logger.error(f"FastDePix API error: {e}")
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    
    return transaction

@api_router.get("/transactions")
async def list_transactions(
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    query = {"parceiro_id": user["id"]}
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.transactions.count_documents(query)
    
    return {"transactions": transactions, "total": total}

@api_router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "parceiro_id": user["id"]},
        {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transaction

# ===================== WEBHOOK ROUTE =====================

@api_router.post("/webhook/fastdepix")
async def fastdepix_webhook(
    event: dict,
    x_signature: Optional[str] = Header(None, alias="X-Signature")
):
    config = await get_config()
    webhook_secret = config.get("fastdepix_webhook_secret")
    
    if webhook_secret and x_signature:
        import json
        payload = json.dumps(event, separators=(',', ':'))
        expected_signature = hmac.new(
            webhook_secret.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if not hmac.compare_digest(x_signature, expected_signature):
            raise HTTPException(status_code=401, detail="Assinatura inválida")
    
    event_type = event.get("event")
    transaction_data = event.get("data", {})
    custom_id = transaction_data.get("custom_id")
    
    if event_type == "transaction.paid" and custom_id:
        transaction = await db.transactions.find_one({"id": custom_id})
        if transaction and transaction.get("status") != "paid":
            await db.transactions.update_one(
                {"id": custom_id},
                {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            
            user = await db.users.find_one({"id": transaction["parceiro_id"]})
            if user:
                valor_liquido = transaction.get("valor_liquido", transaction["valor"])
                await db.users.update_one(
                    {"id": user["id"]},
                    {
                        "$inc": {
                            "saldo_disponivel": valor_liquido,
                            "valor_movimentado": transaction["valor"]
                        }
                    }
                )
                
                indicador_id = user.get("indicador_id")
                if indicador_id:
                    comissao = transaction["valor"] * config.get("comissao_indicacao", 1.0) / 100
                    await db.users.update_one(
                        {"id": indicador_id},
                        {"$inc": {"saldo_comissoes": comissao}}
                    )
                    
                    await db.commissions.insert_one({
                        "id": str(uuid.uuid4()),
                        "indicador_id": indicador_id,
                        "indicado_id": user["id"],
                        "transacao_id": custom_id,
                        "valor_transacao": transaction["valor"],
                        "percentual": config.get("comissao_indicacao", 1.0),
                        "valor_comissao": comissao,
                        "status": "credited",
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })
                
                updated_user = await db.users.find_one({"id": user["id"]})
                if updated_user.get("valor_movimentado", 0) >= config.get("valor_minimo_indicacao", 1000):
                    current_liberadas = updated_user.get("indicacoes_liberadas", 0)
                    if current_liberadas == 0:
                        await db.users.update_one(
                            {"id": user["id"]},
                            {"$set": {"indicacoes_liberadas": 1}}
                        )
    
    return {"status": "ok"}

# ===================== REFERRAL ROUTES =====================

@api_router.get("/referrals")
async def list_referrals(user: dict = Depends(get_current_user)):
    config = await get_config()
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    referrals = await db.referrals.find({"indicador_id": user["id"]}, {"_id": 0}).to_list(1000)
    
    enriched = []
    for ref in referrals:
        indicado = await db.users.find_one({"id": ref["indicado_id"]}, {"_id": 0, "senha": 0})
        if indicado:
            commissions = await db.commissions.find({"indicado_id": ref["indicado_id"]}, {"_id": 0}).to_list(1000)
            total_comissoes = sum(c.get("valor_comissao", 0) for c in commissions)
            enriched.append({
                **ref,
                "indicado_nome": indicado.get("nome"),
                "indicado_email": indicado.get("email"),
                "total_movimentado": indicado.get("valor_movimentado", 0),
                "total_comissoes": total_comissoes
            })
    
    can_refer = user_data.get("valor_movimentado", 0) >= config.get("valor_minimo_indicacao", 1000)
    indicacoes_disponiveis = user_data.get("indicacoes_liberadas", 0) - user_data.get("indicacoes_usadas", 0)
    
    return {
        "referrals": enriched,
        "can_refer": can_refer,
        "indicacoes_disponiveis": indicacoes_disponiveis,
        "valor_minimo_indicacao": config.get("valor_minimo_indicacao", 1000),
        "valor_atual": user_data.get("valor_movimentado", 0),
        "codigo_indicacao": user_data.get("codigo")
    }

# ===================== COMMISSION ROUTES =====================

@api_router.get("/commissions")
async def list_commissions(user: dict = Depends(get_current_user)):
    commissions = await db.commissions.find({"indicador_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    total = sum(c.get("valor_comissao", 0) for c in commissions)
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    return {
        "commissions": commissions,
        "total_comissoes": total,
        "saldo_comissoes": user_data.get("saldo_comissoes", 0)
    }

# ===================== WITHDRAWAL ROUTES =====================

@api_router.post("/withdrawals")
async def create_withdrawal(data: WithdrawalCreate, user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    total_disponivel = user_data.get("saldo_disponivel", 0) + user_data.get("saldo_comissoes", 0)
    
    if data.valor > total_disponivel:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    
    if data.valor < 10:
        raise HTTPException(status_code=400, detail="Valor mínimo de saque é R$10,00")
    
    withdrawal = {
        "id": str(uuid.uuid4()),
        "parceiro_id": user["id"],
        "valor": data.valor,
        "chave_pix": data.chave_pix,
        "tipo_chave": data.tipo_chave,
        "status": "pending",
        "motivo": None,
        "aprovado_por": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.withdrawals.insert_one(withdrawal)
    
    if data.valor <= user_data.get("saldo_disponivel", 0):
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"saldo_disponivel": -data.valor}}
        )
    else:
        resto = data.valor - user_data.get("saldo_disponivel", 0)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"saldo_disponivel": 0}, "$inc": {"saldo_comissoes": -resto}}
        )
    
    del withdrawal["_id"]
    return withdrawal

@api_router.get("/withdrawals")
async def list_withdrawals(user: dict = Depends(get_current_user)):
    withdrawals = await db.withdrawals.find({"parceiro_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"withdrawals": withdrawals}

# ===================== TICKET ROUTES =====================

@api_router.post("/tickets")
async def create_ticket(data: TicketCreate, user: dict = Depends(get_current_user)):
    ticket = {
        "id": str(uuid.uuid4()),
        "parceiro_id": user["id"],
        "parceiro_nome": user.get("nome"),
        "assunto": data.assunto,
        "prioridade": data.prioridade,
        "status": "open",
        "mensagens": [{
            "id": str(uuid.uuid4()),
            "autor_id": user["id"],
            "autor_nome": user.get("nome"),
            "autor_role": user.get("role"),
            "mensagem": data.mensagem,
            "created_at": datetime.now(timezone.utc).isoformat()
        }],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tickets.insert_one(ticket)
    del ticket["_id"]
    return ticket

@api_router.get("/tickets")
async def list_tickets(user: dict = Depends(get_current_user)):
    query = {"parceiro_id": user["id"]} if user.get("role") != "admin" else {}
    tickets = await db.tickets.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return {"tickets": tickets}

@api_router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, user: dict = Depends(get_current_user)):
    query = {"id": ticket_id}
    if user.get("role") != "admin":
        query["parceiro_id"] = user["id"]
    
    ticket = await db.tickets.find_one(query, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    return ticket

@api_router.post("/tickets/{ticket_id}/reply")
async def reply_ticket(ticket_id: str, data: TicketResponse, user: dict = Depends(get_current_user)):
    query = {"id": ticket_id}
    if user.get("role") != "admin":
        query["parceiro_id"] = user["id"]
    
    ticket = await db.tickets.find_one(query)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    
    new_message = {
        "id": str(uuid.uuid4()),
        "autor_id": user["id"],
        "autor_nome": user.get("nome"),
        "autor_role": user.get("role"),
        "mensagem": data.mensagem,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.tickets.update_one(
        {"id": ticket_id},
        {
            "$push": {"mensagens": new_message},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    updated = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    return updated

@api_router.put("/tickets/{ticket_id}/status")
async def update_ticket_status(ticket_id: str, status: str, user: dict = Depends(get_current_user)):
    if status not in ["open", "in_progress", "resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Status inválido")
    
    query = {"id": ticket_id}
    if user.get("role") != "admin":
        query["parceiro_id"] = user["id"]
    
    result = await db.tickets.update_one(query, {"$set": {"status": status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Ticket não encontrado")
    
    return {"message": "Status atualizado"}

# ===================== API INTEGRATION ROUTES =====================

@api_router.get("/api-keys")
async def get_api_keys(user: dict = Depends(get_current_user)):
    keys = await db.api_keys.find({"parceiro_id": user["id"]}, {"_id": 0}).to_list(100)
    return {"keys": keys}

@api_router.post("/api-keys")
async def create_api_key(name: str, user: dict = Depends(get_current_user)):
    key = {
        "id": str(uuid.uuid4()),
        "parceiro_id": user["id"],
        "name": name,
        "key": f"pk_{secrets.token_hex(24)}",
        "status": "active",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.api_keys.insert_one(key)
    del key["_id"]
    return key

@api_router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: str, user: dict = Depends(get_current_user)):
    result = await db.api_keys.delete_one({"id": key_id, "parceiro_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Chave não encontrada")
    return {"message": "Chave removida"}

# ===================== ADMIN ROUTES =====================

@api_router.get("/admin/users")
async def admin_list_users(
    search: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(50, le=100),
    skip: int = 0,
    admin: dict = Depends(get_admin_user)
):
    query = {"role": {"$ne": "admin"}}
    if search:
        query["$or"] = [
            {"nome": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
            {"codigo": {"$regex": search, "$options": "i"}}
        ]
    if status:
        query["status"] = status
    
    users = await db.users.find(query, {"_id": 0, "senha": 0}).skip(skip).limit(limit).to_list(limit)
    total = await db.users.count_documents(query)
    
    return {"users": users, "total": total}

@api_router.get("/admin/users/{user_id}")
async def admin_get_user(user_id: str, admin: dict = Depends(get_admin_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "senha": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user

@api_router.put("/admin/users/{user_id}")
async def admin_update_user(user_id: str, data: AdminUserUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "senha": 0})
    return updated

@api_router.get("/admin/withdrawals")
async def admin_list_withdrawals(
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    query = {}
    if status:
        query["status"] = status
    
    withdrawals = await db.withdrawals.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    enriched = []
    for w in withdrawals:
        user = await db.users.find_one({"id": w["parceiro_id"]}, {"_id": 0, "senha": 0})
        enriched.append({**w, "parceiro": user})
    
    return {"withdrawals": enriched}

@api_router.put("/admin/withdrawals/{withdrawal_id}")
async def admin_approve_withdrawal(
    withdrawal_id: str,
    data: WithdrawalApprove,
    admin: dict = Depends(get_admin_user)
):
    if data.status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Status inválido")
    
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Saque não encontrado")
    
    if withdrawal.get("status") != "pending":
        raise HTTPException(status_code=400, detail="Saque já processado")
    
    update_data = {
        "status": data.status,
        "motivo": data.motivo,
        "aprovado_por": admin["id"],
        "processed_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.withdrawals.update_one({"id": withdrawal_id}, {"$set": update_data})
    
    if data.status == "rejected":
        await db.users.update_one(
            {"id": withdrawal["parceiro_id"]},
            {"$inc": {"saldo_disponivel": withdrawal["valor"]}}
        )
    
    return {"message": f"Saque {data.status}"}

@api_router.get("/admin/config")
async def admin_get_config(admin: dict = Depends(get_admin_user)):
    config = await get_config()
    return config

@api_router.put("/admin/config")
async def admin_update_config(data: AdminConfig, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.config.update_one({"type": "system"}, {"$set": update_data})
    
    config = await get_config()
    return config

@api_router.get("/admin/stats")
async def admin_get_stats(admin: dict = Depends(get_admin_user)):
    total_users = await db.users.count_documents({"role": "user"})
    active_users = await db.users.count_documents({"role": "user", "status": "active"})
    
    transactions = await db.transactions.find({}, {"_id": 0}).to_list(10000)
    total_transactions = len(transactions)
    total_volume = sum(t.get("valor", 0) for t in transactions if t.get("status") == "paid")
    total_taxas = sum(t.get("taxa_total", 0) for t in transactions if t.get("status") == "paid")
    
    pending_withdrawals = await db.withdrawals.count_documents({"status": "pending"})
    open_tickets = await db.tickets.count_documents({"status": {"$in": ["open", "in_progress"]}})
    
    today = datetime.now(timezone.utc).date()
    chart_data = []
    for i in range(7):
        date = (datetime.now(timezone.utc) - timedelta(days=6-i)).date()
        day_transactions = [t for t in transactions if t.get("status") == "paid" and datetime.fromisoformat(t.get("created_at", "")).date() == date]
        chart_data.append({
            "date": date.strftime("%d/%m"),
            "volume": sum(t.get("valor", 0) for t in day_transactions),
            "count": len(day_transactions)
        })
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "total_transactions": total_transactions,
        "total_volume": total_volume,
        "total_taxas": total_taxas,
        "pending_withdrawals": pending_withdrawals,
        "open_tickets": open_tickets,
        "chart_data": chart_data
    }

# ===================== PUBLIC PAGE ROUTE =====================

@api_router.get("/p/{codigo}")
async def get_public_page(codigo: str):
    user = await db.users.find_one({"codigo": codigo, "status": "active"}, {"_id": 0, "senha": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Página não encontrada")
    
    return {
        "nome": user.get("nome"),
        "pagina_personalizada": user.get("pagina_personalizada", {}),
        "codigo": user.get("codigo")
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
