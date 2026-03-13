# HappyDo Guard

Sistema de vídeo monitoramento centralizado para ~80 câmeras MIBO Intelbras em mercadinhos autônomos.

## Arquitetura

```
┌──────────────┐     RTMP push      ┌─────────────────┐
│  Câmera MIBO │ ──────────────────► │  Nginx-RTMP     │
│  Intelbras   │                     │  (Ingest Server) │
└──────────────┘                     └────────┬────────┘
       x80                                    │
                                    ┌─────────┴─────────┐
                                    │                   │
                              ┌─────▼─────┐     ┌──────▼──────┐
                              │  Gravação  │     │  HLS/DASH   │
                              │  (FLV/MP4) │     │  (Live View)│
                              └─────┬─────┘     └──────┬──────┘
                                    │                   │
                              ┌─────▼───────────────────▼─────┐
                              │        REST API (FastAPI)      │
                              │  - Gerenciamento de câmeras    │
                              │  - Consulta de gravações       │
                              │  - Autenticação / RBAC         │
                              │  - Health check de streams     │
                              └──────────────┬────────────────┘
                                             │
                              ┌──────────────▼────────────────┐
                              │     Dashboard Web (React)      │
                              │  - Grid de câmeras ao vivo     │
                              │  - Playback de gravações       │
                              │  - Alertas e status            │
                              │  - Gestão de lojas/câmeras     │
                              └───────────────────────────────┘
```

## Stack Tecnológico

| Componente        | Tecnologia                        |
|-------------------|-----------------------------------|
| Ingest Server     | Nginx + nginx-rtmp-module         |
| API Backend       | Python 3.12 + FastAPI             |
| Banco de Dados    | PostgreSQL 16                     |
| Cache/Pub-Sub     | Redis 7                           |
| Dashboard         | React 18 + TypeScript + Vite      |
| Player de Vídeo   | HLS.js                            |
| Containerização   | Docker + Docker Compose           |
| Storage           | Volume local / S3-compatible      |

## Estrutura do Projeto

```
HappyDoGuard/
├── docker-compose.yml          # Orquestração de todos os serviços
├── nginx-rtmp/
│   ├── Dockerfile
│   └── nginx.conf              # Config do Nginx-RTMP
├── api/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # Entrypoint FastAPI
│       ├── config.py           # Settings via env vars
│       ├── models/             # SQLAlchemy models
│       ├── schemas/            # Pydantic schemas
│       ├── routers/            # API routes
│       └── services/           # Business logic
├── dashboard/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       └── components/
└── .env.example
```

## Quick Start

```bash
# 1. Clone o repositório
git clone https://github.com/andrelealpb/HappyDoGuard.git
cd HappyDoGuard

# 2. Copie e configure as variáveis de ambiente
cp .env.example .env

# 3. Suba todos os serviços
docker compose up -d

# 4. Acesse
# Dashboard:  http://localhost:3000
# API Docs:   http://localhost:8000/docs
# RTMP Ingest: rtmp://localhost:1935/live/{stream_key}
```

## Configuração das Câmeras MIBO

Cada câmera MIBO Intelbras deve ser configurada para enviar stream RTMP:

1. Acesse a interface web da câmera
2. Vá em **Configurações > Rede > RTMP**
3. Configure a URL: `rtmp://<SERVER_IP>:1935/live/<STREAM_KEY>`
4. O `STREAM_KEY` é gerado pela API ao cadastrar a câmera

## Licença

Proprietary - HappyDo © 2026
