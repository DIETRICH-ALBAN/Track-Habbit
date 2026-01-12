"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sphere, MeshDistortMaterial, Float, MeshWobbleMaterial } from "@react-three/drei";
import * as THREE from "three";

export function NeuralSphere({ active = false }: { active?: boolean }) {
    return (
        <div className="w-full h-full">
            <Canvas camera={{ position: [0, 0, 3], fov: 75 }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} intensity={1} color="#A855F7" />
                <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06B6D4" />
                <spotLight position={[0, 5, 0]} intensity={2} color="#8B5CF6" />

                <Float speed={2} rotationIntensity={1} floatIntensity={1}>
                    <AnimatedSphere active={active} />
                </Float>
            </Canvas>
        </div>
    );
}

function AnimatedSphere({ active }: { active: boolean }) {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.rotation.y = time * 0.2;
            meshRef.current.rotation.z = time * 0.1;
        }
    });

    return (
        <Sphere ref={meshRef} args={[1, 64, 64]}>
            <MeshDistortMaterial
                color={active ? "#A855F7" : "#8B5CF6"}
                attach="material"
                distort={active ? 0.6 : 0.4}
                speed={active ? 4 : 2}
                roughness={0.1}
                metalness={1}
                emissive={active ? "#8B5CF6" : "#4c1d95"}
                emissiveIntensity={active ? 2 : 1}
            />
        </Sphere>
    );
}

export function MiniNeuralSphere({ active = false }: { active?: boolean }) {
    return (
        <div className="w-full h-full">
            <Canvas camera={{ position: [0, 0, 2], fov: 50 }}>
                <ambientLight intensity={1} />
                <pointLight position={[5, 5, 5]} intensity={1} color="#8B5CF6" />
                <Float speed={3} rotationIntensity={0.5} floatIntensity={0.5}>
                    <Sphere args={[1, 32, 32]}>
                        <MeshWobbleMaterial
                            color={active ? "#A855F7" : "#8B5CF6"}
                            factor={active ? 0.8 : 0.4}
                            speed={5}
                            roughness={0}
                            emissive={active ? "#8B5CF6" : "#4c1d95"}
                            emissiveIntensity={active ? 3 : 1}
                        />
                    </Sphere>
                </Float>
            </Canvas>
        </div>
    );
}
