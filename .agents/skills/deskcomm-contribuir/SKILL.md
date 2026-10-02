---
name: deskcomm-contribuir
description: Guia especializado para contribuição intencional ao upstream DeskcommCRM. Use quando o usuário pedir enviar, revisar ou preparar uma contribuição destinada ao repositório original. Não se aplica automaticamente a desenvolvimento, commits, bugs, migrations ou PRs internos do CRM Geral; não arma hooks por ser um fork.
metadata:
  publico: contribuidor intencional ao upstream
  espelho-de: triagem/TRIAGEM.md
---

# Contribuição intencional ao upstream Deskcomm

O contrato global do checkout é AGENTS.md; CLAUDE detalha regras compatíveis. Esta skill só organiza trabalho cujo destino upstream foi explicitamente pedido. Preserve trabalho interno do fork e não misture branding, ambiente local ou decisões comerciais próprias numa contribuição ao original.

## Identifique o destino antes de agir

Inspecione `git remote -v`: no CRM Geral, origin é o fork. Verifique explicitamente o URL do remoto Deskcomm (repositório original melgarafael/DeskcommCRM) e sua referência, por exemplo upstream/main **somente se esse remoto existir e tiver o URL correto**. Não crie remoto, atualize base nem faça merge como ritual automático. Comparação usa a referência verificada, não origin/main por suposição.

O papel detectado por [quem-sou.sh](scripts/quem-sou.sh) é auxiliar do fluxo original, não autorização nem autoridade sobre o fork. Não execute [armar-hooks.sh](scripts/armar-hooks.sh) automaticamente. Os scripts legados assumem origin como original: use-os apenas num checkout dedicado com esse destino verificado e com instalação de hooks autorizada; não os aplique ao fork interno.

## Prepare a contribuição

Meça na revisão de destino: checks, contratos, migration/tripla, impacto na instalação, marca e fragmento de release quando aplicável. Não copie contagens antigas nem reduza a prova exigida no checkout atual. Rode verificações relevantes e declare lacunas reais. Para UI, inclua evidência pela tela; para schema/RLS, invariantes de banco. Proteja segredos e dados pessoais conforme AGENTS.

As referências abaixo conservam receitas do contexto original e exemplos em que origin/main significa o checkout dedicado do Deskcomm. Não são comandos para executar cegamente no CRM Geral:

- `references/pre-voo.md`
- `references/receita-e2e-local.md`
- `references/erros-recorrentes.md`
- `references/depois-do-pr.md`

Abrir PR ou comentar/enviar mensagens segue a autorização explícita da tarefa; esta skill não inicia comunicação externa por conta própria. Rituais em triagem, loop e agentes especializados são do fluxo invocado, não leis globais.
