"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Toast } from "@/app/components/Modal";

type ScannedItem = {
  name: string;
  category: string;
  location: string;
  quantityText: string;
  keep: boolean;
};

type Step = "intro" | "fridge" | "pantry" | "freezer" | "done";

const CAPTURE_STEPS: { id: Step; label: string; icon: string; hint: string; example: string }[] = [
  {
    id: "fridge",
    label: "Fridge",
    icon: "🧊",
    hint: "Open your fridge and photograph each shelf.",
    example: "dairy, produce, leftovers, condiments",
  },
  {
    id: "pantry",
    label: "Pantry & Cabinets",
    icon: "🗄️",
    hint: "Snap your pantry shelves, cabinets, and countertop staples.",
    example: "canned goods, dry goods, oils, spices",
  },
  {
    id: "freezer",
    label: "Freezer",
    icon: "❄️",
    hint: "Open your freezer and photograph what's inside.",
    example: "frozen meat, vegetables, prepared meals",
  },
];

const CATEGORIES = ["PANTRY","SPICE","SEAFOOD","PRODUCE","MEAT","DAIRY","CONDIMENT","BAKING","BEVERAGE","PREPARED","OTHER"];
const LOCATIONS = ["PANTRY","FRIDGE","FREEZER","COUNTER","OTHER"];

async function isHeic(file: File): Promise<boolean> {
  try {
    const buf = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buf);
    const ftyp = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
    const brand = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return ftyp === "ftyp" && /^(heic|heix|mif1|msf1|hevc|hevx)/.test(brand);
  } catch {
    return false;
  }
}

async function resizeImage(file: File, maxPx = 1600): Promise<Blob> {
  if (await isHeic(file)) throw new Error(`"${file.name}" is a HEIC file`);
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error(`Failed to compress "${file.name}"`))),
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`"${file.name}" could not be read`));
    };
    img.src = url;
  });
}

