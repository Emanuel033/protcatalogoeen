import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco, estibaCruzada, patronIndex, patronesCustom }) => {
  const cajas = [];
  const boxHeight = 1; 
  const gap = 0.01;    

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  const renderMaterial = (isHueco, colorBase = "#3b82f6") => {
    if (isHueco) return <meshStandardMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />;
    return <meshStandardMaterial color={colorBase} roughness={0.3} metalness={0.1} />;
  };

  // --- OBTENER PATRONES DEFAULT DE SISTEMA ---
  const getHardcodedPatrones = (pz) => {
    if (pz === 3) return [
      [ { x: -2, z: 0, r: false }, { x: 0, z: 0, r: false }, { x: 2, z: 0, r: false } ], // Romano
      [ { x: -0.8, z: 0.5, r: false }, { x: 0.8, z: 0.5, r: false }, { x: 0, z: -0.8, r: true } ] // Pi
    ];
    if (pz === 4) return [
      [ { x: -1, z: -1, r: false }, { x: 1, z: -1, r: false }, { x: -1, z: 1, r: false }, { x: 1, z: 1, r: false } ], // Grid
      [ { x: 0, z: -1.5, r: true }, { x: 1.5, z: 0, r: false }, { x: 0, z: 1.5, r: true }, { x: -1.5, z: 0, r: false } ] // Molino Hueco
    ];
    if (pz === 5) return [
      [ { x: -1.5, z: -1, r: false }, { x: 0, z: -1, r: false }, { x: 1.5, z: -1, r: false }, { x: -0.8, z: 1.5, r: true }, { x: 0.8, z: 1.5, r: true } ] // 3+2
    ];
    return [];
  };

  // Lógica para decidir qué dibujar
  const pzInt = parseInt(pzCama);
  const hardcoded = (modoOrigen === 'cama') ? getHardcodedPatrones(pzInt) : [];
  
  // COMBINAMOS LOS MÍOS CON LOS TUYOS
  const totalPatrones = hardcoded.length + (patronesCustom ? patronesCustom.length : 0);
  const actualIndex = totalPatrones > 0 ? patronIndex % totalPatrones : 0;
  
  const isCustomCama = modoOrigen === 'cama' && totalPatrones > 0 && actualIndex >= hardcoded.length;
  const customVisuales = isCustomCama ? patronesCustom[actualIndex - hardcoded.length] : [];
  
  // Si estamos en lienzo o usando un dibujo guardado, usamos la misma lógica poderosa de renderizado 2D -> 3D
  const useVisualLogic = (modoOrigen === 'visual' && piezasVisuales && piezasVisuales.length > 0) || isCustomCama;
  const sourceVisuales = isCustomCama ? customVisuales : piezasVisuales;

  // ==========================================
  // ESCENARIO 1 Y 2 AVANZADO: LIENZO Y PATRONES GUARDADOS POR EL USUARIO
  // ==========================================
  if (useVisualLogic) {
    const scale = 34; 
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Auto-centramos tu dibujo (sin importar en qué esquina del lienzo lo hiciste)
    sourceVisuales.forEach(p => {
      const wPx = p.forma.includes('-h') ? (p.forma.includes('delgado') ? 102 : p.forma.includes('rect') ? 68 : 51) : 34;
      const dPx = p.forma.includes('-v') ? (p.forma.includes('delgado') ? 102 : p.forma.includes('rect') ? 68 : 51) : 34;
      if (p.x < minX) minX = p.x; if ((p.x + wPx) > maxX) maxX = p.x + wPx;
      if (p.y < minY) minY = p.y; if ((p.y + dPx) > maxY) maxY = p.y + dPx;
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        const debeRotarCapa = estibaCruzada && (y % 2 !== 0);
        const posY = y * (boxHeight + gap) + (boxHeight / 2);

        sourceVisuales.forEach((p, idx) => {
          let w3D = 1, d3D = 1;
          const f = p.forma;
          if (f.includes('caja')) { w3D = f.includes('-h')?1.5:1; d3D = f.includes('-v')?1.5:1; }
          else if (f.includes('rect')) { w3D = f.includes('-h')?2:1; d3D = f.includes('-v')?2:1; }
          else if (f.includes('delgado')) { w3D = f.includes('-h')?3:1; d3D = f.includes('-v')?3:1; }

          // Dimensiones visuales reales en píxeles para encontrar su centro local
          const wPx = w3D * scale;
          const dPx = d3D * scale;

          // Desplazamiento desde el centro global
          let x3D = ((p.x + (wPx/2)) - centerX) / scale;
          let z3D = ((p.y + (dPx/2)) - centerY) / scale;

          if (debeRotarCapa) { x3D = -x3D; z3D = -z3D; }
          
          const key = `lienzo-${tarima}-${y}-${idx}`;
          const isHueco = huecos3D.includes(key);

          if (f === 'circulo') {
            cajas.push(<Cylinder key={key} position={[x3D, posY, z3D + (tarima * 4)]} args={[0.5, 0.5, boxHeight, 32]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial(isHueco, "#f59e0b")}</Cylinder>);
          } else {
            // Si la capa rota, visualmente intercambiamos ancho por profundidad
            const finalW = debeRotarCapa ? d3D : w3D;
            const finalD = debeRotarCapa ? w3D : d3D;
            cajas.push(<Box key={key} position={[x3D, posY, z3D + (tarima * 4)]} args={[finalW, boxHeight, finalD]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial(isHueco, isCustomCama ? "#8b5cf6" : "#3b82f6")}</Box>);
          }
        });
      }
    }
  } 
  // ==========================================
  // ESCENARIO 2 BÁSICO: CAMA CON PATRÓN DEL SISTEMA
  // ==========================================
  else if (modoOrigen === 'cama' && hardcoded.length > 0) {
    const config = hardcoded[actualIndex];
    for (let y = 0; y < n; y++) {
      const debeRotar = estibaCruzada && (y % 2 !== 0);
      const posY = y * (1 + gap) + 0.5;
      config.forEach((c, i) => {
        const key = `sys-${y}-${i}`;
        const w = (c.r !== debeRotar) ? 1.5 : 1; 
        const d = (c.r !== debeRotar) ? 1 : 1.5;
        let px = debeRotar ? -c.x : c.x;
        let pz = debeRotar ? -c.z : c.z;
        cajas.push(<Box key={key} position={[px, posY, pz]} args={[w, 1, d]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>{renderMaterial(huecos3D.includes(key), "#8b5cf6")}</Box>);
      });
    }
  }
  // (Cuadrícula Genérica o Bloque...)
  else {
    const f = Math.max(1, parseInt(frente) || 1); const d = Math.max(1, parseInt(fondo) || 1);
    for (let y=0; y<n; y++) for (let x=0; x<f; x++) for (let z=0; z<d; z++) {
      const key=`b-${y}-${x}-${z}`;
      cajas.push(<Box key={key} position={[x*(1+gap)-(f/2), y*(1+gap)+0.5, z*(1+gap)-(d/2)]} args={[1,1,1]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>{renderMaterial(huecos3D.includes(key), "#10b981")}</Box>);
    }
  }

  return (
    <Canvas camera={{ position: [0, 8, 10], fov: 40 }}>
      <ambientLight intensity={0.8} /><directionalLight position={[10, 20, 10]} intensity={1} />
      {cajas}
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.1} />
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#475569" sectionColor="#1e293b" fadeDistance={25} />
    </Canvas>
  );
};

export default Estiba3D;