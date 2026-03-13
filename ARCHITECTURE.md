# HappyDo Guard — Arquitetura do Sistema

> Sistema centralizado de vídeo monitoramento para mercadinhos autônomos da Happydo Mercadinhos.
> Versão 2.2 | Março 2026

---

## 1. Contexto de Negócio

A Happydo Mercadinhos opera 60-80 **mercadinhos autônomos de autoatendimento** instalados em condomínios e empresas em João Pessoa/PB. Cada PDV possui 1-2 câmeras Wi-Fi da linha MIBO Intelbras (~80 câmeras no total).

**Necessidades principais:**
- Prevenção e combate a furtos em operações de autoatendimento
- Identificação de ações suspeitas via vídeo e IA
- Busca de momentos exatos de gravação por timestamp (ex: "quando o repositor chegou no PDV X?")
- Contagem remota de produtos nas prateleiras
- Integração com o HappyDoPulse (app mobile React Native/Expo) e outros sistemas via API

**Restrições operacionais críticas:**
- **Sem acesso aos roteadores** dos PDVs (redes de condomínios/empresas)
- Sem possibilidade de port-forwarding, DDNS ou qualquer configuração de rede
- Apenas conexões de saída (outbound) funcionam
- Todo o desenvolvimento e infraestrutura deve ser 100% online/cloud

---

## 2. Inventário de Câmeras

### Grupo 1: Câmeras iM com RTMP nativo (~57 câmeras) — ZERO hardware no PDV

| Modelo | Qtd aprox. | RTMP | RTSP | ONVIF | Estratégia |
|--------|-----------|------|------|-------|------------|
| iM3 C | ~20 | ✅ SIM | ✅ | ✅ | RTMP direto → Cloud |
| iM5 SC | ~25 | ✅ SIM (validado) | ✅ | ✅ | RTMP direto → Cloud |
| iMX | ~12 | ✅ SIM | ✅ | ✅ | RTMP direto → Cloud |

**Configuração RTMP validada em campo (iM5 SC, firmware 2.800.00IB01X.0.R.240927):**
- App Mibo Smart → Configurações → Mais → Redes → RTMP → Habilitar → Personalizado
- Campos: Stream (Econômica/Principal), Endereço, Porta, URL RTMP
- A câmera faz conexão outbound para `rtmp://Endereço:Porta/URL_RTMP`

### Grupo 2: Câmeras IC legadas (~23 câmeras) — Pi Zero como tradutor

| Modelo | Qtd aprox. | RTMP | RTSP | Estratégia |
|--------|-----------|------|------|------------|
| IC3 | ~13 | ❌ | ✅ | Pi Zero 2 W (RTSP→RTMP) |
| IC5 | ~10 | ❌ | ✅ | Pi Zero 2 W (RTSP→RTMP) |

**Comando FFmpeg no Pi Zero:**
```bash
ffmpeg -i rtsp://admin:CHAVE@IP_LOCAL:554/live -c copy -f flv rtmp://servidor:1935/live/stream_key
```

