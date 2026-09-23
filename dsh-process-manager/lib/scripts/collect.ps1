<#
  dsh-process-manager — listening-endpoint collector (Windows).

  Emits NDJSON (one JSON object per line) on stdout, encoded UTF-8. Hand-built
  JSON keeps the output identical on Windows PowerShell 5.1 and PowerShell 7,
  and avoids ConvertTo-Json's array unrolling and depth limits.

  Line types:
    {"t":"meta",     "platform":"win32","elevated":true,"psVersion":"7.4.6","collectedAt":"...","host":"..."}
    {"t":"endpoint", "proto":"tcp4","addr":"0.0.0.0","port":135,"pid":4}
    {"t":"process",  "pid":4,"name":"System","path":null,"cmd":null,"ppid":0}
    {"t":"error",    "stage":"tcp","message":"..."}
    {"t":"done",     "endpoints":59,"processes":40}

  Read-only: this script never modifies system state.
#>
[CmdletBinding()]
param(
  # PID whose ancestor chain must also be reported (the DSH host): its parents
  # are killed only at the cost of this session, so the panel protects them.
  [int]$TrackPid = 0
)

$ErrorActionPreference = 'Stop'

# Redirected stdout must be UTF-8 so non-ASCII (paths, user names, service
# names) survives the pipe intact. Identical to what dsh's own runner does.
try {
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch { }

function Write-Line([string]$Json) {
  [Console]::Out.WriteLine($Json)
}

<#
  Minimal JSON string encoder. Control characters are escaped so a stray CR/LF
  inside a command line can never split one NDJSON record into two.
#>
function ConvertTo-JsonString([object]$Value) {
  if ($null -eq $Value) { return 'null' }
  $text = [string]$Value
  $builder = [System.Text.StringBuilder]::new($text.Length + 2)
  [void]$builder.Append('"')
  foreach ($ch in $text.ToCharArray()) {
    $code = [int]$ch
    switch ($ch) {
      '"'  { [void]$builder.Append('\"'); continue }
      '\'  { [void]$builder.Append('\\'); continue }
      "`b" { [void]$builder.Append('\b'); continue }
      "`f" { [void]$builder.Append('\f'); continue }
      "`n" { [void]$builder.Append('\n'); continue }
      "`r" { [void]$builder.Append('\r'); continue }
      "`t" { [void]$builder.Append('\t'); continue }
      default {
        if ($code -lt 32) { [void]$builder.AppendFormat('\u{0:x4}', $code) }
        else { [void]$builder.Append($ch) }
      }
    }
  }
  [void]$builder.Append('"')
  return $builder.ToString()
}

function ConvertTo-JsonBool([bool]$Value) {
  if ($Value) { return 'true' }
  return 'false'
}

# ------------------------------------------------------------------ meta ----

$elevated = $false
try {
  $elevated = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator)
} catch { }

Write-Line ('{"t":"meta","platform":"win32","elevated":' + (ConvertTo-JsonBool $elevated) +
  ',"psVersion":' + (ConvertTo-JsonString $PSVersionTable.PSVersion.ToString()) +
  ',"collectedAt":' + (ConvertTo-JsonString ([DateTime]::UtcNow.ToString('o'))) +
  ',"host":' + (ConvertTo-JsonString ([Environment]::MachineName)) + '}')

# ------------------------------------------------------------- endpoints ----

$endpointCount = 0
$ownerPids = [System.Collections.Generic.HashSet[int]]::new()

# TCP listeners. Get-NetTCPConnection is the structured form of `netstat -ano`
# and is present on every supported Windows (NetTCPIP module).
try {
  foreach ($conn in Get-NetTCPConnection -State Listen -ErrorAction Stop) {
    $address = [string]$conn.LocalAddress
    $proto = 'tcp4'
    if ($address.Contains(':')) { $proto = 'tcp6' }
    $ownerPid = [int]$conn.OwningProcess
    Write-Line ('{"t":"endpoint","proto":"' + $proto + '","addr":' + (ConvertTo-JsonString $address) +
      ',"port":' + [int]$conn.LocalPort + ',"pid":' + $ownerPid + '}')
    $endpointCount++
    [void]$ownerPids.Add($ownerPid)
  }
} catch {
  Write-Line ('{"t":"error","stage":"tcp","message":' + (ConvertTo-JsonString $_.Exception.Message) + '}')
}

# UDP endpoints. UDP is connectionless: every bound endpoint is "listening"
# and the Resource Monitor's network tab lists them alongside TCP listeners.
try {
  foreach ($endpoint in Get-NetUDPEndpoint -ErrorAction Stop) {
    $address = [string]$endpoint.LocalAddress
    $proto = 'udp4'
    if ($address.Contains(':')) { $proto = 'udp6' }
    $ownerPid = [int]$endpoint.OwningProcess
    Write-Line ('{"t":"endpoint","proto":"' + $proto + '","addr":' + (ConvertTo-JsonString $address) +
      ',"port":' + [int]$endpoint.LocalPort + ',"pid":' + $ownerPid + '}')
    $endpointCount++
    [void]$ownerPids.Add($ownerPid)
  }
} catch {
  Write-Line ('{"t":"error","stage":"udp","message":' + (ConvertTo-JsonString $_.Exception.Message) + '}')
}

# ------------------------------------------------------------- processes ----

# One CIM query answers name, path, command line, and parentage for every PID
# that owns an endpoint, plus the ancestor chain of -TrackPid. ExecutablePath
# and CommandLine are null for protected processes (and for processes in
# another elevation context), which is exactly the information the panel needs
# to render them as protected.
$processCount = 0
try {
  $wanted = [System.Collections.Generic.HashSet[int]]::new()
  foreach ($ownerPid in $ownerPids) { [void]$wanted.Add($ownerPid) }

  $records = Get-CimInstance -ClassName Win32_Process -Property ProcessId, Name, ExecutablePath, CommandLine, ParentProcessId -ErrorAction Stop
  $byId = @{}
  foreach ($record in $records) { $byId[[int]$record.ProcessId] = $record }

  # Ancestor chain of the tracked PID, walked through the same snapshot so a
  # parent that owns no listening endpoint is still reported.
  $chain = [System.Collections.Generic.HashSet[int]]::new()
  if ($TrackPid -gt 0) {
    $cursor = $TrackPid
    $guard = 0
    while ($cursor -gt 0 -and $guard -lt 64) {
      $guard++
      if (-not $byId.ContainsKey($cursor)) { break }
      [void]$chain.Add($cursor)
      $next = [int]$byId[$cursor].ParentProcessId
      if ($next -eq $cursor) { break }
      $cursor = $next
    }
  }

  foreach ($processId in ($wanted + $chain)) {
    if (-not $byId.ContainsKey($processId)) { continue }
    $record = $byId[$processId]
    $isChain = $chain.Contains($processId)
    Write-Line ('{"t":"process","pid":' + $processId +
      ',"name":' + (ConvertTo-JsonString $record.Name) +
      ',"path":' + (ConvertTo-JsonString $record.ExecutablePath) +
      ',"cmd":' + (ConvertTo-JsonString $record.CommandLine) +
      ',"ppid":' + [int]$record.ParentProcessId +
      ',"chain":' + $(if ($isChain) { 'true' } else { 'false' }) + '}')
    if (-not $isChain) { $processCount++ }
  }
} catch {
  Write-Line ('{"t":"error","stage":"process","message":' + (ConvertTo-JsonString $_.Exception.Message) + '}')
}

Write-Line ('{"t":"done","endpoints":' + $endpointCount + ',"processes":' + $processCount + '}')
