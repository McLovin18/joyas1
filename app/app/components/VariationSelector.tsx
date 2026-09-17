"use client";

import React, { useEffect, useRef, useState } from "react";

interface VariationSelectorProps {
  label: string;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export default function VariationSelector({
  label,
  options,
  selectedValue,
  onSelect,
  disabled = false,
}: VariationSelectorProps) {

  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClick);

    return () => window.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="flex flex-col gap-2.5 relative" ref={containerRef}>

    <label className="flex items-center justify-between text-xs font-semibold">

        <span className="text-white">
            {label}
        </span>

        <span className="text-white/35">
            {options.length} opciones
        </span>

    </label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(!open)}
        className={`
        w-full
        rounded-2xl
        px-5
        py-4
        flex
        items-center
        justify-between
        transition-all
        duration-200

        border

        ${
          open
            ? "border-red-600"
            : "border-white/10 hover:border-white/20"
        }

        bg-[#111111]

        hover:bg-[#171717]

        shadow-[0_10px_25px_rgba(0,0,0,.35)]

        ${disabled && "opacity-50 cursor-not-allowed"}
        `}
      >

        <span
          className={
            selectedValue
              ? "text-white font-medium"
              : "text-white/35"
          }
        >
          {selectedValue || `Selecciona ${label.toLowerCase()}`}
        </span>

        <span
          className={`material-icons-round transition-all duration-200 ${
            open ? "rotate-180 text-red-500" : "text-white/50"
          }`}
        >
          expand_more
        </span>

      </button>

      <div
        className={`
        absolute
        top-full
        left-0
        right-0
        mt-2

        overflow-hidden

        rounded-2xl

        border
        border-white/10

        bg-[#111111]

        backdrop-blur-xl

        shadow-[0_20px_45px_rgba(0,0,0,.55)]

        transition-all
        duration-200
        origin-top

        ${
          open
            ? "opacity-100 scale-100 visible"
            : "opacity-0 scale-95 invisible"
        }
        `}
      >

        {options.map((option) => {

          const selected = option === selectedValue;

          return (

            <button
              key={option}
              type="button"
              onClick={() => {

                if (selected) {
                  onSelect("");
                } else {
                  onSelect(option);
                }

                setOpen(false);

              }}
              className={`
              w-full

              px-5
              py-3.5

              flex
              items-center
              justify-between

              transition-all

              ${
                selected
                  ? "bg-red-600 text-white"
                  : "text-white/80 hover:bg-white/5"
              }
              `}
            >

              <span>{option}</span>

              {selected && (
                <span className="material-icons-round text-lg">
                  check
                </span>
              )}

            </button>

          );

        })}

      </div>

    </div>
  );
}