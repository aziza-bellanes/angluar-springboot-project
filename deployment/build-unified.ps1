# Run from repository root in PowerShell after installing JDK, Maven, Node.js and npm.
$ErrorActionPreference='Stop'
Push-Location frontend
try {
  npm ci
  if ($LASTEXITCODE -ne 0) { throw 'npm ci failed' }
  npm run build -- --configuration production
  if ($LASTEXITCODE -ne 0) { throw 'Angular build failed' }
} finally { Pop-Location }
$target='backend/src/main/resources/static'
if (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Recurse -Force }
New-Item -ItemType Directory -Force $target | Out-Null
Copy-Item -Path 'frontend/dist/psm/browser/*' -Destination $target -Recurse -Force
Push-Location backend
try {
  mvn clean package
  if ($LASTEXITCODE -ne 0) { throw 'Maven build failed' }
} finally { Pop-Location }
Write-Host 'JAR built at backend/target/psm.jar'
