/**
 * Mapping of technical Intune/Graph compliance setting names to human-readable 
 * explanations and remediation steps.
 */
export const COMPLIANCE_MAP: Record<string, { reason: string; remediation: string }> = {
    "PasswordRequired": {
        reason: "A device password or PIN is not configured.",
        remediation: "Go to Settings > Accounts > Sign-in options and set up a PIN or Password."
    },
    "StorageEncryption": {
        reason: "Drive encryption (BitLocker) is disabled or not fully initialized.",
        remediation: "Search for 'Manage BitLocker' in the Start menu and ensure it is turned on for your primary drive."
    },
    "Antivirus": {
        reason: "Windows Defender or your installed antivirus is disabled or out of date.",
        remediation: "Open Windows Security and ensure 'Virus & threat protection' is turned on and updated."
    },
    "Firewall": {
        reason: "The system firewall is currently disabled.",
        remediation: "Open Windows Security > Firewall & network protection and ensure all networks are protected."
    },
    "SystemIntegrity": {
        reason: "Core system security features (like Secure Boot or Code Integrity) are compromised or disabled.",
        remediation: "Restart your device and ensure 'Secure Boot' is enabled in the BIOS/UEFI settings."
    },
    "TpmRequired": {
        reason: "A Trusted Platform Module (TPM) was not found or is not version 2.0.",
        remediation: "Verify in Device Manager > Security devices that TPM 2.0 is present and enabled."
    },
    "OsVersion": {
        reason: "Your operating system version is below the minimum required security level.",
        remediation: "Go to Settings > Windows Update and install all pending security and feature updates."
    },
    "DefenderRealTimeMonitoring": {
        reason: "Defender Real-time protection is disabled.",
        remediation: "Open Windows Security > Virus & threat protection > Manage settings and turn on Real-time protection."
    },
    "VulnerabilityRemediation": {
        reason: "High or Critical security vulnerabilities are present on this device.",
        remediation: "Use the 'One-Touch Remediation' button on the dashboard to force a global security patch pulse."
    }
};

/**
 * Translates a technical setting name to a human-readable diagnostic.
 */
export function getComplianceInsight(settingName: string) {
    // Try to find a direct match or a fuzzy match (case-insensitive)
    const key = Object.keys(COMPLIANCE_MAP).find(k => k.toLowerCase() === settingName.toLowerCase());
    if (key) {
        return COMPLIANCE_MAP[key];
    }
    
    // Fallback if no specific mapping exists
    return {
        reason: `Setting Failure: ${settingName}`,
        remediation: "Review Intune Endpoint Manager for specific policy configurations."
    };
}
