[CmdletBinding()]
param([ValidateSet('Verify','Run')][string]$Mode='Verify')
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$previous=@{}
$names=@('NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY','SUPABASE_DB_URL','LOCAL_DEV_AUTH','LOCAL_DEV_AUTH_PASSWORD','LOCAL_DEV_AUTH_SECRET','NEXT_PUBLIC_APP_URL','D2_SUPABASE_STAGING_ACK')
foreach($name in $names){$previous[$name]=[Environment]::GetEnvironmentVariable($name,'Process')}
function Read-HiddenValue([string]$Label){
  $credential=[PSCredential]::new('runtime',(Read-Host $Label -AsSecureString))
  try{return $credential.GetNetworkCredential().Password}finally{$credential=$null}
}
Write-Host 'Destino fixo: Supabase Geral 1 (staging). Chaves apenas na memória do processo; nenhum arquivo de segredo será criado.'
try{
  if(-not $env:SUPABASE_SERVICE_ROLE_KEY){$env:SUPABASE_SERVICE_ROLE_KEY=Read-HiddenValue 'Chave de servidor do Geral 1 (service_role ou secret key)'}
  if(-not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY){$env:NEXT_PUBLIC_SUPABASE_ANON_KEY=Read-HiddenValue 'Chave pública do Geral 1 (anon ou publishable key; entrada oculta)'}
  if(-not $env:SUPABASE_SERVICE_ROLE_KEY -or -not $env:NEXT_PUBLIC_SUPABASE_ANON_KEY){throw 'Chaves obrigatórias ausentes.'}
  $env:NEXT_PUBLIC_SUPABASE_URL='https://zwjrhqqwizjpzmeayrju.supabase.co'
  $env:LOCAL_DEV_AUTH='false'
  $env:LOCAL_DEV_AUTH_PASSWORD=''
  $env:LOCAL_DEV_AUTH_SECRET=''
  $env:SUPABASE_DB_URL=''
  $env:D2_SUPABASE_STAGING_ACK='Geral 1'
  Push-Location -LiteralPath $repo
  try{
    if($Mode -eq 'Verify'){
      $env:NEXT_PUBLIC_APP_URL='http://localhost:3002'
      & node (Join-Path $PSScriptRoot 'verify-geral-1.mjs')
    }else{
      $env:NEXT_PUBLIC_APP_URL='http://localhost:3000'
      & node (Join-Path $repo 'node_modules/next/dist/bin/next') dev -p 3000
    }
    if($LASTEXITCODE -ne 0){throw 'Execução não concluída. Consulte somente o relatório sanitizado em .local-dev/d2/result.json.'}
  }finally{Pop-Location}
}finally{
  foreach($name in $names){[Environment]::SetEnvironmentVariable($name,$previous[$name],'Process')}
  $previous.Clear()
}
