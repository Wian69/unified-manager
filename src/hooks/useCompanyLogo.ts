"use client";

import { useEffect, useState } from "react";

const LOGO_KEY = "eqn-company-logo";
const DEFAULT_LOGO = "/Equinox-Logo-Transparent.png";

export function useCompanyLogo() {
    const [logo, setLogoState] = useState<string>(DEFAULT_LOGO);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(LOGO_KEY);
            if (stored) setLogoState(stored);
        } catch {}
    }, []);

    const setLogo = (dataUrl: string) => {
        localStorage.setItem(LOGO_KEY, dataUrl);
        setLogoState(dataUrl);
    };

    const resetLogo = () => {
        localStorage.removeItem(LOGO_KEY);
        setLogoState(DEFAULT_LOGO);
    };

    return { logo, setLogo, resetLogo, isDefault: logo === DEFAULT_LOGO };
}
