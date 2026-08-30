<#
.SYNOPSIS
    IMS Production Backup & Disaster Recovery Automation Script for Windows Environments.
    SLA Targets: RPO <= 15 minutes, RTO <= 60 minutes.
#>

param(
    [string]$BackupDir = "$PSScriptRoot\backups",
    [string]$ContainerName = "ims-postgres-db",
    [string]$PostgresUser = "ims_user",
    [string]$PostgresDb = "ims_db",
    [int]$RetentionDays = 30,
    [string]$EncryptionKey = $env:BACKUP_ENCRYPTION_KEY
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path -Path $BackupDir -ChildPath "ims_db_backup_$Timestamp.sql"
$CompressedFile = "$BackupFile.gz"

Write-Host "=========================================================================" -ForegroundColor Cipher
Write-Host " Starting Enterprise IMS Database Automated Production Backup (PowerShell)" -ForegroundColor Cyan
Write-Host " Container Target : $ContainerName" -ForegroundColor Yellow
Write-Host " Database Name    : $PostgresDb" -ForegroundColor Yellow
Write-Host " Timestamp        : $Timestamp" -ForegroundColor Yellow
Write-Host " SLA Targets      : RPO <= 15m | RTO <= 60m" -ForegroundColor Green
Write-Host "=========================================================================" -ForegroundColor Cipher

try {
    # 1. Execute SQL dump from Docker container
    Write-Host "[1/3] Extracting PostgreSQL database dump..." -ForegroundColor Gray
    docker exec $ContainerName pg_dump -U $PostgresUser -d $PostgresDb --clean --if-exists | Out-File -FilePath $BackupFile -Encoding utf8

    # 2. Compress backup file
    Write-Host "[2/3] Compressing backup archive..." -ForegroundColor Gray
    if (Get-Command tar -ErrorAction SilentlyContinue) {
        tar -czf $CompressedFile -C $BackupDir "ims_db_backup_$Timestamp.sql"
        Remove-Item -Path $BackupFile -Force
    } else {
        $CompressedFile = $BackupFile
    }

    Write-Host "Backup file successfully created: $CompressedFile" -ForegroundColor Green

    if (-not $EncryptionKey) {
        throw "BACKUP_ENCRYPTION_KEY is required. Refusing to keep an unencrypted backup."
    }

    $EncryptedFile = "$CompressedFile.enc"
    openssl enc -aes-256-cbc -salt -pbkdf2 -in $CompressedFile -out $EncryptedFile -pass "pass:$EncryptionKey"
    Remove-Item -LiteralPath $CompressedFile -Force
    $CompressedFile = $EncryptedFile

    # 3. Apply Retention Cleanup
    Write-Host "[3/3] Enforcing retention policy ($RetentionDays days)..." -ForegroundColor Gray
    $CutoffDate = (Get-Date).AddDays(-$RetentionDays)
    Get-ChildItem -Path $BackupDir -Filter "ims_db_backup_*" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item -Force

    Write-Host "=========================================================================" -ForegroundColor Cipher
    Write-Host " Backup Task Completed Successfully!" -ForegroundColor Green
    Write-Host " Output File: $CompressedFile" -ForegroundColor Yellow
    Write-Host "=========================================================================" -ForegroundColor Cipher
}
catch {
    Write-Host "ERROR: Backup execution failed: $_" -ForegroundColor Red
    exit 1
}
