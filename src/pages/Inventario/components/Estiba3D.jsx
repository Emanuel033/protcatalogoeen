import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco, estibaCruzada }) => {
  const cajas = [];
  const boxHeight = 1; // Altura estándar de caja en 3D
  const gap = 0.01;    // Holgura mínima para realismo sin verse separado

  const n = Math.max(1, parseInt(niveles) || 1);

  const renderMaterial = (isHueco, colorBase = "#3b82f6") => {
    if (isHueco) return <meshStandardMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />;
    return <meshStandardMaterial color={colorBase} roughness={0.3} metalness={0.1} />;
  };

  // ==========================================
  // ESCENARIO 1: LIENZO (LIBRE TOTAL, CLON EXACTO)
  // ==========================================
  if (modoOrigen === 'visual' && piezasVisuales && piezasVisuales.length > 0) {
    const scale = 34; // Factor de conversión píxeles -> unidades 3D
    // Centrado dinámico basado en las piezas existentes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    piezasVisuales.forEach(p => {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    });
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    for (let y = 0; y < n; y++) {
      const debeRotarCapa = estibaCruzada && (y % 2 !== 0);
      const posY = y * (boxHeight + gap) + (boxHeight / 2);

      piezasVisuales.forEach((p, idx) => {
        // Obtenemos dimensiones 3D basadas en el nombre de la forma
        let w3D = 1, d3D = 1;
        const n = p.forma;
        if (n.includes('caja')) { w3D = n.includes('-h')?1.5:1; d3D = n.includes('-v')?1.5:1; }
        else if (n.includes('rect')) { w3D = n.includes('-h')?2:1; d3D = n.includes('-v')?2:1; }
        else if (n.includes('delgado')) { w3D = n.includes('-h')?3:1; d3D = n.includes('-v')?3:1; }

        let x3D = (p.x - centerX) / scale;
        let z3D = (p.y - centerY) / scale;

        // Invertimos coordenadas si la capa debe rotar (Amarre)
        if (debeRotarCapa) { x3D = -x3D; z3D = -z3D; }
        
        const key = `lienzo-${y}-${idx}`;
        const isHueco = huecos3D.includes(key);

        if (p.forma === 'circulo') {
          cajas.push(
            <Cylinder key={key} position={[x3D, posY, z3D]} args={[0.5, 0.5, boxHeight, 32]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
              {renderMaterial(isHueco, "#f59e0b")} {/* Ámbar para cilindros */}
            </Cylinder>
          );
        } else {
          cajas.push(
            <Box key={key} position={[x3D, posY, z3D]} args={[w3D, boxHeight, d3D]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
              {renderMaterial(isHueco)}
            </Box>
          );
        }
      });
    }
  } 
  // ... (Escenarios Cama y Bloque simplificados, usan gap mínimo) ...
  else if (modoOrigen === 'cama' && parseInt(pzCama) > 0) {
    const pz = parseInt(pzCama);
    const cols = Math.ceil(Math.sqrt(pz));
    const offX = (cols * (1 + gap)) / 2 - 0.5;
    const offZ = (Math.ceil(pz/cols) * (1 + gap)) / 2 - 0.5;

    for (let y = 0; y < n; y++) {
      for (let i = 0; i < pz; i++) {
        const key = `cama-${y}-${i}`;
        const col = i % cols; const row = Math.floor(i / cols);
        cajas.push(<Box key={key} position={[col*(1+gap)-offX, y*(1+gap)+0.5, row*(1+gap)-offZ]} args={[1,1,1]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>{renderMaterial(huecos3D.includes(key), "#8b5cf6")}</Box>);
      }
    }
  } else {
    const f = Math.max(1, frente||1); const d = Math.max(1, fondo||1);
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