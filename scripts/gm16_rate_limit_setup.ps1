$ErrorActionPreference = 'Stop'

# Local-only GM-16 setup. Supabase CLI exposes token_refresh in config.toml but
# the GoTrue image keeps its trusted rate-limit header as a self-hosted env var.
# Recreate only the Auth container so Kong's X-Forwarded-For becomes the bucket
# key. No database volume, key, or client setting is changed.
$container = 'supabase_auth_gi-cung-duoc-local'
$backup = "$container-base"

$names = @(docker ps -a --format '{{.Names}}')
if ($names -notcontains $container) {
  throw "Missing $container. Run npm run backend:start first."
}

$envLines = @(docker inspect $container --format '{{range .Config.Env}}{{println .}}{{end}}')
if ($envLines -contains 'GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For') {
  Write-Output 'GM-16 Auth rate-limit header already configured.'
  exit 0
}
if ($names -contains $backup) {
  throw "Refusing to overwrite existing recovery container $backup. Remove it only after checking Docker state."
}

$inspection = docker inspect $container | ConvertFrom-Json
$network = @($inspection.NetworkSettings.Networks.PSObject.Properties)[0].Name
$image = $inspection.Config.Image
$envArgs = [System.Collections.Generic.List[string]]::new()
foreach ($line in $inspection.Config.Env) {
  [void]$envArgs.Add('--env')
  [void]$envArgs.Add([string]$line)
}
[void]$envArgs.Add('--env')
[void]$envArgs.Add('GOTRUE_RATE_LIMIT_HEADER=X-Forwarded-For')

docker rename $container $backup | Out-Null
try {
  $runArgs = @('run', '--detach', '--name', $container, '--network', $network, '--network-alias', 'auth')
  $runArgs += $envArgs
  $runArgs += @('--label', 'com.supabase.cli.project=gi-cung-duoc-local', '--label', 'com.supabase.cli.workdir=' + (Get-Location).Path, $image, 'auth')
  docker @runArgs | Out-Null
  if ($LASTEXITCODE -ne 0) { throw 'Docker failed to create the replacement Auth container.' }
  docker rm $backup | Out-Null
  Write-Output 'GM-16 Auth rate-limit header configured: X-Forwarded-For.'
}
catch {
  docker rm -f $container 2>$null | Out-Null
  docker rename $backup $container | Out-Null
  throw
}
