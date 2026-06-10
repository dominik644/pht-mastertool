# Nach "gh auth login" ausführen – erstellt Repo und pusht nach GitHub
$env:Path = "C:\Program Files\GitHub CLI;C:\Program Files\Git\bin;C:\Program Files\Git\cmd;" + $env:Path
Set-Location "$PSScriptRoot\.."

gh auth status
if ($LASTEXITCODE -ne 0) {
  Write-Host "Bitte zuerst im Terminal ausführen: gh auth login" -ForegroundColor Yellow
  exit 1
}

$user = gh api user -q .login
$repo = "pht-mastertool"

if (-not (git remote get-url origin 2>$null)) {
  gh repo create $repo --public --source=. --remote=origin --description "PHT Procurement Intelligence App"
}

git branch -M main
git push -u origin main
Write-Host ""
Write-Host "GitHub Repo: https://github.com/$user/$repo" -ForegroundColor Green
Write-Host "Vercel: https://vercel.com/new -> Import Git Repository" -ForegroundColor Cyan
