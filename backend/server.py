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
import asyncio

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
    taxa_saque: Optional[float] = None
    taxa_transferencia: Optional[float] = None
    valor_minimo_saque: Optional[float] = None
    valor_minimo_transferencia: Optional[float] = None
    indicacoes_liberadas: Optional[int] = None
    status: Optional[str] = None

class AdminCredentialsUpdate(BaseModel):
    codigo: Optional[str] = None
    senha_atual: str
    senha_nova: Optional[str] = None

class TwoFactorSetup(BaseModel):
    enabled: bool

class TwoFactorVerify(BaseModel):
    code: str

class TransferCreate(BaseModel):
    valor: float
    carteira_destino: str

class TransactionCreate(BaseModel):
    valor: float
    cpf_cnpj: Optional[str] = None
    nome_pagador: Optional[str] = None
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
    taxa_saque_padrao: Optional[float] = None
    taxa_transferencia_padrao: Optional[float] = None
    valor_minimo_indicacao: Optional[float] = None
    valor_minimo_saque: Optional[float] = None
    valor_minimo_transferencia: Optional[float] = None
    comissao_indicacao: Optional[float] = None
    nome_sistema: Optional[str] = None
    logo_url: Optional[str] = None

class WithdrawalObservation(BaseModel):
    observacao: str

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

async def get_config(admin_id: str = None):
    """Obtém configuração do sistema. Se admin_id fornecido, busca config específica da rede"""
    if admin_id:
        config = await db.admin_configs.find_one({"admin_id": admin_id}, {"_id": 0})
        if config:
            return config
    
    # Config global padrão
    config = await db.config.find_one({"type": "system"}, {"_id": 0})
    if not config:
        config = {
            "type": "system",
            "fastdepix_api_key": "",
            "fastdepix_webhook_secret": "",
            "taxa_percentual_padrao": 2.0,
            "taxa_fixa_padrao": 0.99,
            "taxa_saque_padrao": 1.5,
            "taxa_transferencia_padrao": 0.5,
            "valor_minimo_indicacao": 1000.0,
            "comissao_indicacao": 1.0,
            "nome_sistema": "FastPay",
            "logo_url": ""
        }
        await db.config.insert_one(config)
    return config

