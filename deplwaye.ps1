$ProjectId = Read-Host -Prompt "Antre nouvo ID Pwojè Supabase ou a (ex: uvgntflbylfbdfszthsa)"

Write-Host "1. M ap konekte ak nouvo pwojè a ($ProjectId)..." -ForegroundColor Cyan
npx supabase link --project-ref $ProjectId

# Mot de passe baz de done a ap mande
Write-Host "2. M ap ekzekite tout fichye SQL yo nan baz de done a..." -ForegroundColor Cyan
$sqlFiles = Get-ChildItem -Filter "*.sql"
foreach ($file in $sqlFiles) {
    Write-Host "   -> Ap kouri $($file.Name)..." -ForegroundColor Yellow
    npx supabase db execute --file $file.Name
}

Write-Host "3. M ap deplwaye tout Edge Functions yo..." -ForegroundColor Cyan
npx supabase functions deploy

Write-Host "Tout bagay fini ak siksè ! 🎉" -ForegroundColor Green
Write-Host "Pa bliye mete nouvo 'URL' ak 'Anon Key' yo nan fichye .env ou ak js/supabase.js ou!" -ForegroundColor Red
