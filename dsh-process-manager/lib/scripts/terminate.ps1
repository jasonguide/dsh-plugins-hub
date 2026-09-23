<#
  dsh-process-manager — terminate one process, gracefully first (Windows).

  Emits exactly one NDJSON result line on stdout, encoded UTF-8:

    {"t":"result","pid":123,"name":"node.exe","outcome":"killed","ok":true,
     "graceful":false,"waitedMs":312,"forced":true,"message":"..."}

  Outcomes:
    already-exited    the PID was gone before anything was attempted
    closed            CloseMainWindow() posted WM_CLOSE and the app exited
    killed            the app exposed no graceful channel; terminated directly
    killed-after-request  WM_CLOSE was posted, the app ignored it past the
                      grace window, and it was then terminated
    still-running     termination was issued but the process is still alive
    protected         the PID is a critical system process or this script
    identity-changed  the PID no longer carries the expected process name
    denied            Windows refused the termination (access denied)
    failed            any other failure; `message` carries the raw error

  Only the target PID is ever touched. This script never kills a tree.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][int]$TargetPid,
  [int]$GraceMs = 3000,
  [string]$ExpectName = ''
)

$ErrorActionPreference = 'Stop'

try {
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $OutputEncoding = [System.Text.UTF8Encoding]::new($false)
} catch { }

function Write-Line([string]$Json) {
  [Console]::Out.WriteLine($Json)
}

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

function Write-Result {
  param(
    [string]$Outcome,
    [bool]$Ok,
    [bool]$Graceful,
    [bool]$Forced,
    [int]$WaitedMs,
    [string]$Name,
    [string]$Message
  )
  Write-Line ('{"t":"result","pid":' + $TargetPid +
    ',"outcome":' + (ConvertTo-JsonString $Outcome) +
    ',"ok":' + $(if ($Ok) { 'true' } else { 'false' }) +
    ',"graceful":' + $(if ($Graceful) { 'true' } else { 'false' }) +
    ',"forced":' + $(if ($Forced) { 'true' } else { 'false' }) +
    ',"waitedMs":' + $WaitedMs +
    ',"name":' + (ConvertTo-JsonString $Name) +
    ',"message":' + (ConvertTo-JsonString $Message) + '}')
}

# Hard refusals: never let a stale or hostile call reach a critical PID.
if ($TargetPid -le 4) {
  Write-Result -Outcome 'protected' -Ok $false -Graceful $false -Forced $false -WaitedMs 0 -Name '' `
    -Message 'PID 4 and below are kernel/System processes and are never terminated.'
  exit 0
}
if ($TargetPid -eq $PID) {
  Write-Result -Outcome 'protected' -Ok $false -Graceful $false -Forced $false -WaitedMs 0 -Name '' `
    -Message 'Refusing to terminate the helper process itself.'
  exit 0
}

function Get-Target {
  return Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
}

$stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$target = Get-Target
if ($null -eq $target) {
  Write-Result -Outcome 'already-exited' -Ok $true -Graceful $false -Forced $false -WaitedMs 0 -Name '' `
    -Message 'The process had already exited.'
  exit 0
}

$name = [string]$target.ProcessName

# PID recycling guard: a recycled PID is a different process, and killing it
# would hit an unrelated program. Names are compared without the .exe suffix.
if ($ExpectName -ne '') {
  $expected = $ExpectName -replace '\.exe$', ''
  if ($name -ne $expected) {
    Write-Result -Outcome 'identity-changed' -Ok $false -Graceful $false -Forced $false -WaitedMs 0 -Name $name `
      -Message ('PID ' + $TargetPid + ' is now "' + $name + '", not "' + $expected + '"; the operation was cancelled.')
    exit 0
  }
}

function Wait-ForExit([int]$TimeoutMs) {
  $deadline = [System.Diagnostics.Stopwatch]::StartNew()
  while ($deadline.ElapsedMilliseconds -lt $TimeoutMs) {
    if ($null -eq (Get-Target)) { return $true }
    Start-Sleep -Milliseconds 120
  }
  return ($null -eq (Get-Target))
}

# --- tier 1: graceful request ------------------------------------------------
# CloseMainWindow() posts WM_CLOSE to the process's top-level window, the same
# request the window's X button makes, so the app can save and shut down. A
# console or service process owns no window and returns false: Windows offers
# it no graceful channel at all, so tier 2 is the only remaining option.
$gracefulPosted = $false
try {
  $gracefulPosted = [bool]$target.CloseMainWindow()
} catch {
  $gracefulPosted = $false
}

if ($gracefulPosted) {
  if (Wait-ForExit -TimeoutMs ([Math]::Max(200, $GraceMs))) {
    $waited = [int]$stopwatch.ElapsedMilliseconds
    Write-Result -Outcome 'closed' -Ok $true -Graceful $true -Forced $false -WaitedMs $waited -Name $name `
      -Message 'A graceful close request was accepted by the application.'
    exit 0
  }
} else {
  # No window: give the process a brief settle window anyway, so an app that is
  # already exiting on its own is reported as such rather than force-killed.
  if (Wait-ForExit -TimeoutMs 250) {
    $waited = [int]$stopwatch.ElapsedMilliseconds
    Write-Result -Outcome 'already-exited' -Ok $true -Graceful $false -Forced $false -WaitedMs $waited -Name $name `
      -Message 'The process exited on its own before termination.'
    exit 0
  }
}

# --- tier 2: forced termination ---------------------------------------------
$forced = $false
try {
  Stop-Process -Id $TargetPid -Force -ErrorAction Stop
  $forced = $true
} catch {
  $raw = $_.Exception.Message
  $outcome = 'failed'
  if ($raw -match 'denied|拒绝|Access') { $outcome = 'denied' }
  $waited = [int]$stopwatch.ElapsedMilliseconds
  Write-Result -Outcome $outcome -Ok $false -Graceful $gracefulPosted -Forced $false -WaitedMs $waited -Name $name `
    -Message $raw
  exit 0
}

$exited = Wait-ForExit -TimeoutMs 2000
$waitedTotal = [int]$stopwatch.ElapsedMilliseconds

if (-not $exited) {
  Write-Result -Outcome 'still-running' -Ok $false -Graceful $gracefulPosted -Forced $true -WaitedMs $waitedTotal -Name $name `
    -Message 'The termination request was issued but the process is still running; it may be protected by the system or waiting on a driver.'
  exit 0
}

$outcome = 'killed'
$message = 'No graceful channel was available, so the process was terminated.'
if ($gracefulPosted) {
  $outcome = 'killed-after-request'
  $message = 'The application ignored the graceful close request, so it was terminated.'
}
if ($forced) {
  Write-Result -Outcome $outcome -Ok $true -Graceful $gracefulPosted -Forced $true -WaitedMs $waitedTotal -Name $name -Message $message
}