async def get_user_network_admin(user_id: str):
    """Encontra o admin raiz da rede do usuário"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        return None
    
    # Se é admin e é o admin raiz (sem promoted_by ou promoted_by é ele mesmo)
    if user.get("role") == "admin" and not user.get("promoted_by"):
        return user
    
    # Se é admin promovido, retorna ele mesmo (ele tem sua própria config)
    if user.get("role") == "admin":
        return user
    
    # Se é usuário comum, sobe a cadeia até encontrar um admin
    current = user
    visited = set()
    while current:
        if current["id"] in visited:
            break
        visited.add(current["id"])
        
        if current.get("role") == "admin":
            return current
        
        if not current.get("indicador_id"):
            break
        
        current = await db.users.find_one({"id": current["indicador_id"]}, {"_id": 0})
    
    return None

async def get_config_for_user(user_id: str):
    """Obtém a configuração aplicável para um usuário baseado em sua rede"""
    admin = await get_user_network_admin(user_id)
    if admin:
        config = await get_config(admin["id"])
        if config and config.get("admin_id"):
            return config
    return await get_config()

def generate_wallet_id():
    """Gera ID de carteira único"""
    return f"W{secrets.token_hex(6).upper()}"

def validate_cpf_cnpj(value: str) -> bool:
    clean = re.sub(r'[^\d]', '', value)
    return len(clean) == 11 or len(clean) == 14

# ===================== INITIALIZATION =====================

async def init_admin():
    admin = await db.users.find_one({"codigo": "ADMIN001"})
    if not admin:
        admin_id = str(uuid.uuid4())
        admin_user = {
            "id": admin_id,
            "codigo": "ADMIN001",
            "carteira_id": generate_wallet_id(),
            "nome": "Administrador",
            "email": "admin@sistema.com",
            "senha": hash_password("admin123"),
            "role": "admin",
            "is_root_admin": True,  # Admin raiz não pode ser removido
            "promoted_by": None,  # Ninguém promoveu, é o original
            "status": "active",
            "saldo_disponivel": 0.0,
            "saldo_comissoes": 0.0,
            "valor_movimentado": 0.0,
            "indicacoes_liberadas": 999,
            "indicacoes_usadas": 0,
            "taxa_percentual": 2.0,
            "taxa_fixa": 0.99,
            "taxa_saque": 1.5,
            "taxa_transferencia": 0.5,
            "indicador_id": None,
            "two_factor_enabled": False,
            "two_factor_secret": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(admin_user)
        logger.info("Admin user created: ADMIN001 / admin123")
    else:
        # Adiciona campos novos se não existirem
        update_fields = {}
        if "carteira_id" not in admin:
            update_fields["carteira_id"] = generate_wallet_id()
        if "taxa_saque" not in admin:
            update_fields["taxa_saque"] = 1.5
        if "taxa_transferencia" not in admin:
            update_fields["taxa_transferencia"] = 0.5
        if "two_factor_enabled" not in admin:
            update_fields["two_factor_enabled"] = False
        if "two_factor_secret" not in admin:
            update_fields["two_factor_secret"] = None
        if "is_root_admin" not in admin:
            update_fields["is_root_admin"] = True
        if "promoted_by" not in admin:
            update_fields["promoted_by"] = None
        if update_fields:
            await db.users.update_one({"codigo": "ADMIN001"}, {"$set": update_fields})
    
    await get_config()

# ===================== BACKGROUND POLLING JOB =====================

async def process_paid_transaction(transaction: dict, config: dict):
    """Processa uma transação quando confirmada como paga"""
    transaction_id = transaction["id"]
    
    # Atualiza status
    paid_at = datetime.now(timezone.utc).isoformat()
    await db.transactions.update_one(
        {"id": transaction_id},
        {"$set": {"status": "paid", "paid_at": paid_at}}
    )
    
    # Atualiza saldo do parceiro
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
        
        # Comissão para indicador
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
                "transacao_id": transaction_id,
                "valor_transacao": transaction["valor"],
                "percentual": config.get("comissao_indicacao", 1.0),
                "valor_comissao": comissao,
                "status": "credited",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Libera indicação se atingiu meta
        updated_user = await db.users.find_one({"id": user["id"]})
        if updated_user.get("valor_movimentado", 0) >= config.get("valor_minimo_indicacao", 1000):
            current_liberadas = updated_user.get("indicacoes_liberadas", 0)
            if current_liberadas == 0:
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {"indicacoes_liberadas": 1}}
                )
    
    logger.info(f"Transaction {transaction_id} marked as paid")

async def check_pending_transactions():
    """Job de background que verifica transações pendentes a cada 5 segundos"""
    while True:
        try:
            config = await get_config()
            api_key = config.get("fastdepix_api_key")
            
            if api_key:
                # Busca transações pendentes com ID do FastDePix
                pending_txs = await db.transactions.find({
                    "status": "pending",
                    "fastdepix_id": {"$ne": None}
                }).to_list(100)
                
                for tx in pending_txs:
                    try:
                        async with httpx.AsyncClient() as client_http:
                            response = await client_http.get(
                                f"https://fastdepix.space/api/v1/transactions/{tx['fastdepix_id']}",
                                headers={
                                    "Authorization": f"Bearer {api_key}",
                                    "Content-Type": "application/json"
                                },
                                timeout=10.0
                            )
                            
                            if response.status_code == 200:
                                result = response.json()
                                if result.get("success"):
                                    tx_data = result.get("data", {})
                                    if tx_data.get("status") == "paid":
                                        await process_paid_transaction(tx, config)
                    except Exception as e:
                        logger.error(f"Error checking transaction {tx['id']}: {e}")
        except Exception as e:
            logger.error(f"Error in background polling: {e}")
        
        await asyncio.sleep(5)  # Espera 5 segundos

@app.on_event("startup")
async def startup():
    await init_admin()
    # Inicia o job de polling em background
    asyncio.create_task(check_pending_transactions())
    logger.info("Background payment polling started")

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
    
    # Admin pode indicar sem restrições
    if indicador.get("role") != "admin":
        # Verificar se tem indicações disponíveis (liberadas pelo admin ou por movimentação)
        indicacoes_liberadas = indicador.get("indicacoes_liberadas", 0)
        indicacoes_usadas = indicador.get("indicacoes_usadas", 0)
        
        if indicacoes_liberadas <= 0 or indicacoes_usadas >= indicacoes_liberadas:
            raise HTTPException(status_code=400, detail="Indicador não tem indicações disponíveis")
    
    config = await get_config()
    
    new_user = {
        "id": str(uuid.uuid4()),
        "codigo": generate_code(),
        "carteira_id": generate_wallet_id(),
        "nome": data.nome,
        "email": data.email,
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
        "taxa_saque": config.get("taxa_saque_padrao", 1.5),
        "taxa_transferencia": config.get("taxa_transferencia_padrao", 0.5),
        "indicador_id": indicador["id"],
        "pagina_personalizada": {"titulo": data.nome, "cor_primaria": "#22c55e"},
        "two_factor_enabled": False,
        "two_factor_secret": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(new_user)
    
    if indicador and indicador.get("role") != "admin":
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

# ===================== ADMIN CREDENTIALS =====================

@api_router.put("/admin/credentials")
async def update_admin_credentials(data: AdminCredentialsUpdate, admin: dict = Depends(get_admin_user)):
    full_admin = await db.users.find_one({"id": admin["id"]})
    if not verify_password(data.senha_atual, full_admin["senha"]):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.codigo:
        existing = await db.users.find_one({"codigo": data.codigo, "id": {"$ne": admin["id"]}})
        if existing:
            raise HTTPException(status_code=400, detail="Código já está em uso")
        update_fields["codigo"] = data.codigo
    
    if data.senha_nova:
        update_fields["senha"] = hash_password(data.senha_nova)
    
    await db.users.update_one({"id": admin["id"]}, {"$set": update_fields})
    
    updated = await db.users.find_one({"id": admin["id"]}, {"_id": 0, "senha": 0})
    return updated

# ===================== 2FA ROUTES =====================

@api_router.post("/auth/2fa/setup")
async def setup_2fa(user: dict = Depends(get_current_user)):
    import pyotp
    import base64
    
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    
    config = await get_config()
    nome_sistema = config.get("nome_sistema", "FastPay")
    
    provisioning_uri = totp.provisioning_uri(
        name=user.get("email", user.get("codigo")),
        issuer_name=nome_sistema
    )
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_secret": secret}}
    )
    
    return {
        "secret": secret,
        "qr_code_uri": provisioning_uri
    }

@api_router.post("/auth/2fa/verify")
async def verify_2fa(data: TwoFactorVerify, user: dict = Depends(get_current_user)):
    import pyotp
    
    full_user = await db.users.find_one({"id": user["id"]})
    secret = full_user.get("two_factor_secret")
    
    if not secret:
        raise HTTPException(status_code=400, detail="2FA não configurado")
    
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Código inválido")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_enabled": True}}
    )
    
    return {"message": "2FA ativado com sucesso"}

@api_router.post("/auth/2fa/disable")
async def disable_2fa(data: TwoFactorVerify, user: dict = Depends(get_current_user)):
    import pyotp
    
    full_user = await db.users.find_one({"id": user["id"]})
    secret = full_user.get("two_factor_secret")
    
    if not secret or not full_user.get("two_factor_enabled"):
        raise HTTPException(status_code=400, detail="2FA não está ativado")
    
    totp = pyotp.TOTP(secret)
    if not totp.verify(data.code):
        raise HTTPException(status_code=400, detail="Código inválido")
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"two_factor_enabled": False, "two_factor_secret": None}}
    )
    
    return {"message": "2FA desativado com sucesso"}

@api_router.get("/auth/2fa/status")
async def get_2fa_status(user: dict = Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {
        "enabled": full_user.get("two_factor_enabled", False)
    }

# Verificação 2FA no login (modificar login existente para suportar)
class UserLoginWith2FA(BaseModel):
    codigo: str
    senha: str
    two_factor_code: Optional[str] = None

@api_router.post("/auth/login-2fa")
async def login_with_2fa(data: UserLoginWith2FA):
    import pyotp
    
    user = await db.users.find_one({"codigo": data.codigo}, {"_id": 0})
    if not user or not verify_password(data.senha, user["senha"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if user.get("status") != "active":
        raise HTTPException(status_code=403, detail="Conta desativada")
    
    # Verifica se 2FA está habilitado
    if user.get("two_factor_enabled"):
        if not data.two_factor_code:
            return {"requires_2fa": True, "message": "Código 2FA necessário"}
        
        secret = user.get("two_factor_secret")
        totp = pyotp.TOTP(secret)
        if not totp.verify(data.two_factor_code):
            raise HTTPException(status_code=401, detail="Código 2FA inválido")
    
    token = create_access_token({"sub": user["id"]})
    del user["senha"]
    if "two_factor_secret" in user:
        del user["two_factor_secret"]
    
    return {"user": user, "token": token}

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
    
    indicacoes_liberadas = user_data.get("indicacoes_liberadas", 0)
    indicacoes_usadas = user_data.get("indicacoes_usadas", 0)
    indicacoes_disponiveis = indicacoes_liberadas - indicacoes_usadas
    can_refer = indicacoes_disponiveis > 0
    
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
            # Determinar tipo de usuário baseado no CPF/CNPJ
            cpf_cnpj_clean = (data.cpf_cnpj or "").replace(".", "").replace("-", "").replace("/", "")
            user_type = "company" if len(cpf_cnpj_clean) == 14 else "individual"
            
            async with httpx.AsyncClient() as client_http:
                response = await client_http.post(
                    "https://fastdepix.space/api/v1/transactions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "amount": data.valor,
                        "user": {
                            "name": user_data.get("nome", "Cliente"),
                            "cpf_cnpj": cpf_cnpj_clean,
                            "user_type": user_type
                        }
                    },
                    timeout=30.0
                )
                logger.info(f"FastDePix response: {response.status_code} - {response.text}")
                if response.status_code in [200, 201]:
                    result = response.json()
                    if result.get("success"):
                        tx_data = result.get("data", {})
                        transaction["fastdepix_id"] = tx_data.get("id")
                        transaction["qr_code"] = tx_data.get("qr_code")
                        transaction["pix_copia_cola"] = tx_data.get("qr_code_text")
        except Exception as e:
            logger.error(f"FastDePix API error: {e}")
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    
    return transaction

@api_router.get("/transactions")
async def list_transactions(
    status: Optional[str] = None,
    data_inicial: Optional[str] = None,
    data_final: Optional[str] = None,
    busca: Optional[str] = None,
    limit: int = Query(50, le=500),
    skip: int = 0,
    user: dict = Depends(get_current_user)
):
    query = {"parceiro_id": user["id"]}
    
    # Filtro por status
    if status:
        query["status"] = status
    
    # Filtro por data inicial
    if data_inicial:
        try:
            data_ini = datetime.fromisoformat(data_inicial.replace('Z', '+00:00'))
            query["created_at"] = {"$gte": data_ini.isoformat()}
        except:
            pass
    
    # Filtro por data final
    if data_final:
        try:
            data_fim = datetime.fromisoformat(data_final.replace('Z', '+00:00'))
            # Adiciona 1 dia para incluir todo o dia final
            data_fim = data_fim + timedelta(days=1)
            if "created_at" in query:
                query["created_at"]["$lte"] = data_fim.isoformat()
            else:
                query["created_at"] = {"$lte": data_fim.isoformat()}
        except:
            pass
    
    # Filtro por busca (CPF, nome ou ID)
    if busca:
        busca_clean = busca.strip()
        query["$or"] = [
            {"cpf_cnpj": {"$regex": busca_clean, "$options": "i"}},
            {"nome_pagador": {"$regex": busca_clean, "$options": "i"}},
            {"id": {"$regex": busca_clean, "$options": "i"}}
        ]
    
    # Busca as transações
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.transactions.count_documents(query)
    
    # Calcula estatísticas do filtro aplicado
    all_filtered = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    total_transacoes = len(all_filtered)
    transacoes_pagas = sum(1 for t in all_filtered if t.get("status") == "paid")
    # Volume total e líquido são apenas de transações PAGAS
    volume_total = sum(t.get("valor", 0) for t in all_filtered if t.get("status") == "paid")
    valor_liquido_total = sum(t.get("valor_liquido", 0) for t in all_filtered if t.get("status") == "paid")
    
    # Enriquece com dados do usuário (para quando admin visualizar)
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0, "senha": 0})
    
    return {
        "transactions": transactions, 
        "total": total,
        "stats": {
            "total_transacoes": total_transacoes,
            "volume_total": volume_total,
            "valor_liquido_total": valor_liquido_total,
            "transacoes_pagas": transacoes_pagas
        },
        "usuario": {
            "nome": user_data.get("nome"),
            "codigo": user_data.get("codigo")
        }
    }

@api_router.get("/transactions/{transaction_id}")
async def get_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "parceiro_id": user["id"]},
        {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return transaction

@api_router.get("/transactions/{transaction_id}/status")
async def check_transaction_status(transaction_id: str):
    """Verificar status da transação - o backend já faz polling automático"""
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    return {
        "status": transaction.get("status", "pending"),
        "paid_at": transaction.get("paid_at")
    }

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
    
    indicacoes_liberadas = user_data.get("indicacoes_liberadas", 0)
    indicacoes_usadas = user_data.get("indicacoes_usadas", 0)
    indicacoes_disponiveis = indicacoes_liberadas - indicacoes_usadas
    can_refer = indicacoes_disponiveis > 0
    
    return {
        "referrals": enriched,
        "can_refer": can_refer,
        "indicacoes_disponiveis": indicacoes_disponiveis,
        "indicacoes_liberadas": indicacoes_liberadas,
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

@api_router.get("/withdrawals/calculate")
async def calculate_withdrawal(valor: float, user: dict = Depends(get_current_user)):
    """Calcula quanto o usuário precisa ter para sacar um valor específico"""
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    taxa_saque = user_data.get("taxa_saque", 1.5)
    
    valor_taxa = valor * (taxa_saque / 100)
    valor_necessario = valor + valor_taxa
    total_disponivel = user_data.get("saldo_disponivel", 0) + user_data.get("saldo_comissoes", 0)
    
    return {
        "valor_solicitado": valor,
        "taxa_percentual": taxa_saque,
        "valor_taxa": round(valor_taxa, 2),
        "valor_necessario": round(valor_necessario, 2),
        "saldo_disponivel": total_disponivel,
        "pode_sacar": total_disponivel >= valor_necessario
    }

@api_router.post("/withdrawals")
async def create_withdrawal(data: WithdrawalCreate, user: dict = Depends(get_current_user)):
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    taxa_saque = user_data.get("taxa_saque", 1.5)
    
    valor_taxa = data.valor * (taxa_saque / 100)
    valor_necessario = data.valor + valor_taxa
    total_disponivel = user_data.get("saldo_disponivel", 0) + user_data.get("saldo_comissoes", 0)
    
    if valor_necessario > total_disponivel:
        raise HTTPException(status_code=400, detail=f"Saldo insuficiente. Você precisa de R${valor_necessario:.2f} para sacar R${data.valor:.2f}")
    
    if data.valor < 10:
        raise HTTPException(status_code=400, detail="Valor mínimo de saque é R$10,00")
    
    withdrawal = {
        "id": str(uuid.uuid4()),
        "parceiro_id": user["id"],
        "valor_solicitado": data.valor,
        "taxa_percentual": taxa_saque,
        "valor_taxa": round(valor_taxa, 2),
        "valor_total_retido": round(valor_necessario, 2),
        "chave_pix": data.chave_pix,
        "tipo_chave": data.tipo_chave,
        "status": "pending",
        "observacoes": [],
        "motivo": None,
        "aprovado_por": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.withdrawals.insert_one(withdrawal)
    
    # Deduz o valor total (valor + taxa) do saldo
    if valor_necessario <= user_data.get("saldo_disponivel", 0):
        await db.users.update_one(
            {"id": user["id"]},
            {"$inc": {"saldo_disponivel": -valor_necessario}}
        )
    else:
        resto = valor_necessario - user_data.get("saldo_disponivel", 0)
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"saldo_disponivel": 0}, "$inc": {"saldo_comissoes": -resto}}
        )
    
    del withdrawal["_id"]
    return withdrawal

@api_router.get("/withdrawals")
async def list_withdrawals(user: dict = Depends(get_current_user)):
    withdrawals = await db.withdrawals.find({"parceiro_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {
        "withdrawals": withdrawals,
        "taxa_saque": user_data.get("taxa_saque", 1.5)
    }

@api_router.get("/withdrawals/{withdrawal_id}")
async def get_withdrawal(withdrawal_id: str, user: dict = Depends(get_current_user)):
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id, "parceiro_id": user["id"]}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Saque não encontrado")
    return withdrawal

# ===================== TRANSFER ROUTES =====================

@api_router.get("/transfers/validate/{carteira_id}")
async def validate_transfer_wallet(carteira_id: str, user: dict = Depends(get_current_user)):
    """Valida se uma carteira existe e retorna informações do destinatário"""
    if carteira_id == user.get("carteira_id"):
        raise HTTPException(status_code=400, detail="Não é possível transferir para sua própria carteira")
    
    destinatario = await db.users.find_one({"carteira_id": carteira_id, "status": "active"}, {"_id": 0, "senha": 0})
    if not destinatario:
        raise HTTPException(status_code=404, detail="Carteira não encontrada")
    
    return {
        "nome": destinatario.get("nome"),
        "carteira_id": destinatario.get("carteira_id")
    }

@api_router.get("/transfers/calculate")
async def calculate_transfer(valor: float, user: dict = Depends(get_current_user)):
    """Calcula os valores da transferência"""
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    taxa_transferencia = user_data.get("taxa_transferencia", 0.5)
    
    valor_taxa = valor * (taxa_transferencia / 100)
    valor_recebido = valor - valor_taxa
    total_disponivel = user_data.get("saldo_disponivel", 0) + user_data.get("saldo_comissoes", 0)
    
    return {
        "valor_enviado": valor,
        "taxa_percentual": taxa_transferencia,
        "valor_taxa": round(valor_taxa, 2),
        "valor_recebido": round(valor_recebido, 2),
        "saldo_disponivel": total_disponivel,
        "pode_transferir": total_disponivel >= valor
    }

@api_router.post("/transfers")
async def create_transfer(data: TransferCreate, user: dict = Depends(get_current_user)):
    """Cria uma transferência entre usuários"""
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    if data.carteira_destino == user_data.get("carteira_id"):
        raise HTTPException(status_code=400, detail="Não é possível transferir para sua própria carteira")
    
    destinatario = await db.users.find_one({"carteira_id": data.carteira_destino, "status": "active"})
    if not destinatario:
        raise HTTPException(status_code=404, detail="Carteira de destino não encontrada")
    
    if data.valor < 1:
        raise HTTPException(status_code=400, detail="Valor mínimo de transferência é R$1,00")
    
    taxa_transferencia = user_data.get("taxa_transferencia", 0.5)
    valor_taxa = data.valor * (taxa_transferencia / 100)
    valor_recebido = data.valor - valor_taxa
    
    total_disponivel = user_data.get("saldo_disponivel", 0) + user_data.get("saldo_comissoes", 0)
    if data.valor > total_disponivel:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    
    transfer_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Transação de saída (remetente)
    tx_saida = {
        "id": str(uuid.uuid4()),
        "transfer_id": transfer_id,
        "parceiro_id": user["id"],
        "tipo": "transfer_out",
        "valor": data.valor,
        "valor_liquido": -data.valor,
        "taxa_percentual": taxa_transferencia,
        "taxa_total": round(valor_taxa, 2),
        "destinatario_id": destinatario["id"],
        "destinatario_nome": destinatario.get("nome"),
        "destinatario_carteira": data.carteira_destino,
        "status": "paid",
        "descricao": f"Transferência para {destinatario.get('nome')}",
        "created_at": now
    }
    
    # Transação de entrada (destinatário)
    tx_entrada = {
        "id": str(uuid.uuid4()),
        "transfer_id": transfer_id,
        "parceiro_id": destinatario["id"],
        "tipo": "transfer_in",
        "valor": round(valor_recebido, 2),
        "valor_liquido": round(valor_recebido, 2),
        "remetente_id": user["id"],
        "remetente_nome": user_data.get("nome"),
        "remetente_carteira": user_data.get("carteira_id"),
        "status": "paid",
        "descricao": f"Transferência de {user_data.get('nome')}",
        "created_at": now
    }
    
    # Registra as transações
    await db.transactions.insert_one(tx_saida)
    await db.transactions.insert_one(tx_entrada)
    
    # Atualiza saldo do remetente
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
    
    # Atualiza saldo do destinatário
    await db.users.update_one(
        {"id": destinatario["id"]},
        {"$inc": {"saldo_disponivel": valor_recebido}}
    )
    
    # Registro da transferência
    transfer = {
        "id": transfer_id,
        "remetente_id": user["id"],
        "remetente_nome": user_data.get("nome"),
        "remetente_carteira": user_data.get("carteira_id"),
        "destinatario_id": destinatario["id"],
        "destinatario_nome": destinatario.get("nome"),
        "destinatario_carteira": data.carteira_destino,
        "valor_enviado": data.valor,
        "taxa_percentual": taxa_transferencia,
        "valor_taxa": round(valor_taxa, 2),
        "valor_recebido": round(valor_recebido, 2),
        "status": "completed",
        "created_at": now
    }
    
    await db.transfers.insert_one(transfer)
    
    return {
        "success": True,
        "transfer_id": transfer_id,
        "valor_enviado": data.valor,
        "valor_recebido": round(valor_recebido, 2),
        "destinatario": destinatario.get("nome")
    }

@api_router.get("/transfers")
async def list_transfers(user: dict = Depends(get_current_user)):
    """Lista transferências do usuário (enviadas e recebidas)"""
    transfers = await db.transfers.find({
        "$or": [
            {"remetente_id": user["id"]},
            {"destinatario_id": user["id"]}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    user_data = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    
    return {
        "transfers": transfers,
        "carteira_id": user_data.get("carteira_id"),
        "taxa_transferencia": user_data.get("taxa_transferencia", 0.5)
    }

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
        # Devolve o valor total retido (valor + taxa)
        valor_devolver = withdrawal.get("valor_total_retido", withdrawal.get("valor_solicitado", withdrawal.get("valor", 0)))
        await db.users.update_one(
            {"id": withdrawal["parceiro_id"]},
            {"$inc": {"saldo_disponivel": valor_devolver}}
        )
    
    return {"message": f"Saque {data.status}"}

@api_router.post("/admin/withdrawals/{withdrawal_id}/observation")
async def admin_add_observation(
    withdrawal_id: str,
    data: WithdrawalObservation,
    admin: dict = Depends(get_admin_user)
):
    """Adiciona uma observação ao saque"""
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Saque não encontrado")
    
    observation = {
        "id": str(uuid.uuid4()),
        "admin_id": admin["id"],
        "admin_nome": admin.get("nome"),
        "observacao": data.observacao,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$push": {"observacoes": observation}}
    )
    
    updated = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    return updated

@api_router.get("/admin/withdrawals/{withdrawal_id}")
async def admin_get_withdrawal(withdrawal_id: str, admin: dict = Depends(get_admin_user)):
    """Obtém detalhes de um saque específico"""
    withdrawal = await db.withdrawals.find_one({"id": withdrawal_id}, {"_id": 0})
    if not withdrawal:
        raise HTTPException(status_code=404, detail="Saque não encontrado")
    
    user = await db.users.find_one({"id": withdrawal["parceiro_id"]}, {"_id": 0, "senha": 0})
    return {**withdrawal, "parceiro": user}

@api_router.get("/admin/config")
async def admin_get_config(admin: dict = Depends(get_admin_user)):
    config = await get_config()
    return config

@api_router.put("/admin/config")
async def admin_update_config(data: AdminConfig, admin: dict = Depends(get_admin_user)):
    # Pega apenas os campos que foram enviados (não None e não string vazia para campos de texto)
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            # Para strings, aceita string vazia como valor válido (para limpar campos)
            # Mas para campos numéricos, só aceita se não for None
            update_data[k] = v
    
    if update_data:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        await db.config.update_one(
            {"type": "system"}, 
            {"$set": update_data},
            upsert=True  # Cria se não existir
        )
    
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
    
    config = await get_config()
    
    # Verificar se pode receber indicações
    pode_indicar = True
    motivo_bloqueio = None
    
    if user.get("role") != "admin":
        indicacoes_liberadas = user.get("indicacoes_liberadas", 0)
        indicacoes_usadas = user.get("indicacoes_usadas", 0)
        
        # Só pode indicar se tem indicações liberadas e disponíveis
        if indicacoes_liberadas <= 0 or indicacoes_usadas >= indicacoes_liberadas:
            pode_indicar = False
            motivo_bloqueio = "Sem indicações disponíveis"
    
    return {
        "nome": user.get("nome"),
        "pagina_personalizada": user.get("pagina_personalizada", {}),
        "codigo": user.get("codigo"),
        "nome_sistema": config.get("nome_sistema", "FastPay"),
        "logo_url": config.get("logo_url", ""),
        "pode_indicar": pode_indicar,
        "motivo_bloqueio": motivo_bloqueio
    }

@api_router.post("/p/{codigo}/pay")
async def create_public_payment(codigo: str, data: PublicPaymentCreate):
    """Criar pagamento público via link personalizado"""
    user = await db.users.find_one({"codigo": codigo, "status": "active"}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Página não encontrada")
    
    if data.valor < 10:
        raise HTTPException(status_code=400, detail="Valor mínimo é R$10,00")
    
    config = await get_config()
    
    taxa_percentual = user.get("taxa_percentual", 2.0)
    taxa_fixa = user.get("taxa_fixa", 0.99)
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
        "cpf_cnpj": data.cpf_pagador,
        "nome_pagador": data.nome_pagador,
        "descricao": f"Pagamento para {user.get('nome', 'Parceiro')}",
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
            cpf_cnpj_clean = (data.cpf_pagador or "").replace(".", "").replace("-", "").replace("/", "")
            user_type = "company" if len(cpf_cnpj_clean) == 14 else "individual"
            
            async with httpx.AsyncClient() as client_http:
                response = await client_http.post(
                    "https://fastdepix.space/api/v1/transactions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "amount": data.valor,
                        "user": {
                            "name": data.nome_pagador,
                            "cpf_cnpj": cpf_cnpj_clean,
                            "user_type": user_type
                        }
                    },
                    timeout=30.0
                )
                logger.info(f"FastDePix public payment response: {response.status_code} - {response.text}")
                if response.status_code in [200, 201]:
                    result = response.json()
                    if result.get("success"):
                        tx_data = result.get("data", {})
                        transaction["fastdepix_id"] = tx_data.get("id")
                        transaction["qr_code"] = tx_data.get("qr_code")
                        transaction["pix_copia_cola"] = tx_data.get("qr_code_text")
        except Exception as e:
            logger.error(f"FastDePix API error: {e}")
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    
    return transaction

# ===================== EXTERNAL API (Para integrações de terceiros) =====================

async def get_user_by_api_key(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="API Key inválida")
    
    api_key = authorization.replace("Bearer ", "")
    key_doc = await db.api_keys.find_one({"key": api_key, "status": "active"})
    if not key_doc:
        raise HTTPException(status_code=401, detail="API Key inválida ou inativa")
    
    user = await db.users.find_one({"id": key_doc["parceiro_id"]}, {"_id": 0})
    if not user or user.get("status") != "active":
        raise HTTPException(status_code=401, detail="Usuário inativo")
    
    return user

@api_router.post("/v1/transactions")
async def external_create_transaction(data: ExternalTransactionCreate, user: dict = Depends(get_user_by_api_key)):
    """API externa para criação de transações (compatível com FastDePix)"""
    if data.amount < 10:
        raise HTTPException(status_code=400, detail="Valor mínimo é R$10,00")
    
    config = await get_config()
    
    taxa_percentual = user.get("taxa_percentual", 2.0)
    taxa_fixa = user.get("taxa_fixa", 0.99)
    taxa_total = (data.amount * taxa_percentual / 100) + taxa_fixa
    valor_liquido = data.amount - taxa_total
    
    transaction = {
        "id": str(uuid.uuid4()),
        "parceiro_id": user["id"],
        "valor": data.amount,
        "valor_liquido": valor_liquido,
        "taxa_percentual": taxa_percentual,
        "taxa_fixa": taxa_fixa,
        "taxa_total": taxa_total,
        "cpf_cnpj": data.payer_cpf_cnpj,
        "nome_pagador": data.payer_name,
        "descricao": data.description or f"Pagamento via API",
        "custom_id": data.custom_id,
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
            cpf_cnpj_clean = (data.payer_cpf_cnpj or "").replace(".", "").replace("-", "").replace("/", "")
            user_type = "company" if len(cpf_cnpj_clean) == 14 else "individual"
            
            async with httpx.AsyncClient() as client_http:
                response = await client_http.post(
                    "https://fastdepix.space/api/v1/transactions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "amount": data.amount,
                        "user": {
                            "name": data.payer_name or "Cliente",
                            "cpf_cnpj": cpf_cnpj_clean,
                            "user_type": user_type
                        }
                    },
                    timeout=30.0
                )
                logger.info(f"FastDePix external API response: {response.status_code} - {response.text}")
                if response.status_code in [200, 201]:
                    result = response.json()
                    if result.get("success"):
                        tx_data = result.get("data", {})
                        transaction["fastdepix_id"] = tx_data.get("id")
                        transaction["qr_code"] = tx_data.get("qr_code")
                        transaction["pix_copia_cola"] = tx_data.get("qr_code_text")
        except Exception as e:
            logger.error(f"FastDePix API error: {e}")
    
    await db.transactions.insert_one(transaction)
    del transaction["_id"]
    
    # Retorno compatível com FastDePix
    return {
        "id": transaction["id"],
        "amount": transaction["valor"],
        "status": transaction["status"],
        "qr_code": transaction["qr_code"],
        "qr_code_base64": transaction["qr_code_base64"],
        "pix_copy_paste": transaction["pix_copia_cola"],
        "custom_id": transaction.get("custom_id"),
        "created_at": transaction["created_at"]
    }

@api_router.get("/v1/transactions/{transaction_id}")
async def external_get_transaction(transaction_id: str, user: dict = Depends(get_user_by_api_key)):
    """API externa para consultar transação"""
    transaction = await db.transactions.find_one(
        {"id": transaction_id, "parceiro_id": user["id"]},
        {"_id": 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    
    return {
        "id": transaction["id"],
        "amount": transaction["valor"],
        "status": transaction["status"],
        "qr_code": transaction.get("qr_code"),
        "qr_code_base64": transaction.get("qr_code_base64"),
        "pix_copy_paste": transaction.get("pix_copia_cola"),
        "custom_id": transaction.get("custom_id"),
        "paid_at": transaction.get("paid_at"),
        "created_at": transaction["created_at"]
    }

@api_router.get("/v1/transactions")
async def external_list_transactions(
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(50, le=500),
    user: dict = Depends(get_user_by_api_key)
):
    """API externa para listar transações com filtros e estatísticas"""
    query = {"parceiro_id": user["id"]}
    
    if status:
        query["status"] = status
    
    # Filtro por data inicial
    if start_date:
        try:
            data_ini = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query["created_at"] = {"$gte": data_ini.isoformat()}
        except:
            pass
    
    # Filtro por data final
    if end_date:
        try:
            data_fim = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            data_fim = data_fim + timedelta(days=1)
            if "created_at" in query:
                query["created_at"]["$lte"] = data_fim.isoformat()
            else:
                query["created_at"] = {"$lte": data_fim.isoformat()}
        except:
            pass
    
    # Filtro por busca (CPF, nome ou ID)
    if search:
        search_clean = search.strip()
        query["$or"] = [
            {"cpf_cnpj": {"$regex": search_clean, "$options": "i"}},
            {"nome_pagador": {"$regex": search_clean, "$options": "i"}},
            {"id": {"$regex": search_clean, "$options": "i"}}
        ]
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    
    # Calcula estatísticas
    all_filtered = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    total_transactions = len(all_filtered)
    total_volume = sum(t.get("valor", 0) for t in all_filtered)
    total_net_value = sum(t.get("valor_liquido", 0) for t in all_filtered)
    paid_transactions = sum(1 for t in all_filtered if t.get("status") == "paid")
    
    return {
        "data": [{
            "id": t["id"],
            "amount": t["valor"],
            "net_amount": t.get("valor_liquido", 0),
            "payer_name": t.get("nome_pagador"),
            "payer_cpf_cnpj": t.get("cpf_cnpj"),
            "status": t["status"],
            "custom_id": t.get("custom_id"),
            "created_at": t["created_at"],
            "paid_at": t.get("paid_at")
        } for t in transactions],
        "stats": {
            "total_transactions": total_transactions,
            "total_volume": total_volume,
            "total_net_value": total_net_value,
            "paid_transactions": paid_transactions
        }
    }

# ===================== ADMIN TEAM MANAGEMENT =====================

@api_router.get("/admin/team")
async def get_admin_team(admin: dict = Depends(get_admin_user)):
    """Lista todos os admins promovidos por este admin"""
    admins = await db.users.find({
        "role": "admin",
        "promoted_by": admin["id"]
    }, {"_id": 0, "senha": 0, "two_factor_secret": 0}).to_list(100)
    
    return {"admins": admins}

@api_router.post("/admin/team/promote/{user_id}")
async def promote_to_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    """Promove um usuário da rede a admin"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Usuário já é admin")
    
    # Verifica se o usuário está na rede do admin
    user_admin = await get_user_network_admin(user_id)
    if not user_admin or user_admin["id"] != admin["id"]:
        raise HTTPException(status_code=403, detail="Usuário não pertence à sua rede")
    
    # Promove a admin
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "role": "admin",
            "promoted_by": admin["id"],
            "is_root_admin": False,
            "indicacoes_liberadas": 999
        }}
    )
    
    # Cria configuração inicial para o novo admin (cópia da config do promotor)
    config = await get_config(admin["id"])
    if not config.get("admin_id"):
        config = await get_config()
    
    new_admin_config = {
        "admin_id": user_id,
        "fastdepix_api_key": "",  # Novo admin precisa configurar sua própria chave
        "fastdepix_webhook_secret": "",
        "taxa_percentual_padrao": config.get("taxa_percentual_padrao", 2.0),
        "taxa_fixa_padrao": config.get("taxa_fixa_padrao", 0.99),
        "taxa_saque_padrao": config.get("taxa_saque_padrao", 1.5),
        "taxa_transferencia_padrao": config.get("taxa_transferencia_padrao", 0.5),
        "valor_minimo_indicacao": config.get("valor_minimo_indicacao", 1000.0),
        "comissao_indicacao": config.get("comissao_indicacao", 1.0),
        "nome_sistema": config.get("nome_sistema", "FastPay"),
        "logo_url": "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.admin_configs.insert_one(new_admin_config)
    
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "senha": 0})
    return updated

