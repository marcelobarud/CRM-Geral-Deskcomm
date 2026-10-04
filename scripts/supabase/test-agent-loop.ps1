$ErrorActionPreference='Stop'
$repo=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$directory=Join-Path $repo ('.local-dev/agent-loop-test-'+[Guid]::NewGuid().ToString())
$loop=Join-Path $PSScriptRoot 'agent-verification-loop.ps1'
[IO.Directory]::CreateDirectory($directory) | Out-Null
$job=Start-Job -ArgumentList $loop,$directory -ScriptBlock {
  param($Script,$Directory)
  $env:CRM_GERAL_LOOP_TEST_VALUE='memory-only-fixture'
  & $Script -Directory $Directory -Minutes 1 -RunVerification {
    if($env:CRM_GERAL_LOOP_TEST_VALUE -ne 'memory-only-fixture'){throw 'Memória ausente'}
    Add-Content -LiteralPath (Join-Path $Directory 'calls.txt') -Value 'called'
    return 0
  }
}
function Read-Status {Get-Content -LiteralPath (Join-Path $directory 'agent-status.json') -Raw | ConvertFrom-Json}
function Await-State([string]$State){
  $limit=[DateTime]::UtcNow.AddSeconds(15)
  do{
    if(Test-Path -LiteralPath (Join-Path $directory 'agent-status.json')){
      $status=Read-Status
      if($status.state -eq $State){return $status}
    }
    Start-Sleep -Milliseconds 100
  }while([DateTime]::UtcNow -lt $limit)
  throw ('Estado não alcançado: '+$State)
}
function Request([string]$Session,[string]$Action,[string]$Id){
  $json=@{session_id=$Session;action=$Action;request_id=$Id} | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $directory 'agent-request.json'),$json)
}
try{
  $ready=Await-State 'ready'
  Request ([Guid]::NewGuid().ToString()) 'run' ([Guid]::NewGuid().ToString())
  Start-Sleep -Milliseconds 700
  if(Test-Path -LiteralPath (Join-Path $directory 'calls.txt')){throw 'Sessão antiga executou'}
  Request $ready.session_id 'arbitrary-command' ([Guid]::NewGuid().ToString())
  Start-Sleep -Milliseconds 700
  if(Test-Path -LiteralPath (Join-Path $directory 'calls.txt')){throw 'Ação inválida executou'}
  $id=[Guid]::NewGuid().ToString()
  Request $ready.session_id 'run' $id
  $finished=Await-State 'finished'
  if($finished.exit_code -ne 0){throw 'Verificação falhou'}
  Request $ready.session_id 'run' $id
  Start-Sleep -Milliseconds 700
  if(@(Get-Content -LiteralPath (Join-Path $directory 'calls.txt')).Count -ne 1){throw 'Request repetido executou'}
  if((Get-Content -LiteralPath (Join-Path $directory 'agent-status.json') -Raw).Contains('memory-only-fixture')){throw 'Valor em memória persistido'}
  Request $ready.session_id 'stop' ([Guid]::NewGuid().ToString())
  $null=Await-State 'stopped'
  $null=Wait-Job $job -Timeout 5
  if($job.State -ne 'Completed'){throw 'Processo não encerrou'}
  Write-Host 'PASS: memória, sessão, ações permitidas, deduplicação, status sem credencial e encerramento.'
}finally{
  Receive-Job $job -ErrorAction Continue | Out-Host
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
}
