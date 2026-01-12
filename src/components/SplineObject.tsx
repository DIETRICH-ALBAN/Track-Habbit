"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";

export default function SplineObject() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const hideLogo = () => {
            if (containerRef.current) {
                const viewer = containerRef.current.querySelector('spline-viewer');
                if (viewer && viewer.shadowRoot) {
                    const logo = viewer.shadowRoot.querySelector('#logo');
                    if (logo) {
                        // @ts-ignore
                        logo.style.display = 'none';
                    } else {
                        // Retry if not yet ready
                        requestAnimationFrame(hideLogo);
                    }
                } else {
                    requestAnimationFrame(hideLogo);
                }
            }
        };

        // Start attempting to hide the logo
        const timer = setTimeout(hideLogo, 100);
        return () => clearTimeout(timer);
    }, []);

    return (
        <>
            <Script
                type="module"
                src="https://unpkg.com/@splinetool/viewer@1.12.32/build/spline-viewer.js"
            />
            <div ref={containerRef} className="w-full h-full relative">
                {/* @ts-ignore */}
                <spline-viewer
                    url="https://prod.spline.design/S8ExRYmCK3ZlAx8n/scene.splinecode"
                    loading-anim-type="none"
                    style={{ width: '100%', height: '100%' }}
                />
            </div>
        </>
    );
}
