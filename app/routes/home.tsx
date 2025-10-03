import React, { useRef, useState, Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Center, Stage, Environment, Html, useAnimations } from "@react-three/drei";
import * as THREE from "three";

// Varianti disponibili del modello MrDude
const MODEL_VARIANTS = {
  metallic: "/models/MrDude_metallic.glb",
  plastic: "/models/MrDude_plastic.glb",
  trasparente: "/models/MrDude_trasparente.glb",
  white: "/models/MrDude_white.glb"
} as const;

type ModelVariant = keyof typeof MODEL_VARIANTS;

const DEFAULT_MODEL_URL = MODEL_VARIANTS.metallic;

type ModelProps = {
  url: string;
  enabledAnimations: Set<string>;
  onAnimationsDiscovered: (animationNames: string[]) => void;
};


function Model({ url, enabledAnimations, onAnimationsDiscovered }: ModelProps) {
  const group = useRef<THREE.Group>(null);
  // drei's useGLTF caches by URL and supports both .gltf and .glb
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);

  // Comunica le animazioni disponibili al componente padre
  useEffect(() => {
    if (names.length > 0) {
      onAnimationsDiscovered(names);
    }
  }, [names, onAnimationsDiscovered]);

  // Controlla le animazioni in base a quelle abilitate
  useEffect(() => {
    names.forEach((name: string) => {
      const action = actions[name];
      if (action) {
        if (enabledAnimations.has(name)) {
          action.play();
        } else {
          action.stop();
        }
      }
    });
  }, [actions, names, enabledAnimations]);

  /*
  useEffect(() => {
    scene.traverse((obj: any) => {

      if (obj.isMesh && obj.material) {
        if (Array.isArray(obj.material)) {

          obj.material.forEach((mat: any) => {

            mat.transparent = true;
            mat.opacity = 0.9;
            mat.ior = 3; 
            mat.envMapIntensity = 3;

          });

        } else {

          obj.material.transparent = true;
          obj.material.opacity = 0.9;
          obj.material.ior = 3;
          obj.material.envMapIntensity = 3;

        }

      }
    });

  }, [scene]);
  */

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}



export default function R3FLocalGLTFViewer(): React.ReactElement {
  
  const [useHdrBackground, setUseHdrBackground] = useState<boolean>(true);
  const [selectedVariant, setSelectedVariant] = useState<ModelVariant>('metallic');
  const [enabledAnimations, setEnabledAnimations] = useState<Set<string>>(new Set());
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
  const activeUrl = MODEL_VARIANTS[selectedVariant];

  // Preload selected variant for faster first render (solo lato client)
  useEffect(() => {
    // @ts-ignore
    useGLTF.preload?.(MODEL_VARIANTS[selectedVariant]);
  }, [selectedVariant]);





  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white flex flex-col">
      {/* Header */}
      <div className="w-full p-4 flex items-center justify-between gap-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-lg font-medium">R3F – Local GLTF Viewer</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10">@react-three/fiber</span>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedVariant}
            onChange={(e) => {
              setSelectedVariant(e.target.value as ModelVariant);
              setEnabledAnimations(new Set());
              setAvailableAnimations([]);
            }}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition text-white border-none outline-none"
            title="Seleziona variante modello"
          >
            <option value="metallic">Metallico</option>
            <option value="plastic">Plastica</option>
            <option value="trasparente">Trasparente</option>
            <option value="white">Bianco</option>
          </select>
          <button
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
            onClick={() => setUseHdrBackground(!useHdrBackground)}
            title="Cambia sfondo"
          >
            {useHdrBackground ? "Sfondo nero" : "Sfondo HDR"}
          </button>
        </div>
      </div>

      {/* Canvas container */}
      <div className="relative flex-1">
        <Canvas
          camera={{ position: [100, 6, 120], fov: 50 }}
          dpr={[1, 2]}
          style={{ height: '100vh', width: '100%' }}
        >
          {/* Luce d'ambiente per illuminazione diffusa */}
          <ambientLight intensity={0.7} />
          {/* Luce direzionale puntata sul modello */}
          <directionalLight 
            position={[5, 5, 5]} 
            intensity={1.5}
          />
          <color attach="background" args={["#0b0b0c"]} />

          <Suspense fallback={<Html center>Caricamento modello…</Html>}>
            {/* Stage provides soft lights and a ground; environment is set separately below */}
            <Stage intensity={1} environment={null} adjustCamera={false}>
              {/* Center recenters and normalizes the model around the origin */}
              <Center top>
                <Model 
                  key={activeUrl}
                  url={activeUrl} 
                  enabledAnimations={enabledAnimations}
                  onAnimationsDiscovered={(names) => {
                    setAvailableAnimations(names);
                    // Auto-abilita tutte le animazioni per ogni nuovo modello caricato
                    if (names.length > 0) {
                      setEnabledAnimations(new Set(names));
                    }
                  }}
                />
              </Center>
            </Stage>

            {/* Image-based lighting con HDR personalizzato o preset */}
            {useHdrBackground ? (
              <Environment files="/background.hdr" background />
            ) : (
              <Environment preset="sunset" background={false} />
            )}
          </Suspense>

          <OrbitControls makeDefault enableDamping />
        </Canvas>

        {/* Animation Controls */}
        {availableAnimations.length > 0 && (
          <div className="absolute top-4 left-4 bg-black/40 backdrop-blur px-3 py-2 rounded-xl text-xs text-white">
            <div className="font-medium mb-2">Animazioni:</div>
            {availableAnimations.map((animName) => (
              <label key={animName} className="flex items-center gap-2 cursor-pointer mb-1">
                <input
                  type="checkbox"
                  checked={enabledAnimations.has(animName)}
                  onChange={(e) => {
                    const newSet = new Set(enabledAnimations);
                    if (e.target.checked) {
                      newSet.add(animName);
                    } else {
                      newSet.delete(animName);
                    }
                    setEnabledAnimations(newSet);
                  }}
                  className="rounded"
                />
                <span className="text-xs">{animName}</span>
              </label>
            ))}
          </div>
        )}

      </div>

    </div>
  );
  
}
