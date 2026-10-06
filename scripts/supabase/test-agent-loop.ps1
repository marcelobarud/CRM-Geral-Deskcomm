$ErrorActionPreference='Stop'
$repo=Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$directory=Join-Path $repo ('.local-dev/agent-loop-test-'+[Guid]::NewGuid().ToString())
$loop=Join-Path $PSScriptRoot 'agent-verification-loop.ps1'
[IO.Directory]::CreateDirectory($directory) | Out-Null
$job=Start-Job -ArgumentList $loop,$directory -ScriptBlock {
  param($Script,$Directory)
  $env:CRM_GERAL_LOOP_TEST_VALUE='memory-only-fixture'
  & $Script -Directory $Directory -Minutes 0 -AllowedSuites @('D2','All') -RequireSuite -RunVerification {
    param([string]$Suite)
    if($env:CRM_GERAL_LOOP_TEST_VALUE -ne 'memory-only-fixture'){throw 'Memória ausente'}
    Add-Content -LiteralPath (Join-Path $Directory 'calls.txt') -Value $Suite
    return 0
  }
}
function Read-Status {Get-Content -LiteralPath (Join-Path $directory 'agent-status.json') -Raw | ConvertFrom-Json}
function Await-State([string]$State,[string]$RequestId=''){
  $limit=[DateTime]::UtcNow.AddSeconds(15)
  do{
    if(Test-Path -LiteralPath (Join-Path $directory 'agent-status.json')){
      $status=Read-Status
      if($status.state -eq $State -and (-not $RequestId -or $status.request_id -eq $RequestId)){return $status}
    }
    Start-Sleep -Milliseconds 100
  }while([DateTime]::UtcNow -lt $limit)
  throw ('Estado não alcançado: '+$State)
}
function Request([string]$Session,[string]$Action,[string]$Id,[string]$Suite=''){
  $json=@{session_id=$Session;action=$Action;request_id=$Id;suite=$Suite} | ConvertTo-Json
  [IO.File]::WriteAllText((Join-Path $directory 'agent-request.json'),$json)
}
try{
  $ready=Await-State 'ready'
  if($null -ne $ready.expires_at){throw 'Sessão sem prazo recebeu expiração'}
  Request ([Guid]::NewGuid().ToString()) 'run' ([Guid]::NewGuid().ToString()) 'D2'
  Start-Sleep -Milliseconds 700
  if(Test-Path -LiteralPath (Join-Path $directory 'calls.txt')){throw 'Sessão antiga executou'}
  Request $ready.session_id 'arbitrary-command' ([Guid]::NewGuid().ToString()) 'D2'
  Start-Sleep -Milliseconds 700
  if(Test-Path -LiteralPath (Join-Path $directory 'calls.txt')){throw 'Ação inválida executou'}
  $invalidId=[Guid]::NewGuid().ToString()
  Request $ready.session_id 'run' $invalidId 'command'
  $rejected=Await-State 'rejected'
  if($rejected.request_id -ne $invalidId -or (Test-Path -LiteralPath (Join-Path $directory 'calls.txt'))){throw 'Suíte não permitida executou'}
  $id=[Guid]::NewGuid().ToString()
  Request $ready.session_id 'run' $id 'D2'
  $finished=Await-State 'finished'
  if($finished.exit_code -ne 0 -or $finished.suite -ne 'D2'){throw 'Verificação falhou'}
  Request $ready.session_id 'run' $id 'D2'
  Start-Sleep -Milliseconds 700
  if(@(Get-Content -LiteralPath (Join-Path $directory 'calls.txt')).Count -ne 1){throw 'Request repetido executou'}
  if((Get-Content -LiteralPath (Join-Path $directory 'agent-status.json') -Raw).Contains('memory-only-fixture')){throw 'Valor em memória persistido'}
  $allId=[Guid]::NewGuid().ToString()
  Request $ready.session_id 'run' $allId 'All'
  $allFinished=Await-State 'finished' $allId
  if($allFinished.request_id -ne $allId -or $allFinished.suite -ne 'All' -or @(Get-Content -LiteralPath (Join-Path $directory 'calls.txt')).Count -ne 2){throw 'Suíte All não foi recebida com segurança'}
  Request $ready.session_id 'stop' ([Guid]::NewGuid().ToString())
  $null=Await-State 'stopped'
  $null=Wait-Job $job -Timeout 5
  if($job.State -ne 'Completed'){throw 'Processo não encerrou'}
  Write-Host 'PASS: sessão sem prazo, memória, suítes permitidas, deduplicação, status sem credencial e encerramento.'
}finally{
  Receive-Job $job -ErrorAction Continue | Out-Host
  Stop-Job $job -ErrorAction SilentlyContinue
  Remove-Job $job -Force -ErrorAction SilentlyContinue
}
