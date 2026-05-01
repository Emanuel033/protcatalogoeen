import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco, estibaCruzada, dimsEmpaque }) => {
  const cajas = [];
  
  // Extraemos las proporciones elegidas por el usuario
  const [bW, bH, bD] = dimsEmpaque || [1, 1, 1];
  const gap = 0.05;

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  const renderMaterial = (forma, isHueco) => {
    if (isHueco) return <meshStandardMaterial color="#ef4444" transparent opacity={0.3} depthWrite={false} />;
    if (forma === 'circulo') return <meshStandardMaterial color="#f59e0b" roughness={0.3} metalness={0.2} />;
    if (forma === 'cama') return <meshStandardMaterial color="#8b5cf6" roughness={0.2} metalness={0.1} />;
    if (forma === 'bloque') return <meshStandardMaterial color="#10b981" roughness={0.2} metalness={0.1} />;
    return <meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.1} />;
  };

  // ==========================================
  // ESCENARIO 1: LIENZO (CON PROPORCIONES ELEGIDAS)
  // ==========================================
  if (modoOrigen === 'visual' && piezasVisuales && piezasVisuales.length > 0) {
    const scale = 34; 
    const offsetX = 5; 
    const offsetZ = 2.5; 

    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    piezasVisuales.forEach(p => {
      const wPx = p.forma.includes('-h') ? (p.forma === 'rectangulo-h' ? 68 : 51) : 34;
      const dPx = p.forma.includes('-v') ? (p.forma === 'rectangulo-v' ? 68 : 51) : 34;
      const base3Dx = ((p.x + (wPx / 2)) / scale) - offsetX;
      const base3Dz = ((p.y + (dPx / 2)) / scale) - offsetZ;
      if (base3Dx < minX) minX = base3Dx;
      if (base3Dx > maxX) maxX = base3Dx;
      if (base3Dz < minZ) minZ = base3Dz;
      if (base3Dz > maxZ) maxZ = base3Dz;
    });

    const centroEstibaX = (minX + maxX) / 2;
    const centroEstibaZ = (minZ + maxZ) / 2;

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        const debeRotar = estibaCruzada && (y % 2 !== 0);

        piezasVisuales.forEach((p, index) => {
          const wPx = p.forma.includes('-h') ? (p.forma === 'rectangulo-h' ? 68 : 51) : 34;
          const dPx = p.forma.includes('-v') ? (p.forma === 'rectangulo-v' ? 68 : 51) : 34;
          
          // La magia aquí: Multiplicamos el ancho visual por la proporción real del empaque elegido
          const ancho3D = (wPx / scale) * (bW / Math.max(bW, bD)); 
          const fondo3D = (dPx / scale) * (bD / Math.max(bW, bD));
          
          let x3D = ((p.x + (wPx / 2)) / scale) - offsetX;
          let z3D = ((p.y + (dPx / 2)) / scale) - offsetZ;

          if (debeRotar) {
            x3D = centroEstibaX - (x3D - centroEstibaX);
            z3D = centroEstibaZ - (z3D - centroEstibaZ);
          }

          z3D += (tarima * 3); 
          const posY = y * (bH + gap) + (bH / 2); // Usamos la altura real 'bH'
          const key = `lienzo-${tarima}-${y}-${index}`;
          const isHueco = huecos3D.includes(key);

          const props = { key: key, position: [x3D, posY, z3D], onClick: (e) => { e.stopPropagation(); onToggleHueco(key); } };

          if (p.forma === 'circulo') {
            cajas.push(<Cylinder {...props} args={[0.5, 0.5, bH, 32]}>{renderMaterial('circulo', isHueco)}</Cylinder>);
          } else {
            cajas.push(<Box {...props} args={[ancho3D, bH, fondo3D]}>{renderMaterial('caja', isHueco)}</Box>);
          }
        });
      }
    }
  } 
  // ==========================================
  // ESCENARIO 2: CAMA NUMÉRICA CON PATRONES INTELIGENTES
  // ==========================================
  else if (modoOrigen === 'cama' && parseInt(pzCama) > 0) {
    const pz = parseInt(pzCama);

    for (let tarima = 0; tarima < t; tarima++) {
      for (let y = 0; y < n; y++) {
        const debeRotar = estibaCruzada && (y % 2 !== 0);
        const posY = y * (bH + gap) + (bH / 2);
        
        // --- PATRÓN INTELIGENTE: 3 PIEZAS (2 vertical, 1 horizontal) ---
        if (pz === 3) {
          const configs = [
            { pos: [-0.55 * bW, posY, 0], rot: false }, // Izquierda
            { pos: [ 0.55 * bW, posY, 0], rot: false }, // Derecha
            { pos: [ 0, posY, 1.1 * bD], rot: true }    // Abajo acostada
          ];
          configs.forEach((c, i) => {
            const key = `cama-${tarima}-${y}-${i}`;
            const isHueco = huecos3D.includes(key);
            const w = (c.rot !== debeRotar) ? bD : bW;
            const d = (c.rot !== debeRotar) ? bW : bD;
            let px = debeRotar ? -c.pos[0] : c.pos[0];
            let pz = debeRotar ? -c.pos[2] : c.pos[2];
            cajas.push(<Box key={key} position={[px, posY, pz + (tarima * 3)]} args={[w, bH, d]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial('cama', isHueco)}</Box>);
          });
        }
        // --- PATRÓN INTELIGENTE: 5 PIEZAS (3 vertical arriba, 2 horizontal abajo) ---
        else if (pz === 5) {
          const configs = [
            { pos: [-1.1 * bW, posY, -0.6 * bD], rot: false }, // Arriba Izq
            { pos: [ 0, posY, -0.6 * bD], rot: false },        // Arriba Centro
            { pos: [ 1.1 * bW, posY, -0.6 * bD], rot: false }, // Arriba Der
            { pos: [-0.6 * bW, posY, 0.6 * bD], rot: true },   // Abajo Izq
            { pos: [ 0.6 * bW, posY, 0.6 * bD], rot: true }    // Abajo Der
          ];
          configs.forEach((c, i) => {
            const key = `cama-${tarima}-${y}-${i}`;
            const isHueco = huecos3D.includes(key);
            const w = (c.rot !== debeRotar) ? bD : bW;
            const d = (c.rot !== debeRotar) ? bW : bD;
            let px = debeRotar ? -c.pos[0] : c.pos[0];
            let pz = debeRotar ? -c.pos[2] : c.pos[2];
            cajas.push(<Box key={key} position={[px, posY, pz + (tarima * 3)]} args={[w, bH, d]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>{renderMaterial('cama', isHueco)}</Box>);
          });
        }
        // --- PATRÓN POR DEFECTO (Cuadrícula Genérica) ---
        else {
          const cols = Math.ceil(Math.sqrt(pz));
          const offsetX = (cols * (bW + gap)) / 2 - (bW / 2);
          const offsetZ = (Math.ceil(pz/cols) * (bD + gap)) / 2 - (bD / 2);

          for (let i = 0; i < pz; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const key = `cama-${tarima}-${y}-${i}`;
            const isHueco = huecos3D.includes(key);
            
            const w = debeRotar ? bD : bW;
            const d = debeRotar ? bW : bD;
            let px = col * (w + gap) - offsetX;
            let pz = row * (d + gap) - offsetZ;

            if (debeRotar) { px = -px; pz = -pz; }

            cajas.push(
              <Box key={key} position={[px, posY, pz + (tarima * 3)]} args={[w, bH, d]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
                {renderMaterial('cama', isHueco)}
              </Box>
            );
          }
        }
      }
    }
  } 
  // ==========================================
  // ESCENARIO 3: BLOQUE BÁSICO
  // ==========================================
  else {
    const f = Math.max(1, parseInt(frente) || 1);
    const d = Math.max(1, parseInt(fondo) || 1);

    for (let y = 0; y < n; y++) {
      const debeRotar = estibaCruzada && (y % 2 !== 0);
      const iterF = debeRotar ? d : f;
      const iterD = debeRotar ? f : d;
      const offX = (iterF * (bW + gap)) / 2 - (bW / 2);
      const offZ = (iterD * (bD + gap)) / 2 - (bD / 2);
      const posY = y * (bH + gap) + (bH / 2);

      for (let x = 0; x < iterF; x++) {
        for (let z = 0; z < iterD; z++) {
          const key = `bloque-${x}-${y}-${z}`;
          const isHueco = huecos3D.includes(key);
          const currentW = debeRotar ? bD : bW;
          const currentD = debeRotar ? bW : bD;

          cajas.push(
            <Box key={key} position={[x * (currentW + gap) - offX, posY, z * (currentD + gap) - offZ]} args={[currentW, bH, currentD]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
              {renderMaterial('bloque', isHueco)}
            </Box>
          );
        }
      }
    }
  }

  return (
    <Canvas camera={{ position: [0, 6, 8], fov: 50 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      {cajas}
      <OrbitControls makeDefault maxPolarAngle={Math.PI / 2 - 0.1} />
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#475569" sectionColor="#1e293b" fadeDistance={20} />
    </Canvas>
  );
};

export default Estiba3D;