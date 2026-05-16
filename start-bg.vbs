Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd /c npm run dev:full", 0, False
