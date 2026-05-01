import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Minus, RotateCcw, Pencil, Check, UserPlus, Trash2, ChevronsUp, X, Heart, Skull, Save, FolderOpen } from 'lucide-react';

const HERO_PALETTE = [
  { stripe: '#2563EB', glow: '#60A5FA' },
  { stripe: '#15803D', glow: '#4ADE80' },
  { stripe: '#7E22CE', glow: '#C084FC' },
  { stripe: '#EA580C', glow: '#FB923C' },
];

const STAGES = ['I', 'II', 'III', 'IV'];
const STORAGE_KEY = 'mc-tracker-state';
const SAVES_KEY = 'mc-tracker-saves';

function formatRelative(ts) {
  const diff = Date.now() - ts;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'recién';
  const min = Math.floor(sec / 60);
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d} d`;
  return new Date(ts).toLocaleDateString();
}

function formatDateForSaveName() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

const defaultState = () => ({
  phase: 'setup',
  heroes: [],
  villain: { name: '', basePerPlayer: 15, hp: 0, stageIdx: 0 },
  nextId: 1,
});

// ─── Tap-and-hold button: press fires once, hold accelerates ─────────────
function HoldButton({ onPress, disabled, children, style, className, ariaLabel }) {
  const startTimer = useRef(null);
  const tickTimer = useRef(null);
  const speed = useRef(110);

  const stop = useCallback(() => {
    if (startTimer.current) { clearTimeout(startTimer.current); startTimer.current = null; }
    if (tickTimer.current) { clearTimeout(tickTimer.current); tickTimer.current = null; }
    speed.current = 110;
  }, []);

  const start = (e) => {
    if (disabled) return;
    e.preventDefault();
    onPress();
    if (navigator.vibrate) try { navigator.vibrate(6); } catch {}
    startTimer.current = setTimeout(() => {
      const tick = () => {
        onPress();
        speed.current = Math.max(38, speed.current - 9);
        tickTimer.current = setTimeout(tick, speed.current);
      };
      tickTimer.current = setTimeout(tick, speed.current);
    }, 320);
  };

  useEffect(() => () => stop(), [stop]);

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onContextMenu={(e) => e.preventDefault()}
      disabled={disabled}
      aria-label={ariaLabel}
      style={style}
      className={className}
    >
      {children}
    </button>
  );
}

// ─── Confirm dialog ──────────────────────────────────────────────────────
function Confirm({ open, title, body, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_.15s_ease-out]">
      <div className="w-full max-w-sm bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-5 shadow-2xl">
        <h3 className="text-xl font-display tracking-wide text-white mb-1">{title}</h3>
        <p className="text-sm text-zinc-400 mb-5">{body}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-200 font-semibold active:scale-95 transition">Cancelar</button>
          <button onClick={onConfirm} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold active:scale-95 transition">Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit modal ──────────────────────────────────────────────────────────
function EditModal({ open, title, initial, onSave, onClose, accent = '#ef4444', perPlayer = false, playerCount = 1, numberLabel, saveLabel = 'Guardar' }) {
  const [name, setName] = useState('');
  const [num, setNum] = useState('');

  useEffect(() => {
    if (open && initial) {
      setName(initial.name);
      setNum(String(perPlayer ? initial.basePerPlayer : initial.max));
    }
  }, [open, initial, perPlayer]);

  if (!open) return null;

  const parsed = parseInt(num, 10);
  const valid = name.trim() && !isNaN(parsed) && parsed >= 1;
  const total = valid ? parsed * playerCount : 0;

  const submit = () => {
    if (!valid) return;
    onSave(perPlayer
      ? { name: name.trim().slice(0, 24), basePerPlayer: parsed }
      : { name: name.trim().slice(0, 24), max: parsed });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_.15s_ease-out]">
      <div className="w-full max-w-sm bg-zinc-900 border-2 rounded-2xl p-5 shadow-2xl" style={{ borderColor: accent }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-display tracking-wide text-white">{title}</h3>
          <button onClick={onClose} className="p-1 text-zinc-400 active:scale-90"><X size={20} /></button>
        </div>
        <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          className="w-full bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700 focus:outline-none focus:border-zinc-500 mb-4 text-base"
          placeholder={perPlayer ? 'Ej: Rhino' : 'Ej: Spider-Man'}
        />
        <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1">
          {numberLabel || (perPlayer ? 'Vida por jugador' : 'Vida máxima')}
        </label>
        <input
          value={num}
          onChange={(e) => setNum(e.target.value.replace(/[^0-9]/g, ''))}
          inputMode="numeric"
          className="w-full bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700 focus:outline-none focus:border-zinc-500 text-base"
          placeholder={perPlayer ? '15' : '10'}
        />
        {perPlayer && (
          <div className="mt-2 text-xs text-zinc-400">
            <span className="text-zinc-500">Total:</span>{' '}
            <span className="text-white font-semibold">{parsed || 0} × {playerCount} jugador{playerCount === 1 ? '' : 'es'}</span>{' '}
            <span className="text-zinc-500">=</span>{' '}
            <span className="font-display text-base" style={{ color: accent }}>{total}</span>
          </div>
        )}
        <button
          onClick={submit}
          disabled={!valid}
          className="mt-5 w-full py-3 rounded-xl text-white font-bold tracking-wide active:scale-95 transition disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Save modal ──────────────────────────────────────────────────────────
function SaveModal({ open, defaultName, onSave, onClose }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(defaultName || '');
  }, [open, defaultName]);

  if (!open) return null;

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed.slice(0, 40));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_.15s_ease-out]">
      <div className="w-full max-w-sm bg-zinc-900 border-2 rounded-2xl p-5 shadow-2xl" style={{ borderColor: '#10b981' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Save size={18} className="text-emerald-400" />
            <h3 className="text-xl font-display tracking-wide text-white">Guardar partida</h3>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 active:scale-90"><X size={20} /></button>
        </div>
        <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="w-full bg-zinc-800 text-white px-4 py-3 rounded-xl border border-zinc-700 focus:outline-none focus:border-zinc-500 mb-5 text-base"
          placeholder="Ej: Rhino · sábado"
        />
        <button
          onClick={submit}
          disabled={!name.trim()}
          className="w-full py-3 rounded-xl text-white font-bold tracking-wide active:scale-95 transition disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #047857, #10b981)' }}
        >
          Guardar
        </button>
      </div>
    </div>
  );
}

// ─── Load modal ──────────────────────────────────────────────────────────
function LoadModal({ open, saves, onLoad, onDelete, onClose }) {
  const [confirmingDelete, setConfirmingDelete] = useState(null);

  useEffect(() => {
    if (!open) setConfirmingDelete(null);
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-[fadeIn_.15s_ease-out]">
        <div className="w-full max-w-md bg-zinc-900 border-2 border-zinc-700 rounded-2xl shadow-2xl flex flex-col" style={{ maxHeight: '85vh' }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-blue-400" />
              <h3 className="text-xl font-display tracking-wide text-white">Cargar partida</h3>
            </div>
            <button onClick={onClose} className="p-1 text-zinc-400 active:scale-90"><X size={20} /></button>
          </div>

          {saves.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              Todavía no hay partidas guardadas.
            </div>
          ) : (
            <div className="overflow-y-auto p-3 space-y-2">
              {saves.map((s) => {
                const heroCount = s.snapshot.heroes.length;
                const stage = STAGES[s.snapshot.villain.stageIdx] || s.snapshot.villain.stageIdx + 1;
                const villainName = s.snapshot.villain.name || 'Villano';
                return (
                  <div key={s.id} className="rounded-xl bg-zinc-800/60 border border-zinc-700 overflow-hidden">
                    <div className="flex items-stretch">
                      <button
                        onClick={() => onLoad(s.id)}
                        className="flex-1 text-left px-4 py-3 active:bg-zinc-700/50 transition min-w-0"
                      >
                        <div className="font-semibold text-white text-base truncate">{s.name}</div>
                        <div className="text-xs text-zinc-400 mt-1 truncate">
                          <span className="text-red-400">{villainName}</span>
                          <span className="text-zinc-600"> · </span>Etapa {stage}
                          <span className="text-zinc-600"> · </span>{heroCount} héroe{heroCount === 1 ? '' : 's'}
                        </div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">
                          {formatRelative(s.savedAt)}
                        </div>
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(s.id)}
                        className="px-4 text-zinc-500 active:text-red-400 active:bg-zinc-700/50 active:scale-90 transition border-l border-zinc-700"
                        aria-label="Eliminar partida"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {confirmingDelete != null && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_.15s_ease-out]">
          <div className="w-full max-w-sm bg-zinc-900 border-2 border-zinc-700 rounded-2xl p-5 shadow-2xl">
            <h3 className="text-xl font-display tracking-wide text-white mb-1">¿Eliminar partida?</h3>
            <p className="text-sm text-zinc-400 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmingDelete(null)} className="flex-1 py-3 rounded-xl bg-zinc-800 text-zinc-200 font-semibold active:scale-95 transition">Cancelar</button>
              <button onClick={() => { onDelete(confirmingDelete); setConfirmingDelete(null); }} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold active:scale-95 transition">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── HP display with pulse on change ─────────────────────────────────────
function HPDisplay({ value, max, color, dead }) {
  const [pulse, setPulse] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (prev.current !== value) {
      setPulse((p) => p + 1);
      prev.current = value;
    }
  }, [value]);

  const pct = Math.max(0, Math.min(1, value / Math.max(max, 1)));

  return (
    <div className="flex flex-col items-center justify-center select-none">
      <div
        key={pulse}
        className="font-display leading-none animate-[pop_.18s_ease-out]"
        style={{
          fontSize: 'clamp(56px, 18vw, 88px)',
          color: dead ? '#52525b' : '#fff',
          textShadow: dead ? 'none' : `0 0 24px ${color}55, 0 4px 0 #000`,
          letterSpacing: '0.02em',
        }}
      >
        {value}
      </div>
      <div className="text-xs uppercase tracking-[0.25em] text-zinc-500 -mt-1">/ {max}</div>
      <div className="w-full h-1.5 mt-3 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${pct * 100}%`,
            background: dead ? '#3f3f46' : `linear-gradient(90deg, ${color}, ${color}cc)`,
          }}
        />
      </div>
    </div>
  );
}