### Autenticação das câmeras
- **RTSP**: usuário `admin`, senha = chave de acesso da etiqueta (6 caracteres alfanuméricos), porta 554
- **RTMP**: sem autenticação adicional, segurança pela stream key única
- **Porta TCP Intelbras-1**: 37777
- **Todas as câmeras já possuem cartão microSD** instalado (backup local)

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                     GRUPO 1 (~57 câmeras iM)                    │
│                                                                 │
│  [Câmera iM3/iM5/iMX] ──RTMP outbound──→ [Servidor Cloud]     │
│  (config via app Mibo Smart)              (Nginx-RTMP / SRS)    │
│  Zero hardware no PDV                                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     GRUPO 2 (~23 câmeras IC)                    │
│                                                                 │
│  [Câmera IC] ──RTSP local──→ [Pi Zero 2W] ──RTMP outbound──→  │
│                               (FFmpeg)      [Mesmo servidor]    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     SERVIDOR CLOUD (VPS)                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐     │
│  │ Nginx-RTMP   │→ │ NVR/Gravação │→ │ API REST (Node.js)│     │
│  │ ou SRS       │  │ (segmentos   │  │                   │     │
│  │              │  │  MP4/HLS)    │  │ /api/cameras      │     │
│  │ Recebe RTMP  │  │              │  │ /api/recordings   │     │
│  │ de ~80 cam.  │  │ PostgreSQL   │  │ /api/events       │     │
│  └──────────────┘  └──────────────┘  │ /api/live         │     │
│                                      │ /api/snapshots    │     │
│  ┌──────────────┐  ┌──────────────┐  │ /api/webhooks     │     │
│  │ Dashboard    │  │ Módulo IA    │  └───────────────────┘     │
│  │ Web (React)  │  │ (YOLO, Fase5)│                             │
│  └──────────────┘  └──────────────┘                             │
└─────────────────────────────────────────────────────────────────┘
```

### Princípios da arquitetura
1. **RTMP-first**: câmeras empurram vídeo para fora, sem tocar no roteador
2. **Zero hardware onde possível**: 57 câmeras iM não precisam de nada no PDV
3. **100% cloud**: desenvolvimento, armazenamento e processamento online
4. **API-first**: toda funcionalidade acessível via REST para integração
5. **Escalável**: começar com 1 câmera, escalar para 200+

---

## 4. Stack Tecnológica

| Componente | Tecnologia | Justificativa |
|-----------|-----------|---------------|
| Servidor RTMP | Nginx-RTMP ou SRS | Recebe streams, open source, leve |
| Gravação | Segmentos MP4/HLS via FFmpeg | Padrão da indústria |
| Banco de dados | PostgreSQL | Metadados, câmeras, PDVs, eventos |
| API Backend | Node.js + Express | Consistente com stack HappyDoPulse |
| Dashboard Web | React | Mosaico ao vivo, timeline, busca |
| Proxy reverso | Nginx + Let's Encrypt | HTTPS, autenticação |
| Containerização | Docker + Docker Compose | Reprodutibilidade, deploy fácil |
| CI/CD | GitHub Actions | Push na main → deploy no VPS |
| Monitoramento | Healthcheck custom + alertas | Câmeras offline, disco cheio |
| IA (Fase 5) | YOLO v8/v11 | Detecção de pessoas, objetos |

---

## 5. API REST

### Endpoints principais

```
GET    /api/cameras                    # Listar câmeras com status
GET    /api/cameras/:id/live           # URL do stream HLS/WebRTC
GET    /api/cameras/:id/recordings     # Listar gravações por período
GET    /api/cameras/:id/recording      # Buscar gravação por timestamp exato
GET    /api/cameras/:id/snapshot       # Frame atual (JPEG)
GET    /api/cameras/:id/download       # Download trecho MP4
GET    /api/pdvs                       # Listar PDVs com câmeras e status
GET    /api/pdvs/:id/events            # Eventos de um PDV
GET    /api/events                     # Todos os eventos (movimento, offline, IA)
POST   /api/webhooks                   # Cadastrar webhooks para alertas
```

### Busca por momento exato (caso de uso crítico)

O HappyDoPulse pode pedir: *"me dê o vídeo do PDV 42 às 14:32 do dia 10/03/2026"*

```
GET /api/cameras/pdv42_im5sc/recording?timestamp=2026-03-10T14:32:00&duration=300
```

Resposta: URL temporária para o trecho MP4 de 5 minutos ao redor do timestamp.

### Autenticação
- API Key (header `X-API-Key`) para integrações server-to-server
- JWT para usuários do dashboard
- Rate limiting: 100 req/min por API Key

---

## 6. Segurança

- Stream keys únicas por câmera (ex: `/live/pdv42_im5sc_001`)
- Servidor RTMP rejeita stream keys não cadastradas
- HTTPS obrigatório no dashboard (Let's Encrypt)
- JWT com níveis: Admin, Operador, Visualizador
- Firewall: apenas portas 1935 (RTMP), 443 (HTTPS), 22 (SSH)
- LGPD: coleta justificada (segurança patrimonial), retenção limitada (7-14 dias), exclusão automática

---

## 7. Detecção Inteligente (IA) — Fase 5

**Contexto**: mercadinhos autônomos sem atendente → IA é componente central, não acessório.

**Capacidades previstas:**
- Detecção de pessoas em áreas restritas
- Identificação de ações suspeitas (mãos em prateleiras sem compra correspondente)
- Contagem de produtos nas prateleiras (inventário visual)
- Contagem de pessoas no PDV (analytics de fluxo)
- Alertas automáticos via webhook

**Abordagem técnica:**
- Motor: YOLO v8/v11
- Pipeline: NVR extrai frames → serviço IA processa → publica eventos na API
- GPU cloud sob demanda (não 24/7) para otimizar custos

---

## 8. Infraestrutura (VPS)

### Recomendação: Contabo (melhor custo-benefício para vídeo)

| Fase | Plano | Specs | Custo/mês |
|------|-------|-------|-----------|
| 1. PoC | Cloud VPS 10 | 4 vCPU, 8GB RAM, 75GB NVMe | ~R$ 30 |
| 2-3. Piloto | Cloud VPS 20 | 6 vCPU, 16GB RAM, 150GB NVMe | ~R$ 55 |
| 4. Rollout | Storage VPS 30 | 8 vCPU, 24GB RAM, 1TB SSD | ~R$ 100 |
| 4+. Escala | Cloud VPS 40 | 12 vCPU, 48GB RAM, 300GB NVMe | ~R$ 150 |

Tráfego de entrada ilimitado. Upgrade sem migração.

### Alternativa: Hetzner (melhor rede, 20TB tráfego incluso na EU)

---

## 9. Custos

| Item | Valor |
|------|-------|
| CAPEX total | ~R$ 3.000 (apenas Pi Zero para ICs) |
| OPEX Fase 1 (PoC) | ~R$ 30/mês |
| OPEX Fase 4 (Rollout) | ~R$ 100-150/mês |
| OPEX steady-state | ~R$ 150-300/mês |

Comparativo: Mibo Cloud custaria R$ 1.200-2.400/mês para 80 câmeras.

---

## 10. Plano de Implementação

| Fase | Duração | Entrega |
|------|---------|---------|
| 1. PoC | 1-2 semanas | 1 câmera RTMP → servidor → gravação funcionando |
| 2. Dashboard | 2-3 semanas | NVR + interface web + API |
| 3. Piloto | 2-3 semanas | 5 PDVs integrados |
| 4. Rollout | 3-4 semanas | ~80 câmeras online |
| 5. Evolução | Contínuo | IA, HappyDoPulse, analytics |

**Total: 8-12 semanas até rollout completo.**

---

## 11. Estrutura do Repositório

```
happydo-guard/
├── ARCHITECTURE.md          # Este arquivo
├── README.md                # Setup e getting started
├── docker-compose.yml       # Orquestração dos serviços
├── .github/
│   └── workflows/
│       └── deploy.yml       # CI/CD GitHub Actions
├── server/
│   ├── nginx-rtmp/
│   │   └── nginx.conf       # Config do Nginx-RTMP
│   ├── api/
│   │   ├── package.json
│   │   ├── src/
│   │   │   ├── index.js     # Entry point Express
│   │   │   ├── routes/
│   │   │   │   ├── cameras.js
│   │   │   │   ├── recordings.js
│   │   │   │   ├── events.js
│   │   │   │   └── webhooks.js
│   │   │   ├── services/
│   │   │   │   ├── rtmp.js       # Gerência de streams
│   │   │   │   ├── recording.js  # Gravação e segmentação
│   │   │   │   └── health.js     # Healthcheck das câmeras
│   │   │   └── db/
│   │   │       ├── schema.sql
│   │   │       └── migrations/
│   │   └── Dockerfile
│   └── recorder/
│       ├── record.sh         # Script de gravação FFmpeg
│       └── Dockerfile
├── dashboard/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Live.jsx      # Mosaico ao vivo
│   │   │   ├── Playback.jsx  # Timeline e busca
│   │   │   ├── PDVs.jsx      # Lista de PDVs
│   │   │   └── Settings.jsx
│   │   └── components/
│   └── Dockerfile
├── agent/
│   ├── README.md             # Setup do Pi Zero para câmeras IC
│   ├── install.sh            # Script de instalação automática
│   ├── rtsp-to-rtmp.sh       # Script FFmpeg
│   └── systemd/
│       └── happydo-agent.service
└── docs/
    ├── cameras.md            # Lista de câmeras e chaves
    ├── rtmp-setup.md         # Como configurar RTMP no app Mibo
    └── vps-setup.md          # Como provisionar o VPS
