import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Grid, Cylinder, Edges } from '@react-three/drei';

const Estiba3D = ({ modoOrigen, frente, fondo, niveles, pzCama, tarimas, piezasVisuales, huecos3D, onToggleHueco, estibaCruzada }) => {
  const cajas = [];
  const boxHeight = 1;
  const gap = 0.05;

  const n = Math.max(1, parseInt(niveles) || 1);
  const t = Math.max(1, parseInt(tarimas) || 1);

  // --- RENDERIZADO DE ALTO CONTRASTE ---
  const renderMaterial = (isHueco, colorBase = "#3b82f6") => {
    if (isHueco) {
      // Material Fantasma (Rojo translúcido con ligero brillo)
      return <meshStandardMaterial color="#ef4444" transparent opacity={0.25} depthWrite={false} emissive="#7f1d1d" emissiveIntensity={0.5} />;
    }
    // Material Físico (Color sólido con algo de brillo para resaltar bordes)
    return <meshStandardMaterial color={colorBase} roughness={0.4} metalness={0.1} />;
  };

  // ==========================================
  // ESCENARIO 1: LIENZO Y PATRONES (Ahora 100% Unificados)
  // ==========================================
  if (['visual', 'cama'].includes(modoOrigen) && piezasVisuales && piezasVisuales.length > 0) {
    const scale = 34; 
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    
    // Auto-centrado matemático basado en las coordenadas del Lienzo 2D
    piezasVisuales.forEach(p => {
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
        const debeRotarCapa = estibaCruzada && (y % 2 !== 0);
        const posY = y * (boxHeight + gap) + 0.5;

        piezasVisuales.forEach((p, idx) => {
          let w3D = 1, d3D = 1;
          const f = p.forma;
          if (f.includes('caja')) { w3D = f.includes('-h')?1.5:1; d3D = f.includes('-v')?1.5:1; }
          else if (f.includes('rect')) { w3D = f.includes('-h')?2:1; d3D = f.includes('-v')?2:1; }
          else if (f.includes('delgado')) { w3D = f.includes('-h')?3:1; d3D = f.includes('-v')?3:1; }

          const wPx = w3D * scale;
          const dPx = d3D * scale;

          let x3D = ((p.x + (wPx/2)) - centerX) / scale;
          let z3D = ((p.y + (dPx/2)) - centerY) / scale;

          if (debeRotarCapa) { 
            x3D = -x3D; 
            z3D = -z3D; 
          }
          
          const finalW = w3D;
          const finalD = d3D;

          const key = `lienzo-${tarima}-${y}-${idx}`;
          const isHueco = huecos3D.includes(key);
          const colorLogistico = modoOrigen === 'cama' ? "#8b5cf6" : "#3b82f6"; // Morado o Azul

          if (f === 'circulo') {
            cajas.push(
              <Cylinder key={key} position={[x3D, posY, z3D + (tarima * 4)]} args={[0.5, 0.5, boxHeight, 32]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
                {renderMaterial(isHueco, "#f59e0b")}
                <Edges scale={1.01} color={isHueco ? "#fca5a5" : "#78350f"} opacity={isHueco ? 0.5 : 0.8} transparent />
              </Cylinder>
            );
          } else {
            cajas.push(
              <Box key={key} position={[x3D, posY, z3D + (tarima * 4)]} args={[finalW, boxHeight, finalD]} onClick={(e) => { e.stopPropagation(); onToggleHueco(key); }}>
                {renderMaterial(isHueco, colorLogistico)}
                {/* Bordes para separación visual estricta */}
                <Edges scale={1.01} color={isHueco ? "#fca5a5" : "#0f172a"} opacity={isHueco ? 0.5 : 0.85} transparent />
              </Box>
            );
          }
        });
      }
    }
  } 
  // ==========================================
  // ESCENARIO 2: CAMA GENÉRICA CUADRADA (Solo si no hay patrón guardado)
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
          const isHueco = huecos3D.includes(key);
          cajas.push(
            <Box key={key} position={[col*(1+gap)-offsetX, y*(1+gap)+0.5, row*(1+gap)-offsetZ + (tarima * 4)]} args={[1,1,1]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>
              {renderMaterial(isHueco, "#8b5cf6")}
              <Edges scale={1.01} color={isHueco ? "#fca5a5" : "#2e1065"} opacity={isHueco ? 0.5 : 0.85} transparent />
            </Box>
          );
        }
      }
    }
  } 
  // ==========================================
  // ESCENARIO 3: BLOQUE BÁSICO
  // ==========================================
  else {
    const f = Math.max(1, parseInt(frente) || 1); const d = Math.max(1, parseInt(fondo) || 1);
    for (let y = 0; y < n; y++) {
      const debeRotar = estibaCruzada && (y % 2 !== 0);
      const iterF = debeRotar ? d : f; const iterD = debeRotar ? f : d;
      const offX = (iterF * (1 + gap)) / 2 - 0.5; const offZ = (iterD * (1 + gap)) / 2 - 0.5;
      for (let x = 0; x < iterF; x++) {
        for (let z = 0; z < iterD; z++) {
          const key=`b-${y}-${x}-${z}`;
          const isHueco = huecos3D.includes(key);
          cajas.push(
            <Box key={key} position={[x*(1+gap)-offX, y*(1+gap)+0.5, z*(1+gap)-offZ]} args={[1,1,1]} onClick={(e)=>{e.stopPropagation(); onToggleHueco(key);}}>
              {renderMaterial(isHueco, "#10b981")}
              <Edges scale={1.01} color={isHueco ? "#fca5a5" : "#022c22"} opacity={isHueco ? 0.5 : 0.85} transparent />
            </Box>
          );
        }
      }
    }
  }

  return (
    <Canvas 
      camera={{ position: [0, 8, 12], fov: 45 }}
      // Optimizamos el pixel ratio para evitar consumo excesivo de batería en celulares
      dpr={[1, 2]} 
    >
      <ambientLight intensity={0.7} />
      {/* Luz direccional más fuerte para crear sombras duras y volumen */}
      <directionalLight position={[10, 20, 15]} intensity={1.8} castShadow />
      <directionalLight position={[-10, 10, -10]} intensity={0.6} />
      
      {cajas}
      
      <OrbitControls 
        makeDefault 
        // LÍMITES PARA MÓVIL: Evitan perderse en el espacio vacío
        maxPolarAngle={Math.PI / 2 - 0.05} // No deja ver debajo del piso
        minDistance={3}  // No deja meterse "dentro" de las cajas
        maxDistance={28} // No deja alejarse demasiado
        enableDamping={true} // Movimiento táctil suave
        dampingFactor={0.1}
      />
      
      <Grid position={[0, 0, 0]} args={[40, 40]} cellColor="#475569" sectionColor="#1e293b" fadeDistance={30} />
    </Canvas>
  );
};

export default Estiba3D;
