# HappyDo Guard — Arquitetura do Sistema

> Sistema centralizado de vídeo monitoramento para mercadinhos autônomos da Happydo Mercadinhos.
> Versão 2.7 | Março 2026 | **Fase 1 Concluída**

---

## 1. Visão Geral

Happydo opera 60-80 **mercadinhos autônomos de autoatendimento** em condomínios e empresas em João Pessoa/PB. Cada PDV possui 1-2 câmeras MIBO Intelbras (~80 total) e um dispositivo Android para operação.

O sistema combina **câmeras MIBO** (visão geral, teto) com um **app Android leve** nos dispositivos já existentes (captura facial frontal), alimentando um servidor cloud com gravação por movimento, reconhecimento facial, busca cruzada por timestamp e alertas em tempo real.

**Para o servidor, não existe distinção entre um stream MIBO e um stream Guard Cam.** Ambos entram via RTMP, passam pelo mesmo pipeline, são gravados da mesma forma, e consultados pelos mesmos endpoints.

### 1.1 Objetivos

- Live centralizado (MIBO + Guard Cam)
- Gravação por movimento (~80-90% economia)
- Reconhecimento facial (buscar suspeito, confirmar repositor, watchlist)
- **Busca cruzada por timestamp** (todas as câmeras no mesmo instante)
- Contagem de visitantes distintos por PDV/dia
- Zero hardware extra — usa dispositivos Android já existentes
- Sem acesso a roteadores — apenas conexões outbound
- 100% cloud

### 1.2 Decisões Técnicas

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| RTMP vs RTSP | RTMP (push) | Sem acesso ao roteador |
| NVR | Nginx-RTMP + Custom | Controle total |
| Gravação | Por movimento | Economia ~80-90% |
| Face recognition | InsightFace (Fase 2) | Divisor de águas |
| Retenção | Configurável por câmera | Flexibilidade |
| Watchlist | Embeddings permanentes | Não deletados |
| Webhooks | Genéricos | Qualquer destino HTTP |
| Dashboard | Próprio HappyDo Guard | Independente |
| App Android | Kotlin nativo (ultra-leve) | Dispositivos com 2GB RAM |
| Armazenamento | **Unificado** | MIBO e Guard Cam idênticos no pipeline |

---

## 2. Inventário

### 2.1 Câmeras MIBO

| Modelo | Qtd | RTMP | Estratégia |
|--------|-----|------|------------|
| iM3 C | ~20 | ✅ | RTMP direto → Cloud |
| iM5 SC | ~25 | ✅ (validado) | RTMP direto → Cloud |
| iMX | ~12 | ✅ | RTMP direto → Cloud |
| IC3 | ~13 | ❌ | Pi Zero (RTSP→RTMP) |
| IC5 | ~10 | ❌ | Pi Zero (RTSP→RTMP) |
| **TOTAL** | **~80** | **~57** | |

### 2.2 Dispositivos Android nos PDVs

| Dispositivo | Câmera integrada | USB p/ webcam | RAM | Android |
|------------|-----------------|---------------|-----|---------|
| PIPO X9R | ❌ Não | ✅ 4x USB 2.0 | 2GB | 4.4-5.1 |
| Sunmi D2 Mini | ⚠️ Só versão scanning (5MP) | ✅ USB | 2GB | 8.1 |
| Lenovo Tab 10.1" | ✅ Frontal | ✅ OTG | 4GB | 14 |

---

## 3. Arquitetura

```
┌──────────────────────── POR PDV ────────────────────────┐
│                                                          │
│  [Câmera MIBO] ──RTMP──→ Servidor    (teto, visão geral)│
│  [Guard Cam]   ──RTMP──→ Servidor    (frontal, rostos)  │
│                                                          │
│  → Armazenamento e pipeline 100% idênticos              │
└──────────────────────────────────────────────────────────┘

┌──────────────────── SERVIDOR CLOUD (VPS) ────────────────┐
│                                                           │
│  Nginx-RTMP ──→ HLS Live ──→ Dashboard / API             │
│       │                                                   │
│  Pipeline Unificado (cada frame, cada 2-3s):              │
│  ├── 1. Movimento → gravar?                               │
│  ├── 2. Rostos → embedding 512D → pgvector                │
│  └── 3. Watchlist → match >85% → webhook                  │
│       │                    │                              │
│  FFmpeg Recorder      PostgreSQL + pgvector               │
│  (MP4 só movimento)   (eventos, embeddings, metadados)    │
│                                                           │
│  API REST ←──→ Dashboard React (HappyDo Guard)            │
│  ├── Busca cruzada por timestamp (mosaico sincronizado)   │
│  └── Webhooks ──→ qualquer sistema externo                │
└───────────────────────────────────────────────────────────┘
```

### 3.1 Duas fontes de vídeo por PDV

