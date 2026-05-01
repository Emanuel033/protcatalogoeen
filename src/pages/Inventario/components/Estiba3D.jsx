import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco, estibaCruzada, patronIndex, patronesCustom }) => {
  const cajas = [];
  const boxHeight = 1;
  const gap = 0.05;

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  const renderMaterial = (isHueco, colorBase = "#3b82f6") => {
    if (isHueco) return <meshStandardMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />;
    return <meshStandardMaterial color={colorBase} roughness={0.3} metalness={0.1} />;
  };

  // --- OBTENER PATRONES DEFAULT ---
  const getHardcodedPatrones = (pz) => {
    if (pz === 3) return [
      [ { x: -2, z: 0, r: false }, { x: 0, z: 0, r: false }, { x: 2, z: 0, r: false } ], 
      [ { x: -0.8, z: 0.5, r: false }, { x: 0.8, z: 0.5, r: false }, { x: 0, z: -0.8, r: true } ] 
    ];
    if (pz === 4) return [
      [ { x: -1, z: -1, r: false }, { x: 1, z: -1, r: false }, { x: -1, z: 1, r: false }, { x: 1, z: 1, r: false } ], 
      [ { x: 0, z: -1.5, r: true }, { x: 1.5, z: 0, r: false }, { x: 0, z: 1.5, r: true }, { x: -1.5, z: 0, r: false } ] 
    ];
    if (pz === 5) return [
      [ { x: -1.5, z: -1, r: false }, { x: 0, z: -1, r: false }, { x: 1.5, z: -1, r: false }, { x: -0.8, z: 1.5, r: true }, { x: 0.8, z: 1.5, r: true } ] 
    ];
    return [];
  };

  const pzInt = parseInt(pzCama);
  const hardcoded = (modoOrigen === 'cama') ? getHardcodedPatrones(pzInt) : [];
  const totalPatrones = hardcoded.length + (patronesCustom ? patronesCustom.length : 0);
  const actualIndex = totalPatrones > 0 ? patronIndex % totalPatrones : 0;
  
  const isCustomCama = modoOrigen === 'cama' && totalPatrones > 0 && actualIndex >= hardcoded.length;
  const customVisuales = isCustomCama ? patronesCustom[actualIndex - hardcoded.length] : [];
  
  const useVisualLogic = (modoOrigen === 'visual' && piezasVisuales && piezasVisuales.length > 0) || isCustomCama;
  const sourceVisuales = isCustomCama ? customVisuales : piezasVisuales;

  // ==========================================
  // ESCENARIO 1: LIENZO Y PATRONES GUARDADOS
  // ==========================================
  if (useVisualLogic) {
    const scale = 34; 
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Auto-centrado
    sourceVisuales.forEach(p => {
      let wPx = 34, dPx = 34;
      if (p.forma.includes('caja')) { wPx = p.forma.includes('-h')?51:34; dPx = p.forma.includes('-v')?51:34; }
      if (p.forma.includes('rect')) { wPx = p.forma.includes('-h')?68:34; dPx = p.forma.includes('-v')?68:34; }
      if (p.forma.includes('delgado')) { wPx = p.forma.includes('-h')?102:34; dPx = p.forma.includes('-v')?102:34; }
      
      if (p.x < minX) minX = p.x; if ((p.x + wPx) > maxX) maxX = p.x + wPx;
      if (p.y < minY) minY = p.y; if ((p.y + dPx) > maxY) maxY = p.y + dPx;
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        // LÓGICA DE ESTIBA CRUZADA RESTAURADA
        const debeRotarCapa = estibaCruzada && (y % 2 !== 0);
        const posY = y * (boxHeight + gap) + 0.5;

        sourceVisuales.forEach((p, idx) => {
          let w3D = 1, d3D = 1;
          const f = p.forma;
          if (f.includes('caja')) { w3D = f.includes('-h')?1.5:1; d3D = f.includes('-v')?1.5:1; }
          else if (f.includes('rect')) { w3D = f.includes('-h')?2:1; d3D = f.includes('-v')?2:1; }
          else if (f.includes('delgado')) { w3D = f.includes('-h')?3:1; d3D = f.includes('-v')?3:1; }

          const wPx = w3D * scale;
          const dPx = d3D * scale;

          let x3D = ((p.x + (wPx/2)) - centerX) / scale;
          let z3D = ((p.y + (dPx/2)) - centerY) / scale;

          // ROTACIÓN DE 180 GRADOS EN POSICIÓN Y DIMENSIONES
          if (debeRotarCapa) { 
            x3D = -x3D; 
            z3D = -z3D; 
          }
          
          const finalW = debeRotarCapa ? d3D : w3D;
          const finalD = debeRotarCapa ? w3D : d3D;

          const key = `lienzo-${tarima}-${y}-${idx}`;
          const isHueco = huecos3D.includes(key);

          if (f === 'circulo') {
            cajas.push(<Cylinder key={key} position={[x3D, posY, z3D + (tarima * 4)]} args={[0.5, 0.5, boxHeight, 32]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial(isHueco, "#f59e0b")}</Cylinder>);
          } else {
            cajas.push(<Box key={key} position={[x3D, posY, z3D + (tarima * 4)]} args={[finalW, boxHeight, finalD]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial(isHueco, isCustomCama ? "#8b5cf6" : "#3b82f6")}</Box>);
          }
        });
      }
    }
  } 
  // ==========================================
  // ESCENARIO 2: CAMA CON PATRÓN DEL SISTEMA
  // ==========================================
  else if (modoOrigen === 'cama' && hardcoded.length > 0) {
    const config = hardcoded[actualIndex];
    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        const debeRotar = estibaCruzada && (y % 2 !== 0);
        const posY = y * (1 + gap) + 0.5;
        config.forEach((c, i) => {
          const key = `sys-${tarima}-${y}-${i}`;
          const w = (c.r !== debeRotar) ? 1.5 : 1; 
          const d = (c.r !== debeRotar) ? 1 : 1.5;
          let px = debeRotar ? -c.x : c.x;
          let pz = debeRotar ? -c.z : c.z;
          cajas.push(<Box key={key} position={[px, posY, pz + (tarima * 4)]} args={[w, 1, d]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>{renderMaterial(huecos3D.includes(key), "#8b5cf6")}</Box>);
        });
      }
    }
  }
  // ==========================================
  // ESCENARIO 3: BLOQUE BÁSICO Y CUADRÍCULA
  // ==========================================
  else if (modoOrigen === 'cama') {
    const pz = parseInt(pzCama);
    const cols = Math.ceil(Math.sqrt(pz));
    const offsetX = (cols * (1 + gap)) / 2 - 0.5;
    const offsetZ = (Math.ceil(pz/cols) * (1 + gap)) / 2 - 0.5;
    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        for (let i = 0; i < pz; i++) {
          const col = i % cols; const row = Math.floor(i / cols);
          const key = `cama-gen-${tarima}-${y}-${i}`;
          cajas.push(<Box key={key} position={[col*(1+gap)-offsetX, y*(1+gap)+0.5, row*(1+gap)-offsetZ + (tarima * 4)]} args={[1,1,1]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>{renderMaterial(huecos3D.includes(key), "#8b5cf6")}</Box>);
        }
      }
    }
  } else {
    const f = Math.max(1, parseInt(frente) || 1); const d = Math.max(1, parseInt(fondo) || 1);
    for (let y = 0; y < n; y++) {
      const debeRotar = estibaCruzada && (y % 2 !== 0);
      const iterF = debeRotar ? d : f; const iterD = debeRotar ? f : d;
      const offX = (iterF * (1 + gap)) / 2 - 0.5; const offZ = (iterD * (1 + gap)) / 2 - 0.5;
      for (let x = 0; x < iterF; x++) {
        for (let z = 0; z < iterD; z++) {
          const key=`b-${y}-${x}-${z}`;
          cajas.push(<Box key={key} position={[x*(1+gap)-offX, y*(1+gap)+0.5, z*(1+gap)-offZ]} args={[1,1,1]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>{renderMaterial(huecos3D.includes(key), "#10b981")}</Box>);
        }
      }
    }
  }

  return (
    <Canvas camera={{ position: [0, 8, 10], fov: 45 }}>
      <ambientLight intensity={0.6} /><directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      {cajas}
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.1} />
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#475569" sectionColor="#1e293b" fadeDistance={25} />
    </Canvas>
  );
};

export default Estiba3D;