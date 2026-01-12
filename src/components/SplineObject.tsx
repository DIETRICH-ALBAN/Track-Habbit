"use client";

import Script from "next/script";

export default function SplineObject() {
    return (
        <>
            <Script
                type="module"
                src="https://unpkg.com/@splinetool/viewer@1.12.32/build/spline-viewer.js"
            />
            <div className="w-full h-full">
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
