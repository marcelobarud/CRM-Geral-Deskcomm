param(
  [Parameter(Mandatory=$true)][string]$Directory,
  [Parameter(Mandatory=$true)][scriptblock]$RunVerification,
  [ValidateRange(1,180)][int]$Minutes=60
)
$ErrorActionPreference='Stop'
[IO.Directory]::CreateDirectory($Directory) | Out-Null
$session=[Guid]::NewGuid().ToString()
$deadline=[DateTime]::UtcNow.AddMinutes($Minutes)
$seen=[Collections.Generic.HashSet[string]]::new()
$requestPath=Join-Path $Directory 'agent-request.json'
$statusPath=Join-Path $Directory 'agent-status.json'
function Write-AgentStatus([string]$State,[string]$RequestId='',[int]$Code=0){
  $status=@{session_id=$session;state=$State;request_id=$RequestId;exit_code=$Code;expires_at=$deadline.ToString('o')}
  $temporary=$statusPath+'.tmp'
  [IO.File]::WriteAllText($temporary,($status | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
  for($attempt=0;$attempt -lt 5;$attempt++){
    try{Move-Item -LiteralPath $temporary -Destination $statusPath -Force;break}
    catch{if($attempt -eq 4){throw};Start-Sleep -Milliseconds 100}
  }
}
Write-AgentStatus 'ready'
Write-Host ('Sessão automática pronta por até {0} minutos. Mantenha este terminal aberto. Ctrl+C encerra e libera as chaves do ambiente do processo.' -f $Minutes)
try{
  while([DateTime]::UtcNow -lt $deadline){
    if(Test-Path -LiteralPath $requestPath){
      try{$request=Get-Content -LiteralPath $requestPath -Raw | ConvertFrom-Json}catch{$request=$null}
      $requestId=[Guid]::Empty
      if($request -and $request.session_id -eq $session -and [Guid]::TryParse([string]$request.request_id,[ref]$requestId) -and $request.action -in @('run','stop') -and $seen.Add($requestId.ToString())){
        if($request.action -eq 'stop'){break}
        Write-AgentStatus 'running' $requestId.ToString()
        $code=1
        try{$code=[int](& $RunVerification)}catch{Write-Host 'Verificação interrompida; consulte somente o relatório sanitizado.'}
        Write-AgentStatus 'finished' $requestId.ToString() $code
      }
    }
    Start-Sleep -Milliseconds 500
  }
}finally{Write-AgentStatus 'stopped'}
