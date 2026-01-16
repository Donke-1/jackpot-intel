@echo off
echo 🚀 Preparing to ship code to GitHub...
echo.

:: 1. Stage all changes
git add .

:: 2. Ask for a message (so you remember what you did)
set /p msg="Enter a short message for this update: "

:: 3. Commit and Push
git commit -m "%msg%"
git push origin main

echo.
echo ✅ Success! Vercel will now update your live site automatically.
pause