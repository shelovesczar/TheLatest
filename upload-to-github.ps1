# TheLatest - Git Upload Script
# Run this in PowerShell after installing Git

Write-Host "🚀 TheLatest Git Upload Helper" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Git is installed
try {
    git --version | Out-Null
    Write-Host "✅ Git is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Git is not installed" -ForegroundColor Red
    Write-Host "📥 Download from: https://git-scm.com/download/win" -ForegroundColor Yellow
    Write-Host "After installing, restart VS Code and run this script again." -ForegroundColor Yellow
    pause
    exit
}

Write-Host ""
Write-Host "Step 1: Configure Git (if not done yet)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
$name = Read-Host "Enter your name (e.g. Cesar Hernandez)"
$email = Read-Host "Enter your email"

git config --global user.name "$name"
git config --global user.email "$email"
Write-Host "✅ Git configured" -ForegroundColor Green

Write-Host ""
Write-Host "Step 2: Initialize Repository" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow

# Check if already initialized
if (Test-Path ".git") {
    Write-Host "⚠️  Git repository already exists" -ForegroundColor Yellow
    $reinit = Read-Host "Start fresh? This will delete git history (y/N)"
    if ($reinit -eq "y") {
        Remove-Item -Recurse -Force .git
        git init
        Write-Host "✅ Repository reinitialized" -ForegroundColor Green
    }
} else {
    git init
    Write-Host "✅ Repository initialized" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 3: Stage and Commit Files" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow
git add .
Write-Host "✅ Files staged" -ForegroundColor Green

$message = Read-Host "Enter commit message (or press Enter for default)"
if ([string]::IsNullOrWhiteSpace($message)) {
    $message = "Initial commit - TheLatest News Aggregator with 170+ RSS feeds"
}
git commit -m "$message"
Write-Host "✅ Commit created" -ForegroundColor Green

Write-Host ""
Write-Host "Step 4: Add Remote Repository" -ForegroundColor Yellow
Write-Host "=============================" -ForegroundColor Yellow
Write-Host ""
Write-Host "You need to create a repository on GitHub first:" -ForegroundColor Cyan
Write-Host "1. Go to: https://github.com/new" -ForegroundColor Cyan
Write-Host "2. Name: TheLatest" -ForegroundColor Cyan
Write-Host "3. Keep it Public" -ForegroundColor Cyan
Write-Host "4. DON'T initialize with README" -ForegroundColor Cyan
Write-Host "5. Click 'Create repository'" -ForegroundColor Cyan
Write-Host ""

$created = Read-Host "Have you created the repository on GitHub? (y/N)"
if ($created -ne "y") {
    Write-Host "⏸️  Paused. Create the repository first, then run this script again." -ForegroundColor Yellow
    pause
    exit
}

Write-Host ""
$username = Read-Host "Enter your GitHub username (e.g., shelovesczar)"
$reponame = Read-Host "Enter repository name (default: TheLatest)"
if ([string]::IsNullOrWhiteSpace($reponame)) {
    $reponame = "TheLatest"
}

$remoteUrl = "https://github.com/$username/$reponame.git"
Write-Host "Adding remote: $remoteUrl" -ForegroundColor Cyan

# Remove existing remote if it exists
git remote remove origin 2>$null

git remote add origin $remoteUrl
Write-Host "✅ Remote added" -ForegroundColor Green

Write-Host ""
Write-Host "Step 5: Push to GitHub" -ForegroundColor Yellow
Write-Host "======================" -ForegroundColor Yellow
git branch -M main

Write-Host ""
Write-Host "⚠️  You'll be prompted for credentials:" -ForegroundColor Yellow
Write-Host "   Username: $username" -ForegroundColor Cyan
Write-Host "   Password: Use Personal Access Token (not your actual password!)" -ForegroundColor Cyan
Write-Host ""
Write-Host "   Create token at: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "   Required scopes: repo, workflow" -ForegroundColor Cyan
Write-Host ""

git push -u origin main

Write-Host ""
Write-Host "🎉 SUCCESS! Your project is now on GitHub!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "View your repository at:" -ForegroundColor Cyan
Write-Host "https://github.com/$username/$reponame" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Add repository description on GitHub" -ForegroundColor White
Write-Host "2. Add topics: react, news-aggregator, rss-feeds, vite" -ForegroundColor White
Write-Host "3. Share your repo link!" -ForegroundColor White
Write-Host ""
Write-Host "For organization upload, see: GIT_UPLOAD_GUIDE.md" -ForegroundColor Yellow
Write-Host ""

pause