@api_router.delete("/admin/team/demote/{user_id}")
async def demote_from_admin(user_id: str, admin: dict = Depends(get_admin_user)):
    """Remove permissão de admin de um usuário"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    if user.get("is_root_admin"):
        raise HTTPException(status_code=403, detail="Não é possível remover o admin raiz")
    
    if user.get("promoted_by") != admin["id"]:
        raise HTTPException(status_code=403, detail="Você só pode remover admins que você promoveu")
    
    # Remove de admin
    await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "role": "user",
            "promoted_by": None,
            "is_root_admin": False
        }}
    )
    
    # Remove a configuração do admin
    await db.admin_configs.delete_one({"admin_id": user_id})
    
    return {"message": "Admin removido com sucesso"}

@api_router.get("/config/public")
async def get_public_config():
    """Retorna configurações públicas do sistema incluindo taxas"""
    config = await get_config()
    return {
        "nome_sistema": config.get("nome_sistema", "FastPay"),
        "logo_url": config.get("logo_url", ""),
        "taxa_percentual_padrao": config.get("taxa_percentual_padrao", 2.0),
        "taxa_fixa_padrao": config.get("taxa_fixa_padrao", 0.99),
        "comissao_indicacao": config.get("comissao_indicacao", 1.0),
        "taxa_saque_padrao": config.get("taxa_saque_padrao", 1.5)
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
