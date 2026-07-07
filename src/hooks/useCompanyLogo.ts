"use client";

import { useEffect, useState } from "react";

const LOGO_KEY = "eqn-company-logo";
const DEFAULT_LOGO = "/Equinox-Group-Holdings-Logo.png";

export function useCompanyLogo() {
    const [logo, setLogoState] = useState<string>(DEFAULT_LOGO);

    useEffect(() => {
        // Try local first for instant load
        try {
            const stored = localStorage.getItem(LOGO_KEY);
            if (stored) setLogoState(stored);
        } catch {}

        // Then fetch from server to sync
        fetch('/api/settings').then(r => r.json()).then(data => {
            if (data?.companyLogo) {
                setLogoState(data.companyLogo);
                localStorage.setItem(LOGO_KEY, data.companyLogo);
            }
        }).catch(() => {});
    }, []);

    const setLogo = async (dataUrl: string) => {
        setLogoState(dataUrl);
        localStorage.setItem(LOGO_KEY, dataUrl);
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyLogo: dataUrl })
        });
    };

    const resetLogo = async () => {
        setLogoState(DEFAULT_LOGO);
        localStorage.removeItem(LOGO_KEY);
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ companyLogo: null })
        });
    };

    return { logo, setLogo, resetLogo, isDefault: logo === DEFAULT_LOGO };
}
