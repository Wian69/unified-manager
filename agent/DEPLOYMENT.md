---
description: Steps to deploy the Unified Enterprise Agent (UEA) via Microsoft Intune
---

# Agent Deployment Guide (Intune)

Follow these steps to deploy the `unified-agent.ps1` silently across your global fleet.

## 1. Prepare the Script
Ensure your agent script points to your production server or use the parameter-driven approach.

**Command to run:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File "unified-agent.ps1" -ServerUrl "https://your-manager-domain.com"
```

## 2. Intune Configuration
1. Log in to the [Microsoft Intune Admin Center](https://intune.microsoft.com/).
2. Navigate to **Devices** > **Scripts**.
3. Click **Add** > **Windows 10 and later**.
4. Provide a name: `Unified Enterprise Agent Deployment`.
5. Upload `agent/unified-agent.ps1`.
6. **Script settings:**
   - **Run this script using the logged on credentials**: No (Run as SYSTEM).
   - **Enforce script signature check**: No.
   - **Run script in 64-bit PowerShell Host**: Yes.
7. **Assignments:** Assign to the required device groups (Global Fleet).

## 3. Deployment Verification
The agent will:
1. Copy itself to `C:\ProgramData\UnifiedAgent\`.
2. Install a Scheduled Task called `UnifiedEnterpriseAgent` that runs at startup.
3. Check in with the dashboard via the heartbeat API.

## 4. Troubleshooting
- Check logs at `C:\ProgramData\UnifiedAgent\agent.log`.
- Ensure the device has outbound HTTPS access to your hosted manager URL.
