"use client";

import { useRef, type MouseEvent } from "react";

/**
 * Devuelve handlers para cerrar un modal al hacer click en el fondo, pero solo
 * cuando el click empieza y termina en el fondo. Asi, seleccionar texto dentro
 * de la ventana y soltar el mouse afuera (o al reves) no lo cierra.
 */
export function useBackdropClose(onClose: () => void) {
  const downTarget = useRef<EventTarget | null>(null);

  return {
    onMouseDown: (e: MouseEvent) => {
      downTarget.current = e.target;
    },
    onClick: (e: MouseEvent) => {
      const startedOn = downTarget.current;
      downTarget.current = null;
      if (startedOn !== null && startedOn === e.target) {
        onClose();
      }
    },
  };
}