| Fonte | Posição | Função | Protocolo |
|-------|---------|--------|-----------|
| Câmera MIBO | Teto/parede | Visão geral, furto, movimento | RTMP nativo |
| Guard Cam | Balcão/entrada (frontal) | **Captura facial** | RTMP via app |

MIBO no alto = ângulo ruim para rostos (topo da cabeça). Guard Cam na altura dos olhos = rostos de frente = embeddings de qualidade. **Streams Guard Cam são priorizados no pipeline facial.**

### 3.2 Armazenamento Unificado

Não existe separação técnica entre streams MIBO e Guard Cam no servidor. Ambos:
- Entram pelo mesmo Nginx-RTMP
- São processados pelo mesmo pipeline de frames
- São gravados pelo mesmo FFmpeg (por movimento)
- São indexados pelo mesmo InsightFace
- São consultados pelos mesmos endpoints da API
- Têm retenção configurável individualmente

### 3.3 Retenção

| Tipo | Retenção |
|------|----------|
| Gravações + embeddings | Configurável por câmera (padrão 7-14 dias) |
| **Embeddings watchlist** | **Permanentes** (remoção manual) |
| Audit log facial | 90 dias |

---

## 4. HappyDo Guard Cam (App Android)

### 4.1 Visão Geral

App Android nativo ultra-leve. Captura vídeo da câmera integrada ou webcam USB e envia via RTMP. **Não faz processamento de IA localmente** — apenas captura e transmite.

### 4.2 Stack Técnica

| Componente | Tecnologia | Justificativa |
|-----------|-----------|---------------|
| Linguagem | Kotlin nativo | Mais leve que React Native (~30MB vs ~100MB) |
| Câmera integrada | CameraX (Jetpack) | API moderna, Android 5+ |
| Webcam USB | UVCCamera (libusb) | Padrão UVC, maioria das webcams |
| Encoder | MediaCodec (H.264 hardware) | Usa GPU, CPU quase zero |
| RTMP client | rtmp-rtsp-stream-client-java | Lib leve e madura |
| Background | Foreground Service + WakeLock | Não encerrado pelo sistema |
| Config | QR Code + API pull | Busca config no boot |

### 4.3 Funcionalidades

- Detecção automática: câmera integrada → webcam USB (fallback)
- Stream RTMP push: 720p, 10-15fps, H.264 hardware
- Auto-start on boot + auto-reconnect + watchdog interno
- Config via QR code ou tela de setup única
- LED discreto: verde = transmitindo, vermelho = erro
- Background service: tela livre para outros apps
- Heartbeat a cada 60s
- Config remota via API

### 4.4 Requisitos de Performance

| Métrica | Alvo |
|---------|------|
| RAM | < 30 MB |
| CPU | < 2% |
| Android mínimo | 5.0 (API 21) |
| Boot → streaming | < 15 segundos |

### 4.5 Fluxo

```
1. Dispositivo liga → Guard Cam inicia automaticamente
2. Busca config no servidor (stream key, resolução, servidor RTMP)
3. Detecta câmera (integrada ou USB)
4. Abre 720p, 10-15fps → H.264 hardware → RTMP push
5. Roda em background — tela livre
6. Perda de rede → retry com backoff exponencial
7. Câmera USB desconectada → tenta reconectar a cada 30s
8. Heartbeat a cada 60s
```

### 4.6 Configuração

```json
{
  "server": "guard.happydo.com.br",
  "port": 1935,
  "stream_key": "pdv_dct_loja_facecam",
  "camera_source": "auto",
  "resolution": "720p",
  "fps": 15
}
```

Config via QR code (setup inicial) ou remotamente via `/api/guard-cam/config/:device_id`.

### 4.7 Custo Adicional

| Item | Qtd | Unit. | Total |
|------|-----|-------|-------|
| Webcam USB 720p (só s/ câmera) | ~30-40 | R$ 60 | R$ 1.800-2.400 |
| Cabo USB OTG | ~10 | R$ 15 | R$ 150 |
| **Total** | | | **~R$ 2.000-2.600** |

---

## 5. Busca Cruzada por Timestamp

### 5.1 Conceito

A partir de um momento identificado em qualquer câmera (MIBO ou Guard Cam), o sistema busca o mesmo instante em todas as outras câmeras. O Dashboard exibe como **mosaico sincronizado**.

### 5.2 Endpoints

| Escopo | Endpoint | Retorno |
|--------|----------|---------|
| Mesma câmera | `GET /api/cameras/:id/recording?timestamp=T&duration=300` | Trecho MP4 |
| Mesmo PDV | `GET /api/pdvs/:id/recordings?timestamp=T` | MIBO + Guard Cam do PDV |
| Todos os PDVs | `GET /api/recordings/cross-search?timestamp=T&range=300` | Todas câmeras ±5min |

