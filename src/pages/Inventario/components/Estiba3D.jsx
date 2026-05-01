import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco, estibaCruzada, dimsEmpaque, patronIndex }) => {
  const cajas = [];
  const [bW, bH, bD] = dimsEmpaque || [1, 1, 1];
  const gap = 0.02; // Gap mínimo para amarre hermético

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  const renderMaterial = (isHueco, colorBase = "#3b82f6") => {
    if (isHueco) return <meshStandardMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />;
    return <meshStandardMaterial color={colorBase} roughness={0.3} metalness={0.1} />;
  };

  // --- GENERADOR DE PATRONES LOGÍSTICOS ---
  const getPatronCama = (pz, pIndex) => {
    const i = pIndex % 3; // Ciclar entre 3 variantes por número de piezas
    
    if (pz === 3) {
      const p = [
        [ { x: -bW-gap, z: 0, r: false }, { x: 0, z: 0, r: false }, { x: bW+gap, z: 0, r: false } ], // Romano |||
        [ { x: -bW/2-gap, z: bD/2, r: false }, { x: bW/2+gap, z: bD/2, r: false }, { x: 0, z: -bW/2-gap, r: true } ], // Pi (2V, 1H)
        [ { x: 0, z: -bD-gap, r: true }, { x: 0, z: 0, r: true }, { x: 0, z: bD+gap, r: true } ] // Horizontal ---
      ];
      return p[i];
    }
    if (pz === 4) {
      const p = [
        [ { x: -bW/2-gap, z: -bD/2-gap, r: false }, { x: bW/2+gap, z: -bD/2-gap, r: false }, { x: -bW/2-gap, z: bD/2+gap, r: false }, { x: bW/2+gap, z: bD/2+gap, r: false } ], // Grid 2x2
        [ { x: 0, z: -bW/2-bD/2-gap, r: true }, { x: bW/2+bD/2+gap, z: 0, r: false }, { x: 0, z: bW/2+bD/2+gap, r: true }, { x: -bW/2-bD/2-gap, z: 0, r: false } ], // Molino con hueco
        [ { x: -bW-gap, z: 0, r: false }, { x: 0, z: 0, r: false }, { x: bW+gap, z: 0, r: false }, { x: 0, z: bD+gap+bW/2, r: true } ] // T-Shape
      ];
      return p[i];
    }
    if (pz === 5) {
      const p = [
        [ { x: -bW-gap, z: -bD/2-gap, r: false }, { x: 0, z: -bD/2-gap, r: false }, { x: bW+gap, z: -bD/2-gap, r: false }, { x: -bW/2-gap, z: bD/2+gap+bW/2, r: true }, { x: bW/2+gap, z: bD/2+gap+bW/2, r: true } ], // 3V + 2H (Clásico)
        [ { x: -bW-gap, z: 0, r: false }, { x: bW+gap, z: 0, r: false }, { x: 0, z: -bD-gap, r: true }, { x: 0, z: 0, r: true }, { x: 0, z: bD+gap, r: true } ], // Cruz
        [ { x: -bW-gap, z: -bD-gap, r: false }, { x: bW+gap, z: -bD-gap, r: false }, { x: 0, z: 0, r: false }, { x: -bW-gap, z: bD+gap, r: false }, { x: bW+gap, z: bD+gap, r: false } ] // Dados
      ];
      return p[i];
    }
    return null; // Fallback a cuadrícula genérica
  };

  // --- LÓGICA DE DIBUJO ---
  const pzInt = parseInt(pzCama);
  const config = (modoOrigen === 'cama') ? getPatronCama(pzInt, patronIndex) : null;

  for (let tarima = 0; tarima < t; tarima++) {
    for (let y = 0; y < n; y++) {
      const debeRotarCapa = estibaCruzada && (y % 2 !== 0);
      const posY = y * (bH + gap) + (bH / 2);

      if (config) {
        config.forEach((c, idx) => {
          const key = `cama-${tarima}-${y}-${idx}`;
          const isHueco = huecos3D.includes(key);
          // Invertimos coordenadas si la capa debe rotar
          let px = debeRotarCapa ? -c.x : c.x;
          let pz = debeRotarCapa ? -c.z : c.z;
          let isRotated = debeRotarCapa ? !c.r : c.r;
          
          cajas.push(
            <Box key={key} position={[px, posY, pz + (tarima * 4)]} args={[isRotated ? bD : bW, bH, isRotated ? bW : bD]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
              {renderMaterial(isHueco, "#8b5cf6")}
            </Box>
          );
        });
      } else if (modoOrigen === 'visual' && piezasVisuales.length > 0) {
        // ... (Lógica de Lienzo afinada con SNAP de 34px) ...
        const scale = 34;
        piezasVisuales.forEach((p, idx) => {
          const wPx = p.forma.includes('-h') ? (p.forma.includes('rect') ? 68 : 51) : 34;
          const dPx = p.forma.includes('-v') ? (p.forma.includes('rect') ? 68 : 51) : 34;
          let x3D = ((p.x + wPx/2) / scale) - 5;
          let z3D = ((p.y + dPx/2) / scale) - 2.5;
          if (debeRotarCapa) { x3D = -x3D; z3D = -z3D; }
          const key = `lienzo-${tarima}-${y}-${idx}`;
          cajas.push(<Box key={key} position={[x3D, posY, z3D + (tarima * 4)]} args={[wPx/scale, bH, dPx/scale]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial(huecos3D.includes(key))}</Box>);
        });
      } else {
        // Bloque Genérico
        const f = Math.max(1, parseInt(frente) || 1);
        const d = Math.max(1, parseInt(fondo) || 1);
        for (let x = 0; x < f; x++) {
          for (let z = 0; z < d; z++) {
            const key = `bloque-${x}-${y}-${z}`;
            cajas.push(<Box key={key} position={[x*(bW+gap) - (f*bW)/2, posY, z*(bD+gap) - (d*bD)/2]} args={[bW, bH, bD]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial(huecos3D.includes(key), "#10b981")}</Box>);
          }
        }
      }
    }
  }

  return (
    <Canvas camera={{ position: [0, 8, 10], fov: 40 }}>
      <ambientLight intensity={0.7} /><directionalLight position={[10, 20, 10]} intensity={1.2} />
      {cajas}
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#475569" sectionColor="#1e293b" fadeDistance={25} />
    </Canvas>
  );
};

export default Estiba3D;