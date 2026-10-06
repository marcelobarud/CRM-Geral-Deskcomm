[CmdletBinding()]
param(
  [ValidateSet('Verify','Run','AgentLoop','MasterLoop')][string]$Mode='Verify',
  [switch]$Prompt,
  [ValidateSet('D2','Commercial','Tags','B2B','Forecast','Proposals','Automations','Campaigns')][string]$Suite='D2'
)
$ErrorActionPreference='Stop'
if($Mode -eq 'AgentLoop' -and $Suite -notin @('Proposals','Automations','Campaigns')){throw 'A sessão automática aceita somente as suítes Proposals, Automations e Campaigns.'}
$masterSuites=@('D2','Commercial','Tags','B2B','Forecast','Proposals','Automations','Campaigns')
$repo=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$previous=@{}
$names=@('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_DB_URL','LOCAL_DEV_AUTH','LOCAL_DEV_AUTH_PASSWORD','LOCAL_DEV_AUTH_SECRET','NEXT_PUBLIC_APP_URL','D2_SUPABASE_STAGING_ACK','CRM_GERAL_VERIFY_SUITE')
foreach($name in $names){
  if($Mode -eq 'MasterLoop' -and $name -in @('NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY')){$previous[$name]=$null}
  else{$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
}
function Read-HiddenValue([string]$Label){
  $credential=[PSCredential]::new('runtime',(Read-Host $Label -AsSecureString))
  try{return $credential.GetNetworkCredential().Password}finally{$credential=$null}
}
Write-Host 'Destino fixo: Supabase Geral 1 (staging). Chaves apenas na memória do processo; nenhum arquivo de segredo será criado.'
try{
  if($Prompt -or -not $env:SUPABASE_SERVICE_ROLE_KEY){$env:SUPABASE_SERVICE_ROLE_KEY=(Read-HiddenValue 'Chave de servidor do Geral 1 (service_role ou secret key)').Trim()}
  if($Prompt -or -not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY){$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=(Read-HiddenValue 'Chave pública do Geral 1 (anon ou publishable key; entrada oculta)').Trim()}
  if(-not $env:SUPABASE_SERVICE_ROLE_KEY -or -not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY){throw 'Chaves obrigatórias ausentes.'}
  $env:NEXT_PUBLIC_SUPABASE_URL='https://zwjrhqqwizjpzmeayrju.supabase.co'
  $env:LOCAL_DEV_AUTH='false'
  $env:LOCAL_DEV_AUTH_PASSWORD=''
  $env:LOCAL_DEV_AUTH_SECRET=''
  $env:SUPABASE_DB_URL=''
  $env:D2_SUPABASE_STAGING_ACK='Geral 1'
  $env:CRM_GERAL_VERIFY_SUITE=$Suite
  Push-Location -LiteralPath $repo
  try{
    if($Mode -eq 'AgentLoop'){
      $env:NEXT_PUBLIC_APP_URL='http://localhost:3002'
      $directory=if($Suite -eq 'Campaigns'){'.local-dev/bloco-h'}elseif($Suite -eq 'Automations'){'.local-dev/bloco-g'}else{'.local-dev/bloco-f'}
      & (Join-Path $PSScriptRoot 'agent-verification-loop.ps1') -Directory (Join-Path $repo $directory) -AllowedSuites @($Suite) -RunVerification {
        param([string]$RequestedSuite)
        $env:CRM_GERAL_VERIFY_SUITE=$RequestedSuite
        & node (Join-Path $PSScriptRoot 'verify-geral-1.mjs') | Out-Host
        return $LASTEXITCODE
      }
    }elseif($Mode -eq 'MasterLoop'){
      $env:NEXT_PUBLIC_APP_URL='http://localhost:3002'
      $masterServiceKey=$env:SUPABASE_SERVICE_ROLE_KEY
      $masterPublicKey=$env:NEXT_PUBLIC_SUPABASE_ANON_KEY
      $env:SUPABASE_SERVICE_ROLE_KEY=''
      $env:NEXT_PUBLIC_SUPABASE_ANON_KEY=''
      $verifyScript=Join-Path $PSScriptRoot 'verify-geral-1.mjs'
      $runMasterSuite={
        param([string]$RequestedSuite)
        $suitesToRun=if($RequestedSuite -eq 'All'){$masterSuites}else{@($RequestedSuite)}
        try{
          $env:SUPABASE_SERVICE_ROLE_KEY=$masterServiceKey
          $env:NEXT_PUBLIC_SUPABASE_ANON_KEY=$masterPublicKey
          foreach($suiteName in $suitesToRun){
            Write-Host ('D2 master: executando suíte {0}' -f $suiteName)
            $env:CRM_GERAL_VERIFY_SUITE=$suiteName
            & node $verifyScript | Out-Host
            $suiteExitCode=$LASTEXITCODE
            if($suiteExitCode -ne 0){Write-Host ('D2 master: suíte {0} interrompida; consulte o relatório sanitizado correspondente.' -f $suiteName);return $suiteExitCode}
          }
          return 0
        }finally{
          $env:SUPABASE_SERVICE_ROLE_KEY=''
          $env:NEXT_PUBLIC_SUPABASE_ANON_KEY=''
          $env:CRM_GERAL_VERIFY_SUITE='D2'
        }
      }.GetNewClosure()
      try{
        & (Join-Path $PSScriptRoot 'agent-verification-loop.ps1') -Directory (Join-Path $repo '.local-dev/master-loop') -Minutes 0 -AllowedSuites (@('All')+$masterSuites) -RequireSuite -RunVerification $runMasterSuite
      }finally{$runMasterSuite=$null;$masterServiceKey=$null;$masterPublicKey=$null}
    }elseif($Mode -eq 'Verify'){
      $env:NEXT_PUBLIC_APP_URL='http://localhost:3002'
      & node (Join-Path $PSScriptRoot 'verify-geral-1.mjs')
    }else{
      $env:NEXT_PUBLIC_APP_URL='http://localhost:3000'
      & node (Join-Path $repo 'node_modules/next/dist/bin/next') dev -p 3000
    }
    if($Mode -notin @('AgentLoop','MasterLoop') -and $LASTEXITCODE -ne 0){throw 'Execução não concluída. Consulte o relatório sanitizado em .local-dev/d2/result.json (D2), .local-dev/bloco-b/result.json (Commercial), .local-dev/bloco-c/result.json (Tags) ou .local-dev/bloco-d/result.json (B2B) ou .local-dev/bloco-e/result.json (Forecast) ou .local-dev/bloco-f/result.json (Proposals) ou .local-dev/bloco-g/result.json (Automations) ou .local-dev/bloco-h/result.json (Campaigns).'}
  }finally{Pop-Location}
}finally{
  foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
  $previous.Clear()
}