### 5.3 Caso de Uso Típico

1. Operador vê pessoa suspeita na Guard Cam do PDV 12 às 14:32
2. Clica no timestamp → Dashboard busca automaticamente:
   - MIBO do PDV 12 → visão geral do que a pessoa fez
   - Guard Cam de outros PDVs → se visitou mais lojas
3. Mosaico sincronizado: múltiplos vídeos lado a lado no mesmo instante
4. Se combinar com busca facial: upload foto → aparições + busca cruzada automática

### 5.4 Integração com Face Search

A busca facial (`POST /api/faces/search`) retorna timestamps de aparição. Cada resultado inclui um link para busca cruzada, permitindo ver automaticamente todas as câmeras daquele momento. O fluxo completo:

```
Upload foto suspeito
  → InsightFace gera embedding
  → pgvector busca similaridade
  → Retorna: [{timestamp: "14:32", camera: "pdv12_facecam", score: 0.92}, ...]
  → Para cada resultado: link de busca cruzada
  → Dashboard mostra mosaico com todas câmeras daquele instante
```

---

## 6. Reconhecimento Facial (Fase 2)

### Pipeline Unificado

Cada frame (MIBO e Guard Cam, sem distinção) passa por:
1. Movimento → gravar?
2. Rostos (InsightFace) → embedding 512D → pgvector
3. Watchlist → match >85% → webhook

### Casos de Uso

| Caso | Como funciona |
|------|--------------|
| Buscar suspeito | Upload foto → PDVs e horários → busca cruzada |
| Confirmar repositor | Upload foto → chegada/saída por PDV |
| Alerta watchlist | Rosto cadastrado → webhook configurável |
| Visitantes/dia | Pessoas distintas por PDV |

### LGPD

- Base legal: legítimo interesse (segurança patrimonial)
- Embeddings não reversíveis
- Retenção: configurável por câmera. **Watchlist: permanente**
- Acesso: apenas Admin. Audit log de toda busca

---

## 7. API Completa

```
# Câmeras (MIBO + Guard Cam, unificado)
GET    /api/cameras                              # Todas com status
GET    /api/cameras/:id/live                     # Stream HLS
GET    /api/cameras/:id/recordings               # Gravações por período
GET    /api/cameras/:id/recording?timestamp=T    # Trecho por timestamp
GET    /api/cameras/:id/snapshot                 # Frame atual (JPEG)
GET    /api/cameras/:id/download                 # Download MP4

# PDVs
GET    /api/pdvs                                 # PDVs com câmeras
GET    /api/pdvs/:id/visitors                    # Visitantes/dia
GET    /api/pdvs/:id/recordings?timestamp=T      # Busca cruzada: PDV

# Busca Cruzada
GET    /api/recordings/cross-search?timestamp=T&range=300  # Todos PDVs

# Face Recognition
POST   /api/faces/search                         # Upload foto → aparições
GET    /api/faces/watchlist                      # Listar (permanente)
POST   /api/faces/watchlist                      # Adicionar
DELETE /api/faces/watchlist/:id                  # Remover

# Guard Cam
GET    /api/guard-cam/config/:device_id          # Config do app
POST   /api/guard-cam/heartbeat                  # Status online

# Eventos e Webhooks
GET    /api/events                               # Todos os eventos
POST   /api/webhooks                             # Destino configurável
```

Autenticação: API Key (server-to-server), JWT (dashboard), device token (Guard Cam). Busca facial: apenas Admin.

---

## 8. Custos

| | Valor |
|--|-------|
| CAPEX Pi Zeros (câmeras IC) | ~R$ 3.000 |
| CAPEX webcams USB | ~R$ 2.000-2.600 |
| **CAPEX total** | **~R$ 5.000-5.600** |
| OPEX Fase 2 | ~R$ 55/mês |
| OPEX Rollout | ~R$ 55-100/mês |

---

## 9. Plano de Implementação

### 9.1 Fase 1 — PoC ✅ CONCLUÍDA

3 câmeras MIBO via RTMP. Nginx-RTMP + dashboard. Estabilidade 72h.

### 9.2 Fase 2 — Produto Completo ⏳ PRÓXIMA (5-6 semanas)

#### Bloco A — Infraestrutura (sem 1-2)
1. HTTPS + guard.happydo.com.br
2. /snapshot e /download
3. Limpeza automática (período por câmera)
4. Seed PDVs e câmeras

#### Bloco B — Motion + Gravação (sem 2-3)
5. Motion Detector (Node.js, 1 frame/2-3s)
6. Gravador FFmpeg por evento
7. Eventos na API
8. Sensibilidade por câmera

#### Bloco C — Face Recognition (sem 3-5)
9. InsightFace no pipeline
10. Embeddings 512D + pgvector
11. Indexação facial (background)
12. `POST /api/faces/search`
13. Watchlist + alertas (webhook genérico)
14. Contagem visitantes/dia
15. Audit log

