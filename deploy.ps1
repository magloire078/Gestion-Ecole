# Script de Déploiement PowerShell
# Exécutez ce script dans PowerShell

Write-Host "🚀 Déploiement Gestion-Ecole Beta" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# ÉTAPE 1 : Connexion
Write-Host "ÉTAPE 1/5 : Connexion à Firebase" -ForegroundColor Yellow
Write-Host "Connectez-vous avec: magloire078@gmail.com" -ForegroundColor Gray
firebase login
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ Erreur de connexion" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Connecté" -ForegroundColor Green
Write-Host ""

# ÉTAPE 2 : Sélection du projet
Write-Host "ÉTAPE 2/5 : Sélection du projet" -ForegroundColor Yellow
firebase use greecole
if ($LASTEXITCODE -ne 0) { 
    Write-Host "❌ Projet non trouvé" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Projet sélectionné" -ForegroundColor Green
Write-Host ""

# ÉTAPE 3 : Configuration des secrets
Write-Host "ÉTAPE 3/5 : Configuration des secrets" -ForegroundColor Yellow
Write-Host ""

Write-Host "Secret 1 : genius_pay_api_key_live" -ForegroundColor Cyan
Write-Host "Coller: pk_live_votre_cle" -ForegroundColor Gray
firebase apphosting:secrets:set genius_pay_api_key_live
Write-Host ""

Write-Host "Secret 2 : genius_pay_api_secret_live" -ForegroundColor Cyan
Write-Host "Coller: sk_live_votre_secret" -ForegroundColor Gray
firebase apphosting:secrets:set genius_pay_api_secret_live
Write-Host ""

Write-Host "✅ Secrets configurés" -ForegroundColor Green
Write-Host ""

# ÉTAPE 4 : Vérification
Write-Host "ÉTAPE 4/5 : Vérification des secrets" -ForegroundColor Yellow
firebase apphosting:secrets:list
Write-Host ""

# ÉTAPE 5 : Déploiement
Write-Host "ÉTAPE 5/5 : Déploiement" -ForegroundColor Yellow
Write-Host "Cela peut prendre 5-10 minutes..." -ForegroundColor Gray
firebase deploy --only apphosting

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 DÉPLOIEMENT RÉUSSI !" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes :" -ForegroundColor Cyan
    Write-Host "1. Configurer le domaine www.gerecole.com dans Firebase Console" -ForegroundColor White
    Write-Host "2. Configurer les webhooks Genius Pay" -ForegroundColor White
    Write-Host "3. Créer votre compte admin" -ForegroundColor White
    Write-Host ""
}
else {
    Write-Host ""
    Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
    Write-Host "Consultez les logs ci-dessus pour plus de détails" -ForegroundColor Gray
}