// ─── Hero card ───────────────────────────────────────────────────────────
function HeroCard({ hero, onChange, onEdit, onRemove, onHeal, canRemove }) {
  const palette = HERO_PALETTE[hero.colorIdx % HERO_PALETTE.length];
  const dead = hero.hp <= 0;
  const set = (delta) => onChange({ ...hero, hp: Math.max(0, Math.min(99, hero.hp + delta)) });

  return (
    <div
      className="relative rounded-2xl bg-zinc-900 border-2 border-black overflow-hidden"
      style={{ boxShadow: `0 6px 0 #000, 0 0 0 1px ${palette.stripe}55` }}
    >
      {/* Color stripe */}
      <div className="h-2" style={{ background: `linear-gradient(90deg, ${palette.stripe}, ${palette.glow})` }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <Heart size={14} style={{ color: palette.glow }} fill={palette.glow} />
          <h2 className="font-display tracking-wide text-white text-lg truncate">{hero.name}</h2>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onHeal} className="p-2 text-zinc-400 active:scale-90 active:text-white" aria-label="Curar al máximo">
            <ChevronsUp size={18} />
          </button>
          <button onClick={onEdit} className="p-2 text-zinc-400 active:scale-90 active:text-white" aria-label="Editar">
            <Pencil size={16} />
          </button>
          {canRemove && (
            <button onClick={onRemove} className="p-2 text-zinc-500 active:scale-90 active:text-red-400" aria-label="Eliminar">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* HP controls row */}
      <div className="flex items-stretch gap-3 px-3 pb-4 pt-1">
        <HoldButton
          onPress={() => set(-1)}
          ariaLabel="Restar vida"
          className="flex-1 flex items-center justify-center rounded-xl bg-zinc-800 active:bg-zinc-700 active:scale-95 transition border-2 border-black text-white"
          style={{ minHeight: 92 }}
        >
          <Minus size={42} strokeWidth={3} />
        </HoldButton>

        <div className="flex-[1.4] flex items-center justify-center px-2">
          <HPDisplay value={hero.hp} max={hero.max} color={palette.glow} dead={dead} />
        </div>

        <HoldButton
          onPress={() => set(+1)}
          ariaLabel="Sumar vida"
          className="flex-1 flex items-center justify-center rounded-xl active:scale-95 transition border-2 border-black text-white"
          style={{ minHeight: 92, background: `linear-gradient(135deg, ${palette.stripe}, ${palette.glow})` }}
        >
          <Plus size={42} strokeWidth={3} />
        </HoldButton>
      </div>

      {dead && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-black/40">
          <span className="font-display text-2xl tracking-[0.4em] text-red-500" style={{ textShadow: '0 2px 0 #000' }}>K.O.</span>
        </div>
      )}
    </div>
  );
}