#### Bloco D — Guard Cam + Busca Cruzada (sem 4-6)
16. App Kotlin: câmera integrada + webcam USB
17. RTMP push (rtmp-rtsp-stream-client-java)
18. H.264 hardware (MediaCodec)
19. Background service + auto-start + reconnect
20. Config via QR code
21. API: /guard-cam/config + heartbeat
22. Testar em PIPO X9R + Sunmi D2 Mini + Lenovo Tab
23. Dashboard: busca cruzada por timestamp (mosaico)
24. API: /pdvs/:id/recordings + /recordings/cross-search

### 9.3 Fase 3 — Piloto (5 PDVs)
1. Pi Zero para câmeras IC
2. Guard Cam em 5 dispositivos Android + webcams USB
3. Alertas offline (webhook)
4. Auth JWT no dashboard

### 9.4 Fase 4 — Rollout (~80 câmeras + ~70 Guard Cams)
1. Config RTMP nas ~77 câmeras iM restantes
2. Guard Cam em todos os dispositivos Android
3. Webcams USB nos dispositivos sem câmera
4. Deploy Pi Zeros para ICs
5. Integração via API Key
6. Monitoramento completo

### 9.5 Fase 5 — IA Avançada
1. YOLO: ações suspeitas, contagem produtos
2. Heatmaps de movimento
3. Investigar P2P TUTK/Kalay
4. Migrar IC → iM

---

## 10. Riscos

| Risco | Mitigação |
|-------|-----------|
| Intelbras remover RTMP | Travar firmware |
| PIPO X9R Android antigo | Testar UVC lib, pior caso: excluir |
| Webcam USB instável | Auto-reconnect 30s |
| App encerrado pelo Android | Foreground Service + WakeLock |
| Falsos positivos facial | Score ≥85%, revisão humana |

---

## 11. Estrutura do Repositório

```
happydo-guard/
├── ARCHITECTURE.md
├── docker-compose.yml
├── .github/workflows/deploy.yml
├── server/
│   ├── nginx-rtmp/nginx.conf
│   ├── api/src/
│   │   ├── routes/
│   │   │   ├── cameras.js
│   │   │   ├── recordings.js         ← BUSCA CRUZADA
│   │   │   ├── events.js
│   │   │   ├── faces.js
│   │   │   ├── guard-cam.js          ← CONFIG + HEARTBEAT
│   │   │   └── webhooks.js
│   │   ├── services/
│   │   │   ├── motion-detector.js
│   │   │   ├── face-recognition.js
│   │   │   ├── watchlist.js
│   │   │   ├── recorder.js
│   │   │   └── health.js
│   │   └── db/ (schema com pgvector)
├── dashboard/src/pages/
│   ├── Live.jsx
│   ├── Playback.jsx
│   ├── CrossSearch.jsx                ← BUSCA CRUZADA / MOSAICO
│   ├── FaceSearch.jsx
│   ├── Watchlist.jsx
│   ├── Visitors.jsx
│   ├── GuardCams.jsx
│   └── Settings.jsx
├── guard-cam/                         ← APP ANDROID
│   ├── app/src/main/java/com/happydo/guardcam/
│   │   ├── GuardCamApp.kt
│   │   ├── service/
│   │   │   ├── StreamService.kt
│   │   │   ├── CameraManager.kt
│   │   │   └── RtmpPublisher.kt
│   │   ├── config/
│   │   │   ├── DeviceConfig.kt
│   │   │   └── QrCodeScanner.kt
│   │   └── ui/
│   │       ├── SetupActivity.kt
│   │       └── StatusOverlay.kt
├── agent/ (Pi Zero)
└── docs/
    ├── guard-cam-setup.md
    ├── rtmp-setup.md
    └── vps-setup.md
```

---

## 12. Notas Técnicas

### Armazenamento Unificado
MIBO e Guard Cam são tecnicamente idênticos no servidor. Mesmo Nginx-RTMP, mesmo pipeline, mesmo FFmpeg, mesmo pgvector, mesmos endpoints. A distinção é apenas lógica (tipo de câmera no banco) e de posição física.

### Guard Cam vs MIBO = complementares
MIBO no teto = visão geral. Guard Cam frontal = identificação. Streams Guard Cam priorizados no pipeline facial pelo ângulo superior.

### Busca Cruzada + Face Search
A busca facial retorna timestamps. Cada timestamp tem link para busca cruzada. O Dashboard conecta os dois: "esta pessoa apareceu aqui às 14:32 → veja todas as câmeras nesse momento."

### Kotlin vs React Native
Kotlin nativo escolhido por consumo de RAM (~30MB vs ~100MB). Em 2GB RAM, essa diferença é a viabilidade do projeto.
