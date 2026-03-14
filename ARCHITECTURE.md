# HappyDo Guard — Arquitetura do Sistema

> Sistema centralizado de vídeo monitoramento para mercadinhos autônomos da Happydo Mercadinhos.
> Versão 2.5 | Março 2026 | **Fase 1 Concluída**

---

## 1. Visão Geral do Projeto

A Happydo Mercadinhos opera 60-80 **mercadinhos autônomos de autoatendimento** em condomínios e empresas em João Pessoa/PB. Cada PDV possui 1-2 câmeras Wi-Fi MIBO Intelbras (~80 câmeras total).

O monitoramento por vídeo é essencial para prevenção de furtos, identificação de ações suspeitas, contagem de visitantes, e acompanhamento dos repositores. A integração com o HappyDoPulse permite cruzar dados de vídeo com eventos operacionais.

A arquitetura é **RTMP-first**: as câmeras enviam o stream para a cloud. **A gravação é seletiva** (só quando há movimento), e o sistema inclui **reconhecimento facial** para busca de pessoas nas gravações.

### 1.1 Objetivos

- **Live centralizado:** qualquer câmera, qualquer PDV, em tempo real
- **Gravação por movimento:** economia de ~80-90% no armazenamento
- **Busca por momento exato:** API para HappyDoPulse pedir vídeo de timestamp específico
- **Reconhecimento facial:** buscar pessoa suspeita, confirmar repositor, alertas watchlist
- **Contagem de visitantes:** pessoas distintas por PDV/dia
- **Zero hardware nos PDVs** (exceto ICs legadas)
- **Sem acesso a roteadores:** apenas conexões outbound
- **100% cloud:** desenvolvimento e infraestrutura online

### 1.2 Restrições

- IP dinâmico, sem acesso aos roteadores (redes de condomínios/empresas)
- Apenas conexões de saída (outbound) funcionam
- 1-2 câmeras por PDV, Wi-Fi 2.4 GHz
- Cartões microSD já instalados nas câmeras

### 1.3 Decisões Técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| RTMP vs RTSP | RTMP (push) | Sem acesso ao roteador, RTSP exige port-forwarding |
| Shinobi vs Custom | Nginx-RTMP + Custom | Shinobi é pull-based, não recebe RTMP push |
| Gravação contínua vs movimento | Por movimento | Economia de ~80-90% em disco |
| Face recognition | InsightFace (Fase 2) | Divisor de águas para prevenção de furtos |
| IA avançada (YOLO) | Fase 5 | Ações suspeitas, contagem de produtos |

---

## 2. Inventário de Câmeras

| Modelo | Qtd | RTMP | Estratégia |
|--------|-----|------|------------|
| iM3 C | ~20 | ✅ | RTMP direto → Cloud |
| iM5 SC | ~25 | ✅ (validado) | RTMP direto → Cloud |
| iMX | ~12 | ✅ | RTMP direto → Cloud |
| IC3 | ~13 | ❌ | Pi Zero (RTSP→RTMP) |
| IC5 | ~10 | ❌ | Pi Zero (RTSP→RTMP) |
| **TOTAL** | **~80** | **~57** | |

### Config RTMP (validada iM5 SC, firmware 2.800.00IB01X.0.R.240927)

Mibo Smart → Configurações → Mais → Redes → RTMP → Habilitar → Personalizado

- **Stream:** Econômica ou Principal
- **Endereço:** IP/domínio do servidor
- **Porta:** 1935
- **URL RTMP:** /live/stream_key

### Autenticação

- RTSP local: `admin` / chave da etiqueta, porta 554
- RTMP: segurança pela stream key única
- Intelbras-1: porta 37777

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│  Câmeras iM (~57) ──RTMP outbound──→ Servidor Cloud             │
│  Câmeras IC (~23) ──RTSP──→ Pi Zero ──RTMP──→ Servidor Cloud    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     SERVIDOR CLOUD (VPS)                         │
│                                                                 │
│  Nginx-RTMP ──→ HLS Live (sempre ativo) ──→ Dashboard/API      │
│       │                                                         │
│       ▼                                                         │
│  ┌──────────────────────────────────────────┐                   │
│  │         Pipeline Unificado de Frames      │                  │
│  │                                           │                  │
│  │  Frame HLS ──→ 1. Detecção de movimento   │                  │
│  │                   ↓ (gravar?)             │                  │
│  │               2. Detecção de rostos       │                  │
│  │                   ↓ (embeddings→pgvector) │                  │
│  │               3. Watchlist check          │                  │
│  │                   ↓ (match>85%→webhook)   │                  │
│  └──────────────────────────────────────────┘                   │
│       │                    │                                    │
│       ▼                    ▼                                    │
│  FFmpeg Recorder      PostgreSQL + pgvector                     │
│  (MP4 só movimento)   (eventos, embeddings, metadados)          │
│                                                                 │
│  API REST ←──→ Dashboard React                                  │
│  (cameras, recordings, faces, events, webhooks)                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1 Componentes do Servidor

