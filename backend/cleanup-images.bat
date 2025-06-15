@echo off
echo Starting image cleanup - %date% %time%
cd %~dp0
npx ts-node src/scripts/cleanupToolImages.ts
echo Cleanup completed - %date% %time% 