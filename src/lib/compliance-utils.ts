/**
 * Comprehensive mapping of Windows 10/11 Compliance Policy settings to human-readable 
 * diagnostics and authoritative remediation steps.
 */
export const COMPLIANCE_MAP: Record<string, { reason: string; remediation: string }> = {
    // --- Identity & Access ---
    "PasswordRequired": {
        reason: "A device password, PIN, or Windows Hello is not configured or does not meet complexity requirements.",
        remediation: "Go to Settings > Accounts > Sign-in options. Ensure a PIN or Password is set. If utilizing a work account, ensure it meets the organizational complexity (length/alpha-numeric) rules."
    },
    "PasswordExpiration": {
        reason: "The current device password has expired according to organizational policy.",
        remediation: "Press Ctrl+Alt+Del and select 'Change a password' to update your credentials immediately."
    },

    // --- Data Protection ---
    "StorageEncryption": {
        reason: "BitLocker Drive Encryption is either disabled, suspended, or the recovery key has not been backed up to Azure AD.",
        remediation: "1. Search for 'Manage BitLocker'. 2. Click 'Turn on BitLocker' for the C: drive. 3. If already on, click 'Resume protection' or 'Back up your recovery key' to sync with the cloud."
    },
    "BitLockerEnabled": {
       reason: "BitLocker Drive Encryption is REQUIRED but currently inactive on this device.",
       remediation: "Search for 'BitLocker' in the Start menu and follow the wizard to encrypt your primary drive. Ensure you save the recovery key to your Microsoft/Work account."
    },

    // --- Device Health & Integrity ---
    "SecureBootEnabled": {
        reason: "Secure Boot is disabled in the system firmware (UEFI). This prevents the device from verifying the integrity of the OS loader.",
        remediation: "Restart the device and enter the BIOS/UEFI settings (usually F2, F12, or Del). Locate the 'Security' or 'Boot' tab and set 'Secure Boot' to 'Enabled'."
    },
    "CodeIntegrityEnabled": {
        reason: "Windows Code Integrity (Hypervisor-protected code integrity - HVCI) is disabled or not supported.",
        remediation: "Search for 'Core Isolation' in Windows Security. Ensure 'Memory integrity' is toggled to 'On'. A restart will be required."
    },
    "TpmRequired": {
        reason: "Trusted Platform Module (TPM) 2.0 is missing, disabled, or not ready for use.",
        remediation: "1. Run 'tpm.msc' to check status. 2. If 'Not found', enable TPM/PTT/Security Chip in the BIOS/UEFI settings. 3. Ensure the version is 2.0 (Windows 11 requirement)."
    },

    // --- Threat Protection (Windows Defender) ---
    "AntivirusEnabled": {
        reason: "Windows Defender Antivirus or a compatible third-party security suite is disabled.",
        remediation: "Open 'Windows Security' > 'Virus & threat protection'. Click 'Turn on' or ensure your third-party antivirus service is running and active."
    },
    "AntispywareEnabled": {
        reason: "Windows Defender Antispyware is inactive.",
        remediation: "Ensure Windows Defender is active. If using 3rd party security, verify the agent is communicating with the local security center."
    },
    "FirewallEnabled": {
        reason: "One or more Windows Firewall profiles (Domain, Private, or Public) are disabled.",
        remediation: "Go to 'Windows Security' > 'Firewall & network protection'. Click 'Restore settings' to default or manually 'Turn on' all three profiles."
    },
    "DefenderRealTimeMonitoringEnabled": {
        reason: "Active scanning for malware (Real-time protection) is currently turned off.",
        remediation: "Open 'Windows Security' > 'Virus & threat protection' > 'Manage settings'. Toggle 'Real-time protection' to 'On'."
    },
    "MinimumDefenderVersion": {
        reason: "The Windows Defender engine or signature version is outdated and vulnerable.",
        remediation: "Open 'Windows Security' > 'Virus & threat protection'. Click 'Check for updates' and install the latest security Intelligence definitions."
    },
    "DefenderSignatureOutOfDate": {
        reason: "Security definitions are older than the allowed threshold.",
        remediation: "Run 'Command Prompt' as Admin and type: 'mpcmdrun.exe -SignatureUpdate'. Alternatively, use the 'Remediate All' button on the dashboard."
    },

    // --- Software Updates ---
    "OsVersion": {
        reason: "The current Windows build version is below the minimum required security baseline.",
        remediation: "Go to Settings > Windows Update. Click 'Check for updates' and install all available Cumulative Updates (LCU) and Feature Updates."
    },
    "WindowsUpdateRing": {
        reason: "The device is not correctly enrolled in a Windows Update management ring.",
        remediation: "Trigger a manual sync: Settings > Accounts > Access work or school > Click your account > Info > Sync. This will re-force the Update Ring policy."
    }
};

/**
 * Translates a technical setting name to a human-readable diagnostic.
 * Handles both direct matches and common prefixes used by Microsoft Graph.
 */
export function getComplianceInsight(settingName: string) {
    // Clean common prefixes like "DeviceCompliancePolicy." or "DeviceConfiguration."
    const cleanName = settingName.split('.').pop() || settingName;

    // Try to find a direct match or a fuzzy match (case-insensitive)
    const key = Object.keys(COMPLIANCE_MAP).find(k => k.toLowerCase() === cleanName.toLowerCase());
    if (key) {
        return COMPLIANCE_MAP[key];
    }
    
    // Fallback if no specific mapping exists
    return {
        reason: `Policy Setting Failure: ${cleanName}`,
        remediation: "Manual inspection required. Check the Intune Admin Center > Devices > Monitor > Compliance Policy status for specific technical details."
    };
}