```

---

## 12. Primeiros Passos (Fase 1)

1. **Provisionar VPS**: Contabo Cloud VPS 10 (~US$ 5/mês)
2. **Criar repo**: `happydo-guard` no GitHub
3. **Setup Nginx-RTMP**: Docker no VPS
4. **Configurar 1 câmera**: iM5 SC da "DCT LOJA" com RTMP personalizado apontando para o VPS
5. **Validar stream**: confirmar recepção, gravação e playback
6. **Testar estabilidade**: 72h contínuas

---

## 13. Notas Técnicas

### Sobre P2P da Intelbras (TUTK/Kalay)
As câmeras MIBO usam ThroughTek Kalay para P2P. A Intelbras não fornece API/SDK para a linha MIBO. Engenharia reversa é tecnicamente viável (existe precedente com câmeras Wyze), mas arriscada para produção. Mantido como investigação paralela para acesso remoto ao SD card.

### Sobre o app Mibo Smart
Existem dois apps: **Mibo** (para IC3/IC5 legadas) e **Mibo Smart** (para linha iM). As configurações RTMP estão no Mibo Smart. O certificado do APK antigo referencia Hikvision (CN=hikvision), indicando base de firmware compartilhada.

### Sobre gravações no SD
- Linha iM: permite desabilitar criptografia e fazer backup pelo computador
- Linha IC: gravações criptografadas, backup direto pelo PC não funciona nas IC3
- Em ambos os casos, o SD serve como backup offline de último recurso