| Componente | Tecnologia | Função |
|-----------|-----------|--------|
| Servidor RTMP | Nginx-RTMP | Recebe streams, serve HLS live |
| **Pipeline de Frames** | **Node.js** | **Movimento + rostos + watchlist** |
| **Face Recognition** | **InsightFace + pgvector** | **Embeddings, busca facial** |
| Gravador | FFmpeg (por evento) | MP4 só quando há movimento |
| API Backend | Node.js + Express | Busca, playback, faces, webhooks |
| Banco de Dados | PostgreSQL + pgvector | Metadados + embeddings faciais |
| Dashboard | React | Live, playback, busca facial |
| Monitoramento | Healthcheck custom | Câmeras offline, disco, CPU |

### 3.2 Gravação por Movimento

**NÃO grava continuamente.** Stream chega 24/7 (para live), gravação só com movimento.

#### Pipeline por frame (a cada 2-3 segundos por câmera)

1. **Movimento** (diferença de pixels) → acionar/encerrar gravação FFmpeg
2. **Rostos** (InsightFace) → gerar embedding 512D → armazenar no pgvector
3. **Watchlist** → comparar com lista de atenção → match >85% → webhook

#### Gravação

- Pre-buffer: 10 segundos (não perde o início)
- Post-buffer: 30 segundos (não corta no meio)
- Formato: MP4 segmentado
- Evento registrado na API: timestamp início/fim, câmera, PDV, thumbnail

#### Economia

| Métrica | Contínua | Por Movimento |
|---------|----------|---------------|
| Armazenamento/dia (80 câm.) | ~350 GB | **~35-70 GB** |
| 14 dias retenção | ~4.9 TB | **~500 GB - 1 TB** |
| VPS necessário | Storage VPS 30+ | **Cloud VPS 20** |
| Custo | R$ 100-150/mês | **R$ 55/mês** |
| **Economia** | — | **~80-90%** |

---

## 4. Reconhecimento Facial (Fase 2)

### 4.1 Como Funciona

1. **Indexação (background):** Pipeline de frames detecta rostos em cada frame analisado. InsightFace gera embedding (vetor 512D) para cada rosto. Embedding armazenado no PostgreSQL com pgvector junto com timestamp, câmera e PDV.

2. **Busca:** Upload de foto → gera embedding da foto → busca por similaridade vetorial no pgvector → retorna lista de aparições ordenadas por score.

3. **Watchlist (real-time):** Rostos cadastrados na lista de atenção são comparados a cada frame. Match >85% dispara webhook imediato para HappyDoPulse.

### 4.2 Casos de Uso

| Caso | Endpoint | Descrição |
|------|----------|-----------|
| Buscar suspeito de furto | `POST /api/faces/search` | Upload foto → PDVs e horários onde apareceu |
| Confirmar repositor | `POST /api/faces/search` | Upload foto → hora chegada/saída por PDV |
| Alerta watchlist | `POST /api/faces/watchlist` | Cadastrar rosto → alerta real-time |
| Visitantes distintos/dia | `GET /api/pdvs/:id/visitors` | Contagem por PDV |

### 4.3 Stack Técnica

| Componente | Tecnologia | Detalhe |
|-----------|-----------|---------|
| Face Detection | InsightFace (RetinaFace) | Detecta rostos no frame |
| Face Embedding | InsightFace (ArcFace) | Gera vetor 512D por rosto |
| Banco Vetorial | PostgreSQL + pgvector | Busca por similaridade coseno |
| Indexação | Background job (Node.js) | Processa gravações em batch |
| Watchlist | Comparação real-time | A cada frame com rosto detectado |

### 4.4 LGPD e Dados Biométricos

- **Base legal:** legítimo interesse (segurança patrimonial)
- **Embeddings não reversíveis:** não é possível reconstruir rosto a partir do vetor
- **Retenção:** embeddings apagados junto com gravações (14 dias)
- **Acesso restrito:** apenas usuários Admin podem fazer buscas faciais
- **Audit log:** toda busca facial registrada com usuário, data e motivo

### 4.5 Performance

InsightFace roda em CPU ~100ms/frame. Para 80 câmeras a 1 frame/3s ≈ 27 frames/segundo — viável em 8+ vCPUs. GPU cloud só será necessária na Fase 5 (YOLO). Contabo VPS 20 (6 vCPU, 16GB) deve ser suficiente.

---

