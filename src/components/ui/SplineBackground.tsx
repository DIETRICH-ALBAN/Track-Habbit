"use client";

import Script from "next/script";

export default function SplineBackground() {
    return (
        <>
            <Script
                type="module"
                src="https://unpkg.com/@splinetool/viewer@1.12.32/build/spline-viewer.js"
                strategy="lazyOnload"
            />
            {/* 3D Scene - Deepest layer */}
            <div className="fixed inset-0 z-[-50] pointer-events-none opacity-60 blur-[3px] saturate-150">
                {/* @ts-ignore */}
                <spline-viewer
                    url="https://prod.spline.design/S8ExRYmCK3ZlAx8n/scene.splinecode"
                    loading-anim-type="none"
                />
            </div>

            {/* Dark Overlay - For legibility */}
            <div className="fixed inset-0 z-[-40] bg-[#0a0a0b]/90 pointer-events-none backdrop-blur-[1px]" />
        </>
    );
}
