# Deploys aws/index.mjs to the sigil-sync Lambda (us-west-2).
#   .\deploy.ps1                                  # update code only
#   .\deploy.ps1 -AdminUser alice                 # also (re)set env vars
#   .\deploy.ps1 -AdminUser alice -SessionDays 30
#
# index.mjs is dependency-free (scrypt + the preinstalled AWS SDK v3), so the
# zip is just the single file — same as the BinderBooks deploy.
param(
  [string]$AdminUser,
  [int]$SessionDays = 30,
  [string]$Table = "sigil"
)
$ErrorActionPreference = "Stop"
$fn = "sigil-sync"; $region = "us-west-2"
Set-Location $PSScriptRoot

Compress-Archive -Force -Path index.mjs -DestinationPath lambda.zip
aws lambda update-function-code --function-name $fn --region $region --zip-file fileb://lambda.zip | Out-Null
Remove-Item lambda.zip
Write-Host "code deployed"

if ($AdminUser) {
  # update-function-configuration replaces the whole environment, so merge the
  # new values onto whatever is already set.
  $cfg = aws lambda get-function-configuration --function-name $fn --region $region | ConvertFrom-Json
  $vars = @{}
  if ($cfg.Environment -and $cfg.Environment.Variables) {
    $cfg.Environment.Variables.PSObject.Properties | ForEach-Object { $vars[$_.Name] = $_.Value }
  }
  $vars["TABLE_NAME"] = $Table
  $vars["ADMIN_USER"] = $AdminUser
  $vars["SESSION_TTL_DAYS"] = "$SessionDays"
  $envFile = Join-Path $PSScriptRoot "env.json"
  @{ Variables = $vars } | ConvertTo-Json -Compress | Out-File -Encoding ascii $envFile
  aws lambda wait function-updated --function-name $fn --region $region
  aws lambda update-function-configuration --function-name $fn --region $region --environment file://env.json | Out-Null
  Remove-Item $envFile
  Write-Host "env set (TABLE_NAME=$Table, ADMIN_USER=$AdminUser, SESSION_TTL_DAYS=$SessionDays)"
}