// ─── Villain card ────────────────────────────────────────────────────────
function VillainCard({ villain, playerCount, onChange, onEdit, onAdvanceStage, onHeal }) {
  const max = villain.basePerPlayer * playerCount;
  const dead = villain.hp <= 0;
  const set = (delta) => onChange({ ...villain, hp: Math.max(0, Math.min(999, villain.hp + delta)) });
  const stage = STAGES[villain.stageIdx] || `${villain.stageIdx + 1}`;

  return (
    <div
      className="relative rounded-2xl overflow-hidden bg-zinc-900 border-2 border-black"
      style={{ boxShadow: '0 6px 0 #000, 0 0 0 1px #ef444455, 0 0 28px #ef444422' }}
    >
      {/* Red accent stripe (thicker than hero stripe) */}
      <div className="h-3" style={{ background: 'linear-gradient(90deg, #b91c1c, #ef4444, #b91c1c)' }} />

      <div className="relative px-4 pt-3 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Skull size={20} className="text-red-500" />
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.3em] text-red-400/80">Villano · Etapa {stage}</div>
            <h2 className="font-display tracking-wide text-white text-2xl truncate">{villain.name}</h2>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onHeal} className="p-2 text-zinc-300 active:scale-90 active:text-white" aria-label="Llenar vida">
            <ChevronsUp size={18} />
          </button>
          <button onClick={onAdvanceStage} className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-600/40 text-red-300 text-xs font-bold tracking-wider active:scale-95" aria-label="Siguiente etapa">
            ETAPA →
          </button>
          <button onClick={onEdit} className="p-2 text-zinc-300 active:scale-90 active:text-white" aria-label="Editar">
            <Pencil size={16} />
          </button>
        </div>
      </div>

      <div className="relative flex items-stretch gap-3 px-3 pb-2 pt-1">
        <HoldButton
          onPress={() => set(-1)}
          ariaLabel="Restar vida al villano"
          className="flex-1 flex items-center justify-center rounded-xl bg-zinc-800 active:bg-zinc-700 active:scale-95 transition border-2 border-black text-white"
          style={{ minHeight: 104 }}
        >
          <Minus size={48} strokeWidth={3} />
        </HoldButton>

        <div className="flex-[1.5] flex items-center justify-center px-2">
          <HPDisplay value={villain.hp} max={max} color="#ef4444" dead={dead} />
        </div>

        <HoldButton
          onPress={() => set(+1)}
          ariaLabel="Sumar vida al villano"
          className="flex-1 flex items-center justify-center rounded-xl active:scale-95 transition border-2 border-black text-white"
          style={{ minHeight: 104, background: 'linear-gradient(135deg, #b91c1c, #ef4444)' }}
        >
          <Plus size={48} strokeWidth={3} />
        </HoldButton>
      </div>

      <div className="relative px-4 pb-3 text-center text-[10px] uppercase tracking-[0.25em] text-zinc-500">
        {villain.basePerPlayer} por jugador × {playerCount} = <span className="text-red-400 font-semibold">{max}</span>
      </div>

      {dead && (
        <div className="relative px-4 pb-3 -mt-1">
          <div className="text-center text-xs uppercase tracking-[0.3em] text-red-300 animate-pulse">
            ¡Avanza a la siguiente etapa!
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Setup screen ────────────────────────────────────────────────────────
function SetupScreen({ onStart, savesCount, onOpenLoad }) {
  const [playerCount, setPlayerCount] = useState(2);
  const [villainName, setVillainName] = useState('');
  const [basePerPlayer, setBasePerPlayer] = useState('15');

  const baseNum = parseInt(basePerPlayer, 10) || 0;
  const total = baseNum * playerCount;
  const valid = villainName.trim().length > 0 && baseNum >= 1;

  const start = () => {
    if (!valid) return;
    const heroes = Array.from({ length: playerCount }, (_, i) => ({
      id: i + 1,
      name: `Héroe ${i + 1}`,
      hp: 10,
      max: 10,
      colorIdx: i % HERO_PALETTE.length,
    }));
    onStart({
      phase: 'play',
      heroes,
      villain: {
        name: villainName.trim().slice(0, 24),
        basePerPlayer: baseNum,
        hp: baseNum * playerCount,
        stageIdx: 0,
      },
      nextId: playerCount + 1,
    });
  };

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      <header className="px-4 pt-8 pb-6 text-center">
        <div className="flex items-center justify-center gap-2 text-red-500">
          <Skull size={16} />
          <span className="text-[10px] uppercase tracking-[0.4em]">Marvel Champions</span>
          <Skull size={16} />
        </div>
        <h1 className="font-display tracking-wide text-4xl mt-2">Nueva Partida</h1>
      </header>

      <main className="px-4 max-w-md mx-auto space-y-6">
        {/* Load existing */}
        {savesCount > 0 && (
          <button
            onClick={onOpenLoad}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 active:scale-[.98] active:bg-zinc-800 transition"
          >
            <div className="flex items-center gap-3">
              <FolderOpen size={18} className="text-blue-400" />
              <div className="text-left">
                <div className="text-sm font-semibold text-white">Cargar partida</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-500">{savesCount} guardada{savesCount === 1 ? '' : 's'}</div>
              </div>
            </div>
            <span className="text-zinc-500 text-sm">→</span>
          </button>
        )}

        {/* Player count */}
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3 px-1">¿Cuántos héroes?</h2>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((n) => {
              const active = playerCount === n;
              return (
                <button
                  key={n}
                  onClick={() => setPlayerCount(n)}
                  className="py-5 rounded-2xl border-2 font-display text-3xl transition-all active:scale-95"
                  style={{
                    background: active ? 'linear-gradient(135deg, #fff, #d4d4d8)' : '#18181b',
                    color: active ? '#000' : '#71717a',
                    borderColor: active ? '#fff' : '#27272a',
                    boxShadow: active ? '0 4px 0 #000' : 'none',
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </section>

        {/* Villain */}
        <section>
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3 px-1">Villano</h2>

          <div className="space-y-3">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 px-1">Nombre</label>
              <input
                value={villainName}
                onChange={(e) => setVillainName(e.target.value)}
                placeholder="Ej: Rhino, Klaw, Ultron…"
                maxLength={24}
                className="w-full bg-zinc-900 text-white px-4 py-4 rounded-xl border-2 border-zinc-800 focus:outline-none focus:border-red-600 text-lg font-semibold transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-zinc-500 mb-1.5 px-1">Vida por jugador</label>
              <input
                value={basePerPlayer}
                onChange={(e) => setBasePerPlayer(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))}
                inputMode="numeric"
                placeholder="15"
                className="w-full bg-zinc-900 text-white px-4 py-4 rounded-xl border-2 border-zinc-800 focus:outline-none focus:border-red-600 text-lg font-semibold transition-colors"
              />
              <p className="text-[10px] text-zinc-600 mt-1.5 px-1">Lo encontrás en la carta de etapa I del villano.</p>
            </div>
          </div>
        </section>

        {/* Live preview */}
        <section
          className="rounded-2xl border-2 border-zinc-800 px-4 py-5 text-center"
          style={{ background: valid ? 'radial-gradient(circle at top, #450a0a40, transparent)' : '#0c0a09' }}
        >
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-2">Vida total del villano</div>
          <div
            className="font-display text-6xl leading-none transition-colors"
            style={{
              color: valid ? '#fff' : '#3f3f46',
              textShadow: valid ? '0 0 24px #ef444477, 0 4px 0 #000' : 'none',
            }}
          >
            {total}
          </div>
          <div className="text-xs text-zinc-500 mt-2">
            {baseNum} × {playerCount} jugador{playerCount === 1 ? '' : 'es'}
          </div>
        </section>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pt-6 pb-5 pointer-events-none bg-gradient-to-t from-black via-black to-transparent">
        <button
          onClick={start}
          disabled={!valid}
          className="pointer-events-auto w-full max-w-md mx-auto block py-5 rounded-2xl font-display text-xl tracking-[0.2em] text-white transition active:scale-[.98] disabled:cursor-not-allowed"
          style={{
            background: valid ? 'linear-gradient(135deg, #b91c1c, #ef4444)' : '#27272a',
            color: valid ? '#fff' : '#52525b',
            boxShadow: valid ? '0 6px 0 #000, 0 0 32px #ef444466' : '0 4px 0 #000',
            border: '2px solid #000',
          }}
        >
          ¡EMPEZAR!
        </button>
      </div>
    </div>
  );
}

// ─── Main app ────────────────────────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(null);
  const [editing, setEditing] = useState(null); // { kind: 'hero'|'villain'|'stage', id? }
  const [confirm, setConfirm] = useState(null); // { type, payload }
  const [saves, setSaves] = useState([]); // [{ id, name, savedAt, snapshot }]
  const [savingOpen, setSavingOpen] = useState(false);
  const [loadingOpen, setLoadingOpen] = useState(false);
  const loaded = useRef(false);

  // Load active session
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORAGE_KEY);
        if (r?.value) {
          const parsed = JSON.parse(r.value);
          if (parsed.heroes && parsed.villain) {
            // Migrate old format: villain.max -> villain.basePerPlayer
            if (parsed.villain.basePerPlayer == null && parsed.villain.max != null) {
              const players = Math.max(1, parsed.heroes.length);
              parsed.villain.basePerPlayer = Math.max(1, Math.round(parsed.villain.max / players));
              delete parsed.villain.max;
            }
            // Migrate: existing saved games go straight to play
            if (!parsed.phase) parsed.phase = parsed.heroes.length > 0 ? 'play' : 'setup';
            setState(parsed);
            loaded.current = true;
            return;
          }
        }
      } catch {}
      setState(defaultState());
      loaded.current = true;
    })();
  }, []);

  // Load saves index
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(SAVES_KEY);
        if (r?.value) {
          const parsed = JSON.parse(r.value);
          if (Array.isArray(parsed)) setSaves(parsed);
        }
      } catch {}
    })();
  }, []);

  // Save
  useEffect(() => {
    if (!loaded.current || !state) return;
    window.storage.set(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state]);

  if (!state) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-600 text-sm tracking-widest uppercase">Cargando…</div>
      </div>
    );
  }

  if (state.phase === 'setup') {
    return <SetupScreen onStart={(game) => setState((s) => ({ ...s, ...game }))} />;
  }

  const updateHero = (h) => setState((s) => ({ ...s, heroes: s.heroes.map((x) => (x.id === h.id ? h : x)) }));
  const removeHero = (id) => setState((s) => ({ ...s, heroes: s.heroes.filter((x) => x.id !== id) }));
  const addHero = () => setState((s) => {
    if (s.heroes.length >= 4) return s;
    const colorIdx = s.heroes.length % HERO_PALETTE.length;
    return {
      ...s,
      heroes: [...s.heroes, { id: s.nextId, name: `Héroe ${s.heroes.length + 1}`, hp: 10, max: 10, colorIdx }],
      nextId: s.nextId + 1,
    };
  });
  const updateVillain = (v) => setState((s) => ({ ...s, villain: v }));
  const reset = () => setState(defaultState());
  const players = Math.max(1, state.heroes.length);
  const villainMax = state.villain.basePerPlayer * players;

  const editingHero = editing?.kind === 'hero' ? state.heroes.find((h) => h.id === editing.id) : null;

  return (
    <div className="min-h-screen text-white pb-24 bg-black">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bowlby+One+SC&display=swap');
        .font-display { font-family: 'Bowlby One SC', system-ui, sans-serif; font-weight: 400; }
        @keyframes pop { 0% { transform: scale(.85); } 60% { transform: scale(1.08); } 100% { transform: scale(1); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        body { overscroll-behavior: none; }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 backdrop-blur-md bg-black/70 border-b border-zinc-900 flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.35em] text-red-500">Marvel Champions</div>
          <h1 className="font-display tracking-wide text-xl leading-none mt-0.5">Tracker de Vida</h1>
        </div>
        <button
          onClick={() => setConfirm({ type: 'reset' })}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 active:scale-95 active:text-white"
        >
          <RotateCcw size={16} />
          <span className="text-xs font-semibold tracking-wider">NUEVA</span>
        </button>
      </header>

      <main className="px-4 pt-4 space-y-4 max-w-md mx-auto">
        {/* Villain */}
        <VillainCard
          villain={state.villain}
          playerCount={players}
          onChange={updateVillain}
          onEdit={() => setEditing({ kind: 'villain' })}
          onAdvanceStage={() => setEditing({ kind: 'stage' })}
          onHeal={() => updateVillain({ ...state.villain, hp: villainMax })}
        />

        {/* Heroes */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-[0.3em] pl-1">
            <div className="h-px flex-1 bg-zinc-800" />
            <span>Héroes · {state.heroes.length}/4</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          {state.heroes.map((h) => (
            <HeroCard
              key={h.id}
              hero={h}
              onChange={updateHero}
              onEdit={() => setEditing({ kind: 'hero', id: h.id })}
              onRemove={() => setConfirm({ type: 'removeHero', payload: h })}
              onHeal={() => updateHero({ ...h, hp: h.max })}
              canRemove={state.heroes.length > 1}
            />
          ))}

          {state.heroes.length < 4 && (
            <button
              onClick={addHero}
              className="w-full py-4 rounded-2xl border-2 border-dashed border-zinc-700 text-zinc-400 active:scale-[.98] active:text-white active:border-zinc-500 flex items-center justify-center gap-2 font-semibold tracking-wide"
            >
              <UserPlus size={18} />
              Agregar héroe
            </button>
          )}
        </div>

        <p className="text-center text-[10px] uppercase tracking-[0.3em] text-zinc-600 pt-4">
          Mantené presionado · cambio rápido
        </p>
      </main>

      {/* Edit modals */}
      <EditModal
        open={editing?.kind === 'hero' && !!editingHero}
        title="Editar héroe"
        initial={editingHero}
        accent={editingHero ? HERO_PALETTE[editingHero.colorIdx % HERO_PALETTE.length].stripe : '#fff'}
        onClose={() => setEditing(null)}
        onSave={({ name, max }) => {
          updateHero({ ...editingHero, name, max, hp: Math.min(editingHero.hp, max) });
          setEditing(null);
        }}
      />
      <EditModal
        open={editing?.kind === 'villain'}
        title="Editar villano"
        initial={state.villain}
        accent="#ef4444"
        perPlayer
        playerCount={players}
        onClose={() => setEditing(null)}
        onSave={({ name, basePerPlayer }) => {
          const newMax = basePerPlayer * players;
          updateVillain({ ...state.villain, name, basePerPlayer, hp: Math.min(state.villain.hp, newMax) });
          setEditing(null);
        }}
      />
      <EditModal
        open={editing?.kind === 'stage'}
        title={`Etapa ${STAGES[Math.min(state.villain.stageIdx + 1, STAGES.length - 1)]}`}
        initial={state.villain}
        accent="#ef4444"
        perPlayer
        playerCount={players}
        numberLabel="Vida por jugador (nueva etapa)"
        saveLabel="Avanzar etapa"
        onClose={() => setEditing(null)}
        onSave={({ name, basePerPlayer }) => {
          updateVillain({
            ...state.villain,
            name,
            basePerPlayer,
            hp: basePerPlayer * players,
            stageIdx: Math.min(STAGES.length - 1, state.villain.stageIdx + 1),
          });
          setEditing(null);
        }}
      />

      {/* Confirms */}
      <Confirm
        open={confirm?.type === 'reset'}
        title="¿Nueva partida?"
        body="Volvés a la pantalla de inicio para configurar villano y héroes."
        onCancel={() => setConfirm(null)}
        onConfirm={() => { reset(); setConfirm(null); }}
      />
      <Confirm
        open={confirm?.type === 'removeHero'}
        title="¿Eliminar héroe?"
        body={`Se eliminará "${confirm?.payload?.name || ''}" de la partida.`}
        onCancel={() => setConfirm(null)}
        onConfirm={() => { removeHero(confirm.payload.id); setConfirm(null); }}
      />
    </div>
  );
}
