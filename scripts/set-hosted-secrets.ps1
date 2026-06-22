param(
  [string]$Repo = 'shelovesczar/TheLatest',
  [switch]$GitHubOnly,
  [switch]$NetlifyOnly
)

$ErrorActionPreference = 'Stop'

$ghPath = 'C:\Program Files\GitHub CLI\gh.exe'

$secrets = @(
  'SESSION_TOKEN_PEPPER',
  'ADMIN_EMAILS',
  'RSSHUB_BASE_URL',
  'RSS_APP_BUNDLE_FEED_URL',
  'RSS_APP_BUNDLE_SOURCE',
  'NEWS_API_KEY',
  'GNEWS_API_KEY',
  'SOCIAL_RSS_FEEDS',
  'VITE_OPENAI_API_KEY',
  'VITE_ANTHROPIC_API_KEY',
  'VITE_PERPLEXITY_API_KEY',
  'ANTHROPIC_API_KEY',
  'NETLIFY_BLOBS_SITE_ID',
  'NETLIFY_BLOBS_TOKEN'
)

function Confirm-Choice {
  param([string]$Prompt)

  $response = Read-Host "$Prompt [y/N]"
  return $response -match '^(y|yes)$'
}

if (-not $NetlifyOnly) {
  if (-not (Test-Path $ghPath)) {
    throw 'GitHub CLI is not installed at the expected path.'
  }

  & $ghPath auth status | Out-Null
}

if (-not $GitHubOnly) {
  netlify status | Out-Null
}

foreach ($name in $secrets) {
  if (-not (Confirm-Choice "Set $name?")) {
    continue
  }

  if (-not $NetlifyOnly) {
    Write-Host "Setting GitHub Actions secret: $name" -ForegroundColor Cyan
    & $ghPath secret set $name --repo $Repo
  }

  if (-not $GitHubOnly) {
    Write-Host "Setting Netlify environment variable: $name" -ForegroundColor Cyan
    netlify env:set $name --context production deploy-preview branch-deploy --secret
  }
}

Write-Host 'Hosted secret setup flow finished.' -ForegroundColor Green