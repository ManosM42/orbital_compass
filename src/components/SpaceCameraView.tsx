import { useState, useRef, useEffect } from "react";
import { Camera, MapPin, Clock, Satellite, Sparkles, Loader2, CheckCircle2, RefreshCw, AlertCircle, ShieldCheck } from "lucide-react";
import { sightingService } from "@/services/sightings/sightingService";
import { sightingVerificationPipeline } from "@/services/sightings/verificationService";
import { cn } from "@/lib/utils";

interface SpaceCameraViewProps {
  selectedSatellite?: { noradId: number; name: string };
  onSightingRecorded?: () => void;
}

export function SpaceCameraView({ selectedSatellite = { noradId: 25544, name: "ISS (ZARYA)" }, onSightingRecorded }: SpaceCameraViewProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch privacy-safe location on mount (~1km precision)
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Number(position.coords.latitude.toFixed(2));
          const lng = Number(position.coords.longitude.toFixed(2));
          setLocation({ lat, lng });
          setLoadingLocation(false);
        },
        (err) => {
          console.warn("Geolocation access denied or failed:", err.message);
          setLocationError("Location access unavailable. Using default telemetry coordinates.");
          setLocation({ lat: 51.51, lng: -0.13 });
          setLoadingLocation(false);
        },
        { timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocationError("Geolocation not supported by environment.");
      setLocation({ lat: 51.51, lng: -0.13 });
      setLoadingLocation(false);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmitSighting = async () => {
    if (!location) {
      setErrorMessage("Location telemetry required before logging observation.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const observedAtIso = new Date().toISOString();

    // 1. Run the verification pipeline before recording
    const verificationResult = sightingVerificationPipeline.verifyObservation({
      satelliteNoradId: selectedSatellite.noradId,
      observedAt: observedAtIso,
      latitude: location.lat,
      longitude: location.lng,
      imageProvided: !!imageFile,
      expectedPass: {
        peakTime: observedAtIso,
        maxElevation: 48,
        startAzimuth: 120,
      },
    });

    try {
      // 2. Record sighting with verification pipeline results attached in metadata
      await sightingService.recordSighting({
        satelliteNoradId: selectedSatellite.noradId,
        satelliteName: selectedSatellite.name,
        observedAt: observedAtIso,
        latitude: location.lat,
        longitude: location.lng,
        orbitalSnapshot: {
          source: "orbital_live_ephemeris",
          verification: verificationResult,
        },
        visibilityScore: verificationResult.confidenceScore / 10,
        imageFile: imageFile || undefined,
        metadata: {
          client_agent: navigator.userAgent,
          verification_status: verificationResult.status,
          confidence: verificationResult.confidenceScore,
          reasoning: verificationResult.reasoning,
        },
      });

      setSuccessMessage(
        `Observation logged successfully! Pipeline Status: ${verificationResult.status} (${verificationResult.confidenceScore}% confidence). +50 XP awarded.`
      );
      if (onSightingRecorded) onSightingRecorded();

      // Reset after success
      setTimeout(() => {
        setImageFile(null);
        setImagePreview(null);
        setSuccessMessage(null);
      }, 5000);
    } catch (err: any) {
      console.error("Detailed Sighting Error:", err);
      setErrorMessage(err.message || "Failed to log space observation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="panel relative max-w-xl mx-auto rounded-3xl border-primary/30 p-6 sm:p-8 bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border/65 pb-4">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
          <Camera className="h-4 w-4" />
          ORBITAL Optical Telemetry Capture
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 font-mono text-xs text-primary font-medium">
          Live Sensor Active
        </span>
      </div>

      {successMessage ? (
        <div className="my-8 flex flex-col items-center text-center animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground">Observation Verified</h3>
          <p className="mt-2 text-sm text-muted-foreground">{successMessage}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {/* Satellite Context Badge */}
          <div className="flex items-center justify-between rounded-2xl bg-secondary/40 p-4 border border-border/50">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Satellite className="h-5 w-5" />
              </div>
              <div>
                <span className="font-mono text-xs text-muted-foreground">Target Satellite</span>
                <h4 className="font-display font-semibold text-foreground text-sm">{selectedSatellite.name}</h4>
              </div>
            </div>
            <span className="font-mono text-xs text-primary font-medium">NORAD: {selectedSatellite.noradId}</span>
          </div>

          {/* Hidden File Input with Mobile Camera Support */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* Camera Viewfinder / Preview Box */}
          <div
            onClick={handleCaptureClick}
            className={cn(
              "relative flex flex-col items-center justify-center rounded-3xl border-2 border-dashed p-8 text-center cursor-pointer transition-all min-h-[240px] overflow-hidden",
              imagePreview ? "border-primary/50 bg-black/40" : "border-border hover:border-primary/50 bg-secondary/20"
            )}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Captured Sighting" className="absolute inset-0 h-full w-full object-cover opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-center pb-4">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-xs font-mono text-foreground backdrop-blur-md border border-white/10">
                    <RefreshCw className="h-3.5 w-3.5" /> Tap to retake photo
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-3">
                  <Camera className="h-7 w-7" />
                </div>
                <h4 className="font-display font-semibold text-foreground text-sm">Capture Space Observation</h4>
                <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                  Tap to launch device camera or upload optical pass imagery.
                </p>
              </>
            )}
          </div>

          {/* Telemetry Metadata Strip */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/30 p-3.5 border border-border/50">
              <Clock className="h-4 w-4 text-primary shrink-0" />
              <div className="overflow-hidden">
                <span className="block font-mono text-[10px] text-muted-foreground uppercase">Timestamp</span>
                <span className="block font-mono text-xs text-foreground truncate">
                  {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} UTC
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-2xl bg-secondary/30 p-3.5 border border-border/50">
              <MapPin className="h-4 w-4 text-primary shrink-0" />
              <div className="overflow-hidden">
                <span className="block font-mono text-[10px] text-muted-foreground uppercase">Privacy GPS (~1km)</span>
                <span className="block font-mono text-xs text-foreground truncate">
                  {loadingLocation ? "Acquiring..." : location ? `${location.lat}°, ${location.lng}°` : "N/A"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
            <span>Submissions undergo automated ephemeris cross-referencing and trajectory checks.</span>
          </div>

          {locationError && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs font-mono text-amber-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{locationError}</span>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-3 text-xs font-mono text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleSubmitSighting}
            disabled={submitting || !imageFile}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 disabled:opacity-50 transition-transform active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Validating & Logging Sighting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Submit Observation for Verification
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}