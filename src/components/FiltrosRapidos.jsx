import React, { useMemo, useEffect } from 'react'; // ✨ AGREGAMOS useEffect AQUÍ
import { useApp } from '../context/AppContext';

// 🧠 FUNCIONES AUXILIARES PARA DETECTAR CAPACIDADES INTELIGENTEMENTE
const vL = (num) => new RegExp(`\\b${num}\\s*(l|lt|lts|litro|litros)\\b`, 'i');
const vML = (num) => new RegExp(`\\b${num}\\s*(ml|m\\.l\\.|mililitros)\\b`, 'i');
const vG = (num) => new RegExp(`\\b${num}\\s*(g|gr|grs|gramo|gramos)\\b`, 'i');
const vKG = (num) => new RegExp(`\\b${num}\\s*(k|kg|kgs|kilo|kilos)\\b`, 'i');

// 📕 DICCIONARIO MAESTRO DE REGLAS
export const REGLAS_FILTROS = [
  // --- GRUPO 1: CAPACIDADES GRANDES (LITROS Y KILOS) ---
  { id: '1000_l', label: '1000 L', grupo: 1, test: (n) => vL('1000').test(n) },
  { id: '200_l', label: '200 L', grupo: 1, test: (n) => vL('200').test(n) },
  { id: '120_l', label: '120 L', grupo: 1, test: (n) => vL('120').test(n) },
  { id: '100_l', label: '100 L', grupo: 1, test: (n) => vL('100').test(n) },
  { id: '50_l', label: '50 L', grupo: 1, test: (n) => vL('50').test(n) },
  { id: '25_l', label: '25 L', grupo: 1, test: (n) => vL('25').test(n) },
  { id: '20_l', label: '20 L', grupo: 1, test: (n) => vL('20').test(n) },
  { id: '19_l', label: '19 L', grupo: 1, test: (n) => vL('19').test(n) },
  { id: '15_l', label: '15 L', grupo: 1, test: (n) => vL('15').test(n) },
  { id: '10_l', label: '10 L', grupo: 1, test: (n) => vL('10').test(n) },
  { id: '9_l', label: '9 L', grupo: 1, test: (n) => vL('9').test(n) },
  { id: '8_l', label: '8 L', grupo: 1, test: (n) => vL('8').test(n) },
  { id: '6_l', label: '6 L', grupo: 1, test: (n) => vL('6').test(n) },
  { id: '5_l', label: '5 L', grupo: 1, test: (n) => vL('5').test(n) },
  { id: '4_l', label: '4 L', grupo: 1, test: (n) => vL('4').test(n) },
  { id: '4_kg', label: '4 Kg', grupo: 1, test: (n) => vKG('4').test(n) },
  { id: '2_l', label: '2 L', grupo: 1, test: (n) => vL('2').test(n) },
  { id: '2_kg', label: '2 Kg', grupo: 1, test: (n) => vKG('2').test(n) },
  { id: '1_5_kg', label: '1.5 Kg', grupo: 1, test: (n) => vKG('1\\.5').test(n) },
  { id: '1_l', label: '1 Litro', grupo: 1, test: (n) => vL('1').test(n) || vML('1000').test(n) },
  { id: '1_kg', label: '1 Kg', grupo: 1, test: (n) => vKG('1').test(n) || vG('1000').test(n) },
  
  // --- GRUPO 2: CAPACIDADES PEQUEÑAS (ML Y GRAMOS) ---
  { id: '750_ml', label: '750 ml', grupo: 2, test: (n) => vML('750').test(n) },
  { id: '500_ml', label: '500 ml', grupo: 2, test: (n) => vML('500').test(n) || vL('0\\.5|1/2').test(n) },
  { id: '500_g', label: '500 g', grupo: 2, test: (n) => vG('500').test(n) },
  { id: '355_ml', label: '355 ml', grupo: 2, test: (n) => vML('355').test(n) },
  { id: '250_ml', label: '250 ml', grupo: 2, test: (n) => vML('250').test(n) },
  { id: '250_g', label: '250 g', grupo: 2, test: (n) => vG('250').test(n) },
  { id: '240_ml', label: '240 ml', grupo: 2, test: (n) => vML('240').test(n) },
  { id: '240_g', label: '240 g', grupo: 2, test: (n) => vG('240').test(n) },
  { id: '125_ml', label: '125 ml', grupo: 2, test: (n) => vML('125').test(n) },
  { id: '125_g', label: '125 g', grupo: 2, test: (n) => vG('125').test(n) },
  { id: '120_ml', label: '120 ml', grupo: 2, test: (n) => vML('120').test(n) },
  { id: '120_g', label: '120 g', grupo: 2, test: (n) => vG('120').test(n) },
  { id: '100_ml', label: '100 ml', grupo: 2, test: (n) => vML('100').test(n) },
  { id: '60_ml', label: '60 ml', grupo: 2, test: (n) => vML('60').test(n) },
  { id: '60_g', label: '60 g', grupo: 2, test: (n) => vG('60').test(n) },
  { id: '50_g', label: '50 g', grupo: 2, test: (n) => vG('50').test(n) },
  { id: '40_g', label: '40 g', grupo: 2, test: (n) => vG('40').test(n) },
  { id: '30_ml', label: '30 ml', grupo: 2, test: (n) => vML('30').test(n) },
  { id: '30_g', label: '30 g', grupo: 2, test: (n) => vG('30').test(n) },
  { id: '20_g', label: '20 g', grupo: 2, test: (n) => vG('20').test(n) },
  { id: '10_ml', label: '10 ml', grupo: 2, test: (n) => vML('10').test(n) },
  { id: '10_g', label: '10 g', grupo: 2, test: (n) => vG('10').test(n) },

  // --- GRUPO 3: FAMILIAS ESPECIALIZADAS ---
  { id: 'boston_pad', label: 'Boston PAD', grupo: 3, test: (n) => n.includes('boston') && /\b(pad|pead)\b/.test(n) },
  { id: 'boston_pet', label: 'Boston PET', grupo: 3, test: (n) => n.includes('boston') && /\bpet\b/.test(n) },
  { id: 'botella_oval', label: 'Botellas Ovales', grupo: 3, test: (n) => n.includes('botella pet oval') },
  { id: 'alcoholera', label: 'Alcoholeras', grupo: 3, test: (n) => n.includes('alcoholera') },
  { id: 'lechero', label: 'Lecheros', grupo: 3, test: (n) => n.includes('lechero') },
  { id: 'cubeta', label: 'Cubetas', grupo: 3, test: (n) => n.includes('cubeta') },
  { id: 'stolz', label: 'Stolz', grupo: 3, test: (n) => n.includes('stolz') },
  { id: 'pizeta', label: 'Pizetas', grupo: 3, test: (n) => /\b(pizeta|piseta)s?\b/.test(n) },
  { id: 'pegamento', label: 'Pegamentos', grupo: 3, test: (n) => n.includes('pegamento') },
  { id: 'cuadrada', label: 'Cuadradas', grupo: 3, test: (n) => n.includes('cuadrada') || n.includes('cuadrado') },
  { id: 'cilindrico', label: 'Cilíndricos', grupo: 3, test: (n) => n.includes('cilindric') },
  { id: 'campana', label: 'Campanas', grupo: 3, test: (n) => n.includes('campana') },
  { id: 'flex', label: 'Flexibles', grupo: 3, test: (n) => n.includes('flex') },
  { id: 'porron', label: 'Porrones', grupo: 3, test: (n) => n.includes('porron') || n.includes('porrón') },
  { id: 'tambo', label: 'Tambos', grupo: 3, test: (n) => n.includes('tambo') },
  { id: 'garrafa_pad', label: 'Garrafas PAD', grupo: 3, test: (n) => n.includes('garrafa') && /\b(pad|pead)\b/.test(n) },
  { id: 'garrafa_pet', label: 'Garrafas PET', grupo: 3, test: (n) => n.includes('garrafa') && /\bpet\b/.test(n) },
  { id: 'garrafon', label: 'Garrafones', grupo: 3, test: (n) => n.includes('garrafon') || n.includes('garrafón') },
  { id: 'galon_ind', label: 'Galón Ind.', grupo: 3, test: (n) => n.includes('galon industrial') || n.includes('galón industrial') },
  { id: 'vitrolero', label: 'Vitroleros', grupo: 3, test: (n) => n.includes('vitrolero') },
  { id: 'tarro', label: 'Tarros', grupo: 3, test: (n) => n.includes('tarro') },
  { id: 'farmaceutica', label: 'Farmacéuticas', grupo: 3, test: (n) => n.includes('farmaceutica') || n.includes('farmacéutica') },
  { id: 'especiero', label: 'Especieros', grupo: 3, test: (n) => n.includes('especiero') },
  { id: 'bolsa', label: 'Bolsas', grupo: 3, test: (n) => n.includes('bolsa') },
  { id: 'cajita', label: 'Cajitas', grupo: 3, test: (n) => n.includes('cajita') },
  { id: 'pomadera', label: 'Pomaderas', grupo: 3, test: (n) => n.includes('pomadera') },
  
  // --- GRUPO 4: ACCESORIOS ---
  { id: 'atomizador', label: 'Atomizadores', grupo: 4, test: (n) => n.includes('atomizador') },
  { id: 'misil', label: 'Misiles', grupo: 4, test: (n) => n.includes('misil') },
  { id: 'tapa_facil', label: 'Tapa Fácil', grupo: 4, test: (n) => n.includes('tapa facil') || n.includes('tapa fácil') },
  { id: 'ttp', label: 'Triple Presión', grupo: 4, test: (n) => n.includes('ttp') || n.includes('triple presion') },
  { id: 'c_fenol', label: 'Con Fenol', grupo: 4, test: (n) => /\bc\/fenol\b/.test(n) || n.includes('con fenol') },
  { id: 's_fenol', label: 'Sin Fenol', grupo: 4, test: (n) => /\bs\/fenol\b/.test(n) || n.includes('sin fenol') },
  { id: 'gotero', label: 'Goteros', grupo: 4, test: (n) => n.includes('gotero') && !n.includes('alcuzar') },
  { id: 'gotero_alcuzar', label: 'Alcuzar', grupo: 4, test: (n) => n.includes('alcuzar') },
  { id: 'bomba_dosif', label: 'Dosificadoras', grupo: 4, test: (n) => n.includes('bomba dosificadora') || n.includes('dosificadora') },
  { id: 'lainer', label: 'Lainers', grupo: 4, test: (n) => n.includes('lainer') },
  { id: 'espumadora', label: 'Espumadoras', grupo: 4, test: (n) => n.includes('espumadora') },

  // --- GRUPO 5: FORMAS / USOS ---
  { id: 'grasero', label: 'Graseros', grupo: 5, test: (n) => n.includes('grasero') },
  { id: 'tintero', label: 'Tinteros', grupo: 5, test: (n) => n.includes('tintero') },
  { id: 'anticongelante', label: 'Anticongelante', grupo: 5, test: (n) => n.includes('anticongelante') },
  { id: 'mostacero', label: 'Mostaceros', grupo: 5, test: (n) => n.includes('mostacero') },
  { id: 'squeezable', label: 'Squeezables', grupo: 5, test: (n) => n.includes('squeezable') },
  { id: 'whiskero', label: 'Whiskeros', grupo: 5, test: (n) => n.includes('whiskera') || n.includes('whiskero') },
  { id: 'conico', label: 'Cónicos', grupo: 5, test: (n) => n.includes('conico') || n.includes('cónico') },
  { id: 'salsero', label: 'Salseros', grupo: 5, test: (n) => n.includes('salsera') || n.includes('salsero') },
  { id: 'quimica', label: 'Químicas', grupo: 5, test: (n) => n.includes('quimica') || n.includes('química') },
  { id: 'ambar', label: 'Ámbar', grupo: 5, test: (n) => n.includes('ambar') || n.includes('ámbar') },
  { id: 'pastilleros', label: 'Pastilleros', grupo: 5, test: (n) => n.includes('pastillero') || n.includes('pastiller') },
];