## 5. API de Integração

### Endpoints

```
GET    /api/cameras                              # Câmeras com status
GET    /api/cameras/:id/live                     # Stream HLS
GET    /api/cameras/:id/recordings               # Gravações por período
GET    /api/cameras/:id/recording?timestamp=...  # Gravação por momento exato
GET    /api/cameras/:id/snapshot                 # Frame atual (JPEG)
GET    /api/cameras/:id/download                 # Download trecho MP4
GET    /api/pdvs                                 # PDVs com câmeras
GET    /api/pdvs/:id/visitors                    # Visitantes distintos/dia
GET    /api/events                               # Eventos (movimento, offline, facial)
POST   /api/webhooks                             # Cadastrar webhooks
POST   /api/faces/search                         # Upload foto → buscar aparições
GET    /api/faces/watchlist                      # Listar watchlist
POST   /api/faces/watchlist                      # Adicionar rosto à watchlist
DELETE /api/faces/watchlist/:id                  # Remover da watchlist
```

### Busca por Momento Exato

```
GET /api/cameras/pdv42_im5sc/recording?timestamp=2026-03-10T14:32:00&duration=300
→ URL temporária para trecho MP4
```

### Busca Facial

```
POST /api/faces/search
Body: { photo: <base64>, pdvs: ["all"], period: "2026-03-01/2026-03-14" }
→ [{ timestamp, camera, pdv, score, thumbnail_url }, ...]
```

### Autenticação

- API Key (`X-API-Key`) para HappyDoPulse (server-to-server)
- JWT para dashboard. Níveis: Admin, Operador, Visualizador
- Busca facial: apenas Admin
- Rate limit: 100 req/min

---

## 6. Segurança

