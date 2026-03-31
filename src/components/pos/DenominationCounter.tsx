"use client";

import React from "react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, Minus } from "lucide-react";

const BILLS = [
  { label: "$100.000", value: 100000 },
  { label: "$50.000",  value: 50000  },
  { label: "$20.000",  value: 20000  },
  { label: "$10.000",  value: 10000  },
  { label: "$5.000",   value: 5000   },
  { label: "$2.000",   value: 2000   },
  { label: "$1.000",   value: 1000   },
];

const COINS = [
  { label: "$500", value: 500 },
  { label: "$200", value: 200 },
  { label: "$100", value: 100 },
  { label: "$50",  value: 50  },
];

interface DenominationCounterProps {
  values: Record<number, number>;
  onChange: (values: Record<number, number>) => void;
  className?: string;
}

function DenomRow({
  den,
  qty,
  onInc,
  onDec,
  onSet,
  type,
}: {
  den: { label: string; value: number };
  qty: number;
  onInc: () => void;
  onDec: () => void;
  onSet: (v: number) => void;
  type: "bill" | "coin";
}) {
  const subtotal = den.value * qty;
  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-2.5 rounded-[1rem] border-2 transition-all",
        qty > 0
          ? "bg-emerald-50 border-emerald-200 shadow-sm shadow-emerald-50"
          : "bg-white border-slate-100 hover:border-slate-200"
      )}
    >
      {/* Denomination label */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "w-20 h-8 lg:w-24 lg:h-10 rounded-lg flex items-center justify-center text-sm font-black tracking-tight flex-shrink-0",
            type === "bill"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-amber-100 text-amber-800"
          )}
        >
          {den.label}
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase">
          {type === "bill" ? "Billete" : "Moneda"}
        </span>
      </div>

      {/* Counter */}
      <div className="flex items-center gap-3">
        {/* Subtotal */}
        <span
          className={cn(
            "text-base lg:text-lg font-black w-20 lg:w-28 text-right transition-all",
            qty > 0 ? "text-emerald-700" : "text-slate-200"
          )}
        >
          {qty > 0 ? formatCurrency(subtotal) : "—"}
        </span>

        {/* Minus */}
        <button
          type="button"
          onClick={onDec}
          disabled={qty === 0}
          className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-slate-100 hover:bg-rose-100 hover:text-rose-600 text-slate-500 font-black text-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-20 disabled:pointer-events-none touch-manipulation"
        >
          <Minus className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>

        {/* Quantity — editable */}
        <input
          type="number"
          inputMode="numeric"
          min="0"
          value={qty || ""}
          onChange={(e) => onSet(parseInt(e.target.value) || 0)}
          placeholder="0"
          className="w-12 h-10 lg:w-14 lg:h-12 rounded-xl border-2 border-slate-200 text-center font-black text-xl text-slate-800 focus:border-emerald-400 focus:ring-0 outline-none transition-all bg-white"
        />

        {/* Plus */}
        <button
          type="button"
          onClick={onInc}
          className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl flex items-center justify-center transition-all active:scale-90 shadow-lg shadow-emerald-100 touch-manipulation"
        >
          <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
        </button>
      </div>
    </div>
  );
}

export function DenominationCounter({ values, onChange, className }: DenominationCounterProps) {
  const set = (val: number, qty: number) =>
    onChange({ ...values, [val]: Math.max(0, qty) });

  const total = Object.entries(values).reduce(
    (acc, [val, qty]) => acc + Number(val) * qty,
    0
  );

  return (
    <div className={cn("space-y-6", className)}>
      {/* Bills section */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
          💵 Billetes
        </p>
        <div className="space-y-2">
          {BILLS.map((den) => (
            <DenomRow
              key={den.value}
              den={den}
              qty={values[den.value] || 0}
              onInc={() => set(den.value, (values[den.value] || 0) + 1)}
              onDec={() => set(den.value, (values[den.value] || 0) - 1)}
              onSet={(v) => set(den.value, v)}
              type="bill"
            />
          ))}
        </div>
      </div>

      {/* Coins section */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
          🪙 Monedas
        </p>
        <div className="space-y-2">
          {COINS.map((den) => (
            <DenomRow
              key={den.value}
              den={den}
              qty={values[den.value] || 0}
              onInc={() => set(den.value, (values[den.value] || 0) + 1)}
              onDec={() => set(den.value, (values[den.value] || 0) - 1)}
              onSet={(v) => set(den.value, v)}
              type="coin"
            />
          ))}
        </div>
      </div>

      {/* Grand total bar */}
      <div className="p-4 lg:p-6 bg-slate-900 rounded-[1.25rem] lg:rounded-2xl flex justify-between items-center shadow-xl">
        <div>
          <p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
            Total Contado
          </p>
          <p className="text-2xl lg:text-3xl font-black text-white tracking-tighter">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="w-12 h-12 lg:w-14 lg:h-14 bg-white/10 rounded-[1rem] lg:rounded-2xl flex items-center justify-center">
          <span className="text-white font-black text-xl lg:text-2xl">Σ</span>
        </div>
      </div>
    </div>
  );
}
