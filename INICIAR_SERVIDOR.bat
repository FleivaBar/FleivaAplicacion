@echo off
title Servidor Fleiva Bar
color 0A
cls
echo ==========================================
echo      INICIANDO SERVIDOR FLEIVA BAR
echo ==========================================
echo.
cd /d "%~dp0"

echo Verificando si el puerto 3000 esta ocupado...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo El puerto 3000 esta en uso por el proceso %%a. Intentando cerrarlo...
    taskkill /F /PID %%a
)

echo Verificando dependencias...
if not exist "node_modules" (
    echo Instalando dependencias por primera vez...
    call npm install
)

echo.
echo Iniciando aplicacion...
echo.
call npm start

echo.
echo ==========================================
echo    El servidor se ha detenido.
echo ==========================================
pause