- Stream keys únicas, servidor rejeita keys desconhecidas
- HTTPS obrigatório (Let's Encrypt)
- JWT com níveis de acesso
- Firewall: 1935 (RTMP) + 443 (HTTPS) + 22 (SSH)
- LGPD: retenção 7-14 dias, exclusão automática, audit log facial

---

## 7. Ambiente de Desenvolvimento

100% online. Claude Code via SSH. GitHub (`happydo-guard`) + GitHub Actions. PostgreSQL + pgvector no VPS.

---

## 8. Custos

| | Valor |
|--|-------|
| **CAPEX** | ~R$ 3.000 (Pi Zeros para ICs) |
| OPEX Fase 1 | ~R$ 30/mês (VPS 10) |
| OPEX Fase 2 | ~R$ 55/mês (VPS 20 — face recognition) |
| OPEX Rollout | ~R$ 55-100/mês |

**Comparativo:** Mibo Cloud R$ 1.200-2.400/mês | Monuv R$ 1.600-4.000/mês | NVR físico R$ 105.000

---

## 9. Plano de Implementação

### 9.1 Fase 1 — PoC ✅ CONCLUÍDA

| # | Ação | Status |
|---|------|--------|
| 1 | VPS Contabo + Docker + Nginx-RTMP | ✅ |
| 2 | 3 câmeras iM transmitindo RTMP | ✅ |
| 3 | HLS live + dashboard funcional | ✅ |
| 4 | Estabilidade 72h | ✅ |

### 9.2 Fase 2 — Produto Completo ⏳ PRÓXIMA

#### Bloco A — Infraestrutura (semanas 1-2)

| # | Ação | Detalhe |
|---|------|---------|
| 1 | HTTPS + guard.happydo.com.br | Let's Encrypt |
| 2 | /snapshot e /download | FFmpeg (hoje 501) |
| 3 | Limpeza automática +14 dias | Cron LGPD |
| 4 | Seed PDVs e câmeras | Script via API |

#### Bloco B — Motion Detector + Gravação (semanas 2-3)

| # | Ação | Detalhe |
|---|------|---------|
| 5 | Motion Detector (Node.js) | 1 frame/2-3s, comparação de pixels |
| 6 | Gravador FFmpeg por evento | Pre-buffer 10s, post-buffer 30s |
| 7 | Eventos de movimento na API | Timestamp, câmera, PDV, thumbnail |
| 8 | Sensibilidade por câmera | Threshold configurável |

#### Bloco C — Reconhecimento Facial (semanas 3-5)

| # | Ação | Detalhe |
|---|------|---------|
| 9 | InsightFace no pipeline de frames | Detecta rostos em cada frame |
| 10 | Embeddings faciais (vetor 512D) | Armazenados com timestamp/câmera/PDV |
| 11 | pgvector no PostgreSQL | Busca por similaridade vetorial |
| 12 | Indexação facial (job background) | Processa gravações existentes |
| 13 | `POST /api/faces/search` | Upload foto → aparições |
| 14 | Watchlist + alertas real-time | Rostos cadastrados → webhook |
| 15 | Contagem visitantes distintos/dia | `GET /api/pdvs/:id/visitors` |
| 16 | Audit log de buscas faciais | LGPD compliance |

### 9.3 Fase 3 — Piloto (5 PDVs)

| # | Ação |
|---|------|
| 1 | Pi Zero para câmeras IC (RTSP→RTMP) |
| 2 | Alertas câmera offline (webhooks) |
| 3 | Auth JWT no dashboard |

### 9.4 Fase 4 — Rollout (~80 câmeras)

| # | Ação |
|---|------|
| 1 | Monitoramento (disco, CPU, câmeras) |
| 2 | Upgrade VPS conforme volume |
| 3 | Integração HappyDoPulse (API Key) |
| 4 | Config ~77 câmeras iM (10-15/dia) |
| 5 | Deploy ~20 Pi Zeros para ICs |

### 9.5 Fase 5 — IA Avançada

| # | Ação |
|---|------|
| 1 | YOLO: ações suspeitas, contagem produtos |
| 2 | Heatmaps de movimento |
| 3 | Módulo vídeo no HappyDoPulse |
| 4 | Investigar P2P TUTK/Kalay |
| 5 | Migrar IC → iM (eliminar Pi Zeros) |

### Cronograma

| Fase | Duração | Status |
|------|---------|--------|
| 1. PoC | 1-2 sem | ✅ Concluída |
| 2. Produto + Facial | 4-5 sem | ⏳ Próxima |
| 3. Piloto (5 PDVs) | 2-3 sem | Pendente |
| 4. Rollout (~80 câm.) | 3-4 sem | Pendente |
| 5. IA avançada | Contínuo | Futuro |

---

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Intelbras remover RTMP em firmware | Travar firmware |
| Queda de internet no PDV | SD grava local |
| Rede bloquear porta 1935 | Fallback 443/80 |
| Sobrecarga servidor | Escalar VPS, sub-stream |
| Pi Zero instável | Watchdog + auto-restart |
| Falsos positivos (movimento) | Threshold por câmera |
| Falsos positivos (facial) | Score mínimo 85%, revisão humana |

---

## 11. Estrutura do Repositório

```
happydo-guard/
├── ARCHITECTURE.md
├── README.md
├── docker-compose.yml
├── .github/workflows/deploy.yml
├── server/
│   ├── nginx-rtmp/nginx.conf
│   ├── api/src/
│   │   ├── index.js
│   │   ├── routes/
│   │   │   ├── cameras.js
│   │   │   ├── recordings.js
│   │   │   ├── events.js
│   │   │   ├── faces.js              ← BUSCA FACIAL
│   │   │   └── webhooks.js
│   │   ├── services/
│   │   │   ├── rtmp.js
│   │   │   ├── motion-detector.js    ← PIPELINE DE FRAMES
│   │   │   ├── face-recognition.js   ← INSIGHTFACE + PGVECTOR
│   │   │   ├── watchlist.js          ← ALERTAS REAL-TIME
│   │   │   ├── recorder.js           ← FFMPEG POR EVENTO
│   │   │   ├── recording.js
│   │   │   └── health.js
│   │   └── db/
│   │       ├── schema.sql            ← INCLUI PGVECTOR
│   │       └── migrations/
│   └── recorder/
├── dashboard/src/
│   ├── pages/
│   │   ├── Live.jsx
│   │   ├── Playback.jsx
│   │   ├── FaceSearch.jsx            ← BUSCA FACIAL UI
│   │   ├── Watchlist.jsx             ← GERENCIAR WATCHLIST
│   │   ├── Visitors.jsx              ← CONTAGEM VISITANTES
│   │   ├── PDVs.jsx
│   │   └── Settings.jsx
├── agent/ (Pi Zero)
└── docs/
```

---

## 12. Notas Técnicas

### Pipeline Unificado (design intencional)
O Motion Detector (Fase 2 Bloco B) e o Face Recognition (Fase 2 Bloco C) compartilham o mesmo pipeline de extração de frames. Na Fase 5, o YOLO será adicionado ao mesmo pipeline. Cada investimento se compõe sobre o anterior.

### P2P Intelbras (TUTK/Kalay)
Câmeras usam ThroughTek Kalay. Sem API/SDK oficial. Engenharia reversa viável (precedente Wyze). Fase 5.

### Apps Mibo
**Mibo** (IC legadas) e **Mibo Smart** (linha iM). RTMP no Mibo Smart.

### Gravações no SD
- iM: backup pelo PC funciona (desabilitar criptografia)
- IC: criptografadas, backup direto não funciona na IC3
- SD = backup offline último recurso