function FiltrosRapidos({ productosMostrados }) {
  const { filtroRapido, setFiltroRapido } = useApp();

  const filtrosDisponibles = useMemo(() => {
    const encontrados = new Set();
    productosMostrados.forEach(p => {
      const nombreNorm = (p.name || '').toLowerCase();
      REGLAS_FILTROS.forEach(regla => {
        if (regla.test(nombreNorm)) encontrados.add(regla.id);
      });
    });
    
    return REGLAS_FILTROS
      .filter(regla => encontrados.has(regla.id))
      .sort((a, b) => a.grupo - b.grupo); 
  }, [productosMostrados]);

  // ✨ EL FIX MÁGICO: Autolimpiar el filtro si cambia la búsqueda
  useEffect(() => {
    if (filtroRapido) {
      // Verificamos si el filtro que está activado en el cerebro aún existe en los botones en pantalla
      const filtroSigueValido = filtrosDisponibles.some(f => f.id === filtroRapido);
      
      // Si el botón ya no está, apagamos el filtro del cerebro
      if (!filtroSigueValido) {
        setFiltroRapido(null);
      }
    }
  }, [filtrosDisponibles, filtroRapido, setFiltroRapido]);

  if (filtrosDisponibles.length === 0) return null;

  return (
    <div className="w-full bg-slate-50 pb-3 pt-2 mb-4 sticky top-0 z-10 shadow-[0_10px_10px_-10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2 overflow-x-auto hide-scroll px-2 pb-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap shrink-0 flex items-center gap-1">
          <i className="fa-solid fa-tags"></i> Filtros:
        </span>
        
        <button
          onClick={() => setFiltroRapido(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
            filtroRapido === null 
              ? 'bg-slate-800 text-white border-slate-800' 
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
          }`}
        >
          Todos
        </button>

        {filtrosDisponibles.map(filtro => {
          const isActive = filtroRapido === filtro.id;
          return (
            <button
              key={filtro.id}
              onClick={() => setFiltroRapido(isActive ? null : filtro.id)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                isActive 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200/50' 
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {filtro.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default FiltrosRapidos;
