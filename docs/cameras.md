# Inventário de Câmeras

## Grupo 1: Câmeras iM com RTMP nativo (~57 câmeras)

Zero hardware adicional no PDV. A câmera se conecta diretamente ao servidor cloud.

| Modelo | Qtd aprox. | RTMP | RTSP | ONVIF |
|--------|-----------|------|------|-------|
| iM3 C  | ~20       | Sim  | Sim  | Sim   |
| iM5 SC | ~25       | Sim  | Sim  | Sim   |
| iMX    | ~12       | Sim  | Sim  | Sim   |

## Grupo 2: Câmeras IC legadas (~23 câmeras)

Necessitam de Pi Zero 2 W como tradutor RTSP → RTMP.

| Modelo | Qtd aprox. | RTMP | RTSP |
|--------|-----------|------|------|
| IC3    | ~13       | Não  | Sim  |
| IC5    | ~10       | Não  | Sim  |

## Autenticação

- **RTSP**: usuário `admin`, senha = chave de acesso na etiqueta (6 caracteres), porta 554
- **RTMP**: sem autenticação adicional, segurança via stream key única
- **Porta TCP Intelbras**: 37777
- Todas possuem cartão microSD instalado (backup local)

## Nomenclatura de Stream Keys

Padrão sugerido: `pdv{numero}_{modelo}_{sequencial}`

Exemplo: `pdv42_im5sc_001`