export default function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intro");
  const [totalAdded, setTotalAdded] = useState(0);

  // Per-step capture state
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const stepIndex = CAPTURE_STEPS.findIndex(s => s.id === step);
  const currentStepConfig = CAPTURE_STEPS[stepIndex];

  function resetCapture() {
    previews.forEach(p => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setScannedItems([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  function goToStep(s: Step) {
    resetCapture();
    setStep(s);
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const newFiles = Array.from(fileList).slice(0, 5 - files.length);
    if (!newFiles.length) return;
    setFiles(prev => [...prev, ...newFiles].slice(0, 5));
    setPreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))].slice(0, 5));
    setScannedItems([]);
  }

  function removePhoto(i: number) {
    URL.revokeObjectURL(previews[i]);
    setFiles(prev => prev.filter((_, j) => j !== i));
    setPreviews(prev => prev.filter((_, j) => j !== i));
    setScannedItems([]);
  }

  async function runScan() {
    if (!files.length) return;
    setScanning(true);
    setScannedItems([]);
    try {
      const fd = new FormData();
      const VALID = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const MAX = 5 * 1024 * 1024;
      const skipped: string[] = [];
      for (const file of files) {
        try {
          const resized = await resizeImage(file);
          fd.append("images", resized, file.name.replace(/\.[^.]+$/, ".jpg"));
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "";
          const heic = msg.includes("HEIC") || await isHeic(file);
          if (!heic && VALID.includes(file.type) && file.size <= MAX) {
            fd.append("images", file, file.name);
          } else {
            skipped.push(file.name);
          }
        }
      }
      if (fd.getAll("images").length === 0) {
        setToast({ message: "Could not process photo(s). On iPhone try Settings → Camera → Formats → Most Compatible.", type: "error" });
        return;
      }
      if (skipped.length > 0) {
        setToast({ message: `Skipped ${skipped.length} unreadable file(s)`, type: "info" });
      }
      const res = await fetch("/api/inventory/capture", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setToast({ message: data.error ?? "Scan failed", type: "error" });
        return;
      }
      const items: ScannedItem[] = (data.items ?? []).map((it: { name?: string; category?: string; location?: string; quantityText?: string }) => ({
        name: it.name ?? "",
        category: CATEGORIES.includes(it.category ?? "") ? it.category! : "OTHER",
        location: LOCATIONS.includes(it.location ?? "") ? it.location! : "PANTRY",
        quantityText: it.quantityText ?? "1",
        keep: true,
      }));
      setScannedItems(items);
      if (items.length === 0) setToast({ message: "No items detected — try a clearer photo", type: "info" });
    } catch {
      setToast({ message: "Network error during scan", type: "error" });
    } finally {
      setScanning(false);
    }
  }

  function updateItem(idx: number, patch: Partial<ScannedItem>) {
    setScannedItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  }

  async function saveAndContinue() {
    const toAdd = scannedItems.filter(it => it.keep && it.name.trim());
    if (toAdd.length > 0) {
      setSaving(true);
      let added = 0;
      try {
        for (const it of toAdd) {
          const res = await fetch("/api/inventory/items", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              item: { name: it.name.trim(), category: it.category, location: it.location },
              batch: { quantityText: it.quantityText },
            }),
          });
          if (res.ok) added++;
        }
        setTotalAdded(prev => prev + added);
      } catch {
        setToast({ message: "Failed to save some items", type: "error" });
      } finally {
        setSaving(false);
      }
    }
    advanceStep();
  }

  function advanceStep() {
    const nextIndex = stepIndex + 1;
    if (nextIndex >= CAPTURE_STEPS.length) {
      goToStep("done");
    } else {
      goToStep(CAPTURE_STEPS[nextIndex].id);
    }
  }

  const keepCount = scannedItems.filter(it => it.keep).length;

  // ── Intro ──────────────────────────────────────────────────────
  if (step === "intro") {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 0 48px" }}>
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🍳</div>
          <h1 style={{ margin: "0 0 10px", fontSize: 24, fontWeight: 700 }}>
            Let&apos;s stock your kitchen
          </h1>
          <p style={{ margin: "0 0 28px", opacity: 0.7, lineHeight: 1.6, fontSize: 15 }}>
            Take 3 photos — fridge, pantry, and freezer — and AI will identify
            what you have. Takes about 2 minutes.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28, textAlign: "left" }}>
            {CAPTURE_STEPS.map((s, i) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  background: "rgba(74,144,217,0.07)",
                  border: "1px solid rgba(74,144,217,0.15)",
                  borderRadius: 8,
                  padding: "12px 16px",
                }}
              >
                <span style={{ fontSize: 26 }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Step {i + 1}: {s.label}</div>
                  <div style={{ fontSize: 12, opacity: 0.55 }}>{s.example}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("fridge")}
            style={{
              width: "100%",
              padding: "14px",
              fontSize: 16,
              fontWeight: 600,
              background: "rgba(74,144,217,0.15)",
              border: "1px solid rgba(74,144,217,0.4)",
              borderRadius: 8,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            Start →
          </button>
          <button
            onClick={() => router.push("/welcome")}
            style={{
              width: "100%",
              padding: "12px",
              fontSize: 14,
              background: "none",
              border: "1px solid rgba(128,128,128,0.2)",
              borderRadius: 8,
              cursor: "pointer",
              opacity: 0.5,
            }}
          >
            Skip — I&apos;ll add items manually
          </button>
        </div>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "24px 0 48px" }}>
        <div className="card" style={{ textAlign: "center", padding: 32 }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🎉</div>
          <h1 style={{ margin: "0 0 10px", fontSize: 22, fontWeight: 700 }}>
            Kitchen stocked!
          </h1>
          <p style={{ margin: "0 0 28px", opacity: 0.7, fontSize: 15 }}>
            {totalAdded > 0
              ? `Added ${totalAdded} item${totalAdded !== 1 ? "s" : ""} to your inventory.`
              : "No items were added — you can add them from the Inventory page anytime."}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => router.push("/suggest")}
              style={{
                padding: "14px",
                fontSize: 15,
                fontWeight: 600,
                background: "rgba(74,144,217,0.15)",
                border: "1px solid rgba(74,144,217,0.4)",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ✨ What can I make tonight?
            </button>
            <button
              onClick={() => router.push("/inventory")}
              style={{
                padding: "13px",
                fontSize: 15,
                background: "none",
                border: "1px solid rgba(128,128,128,0.2)",
                borderRadius: 8,
                cursor: "pointer",
                opacity: 0.65,
              }}
            >
              📦 View my inventory
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Capture step ───────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 580, margin: "0 auto", padding: "16px 0 48px" }}>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Progress bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {CAPTURE_STEPS.map((s, i) => (
          <div
            key={s.id}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= stepIndex ? "rgba(74,144,217,0.8)" : "rgba(128,128,128,0.2)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>

      {/* Step header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>
          Step {stepIndex + 1} of {CAPTURE_STEPS.length}
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>
          {currentStepConfig.icon} {currentStepConfig.label}
        </h2>
        <p style={{ margin: 0, opacity: 0.65, fontSize: 14 }}>{currentStepConfig.hint}</p>
      </div>

      {/* Photo inputs */}
      <div className="card" style={{ marginBottom: 14 }}>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: "none" }}
          onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={e => handleFiles(e.target.files)}
        />

        <div style={{ display: "flex", gap: 10, marginBottom: previews.length ? 14 : 0 }}>
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={files.length >= 5}
            style={{
              flex: 1,
              padding: "15px 8px",
              fontSize: 15,
              fontWeight: 500,
              background: "rgba(74,144,217,0.12)",
              border: "1px solid rgba(74,144,217,0.3)",
              borderRadius: 8,
              cursor: "pointer",
            }}
          >
            📷 Camera
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={files.length >= 5}
            style={{
              flex: 1,
              padding: "15px 8px",
              fontSize: 15,
              fontWeight: 500,
              background: "none",
              border: "1px solid rgba(128,128,128,0.25)",
              borderRadius: 8,
              cursor: "pointer",
              opacity: 0.7,
            }}
          >
            🖼️ Choose file
          </button>
        </div>

        {/* Thumbnails */}
        {previews.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {previews.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt={`Photo ${i + 1}`}
                  style={{
                    width: 72,
                    height: 72,
                    objectFit: "cover",
                    borderRadius: 6,
                    border: "1px solid rgba(128,128,128,0.2)",
                  }}
                />
                <button
                  onClick={() => removePhoto(i)}
                  aria-label="Remove photo"
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "rgba(200,50,50,0.9)",
                    border: "none",
                    color: "#fff",
                    fontSize: 12,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0,
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Analyze button */}
      {files.length > 0 && scannedItems.length === 0 && (
        <button
          onClick={runScan}
          disabled={scanning}
          style={{
            width: "100%",
            padding: "14px",
            fontSize: 15,
            fontWeight: 600,
            background: "rgba(74,144,217,0.18)",
            border: "1px solid rgba(74,144,217,0.4)",
            borderRadius: 8,
            cursor: scanning ? "wait" : "pointer",
            marginBottom: 14,
          }}
        >
          {scanning
            ? "Analyzing… (may take 15–30s)"
            : `🔍 Analyze ${files.length} photo${files.length !== 1 ? "s" : ""}`}
        </button>
      )}

      {/* Results */}
      {scannedItems.length > 0 && (
        <div className="card" style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, opacity: 0.6, marginBottom: 12 }}>
            {keepCount} item{keepCount !== 1 ? "s" : ""} detected — uncheck any that are wrong
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {scannedItems.map((it, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  opacity: it.keep ? 1 : 0.35,
                  transition: "opacity 0.15s",
                }}
              >
                <input
                  type="checkbox"
                  checked={it.keep}
                  onChange={e => updateItem(i, { keep: e.target.checked })}
                  style={{ marginTop: 4, width: 18, height: 18, cursor: "pointer", flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text"
                    value={it.name}
                    onChange={e => updateItem(i, { name: e.target.value })}
                    style={{ width: "100%", fontSize: 14, fontWeight: 500, marginBottom: 5 }}
                  />
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <select
                      value={it.category}
                      onChange={e => updateItem(i, { category: e.target.value })}
                      style={{ fontSize: 12, padding: "2px 4px" }}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select
                      value={it.location}
                      onChange={e => updateItem(i, { location: e.target.value })}
                      style={{ fontSize: 12, padding: "2px 4px" }}
                    >
                      {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <input
                      type="text"
                      value={it.quantityText}
                      onChange={e => updateItem(i, { quantityText: e.target.value })}
                      style={{ fontSize: 12, width: 76, padding: "2px 4px" }}
                      placeholder="qty"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {scannedItems.length > 0 && (
          <button
            onClick={saveAndContinue}
            disabled={saving}
            style={{
              padding: "14px",
              fontSize: 15,
              fontWeight: 600,
              background: "rgba(74,144,217,0.18)",
              border: "1px solid rgba(74,144,217,0.4)",
              borderRadius: 8,
              cursor: saving ? "wait" : "pointer",
            }}
          >
            {saving
              ? "Saving…"
              : stepIndex < CAPTURE_STEPS.length - 1
              ? `Add ${keepCount} item${keepCount !== 1 ? "s" : ""} → Next: ${CAPTURE_STEPS[stepIndex + 1].label}`
              : `Add ${keepCount} item${keepCount !== 1 ? "s" : ""} → Finish`}
          </button>
        )}
        <button
          onClick={advanceStep}
          style={{
            padding: "12px",
            fontSize: 14,
            background: "none",
            border: "1px solid rgba(128,128,128,0.2)",
            borderRadius: 8,
            cursor: "pointer",
            opacity: 0.55,
          }}
        >
          {scannedItems.length > 0
            ? "Skip — don't add these"
            : stepIndex < CAPTURE_STEPS.length - 1
            ? `Skip ${currentStepConfig.label} →`
            : "Skip →"}
        </button>
      </div>
    </div>
  );
}
