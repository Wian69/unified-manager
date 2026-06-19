import { NextResponse } from 'next/server';
import { getGraphClient } from '@/lib/graph';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        const client = getGraphClient();
        
        // Define the NTLM Restriction Policy using the modern Settings Catalog (Configuration Policy)
        const policyPayload = {
            "name": "Disable NTLM Authentication (Settings Catalog)",
            "description": "Enforces NTLM restrictions across all accounts and domains.",
            "platforms": "windows10",
            "technologies": "mdm",
            "settings": [
                {
                    "@odata.type": "#microsoft.graph.deviceManagementConfigurationSetting",
                    "settingInstance": {
                        "@odata.type": "#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance",
                        "settingDefinitionId": "device_vendor_msft_policy_config_lanmanworkstation_restrictntlmoutbound",
                        "choiceSettingValue": {
                            "value": "device_vendor_msft_policy_config_lanmanworkstation_restrictntlmoutbound_4"
                        }
                    }
                },
                {
                    "@odata.type": "#microsoft.graph.deviceManagementConfigurationSetting",
                    "settingInstance": {
                        "@odata.type": "#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance",
                        "settingDefinitionId": "device_vendor_msft_policy_config_security_restrictntlm_incoming",
                        "choiceSettingValue": {
                            "value": "device_vendor_msft_policy_config_security_restrictntlm_incoming_2"
                        }
                    }
                },
                {
                    "@odata.type": "#microsoft.graph.deviceManagementConfigurationSetting",
                    "settingInstance": {
                        "@odata.type": "#microsoft.graph.deviceManagementConfigurationChoiceSettingInstance",
                        "settingDefinitionId": "device_vendor_msft_policy_config_security_restrictntlm_domain",
                        "choiceSettingValue": {
                            "value": "device_vendor_msft_policy_config_security_restrictntlm_domain_3"
                        }
                    }
                }
            ]
        };

        // 1. Create the Policy
        const newPolicy = await client.api('/deviceManagement/configurationPolicies')
            .version('beta')
            .post(policyPayload);

        // 2. Assign to All Devices
        const assignmentPayload = {
            "assignments": [
                {
                    "target": {
                        "@odata.type": "#microsoft.graph.allDevicesAssignmentTarget"
                    }
                }
            ]
        };

        await client.api(`/deviceManagement/configurationPolicies/${newPolicy.id}/assign`)
            .version('beta')
            .post(assignmentPayload);

        return NextResponse.json({
            success: true,
            policyName: newPolicy.name,
            policyId: newPolicy.id,
            assignedTo: "All Devices"
        });

    } catch (error: any) {
        console.error('[API] NTLM Deployment failed:', error.message);
        return NextResponse.json(
            { error: "Failed to deploy NTLM Restriction Profile", details: error.message },
            { status: 500 }
        );
    }
}
