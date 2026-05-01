import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, 
  Minus, 
  RotateCcw, 
  User, 
  Swords, 
  Pencil, 
  ChevronUp, 
  ChevronsUp,
  Settings2,
  Trash2,
  Save,
  ChevronRight,
  AlertCircle,
  Menu,
  MoreVertical,
  X,
  History,
  Trophy,
  Skull,
  Download,
  ExternalLink,
  RefreshCw,
  LayoutGrid
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Hero {
  id: string;
  name: string;
  currentHp: number;
  maxHp: number;
  deckId?: string;
}

interface Villain {
  name: string;
  currentHp: number;
  maxHp: number;
  stage: number;
}

interface HistoryEntry {
  id: string;
  date: number;
  villain: string;
  heroes: { name: string; deckId?: string }[];
  result: 'win' | 'loss';
  stage: number;
}

interface SavedGame {
  id: string;
  name: string;
  date: number;
  state: GameState;
}

interface GameSettings {
  animationsEnabled: boolean;
}

interface GameState {
  version: number;
  status: 'setup' | 'playing';
  villain: Villain;
  heroes: Hero[];
  phaseIndex: number;
  history: HistoryEntry[];
  heroColumns: 1 | 2;
  settings: GameSettings;
}

// --- Helpers ---

const PHASES = [
  { name: "Héroes: Acciones", description: "Juega cartas, ataca o interviene" },
  { name: "Final: Fase Héroes", description: "Prepara cartas y roba hasta el límite" },
  { name: "Villano: Amenaza", description: "Añade amenaza al plan principal" },
  { name: "Villano: Activación", description: "El villano ataca o planifica" },
  { name: "Villano: Encuentros", description: "Revela cartas de encuentro" }
];

const migrateState = (saved: any): GameState => {
  const defaults: GameState = {
    version: 4,
    status: 'setup',
    villain: { name: '', currentHp: 15, maxHp: 15, stage: 1 },
    heroes: [{ id: '1', name: 'Hero 1', currentHp: 10, maxHp: 10 }],
    phaseIndex: 0,
    history: [],
    heroColumns: 2,
    settings: { animationsEnabled: true }
  };

  if (!saved) return defaults;
  
  return {
    ...defaults,
    ...saved,
    villain: { 
      ...defaults.villain, 
      ...saved.villain,
      name: saved.status === 'setup' ? '' : saved.villain?.name || ''
    },
    heroes: Array.isArray(saved.heroes) ? saved.heroes : defaults.heroes,
    phaseIndex: typeof saved.phaseIndex === 'number' ? saved.phaseIndex : 0,
    history: Array.isArray(saved.history) ? saved.history : [],
    heroColumns: saved.heroColumns || 2,
    settings: saved.settings || defaults.settings
  };
};

const STORAGE_KEY = 'marvel_champions_tracker_v3';
const SAVES_KEY = 'marvel_champions_saves_v1';

const vibrate = (ms = 10) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(ms);
  }
};

// --- Components ---

/**
 * Animated Life Counter with long-press acceleration
 */
const LifeCounter = ({ 
  value, 
  onChange, 
  label, 
  color = "blue",
  isVillain = false
}: { 
  value: number; 
  onChange: (val: number) => void; 
  label: string;
  color?: "blue" | "red" | "emerald";
  isVillain?: boolean;
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isAdjusting = useRef(false);
  const speedRef = useRef(150);

  const startAdjusting = (e: React.PointerEvent, delta: number) => {
    if (isAdjusting.current) return;
    
    // Only handle primary button (left click)
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    
    // Safety check: is original event still valid?
    if (!e.isPrimary) return;

    e.preventDefault();
    isAdjusting.current = true;
    vibrate(15);
    onChange(delta);

    stopAdjusting(); // Clear any existing

    timerRef.current = setTimeout(() => {
      speedRef.current = 150;
      const tick = () => {
        vibrate(8);
        onChange(delta);
        
        if (speedRef.current > 40) {
          speedRef.current -= 10;
        }
        
        intervalRef.current = setTimeout(tick, speedRef.current);
      };
      tick();
    }, 450); 
  };

  const stopAdjusting = () => {
    isAdjusting.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearTimeout(intervalRef.current);
    timerRef.current = null;
    intervalRef.current = null;
  };

  const colorClasses = {
    blue: "bg-[#1a1a1a] border-[#333] active:bg-[#0088cc]",
    red: "bg-[#1a1a1a] border-[#333] active:bg-marvel-red",
    emerald: "bg-[#1a1a1a] border-[#333] active:bg-emerald-500"
  };

  return (
    <div className={`relative flex flex-col items-center justify-center p-4 rounded-3xl border ${isVillain ? 'bg-black border-marvel-red shadow-[0_0_20px_rgba(226,54,54,0.15)]' : 'bg-surface-elevated border-border-dim'} overflow-hidden transition-shadow`}>
      <div className={`absolute top-2 left-4 text-[9px] font-black uppercase tracking-[0.2em] ${isVillain ? 'text-marvel-red' : 'text-zinc-600'} pointer-events-none`}>
        {label}
      </div>
      
      <div className="flex items-center justify-between w-full gap-3 mt-2">
        <button
          className={`flex-1 h-14 rounded-2xl flex items-center justify-center border transition-all active:scale-95 touch-none ${colorClasses[color]}`}
          onPointerDown={(e) => startAdjusting(e, -1)}
          onPointerUp={stopAdjusting}
          onPointerLeave={stopAdjusting}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Minus className="w-6 h-6 text-white font-bold" />
        </button>

        <div className="flex flex-col items-center justify-center min-w-[70px]">
          <AnimatePresence mode="popLayout">
            <motion.span
              key={value}
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -15, opacity: 0 }}
              className={`text-4xl font-black italic tracking-tighter text-white`}
            >
              {value < 10 ? `0${value}` : value}
            </motion.span>
          </AnimatePresence>
        </div>

        <button
          className={`flex-1 h-14 rounded-2xl flex items-center justify-center border transition-all active:scale-95 touch-none ${colorClasses[color]}`}
          onPointerDown={(e) => startAdjusting(e, 1)}
          onPointerUp={stopAdjusting}
          onPointerLeave={stopAdjusting}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Plus className="w-6 h-6 text-white font-bold" />
        </button>
      </div>
    </div>
  );
};

