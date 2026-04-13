"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export function GlobalScanner() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter" && barcodeBuffer.length > 3) {
        const barcode = barcodeBuffer;
        
        // Disparo para el POS si ya estamos ahí, sino redirige
        if (pathname === '/pos') {
            const event = new CustomEvent('global-barcode-scanned', { detail: { barcode } });
            window.dispatchEvent(event);
        } else {
            router.push(`/pos?add=${barcode}`);
        }
        
        barcodeBuffer = "";
      } else if (e.key.length === 1) {
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router, pathname]);

  return null;
}