// --- App Root ---

export default function App() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return migrateState(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading save", e);
      }
    }
    return migrateState(null);
  });

  const [editingEntity, setEditingEntity] = useState<{ type: 'hero' | 'villain' | 'next-stage', index?: number } | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showPhaseIndicator, setShowPhaseIndicator] = useState(false);
  const [confirmation, setConfirmation] = useState<{ 
    title: string; 
    message: string; 
    onConfirm: () => void; 
    confirmText?: string; 
    isDanger?: boolean;
  } | null>(null);
  const [prompt, setPrompt] = useState<{
    title: string;
    message: string;
    defaultValue: string;
    onConfirm: (val: string) => void;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Toast auto-hide
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const saveToSlot = () => {
    vibrate(30);
    setPrompt({
      title: "Guardar Partida",
      message: "Introduce un nombre identificativo para este guardado:",
      defaultValue: `${state.villain.name} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      onConfirm: (name) => {
        if (!name) return;
        const savedGamesRaw = localStorage.getItem(SAVES_KEY);
        const savedGames: SavedGame[] = savedGamesRaw ? JSON.parse(savedGamesRaw) : [];
        
        const newSave: SavedGame = {
          id: Math.random().toString(36).substr(2, 9),
          name: name,
          date: Date.now(),
          state: state
        };

        localStorage.setItem(SAVES_KEY, JSON.stringify([newSave, ...savedGames].slice(0, 10)));
        setIsMenuOpen(false);
        setPrompt(null);
        setToast("¡Partida guardada!");
      }
    });
  };

  const restart = () => {
    vibrate(20);
    setConfirmation({
      title: "¿Reiniciar partida?",
      message: "Se perderá el progreso actual pero mantendrás tu historial.",
      confirmText: "Sí, Reiniciar",
      isDanger: true,
      onConfirm: () => {
        setState(prev => ({ ...prev, status: 'setup', phaseIndex: 0 }));
        setIsMenuOpen(false);
        setConfirmation(null);
      }
    });
  };

  const goToSetup = () => {
    vibrate(20);
    setState(prev => ({ ...prev, status: 'setup' }));
    setIsMenuOpen(false);
  };

  const handleSetup = (villainName: string, heroCount: number, hpPerHero: number) => {
    vibrate(50);
    const heroes: Hero[] = Array.from({ length: heroCount }, (_, i) => ({
      id: Math.random().toString(36).substr(2, 9),
      name: `Héroe ${i + 1}`,
      currentHp: 10,
      maxHp: 10
    }));

    setState(prev => ({
      ...prev,
      status: 'playing',
      villain: {
        name: villainName || 'Villano',
        currentHp: hpPerHero * heroCount,
        maxHp: hpPerHero * heroCount,
        stage: 1
      },
      heroes,
      phaseIndex: 0
    }));
  };

  const nextPhase = () => {
    vibrate(30);
    setState(prev => ({
      ...prev,
      phaseIndex: (prev.phaseIndex + 1) % PHASES.length
    }));
    
    if (state.settings.animationsEnabled) {
      setShowPhaseIndicator(true);
      setTimeout(() => setShowPhaseIndicator(false), 2200);
    }
  };

  const updateHeroHp = (index: number, delta: number) => {
    setState(prev => {
      const newHeroes = prev.heroes.map((hero, i) => {
        if (i === index) {
          return { ...hero, currentHp: Math.max(0, Math.min(hero.maxHp, hero.currentHp + delta)) };
        }
        return hero;
      });
      return { ...prev, heroes: newHeroes };
    });
  };

  const updateVillainHp = (delta: number) => {
    setState(prev => ({
      ...prev,
      villain: {
        ...prev.villain,
        currentHp: Math.max(0, Math.min(prev.villain.maxHp, prev.villain.currentHp + delta))
      }
    }));
  };

  const [showStageModal, setShowStageModal] = useState(false);

  const applyNextStage = (hpPerHero: number) => {
    setState(prev => ({
      ...prev,
      villain: {
        ...prev.villain,
        stage: prev.villain.stage + 1,
        maxHp: hpPerHero * prev.heroes.length,
        currentHp: hpPerHero * prev.heroes.length
      }
    }));
    setShowStageModal(false);
  };

  const nextStage = () => {
    vibrate(40);
    setShowStageModal(true);
  };

  const deleteHero = (idx: number) => {
    vibrate(50);
    setConfirmation({
      title: "¿Eliminar héroe?",
      message: `¿Estás seguro de que quieres eliminar a ${state.heroes[idx].name}?`,
      confirmText: "Eliminar",
      isDanger: true,
      onConfirm: () => {
        setState(p => ({ ...p, heroes: p.heroes.filter((_, i) => i !== idx) }));
        setConfirmation(null);
      }
    });
  };

  const healMax = (index: number) => {
    vibrate(30);
    setState(prev => ({
      ...prev,
      heroes: prev.heroes.map((h, i) => i === index ? { ...h, currentHp: h.maxHp } : h)
    }));
  };

  const recordResult = (result: 'win' | 'loss') => {
    const executeRecord = () => {
      vibrate(50);
      const entry: HistoryEntry = {
        id: Math.random().toString(36).substr(2, 9),
        date: Date.now(),
        villain: state.villain.name,
        heroes: state.heroes.map(h => ({ name: h.name, deckId: h.deckId })),
        result,
        stage: state.villain.stage
      };

      setState(prev => ({
        ...prev,
        history: [entry, ...(prev.history || [])].slice(0, 50),
        status: 'setup'
      }));
      setConfirmation(null);
    };

    if (result === 'win' && state.villain.stage === 1) {
      setConfirmation({
        title: "¿Registrar Victoria?",
        message: "El villano está en Etapa 1. Normalmente se derrota en Etapa 2 o 3. ¿Confirmas la victoria?",
        confirmText: "Registrar Ganador",
        onConfirm: executeRecord
      });
      return;
    }

    executeRecord();
  };

  const isHeroTurn = state.phaseIndex < 2;
  const accentBg = isHeroTurn ? 'bg-[#0088cc]' : 'bg-marvel-red';

  return (
    <div className="min-h-screen bg-background text-[#e0e0e0] font-sans selection:bg-marvel-red/30 relative overflow-x-hidden">
      {state.status === 'setup' ? (
        <SetupView 
          onStart={handleSetup} 
          initialName={state.villain.name} 
          initialHeroes={state.heroes.length} 
          history={state.history}
          settings={state.settings}
          onUpdateSettings={(s) => setState(p => ({ ...p, settings: s }))}
          onLoadState={(s) => setState(migrateState(s))}
          setConfirmation={setConfirmation}
          setToast={setToast}
          onClearHistory={() => {
            setConfirmation({
              title: "¿Borrar Historial?",
              message: "Esta acción eliminará todos los registros de partidas anteriores de forma permanente.",
              confirmText: "Borrar Todo",
              isDanger: true,
              onConfirm: () => {
                setState(p => ({ ...p, history: [] }));
                setConfirmation(null);
                setToast("Historial borrado");
              }
            });
          }}
        />
      ) : (
        <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-surface-header/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex flex-col">
          <h1 className="text-[12px] font-black tracking-[0.25em] text-marvel-red uppercase italic leading-none">Marvel Champions</h1>
          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Combat Companion</span>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => { vibrate(10); setIsMenuOpen(!isMenuOpen); }}
            className="p-3 bg-surface-elevated border border-border rounded-xl transition-all active:scale-95"
          >
            {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-56 bg-surface-elevated border border-border rounded-[24px] shadow-2xl overflow-hidden z-[60]"
              >
                <div className="p-2 space-y-1">
                  <button 
                    onClick={saveToSlot}
                    className="w-full px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 rounded-xl flex items-center gap-4 transition-colors"
                  >
                    <Save className="w-4 h-4 text-[#0088cc]" /> Guardar Partida
                  </button>
                  <button 
                    onClick={goToSetup}
                    className="w-full px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 rounded-xl flex items-center gap-4 transition-colors"
                  >
                    <Settings2 className="w-4 h-4 text-zinc-400" /> Volver al Inicio
                  </button>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button 
                    onClick={restart}
                    className="w-full px-4 py-4 text-left text-[10px] font-black uppercase tracking-widest hover:bg-red-500/10 text-red-500 rounded-xl flex items-center gap-4 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" /> Reiniciar Todo
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={`${accentBg.replace('bg-', 'border-t-') + '/40'} border-t-2 h-1 w-full transition-colors duration-500`} />

      <main className="max-w-md mx-auto space-y-0 pb-32">
        {showStageModal && (
          <StageModal 
            onClose={() => setShowStageModal(false)}
            onConfirm={applyNextStage}
            currentStage={state.villain.stage + 1}
          />
        )}
        {editingEntity && (
        <EditModal 
          entity={editingEntity.type === 'villain' ? state.villain : state.heroes[editingEntity.index!]}
          isHero={editingEntity.type === 'hero'}
          onClose={() => setEditingEntity(null)}
          onSave={(name, maxHp, deckId) => {
            setState(prev => {
              if (editingEntity.type === 'villain') {
                return { 
                  ...prev, 
                  villain: { ...prev.villain, name, maxHp } 
                };
              } else {
                const newHeroes = prev.heroes.map((hero, i) => {
                  if (i === editingEntity.index) {
                    return { 
                      ...hero, 
                      name, 
                      maxHp,
                      deckId: deckId || hero.deckId
                    };
                  }
                  return hero;
                });
                return { ...prev, heroes: newHeroes };
              }
            });
            setEditingEntity(null);
          }}
        />
      )}
        {/* Villain Section */}
        <div className={`p-6 border-b border-marvel-red-dark/20 relative transition-all duration-700 bg-gradient-to-b from-villain-gradient-start to-surface`}>
          <div className="flex justify-between items-end mb-6 relative z-10">
            <div className="flex flex-col">
              <span className={`text-[9px] font-black uppercase tracking-tighter mb-1 text-marvel-red/60`}>Villano Actual</span>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-black italic uppercase italic tracking-tight">{state.villain.name}</h2>
                <button 
                  onClick={() => setEditingEntity({ type: 'villain' })}
                  className="text-zinc-600 hover:text-white transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <button 
                onClick={nextStage}
                className="bg-marvel-red-dark/30 text-marvel-red px-4 py-1.5 rounded-full text-[10px] font-black mb-1 border border-marvel-red-dark/50 hover:bg-marvel-red hover:text-white transition-all active:scale-95 uppercase tracking-widest"
              >
                Etapa →
              </button>
              <div className="text-[12px] font-black text-white px-2">
                ETAPA <span className="text-marvel-red">{['I','II','III','IV','V'][state.villain.stage - 1]}</span>
              </div>
            </div>
          </div>
          
          <LifeCounter 
            label="Vida de Villano" 
            value={state.villain.currentHp} 
            onChange={(d) => updateVillainHp(d)} 
            color="red"
            isVillain
          />

          {state.villain.currentHp === 0 && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-[32px] flex flex-col gap-4 backdrop-blur-sm shadow-xl"
            >
              <div className="flex items-center justify-center gap-3">
                <Trophy className="w-4 h-4 text-emerald-500" />
                <span className="font-black italic uppercase tracking-widest text-[10px] text-emerald-500">¡VILLANO DERROTADO!</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => {
                    vibrate(30);
                    setShowStageModal(true);
                  }}
                  className="flex-1 py-3 bg-emerald-500 text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-transform"
                >Siguiente Etapa</button>
                <button 
                  onClick={() => recordResult('win')}
                  className="flex-1 py-3 bg-white/10 text-emerald-500 font-black italic uppercase tracking-widest text-[11px] rounded-2xl border border-emerald-500/30 active:scale-95 transition-transform"
                >Registrar Victoria</button>
              </div>
            </motion.div>
          )}

          {state.heroes.every(h => h.currentHp === 0) && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-4 bg-marvel-red/10 border border-marvel-red/30 p-4 rounded-[32px] flex flex-col gap-4 backdrop-blur-sm shadow-xl"
            >
              <div className="flex items-center justify-center gap-3">
                <Skull className="w-4 h-4 text-marvel-red" />
                <span className="font-black italic uppercase tracking-widest text-[10px] text-marvel-red">¡TODOS LOS HÉROES CAÍDOS!</span>
              </div>
              <button 
                onClick={() => recordResult('loss')}
                className="w-full py-4 bg-marvel-red text-white font-black italic uppercase tracking-widest text-[11px] rounded-2xl active:scale-95 transition-transform"
              >Registrar Derrota</button>
            </motion.div>
          )}
        </div>

        {/* Heroes Section */}
        <div className="p-6 transition-all duration-700 space-y-6 bg-surface-dark">
          <div className="flex items-center justify-between px-1 relative z-10">
            <div className="flex items-center gap-2">
               <div className={`w-1.5 h-6 rounded-full transition-all ${isHeroTurn ? 'bg-[#0088cc]' : 'bg-zinc-700'}`} />
               <h3 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isHeroTurn ? 'text-[#0088cc]' : 'text-zinc-500'}`}>Héroes</h3>
            </div>
            <div className="flex bg-surface-elevated rounded-xl p-1 border border-border shadow-inner">
               <button 
                 onClick={() => setState(p => ({ ...p, heroColumns: 1 }))}
                 className={`p-2 rounded-lg transition-all ${state.heroColumns === 1 ? 'bg-[#0088cc] text-white shadow-lg' : 'text-zinc-600'}`}
               >
                 <Menu className="w-3 h-3" />
               </button>
               <button 
                 onClick={() => setState(p => ({ ...p, heroColumns: 2 }))}
                 className={`p-2 rounded-lg transition-all ${state.heroColumns === 2 ? 'bg-[#0088cc] text-white shadow-lg' : 'text-zinc-600'}`}
               >
                 <LayoutGrid className="w-3 h-3" />
               </button>
            </div>
          </div>
          
          <div className={`grid ${state.heroColumns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
            {state.heroes.map((hero, idx) => (
              <motion.div 
                layout
                key={hero.id} 
                className={`bg-surface-elevated rounded-[32px] border-2 transition-all p-4 flex flex-col justify-between relative group ${hero.currentHp === 0 ? 'border-zinc-800 grayscale opacity-50' : 'border-[#0088cc]/20 hover:border-[#0088cc]/60 shadow-lg shadow-[#0088cc]/5'} ${state.heroColumns === 1 ? 'min-h-[140px]' : 'min-h-[160px]'}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="max-w-[80%]">
                    <div className="text-[9px] font-black text-[#0088cc] uppercase tracking-wider truncate mb-1">{hero.name}</div>
                    <div className="flex items-baseline gap-1">
                      <div className="text-3xl font-black italic tracking-tighter text-white">
                        {hero.currentHp < 10 ? `0${hero.currentHp}` : hero.currentHp}
                      </div>
                      <div className="text-[10px] font-black text-zinc-600">/ {hero.maxHp < 10 ? `0${hero.maxHp}` : hero.maxHp}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <button 
                      onClick={() => setEditingEntity({ type: 'hero', index: idx })}
                      className="text-[#0088cc] opacity-60 hover:opacity-100 p-1"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 mt-auto">
                    <button 
                      onClick={() => updateHeroHp(idx, -1)}
                      className="flex-1 h-12 bg-surface rounded-2xl flex items-center justify-center border border-border/50 active:bg-marvel-red active:scale-95 transition-all text-xl font-bold"
                    >-</button>
                    <button 
                      onClick={() => updateHeroHp(idx, 1)}
                      className="flex-1 h-12 bg-surface rounded-2xl flex items-center justify-center border border-border/50 active:bg-emerald-500 active:scale-95 transition-all text-xl font-bold"
                    >+</button>
                </div>

                <button 
                  onClick={() => deleteHero(idx)}
                  className="absolute -top-1 -right-1 w-6 h-6 bg-zinc-900 border border-border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-marvel-red"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}

            {state.heroes.length < 4 && (
              <button 
                onClick={() => setState(p => ({
                  ...p,
                  heroes: [...p.heroes, { id: Math.random().toString(), name: `Héroe ${p.heroes.length + 1}`, currentHp: 10, maxHp: 10 }]
                }))}
                className="border-2 border-dashed border-border rounded-[32px] flex flex-col items-center justify-center gap-2 group hover:border-zinc-700 transition-all cursor-pointer h-[160px] bg-black/20"
              >
                <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5 text-zinc-600" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Añadir Héroe</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Phase Transition Overlay */}
      <AnimatePresence>
        {showPhaseIndicator && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[100] flex items-center justify-center pointer-events-none ${state.phaseIndex < 2 ? 'bg-[#0088cc]/20' : 'bg-marvel-red/20'}`}
          >
            <motion.div 
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20 }}
              className="bg-black/90 backdrop-blur-xl px-12 py-10 rounded-[48px] border-2 border-white/10 flex flex-col items-center text-center shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3 }}
                className={`text-[11px] font-black uppercase tracking-[0.4em] mb-4 ${state.phaseIndex < 2 ? 'text-[#0088cc]' : 'text-marvel-red'}`}
              >
                {state.phaseIndex < 2 ? 'TURNO DE HÉROES' : 'TURNO DEL VILLANO'}
              </motion.div>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white mb-4 leading-none max-w-[280px] text-balance">
                {PHASES[state.phaseIndex].name.split(':')[1] || PHASES[state.phaseIndex].name}
              </h2>
              <div className={`h-1.5 w-16 rounded-full ${state.phaseIndex < 2 ? 'bg-[#0088cc]' : 'bg-marvel-red'} shadow-lg`} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Smart Unified Nav Console */}
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-black backdrop-blur-3xl border-t border-white/10 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.8)]">
        <div className="max-w-md mx-auto flex items-center justify-between gap-4 relative">
          
          {/* Left: Current Action Details */}
          <div className="flex-1 text-left min-w-0 pr-8">
            <div className={`text-[8px] font-black uppercase tracking-[0.15em] mb-1 ${isHeroTurn ? 'text-[#0088cc]' : 'text-marvel-red'}`}>
              ACCIÓN ACTUAL
            </div>
            <div className="text-[11px] font-black italic uppercase text-white leading-tight line-clamp-2 tracking-tight">
              {PHASES[state.phaseIndex].description}
            </div>
          </div>

          {/* Center: Swords Button (Refined Floating Orb) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-11 z-50">
            <div className="relative">
              {/* Outer Glow Ring */}
              <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${accentBg} animate-pulse`} />
              
              <button 
                onClick={nextPhase}
                className={`w-16 h-16 ${accentBg} rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-90 transition-all duration-300 ring-4 ring-black/40 group relative overflow-hidden`}
              >
                {/* Internal dynamic lighting */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-white/20 opacity-40" />
                <Swords className="w-8 h-8 text-white group-active:rotate-12 transition-transform relative z-10" />
              </button>
            </div>
          </div>

          {/* Right: Next Phase Preview */}
          <div className="flex-1 text-right min-w-0 opacity-40 pl-8">
             <div className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-0.5">
               SIGUIENTE
             </div>
             <div className="text-[10px] font-black italic uppercase text-zinc-400 truncate tracking-tight">
               {PHASES[(state.phaseIndex + 1) % PHASES.length].name.split(':')[1] || 'FIN'}
             </div>
          </div>

        </div>
      </div>
    </>
  )}

  <div className="fixed inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.02] to-transparent z-50"></div>

  {/* Edit Overlay */}
      <AnimatePresence>
        {editingEntity && (
          <EditModal 
            entity={editingEntity.type === 'villain' ? state.villain : state.heroes[editingEntity.index!]}
            isHero={editingEntity.type === 'hero'}
            onClose={() => setEditingEntity(null)}
            onSave={(name, maxHp, deckId) => {
              setState(prev => {
                if (editingEntity.type === 'villain') {
                  const newVillain = { ...prev.villain, name, maxHp };
                  return { ...prev, villain: newVillain };
                } else {
                  const newHeroes = [...prev.heroes];
                  newHeroes[editingEntity.index!] = { 
                    ...newHeroes[editingEntity.index!], 
                    name, 
                    maxHp,
                    deckId
                  };
                  return { ...prev, heroes: newHeroes };
                }
              });
              setEditingEntity(null);
            }}
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {prompt && (
          <PromptModal 
            {...prompt}
            onClose={() => setPrompt(null)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmation && (
          <ConfirmationModal 
            {...confirmation} 
            onClose={() => setConfirmation(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast message={toast} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Setup View ---

function SetupView({ onStart, initialName, initialHeroes, history, onClearHistory, settings, onUpdateSettings, onLoadState, setConfirmation, setToast }: { 
  onStart: (name: string, count: number, hp: number) => void, 
  initialName: string, 
  initialHeroes: number,
  history: HistoryEntry[],
  onClearHistory: () => void,
  settings: GameSettings,
  onUpdateSettings: (s: GameSettings) => void,
  onLoadState: (s: any) => void,
  setConfirmation: (config: any) => void,
  setToast: (msg: string) => void
}) {
  const [villain, setVillain] = useState(initialName);
  const [players, setPlayers] = useState(initialHeroes);
  const [hpPerPlayer, setHpPerPlayer] = useState(15);
  const [activeTab, setActiveTab] = useState<'setup' | 'history' | 'settings' | 'loads'>('setup');

  const savedGamesRaw = localStorage.getItem(SAVES_KEY);
  const savedGames: SavedGame[] = savedGamesRaw ? JSON.parse(savedGamesRaw) : [];

  const exportHistory = () => {
    const data = JSON.stringify(history, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `marvel_champions_history_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    vibrate(30);
  };

  const importHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmation({
      title: "¿Importar Historial?",
      message: "Se reemplazarán tus datos actuales por los del archivo. ¿Confirmar?",
      confirmText: "Importar",
      onConfirm: () => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const imported = JSON.parse(event.target?.result as string);
            if (Array.isArray(imported)) {
              onLoadState({ ...migrateState(null), history: imported });
              setToast("¡Historial importado con éxito!");
              vibrate(50);
            } else {
              setToast("Error: Formato inválido");
            }
          } catch (err) {
            setToast("Error al leer archivo");
          }
          setConfirmation(null);
        };
        reader.readAsText(file);
      }
    });
  };

  const deleteSave = (id: string, name: string) => {
    vibrate(20);
    setConfirmation({
      title: "¿Borrar partida?",
      message: `¿Seguro que quieres borrar "${name}"?`,
      confirmText: "Borrar",
      isDanger: true,
      onConfirm: () => {
        const currentSaves = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]');
        const filtered = currentSaves.filter((s: SavedGame) => s.id !== id);
        localStorage.setItem(SAVES_KEY, JSON.stringify(filtered));
        setToast("Partida eliminada");
        setConfirmation(null);
        // Refresh loads view
        setActiveTab('setup');
        setTimeout(() => setActiveTab('loads'), 10);
      }
    });
  };

  if (activeTab === 'loads') {
    return (
      <div className="min-h-screen bg-background text-[#e0e0e0] flex flex-col p-6 items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setActiveTab('setup')} className="p-3 bg-surface-elevated border border-border rounded-xl">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-widest italic">Cargar Partida</h2>
            <div className="w-10" />
          </div>
          <div className="space-y-4 max-h-[75vh] overflow-y-auto px-1 pb-10">
            {savedGames.length === 0 ? (
              <div className="text-center py-20 bg-surface-elevated rounded-[40px] border border-dashed border-border">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">No hay partidas guardadas</p>
              </div>
            ) : (
              savedGames.map(save => (
                <div key={save.id} className="bg-surface-elevated border border-border p-5 rounded-[32px] flex items-center justify-between group">
                  <button 
                    onClick={() => { vibrate(40); onLoadState(save.state); }}
                    className="flex-1 text-left"
                  >
                    <div className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">{new Date(save.date).toLocaleString()}</div>
                    <div className="text-lg font-black italic uppercase tracking-tight">{save.name}</div>
                  </button>
                  <button 
                    onClick={() => deleteSave(save.id, save.name)}
                    className="p-3 text-marvel-red opacity-40 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'settings') {
     return (
      <div className="min-h-screen bg-background text-[#e0e0e0] flex flex-col p-6 items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setActiveTab('setup')} className="p-3 bg-surface-elevated border border-border rounded-xl">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-widest italic">Ajustes</h2>
            <div className="w-10"></div>
          </div>
          
          <div className="bg-surface-elevated border border-border p-8 rounded-[40px] space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-black italic uppercase tracking-tight text-white">Animaciones de Fase</h4>
                <p className="text-[10px] text-zinc-500 font-bold uppercase mt-1">Muestra un aviso al cambiar de turno</p>
              </div>
              <button 
                onClick={() => { vibrate(15); onUpdateSettings({ ...settings, animationsEnabled: !settings.animationsEnabled }); }}
                className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 ${settings.animationsEnabled ? 'bg-[#0088cc]' : 'bg-zinc-800'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full transition-transform ${settings.animationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'history') {
    return (
      <div className="min-h-screen bg-background text-[#e0e0e0] flex flex-col p-6 items-center">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between mb-2">
            <button 
              onClick={() => { vibrate(10); setActiveTab('setup'); }}
              className="p-3 bg-surface-elevated border border-border rounded-xl"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-widest italic">Historial</h2>
            <div className="flex gap-2">
              <label className="p-3 bg-surface-elevated border border-border rounded-xl text-emerald-500 cursor-pointer">
                <Download className="w-4 h-4 rotate-180" />
                <input type="file" className="hidden" accept=".json" onChange={importHistory} />
              </label>
              <button 
                onClick={exportHistory}
                className="p-3 bg-surface-elevated border border-border rounded-xl text-[#0088cc]"
                title="Exportar JSON"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar pb-10">
            {history.length === 0 ? (
              <div className="text-center py-20 bg-surface-elevated rounded-[40px] border border-dashed border-border">
                <p className="text-zinc-600 font-black uppercase tracking-widest text-[10px]">Sin partidas registradas</p>
              </div>
            ) : (
              history.map(entry => (
                <div key={entry.id} className="bg-surface-elevated border border-border p-5 rounded-[32px] relative overflow-hidden">
                  <div className={`absolute top-0 right-0 px-4 py-1 text-[8px] font-black uppercase italic ${entry.result === 'win' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-marvel-red/20 text-marvel-red'}`}>
                    {entry.result === 'win' ? 'Victoria' : 'Derrota'}
                  </div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                        {new Date(entry.date).toLocaleDateString()}
                      </div>
                      <div className="text-lg font-black italic uppercase tracking-tight">{entry.villain}</div>
                      <div className="text-[9px] font-bold text-zinc-600">ETAPA {entry.stage}</div>
                    </div>
                  </div>
                  <div className="h-px bg-border/50 my-3" />
                  <div className="flex flex-wrap gap-1.5">
                    {entry.heroes.map((h, i) => (
                      <div key={i} className="flex flex-col bg-black/30 border border-border/30 px-3 py-2 rounded-xl text-[9px]">
                        <span className="font-black text-white/50">{h.name}</span>
                        {h.deckId && <span className="text-[7px] text-[#0088cc] font-mono mt-0.5">#{h.deckId}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {history.length > 0 && (
            <button 
              onClick={onClearHistory}
              className="w-full py-4 text-marvel-red text-[10px] font-black uppercase tracking-widest hover:bg-marvel-red/10 rounded-2xl transition-colors"
            >
              Borrar Todo el Historial
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-[#e0e0e0] flex flex-col p-6 items-center justify-center">
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-sm space-y-10"
      >
        <div className="text-center space-y-6">
          <div className="inline-block relative">
            <div className="absolute inset-0 bg-marvel-red blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative bg-marvel-red p-5 rounded-[28px] shadow-2xl border-4 border-black/50 rotate-3">
               <Swords className="w-12 h-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-[42px] font-black italic uppercase tracking-tighter text-white leading-none">
              MARVEL COMPANION
            </h1>
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Nombre del Villano</label>
            <div className="relative group">
              <input 
                className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 font-black italic uppercase placeholder:text-zinc-800 focus:border-marvel-red/50 outline-none transition-all shadow-inner text-xl"
                value={villain}
                onChange={e => setVillain(e.target.value)}
                placeholder="Ej: RINO"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Jugadores</label>
              <div className="flex items-center bg-[#111] rounded-2xl border border-white/5 overflow-hidden h-16 shadow-inner">
                <button 
                  onClick={() => { vibrate(10); setPlayers(p => Math.max(1, p - 1)); }}
                  className="w-14 h-full hover:bg-white/5 active:bg-marvel-red/20 transition flex items-center justify-center text-zinc-500"
                ><Minus className="w-4 h-4" /></button>
                <span className="flex-1 text-center font-black text-2xl italic">{players}</span>
                <button 
                  onClick={() => { vibrate(10); setPlayers(p => Math.min(4, p + 1)); }}
                  className="w-14 h-full hover:bg-white/5 active:bg-marvel-red/20 transition flex items-center justify-center text-zinc-500"
                ><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">HP x Jugador</label>
              <div className="relative bg-[#111] rounded-2xl border border-white/5 h-16 shadow-inner flex items-center px-4">
                <input 
                  type="number"
                  min="1"
                  className="w-full bg-transparent font-black italic text-2xl outline-none text-center"
                  value={hpPerPlayer}
                  onChange={e => setHpPerPlayer(Number(e.target.value))}
                  onBlur={() => setHpPerPlayer(Math.max(1, hpPerPlayer || 1))}
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
             <div className="bg-[#0a0a0a] p-6 rounded-3xl border border-white/5 mb-10 text-center shadow-2xl">
                <span className="text-[11px] text-zinc-600 font-black uppercase tracking-widest block mb-1">Vida Inicial</span>
                <span className="text-marvel-red font-black text-4xl italic tracking-tighter drop-shadow-[0_0_10px_rgba(226,54,54,0.3)]">
                  {players * (hpPerPlayer || 0)}HP
                </span>
             </div>

            <div className="flex flex-col gap-6">
              <button 
                onClick={() => onStart(villain, players, Math.max(1, hpPerPlayer))}
                disabled={!villain.trim()}
                className="w-full py-6 bg-marvel-red rounded-[36px] font-black italic uppercase tracking-[0.1em] text-xl shadow-[0_10px_30px_rgba(226,54,54,0.4)] transition-all active:scale-95 active:shadow-none hover:brightness-110 active:brightness-90 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:brightness-100 disabled:shadow-none"
              >
                Iniciar Combate
              </button>
              
              <div className="flex justify-center gap-2">
                <button 
                  onClick={() => { vibrate(20); setActiveTab('loads'); }}
                  className="px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-full font-black uppercase tracking-widest text-[8px] flex items-center gap-1.5 hover:bg-zinc-800 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-emerald-500" /> Cargar
                </button>
                <button 
                  onClick={() => { vibrate(10); setActiveTab('history'); }}
                  className="px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-full font-black uppercase tracking-widest text-[8px] flex items-center gap-1.5 hover:bg-zinc-800 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-zinc-500" /> Historial
                </button>
                <button 
                  onClick={() => { vibrate(10); setActiveTab('settings'); }}
                  className="px-4 py-3 bg-zinc-900/50 border border-white/5 rounded-full font-black uppercase tracking-widest text-[8px] flex items-center gap-1.5 hover:bg-zinc-800 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5 text-zinc-500" /> Ajustes
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// --- Stage Modal ---

function StageModal({ onClose, onConfirm, currentStage }: { onClose: () => void, onConfirm: (hp: number) => void, currentStage: number }) {
  const [hp, setHp] = useState(15);
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-surface p-8 rounded-[40px] border border-border shadow-2xl"
      >
        <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 text-center text-balance">Pasar a Etapa {currentStage + 1}</h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-8 text-center">Configura la salud para la siguiente fase</p>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between text-center bg-black/40 rounded-3xl border border-border/50 p-4 h-24">
            <button 
              onClick={() => { vibrate(10); setHp(p => Math.max(1, p - 1)); }}
              className="w-16 h-full flex items-center justify-center bg-surface rounded-2xl border border-border/50 active:scale-90 transition-transform"
            >
              <Minus className="w-5 h-5" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-zinc-600 uppercase mb-1">HP x JUGADOR</span>
              <span className="text-4xl font-black italic">{hp}</span>
            </div>
            <button 
              onClick={() => { vibrate(10); setHp(p => p + 1); }}
              className="w-16 h-full flex items-center justify-center bg-surface rounded-2xl border border-border/50 active:scale-90 transition-transform"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button 
               onClick={onClose}
               className="py-5 bg-zinc-900 border border-border rounded-2xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-transform"
             >Atrás</button>
             <button 
               onClick={() => onConfirm(hp)}
               className="py-5 bg-marvel-red rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-marvel-red/20 active:scale-95 transition-transform"
             >Confirmar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// --- Edit Modal ---

function EditModal({ entity, onClose, onSave, isHero }: { entity: any, onClose: () => void, onSave: (n: string, m: number, d?: string) => void, isHero?: boolean }) {
  const [name, setName] = useState(entity.name);
  const [maxHp, setMaxHp] = useState(entity.maxHp);
  const [deckId, setDeckId] = useState(entity.deckId || '');

  vibrate(15);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-surface rounded-[40px] border border-border p-8 space-y-6 shadow-2xl relative overflow-hidden"
      >
        <h3 className="text-xl font-black italic uppercase tracking-tight text-center text-white">Ajustes de {isHero ? 'Héroe' : 'Villano'}</h3>
        
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nombre</label>
            <input 
              className="w-full bg-surface-dark border border-border rounded-2xl p-4 font-black italic uppercase focus:border-marvel-red outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-widest text-zinc-500 ml-1">Vida Máxima</label>
            <input 
              type="number"
              className="w-full bg-surface-dark border border-border rounded-2xl p-4 font-black italic text-xl focus:border-marvel-red outline-none"
              value={maxHp}
              onChange={e => setMaxHp(Number(e.target.value))}
            />
          </div>

          {isHero && (
            <div className="space-y-2 p-4 bg-black/40 rounded-2xl border border-border-dim border-dashed">
              <label className="text-[9px] font-black uppercase tracking-widest text-[#0088cc] ml-1 block">ID de MarvelCDB</label>
              <input 
                className="w-full bg-surface-dark border border-border rounded-xl px-3 py-3 text-xs font-bold focus:border-[#0088cc] outline-none"
                value={deckId}
                onChange={e => setDeckId(e.target.value)}
                placeholder="Ej: 60430"
              />
              <p className="text-[8px] text-zinc-600 font-bold ml-1 uppercase">ID del mazo para el historial</p>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 py-4 bg-surface-dark border border-border rounded-2xl font-black uppercase text-[10px] tracking-widest"
          >Cancelar</button>
          <button 
            onClick={() => onSave(name, maxHp, deckId)}
            disabled={!name.trim()}
            className="flex-1 py-4 bg-marvel-red rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-marvel-red/20 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
          >Guardar</button>
        </div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent"></div>
      </motion.div>
    </motion.div>
  );
}

// --- Dynamic UX Components ---

function ConfirmationModal({ title, message, onConfirm, onClose, confirmText = "Confirmar", isDanger = false }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-surface rounded-[44px] border border-border p-8 space-y-6 shadow-2xl text-center"
      >
        <div className={`w-16 h-16 mx-auto rounded-3xl flex items-center justify-center ${isDanger ? 'bg-marvel-red/20 text-marvel-red' : 'bg-emerald-500/20 text-emerald-500'}`}>
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black italic uppercase tracking-tight text-white">{title}</h3>
          <p className="text-xs font-bold text-zinc-500 uppercase leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-4 bg-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
          <button 
            onClick={() => { vibrate(30); onConfirm(); }} 
            className={`flex-1 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white shadow-xl ${isDanger ? 'bg-marvel-red shadow-marvel-red/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}
          >{confirmText}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function PromptModal({ title, message, defaultValue, onConfirm, onClose }: any) {
  const [val, setVal] = useState(defaultValue);
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-sm bg-surface rounded-[44px] border border-border p-8 space-y-6 shadow-2xl"
      >
        <div className="space-y-2">
          <h3 className="text-xl font-black italic uppercase tracking-tight text-white">{title}</h3>
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{message}</p>
        </div>
        <input 
          autoFocus
          className="w-full bg-surface-dark border border-border rounded-2xl p-4 font-black italic uppercase focus:border-marvel-red outline-none text-white"
          value={val}
          onChange={e => setVal(e.target.value)}
        />
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-4 bg-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
          <button 
            onClick={() => { vibrate(30); onConfirm(val); }} 
            className="flex-1 py-4 bg-[#0088cc] rounded-2xl font-black uppercase text-[10px] tracking-widest text-white shadow-xl shadow-[#0088cc]/20"
          >Guardar</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }} 
      animate={{ y: 0, opacity: 1 }} 
      exit={{ y: 20, opacity: 0 }}
      className="fixed bottom-24 left-6 right-6 z-[300] pointer-events-none flex justify-center"
    >
      <div className="bg-emerald-500 text-white px-6 py-3 rounded-full font-black uppercase italic tracking-widest text-[10px] shadow-2xl flex items-center gap-3">
        <Trophy className="w-4 h-4" />
        {message}
      </div>
    </motion.div>
  );
}
