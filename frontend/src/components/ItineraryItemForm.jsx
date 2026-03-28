import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_MAP_CENTER = { lat: 3.139, lng: 101.6869 };
const OSM_TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_TILE_ATTRIBUTION = "&copy; OpenStreetMap contributors";

const EMPTY_FORM = {
  date: "",
  time: "",
  location: "",
  notes: "",
  lat: null,
  lng: null,
};

const mapPinIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const searchLocationsByText = async (query, signal) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
    { headers: { Accept: "application/json" }, signal },
  );

  if (!res.ok) {
    return [];
  }

  const data = await res.json();
  const mapped = Array.isArray(data)
    ? data.map((item) => ({
        label: item.display_name,
        lat: Number(item.lat),
        lng: Number(item.lon),
      }))
    : [];

  return mapped.filter(
    (item) => !Number.isNaN(item.lat) && !Number.isNaN(item.lng),
  );
};

const reverseGeocodeLocation = async (lat, lng, signal) => {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`,
    { headers: { Accept: "application/json" }, signal },
  );

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return data?.display_name || null;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isNaN(numberValue) ? null : numberValue;
};

const openNativePicker = (input) => {
  if (!input) {
    return;
  }

  input.focus();

  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      // Fall back to click for browsers that block showPicker.
    }
  }

  input.click();
};

function LocationPicker({ position, onPick }) {
  useMapEvents({
    click(event) {
      onPick(event.latlng);
    },
  });

  return position ? <Marker position={position} icon={mapPinIcon} /> : null;
}

function RecenterMap({ center, zoom }) {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(center?.lat) || !Number.isFinite(center?.lng)) {
      return;
    }

    map.setView(center, zoom, { animate: false });

    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [center, zoom, map]);

  return null;
}

function ItineraryLocationMap({
  position,
  mapCenter,
  zoom,
  isMobileViewport,
  onPick,
}) {
  const focusPoint = position || mapCenter;

  return (
    <MapContainer
      center={focusPoint}
      zoom={zoom}
      scrollWheelZoom
      dragging={!isMobileViewport}
      className="h-full w-full"
      style={{ overscrollBehavior: "contain" }}
    >
      <TileLayer attribution={OSM_TILE_ATTRIBUTION} url={OSM_TILE_URL} />
      <RecenterMap center={focusPoint} zoom={zoom} />
      <LocationPicker position={position} onPick={onPick} />
    </MapContainer>
  );
}

const buildFormState = (initialValues, dateBounds) => ({
  date:
    initialValues?.date ??
    dateBounds?.startDate ??
    EMPTY_FORM.date,
  time: initialValues?.time ?? EMPTY_FORM.time,
  location: initialValues?.location ?? EMPTY_FORM.location,
  notes: initialValues?.notes ?? EMPTY_FORM.notes,
  lat: toNullableNumber(initialValues?.lat),
  lng: toNullableNumber(initialValues?.lng),
});

export default function ItineraryItemForm({
  title = "Add Itinerary Item",
  description = "Add a stop with its date, time, and location.",
  initialValues,
  dateBounds,
  submitLabel,
  submittingLabel,
  onSubmit,
  onSuccess = () => {},
  onCancel = null,
}) {
  const dateInputRef = useRef(null);
  const timeInputRef = useRef(null);
  const locationBoxRef = useRef(null);
  const searchCacheRef = useRef(new Map());
  const reverseCacheRef = useRef(new Map());
  const searchAbortRef = useRef(null);
  const reverseAbortRef = useRef(null);
  const latestSearchQueryRef = useRef("");
  const [form, setForm] = useState(() => buildFormState(initialValues, dateBounds));
  const [locationResults, setLocationResults] = useState([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(
    () => window.innerWidth < 900,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const nextForm = buildFormState(initialValues, dateBounds);
    const nextPosition =
      nextForm.lat !== null && nextForm.lng !== null
        ? { lat: nextForm.lat, lng: nextForm.lng }
        : DEFAULT_MAP_CENTER;

    setForm(nextForm);
    setLocationResults([]);
    setLocationError("");
    setMapCenter(nextPosition);
  }, [initialValues, dateBounds]);

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth < 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (
        locationBoxRef.current &&
        !locationBoxRef.current.contains(event.target)
      ) {
        setLocationResults([]);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    return () => {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      if (reverseAbortRef.current) {
        reverseAbortRef.current.abort();
      }
    };
  }, []);

  const fetchLocationResults = async (query) => {
    const trimmedQuery = query.trim();
    const cacheKey = trimmedQuery.toLowerCase();
    if (searchCacheRef.current.has(cacheKey)) {
      return searchCacheRef.current.get(cacheKey);
    }

    if (searchAbortRef.current) {
      searchAbortRef.current.abort();
    }
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const results = await searchLocationsByText(trimmedQuery, controller.signal);
    searchCacheRef.current.set(cacheKey, results);
    return results;
  };

  const resolveAddressFromCoordinates = async (lat, lng) => {
    const cacheKey = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (reverseCacheRef.current.has(cacheKey)) {
      return reverseCacheRef.current.get(cacheKey);
    }

    if (reverseAbortRef.current) {
      reverseAbortRef.current.abort();
    }
    const controller = new AbortController();
    reverseAbortRef.current = controller;

    const address = await reverseGeocodeLocation(lat, lng, controller.signal);
    if (address) {
      reverseCacheRef.current.set(cacheKey, address);
    }
    return address;
  };

  useEffect(() => {
    const query = form.location.trim();
    if (query.length < 3) {
      if (searchAbortRef.current) {
        searchAbortRef.current.abort();
      }
      setLocationResults([]);
      setLocationError("");
      return;
    }

    latestSearchQueryRef.current = query;

    const timer = setTimeout(async () => {
      try {
        setLocationError("");
        setIsSearchingLocation(true);
        const mapped = await fetchLocationResults(query);
        if (latestSearchQueryRef.current !== query) {
          return;
        }
        setLocationResults(mapped);
      } catch (error) {
        if (error?.name === "AbortError") {
          return;
        }
        setLocationResults([]);
        setLocationError("Location search is temporarily unavailable.");
      } finally {
        if (latestSearchQueryRef.current === query) {
          setIsSearchingLocation(false);
        }
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [form.location]);

  const runSearchFromInput = async () => {
    const query = form.location.trim();
    if (query.length < 3) {
      setLocationError("Enter at least 3 characters to search location.");
      return;
    }

    try {
      setLocationError("");
      setIsSearchingLocation(true);
      const mapped = await fetchLocationResults(query);
      setLocationResults(mapped);
      if (mapped.length === 0) {
        setLocationError("No matching location found.");
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }
      setLocationError("Location search failed. Please try again.");
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const handlePickPoint = ({ lat, lng }) => {
    setLocationError("");
    setForm((prev) => ({ ...prev, lat, lng }));
    setMapCenter({ lat, lng });

    resolveAddressFromCoordinates(lat, lng)
      .then((displayName) => {
        if (!displayName) {
          return;
        }

        setForm((prev) => {
          if (prev.lat !== lat || prev.lng !== lng) {
            return prev;
          }
          return { ...prev, location: displayName };
        });
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          return;
        }
        setLocationError("Map pin set, but address lookup failed.");
      });
  };

  const applyLocationSuggestion = (item) => {
    setForm((prev) => ({
      ...prev,
      location: item.label,
      lat: item.lat,
      lng: item.lng,
    }));
    setLocationError("");
    setLocationResults([]);
    setMapCenter({ lat: item.lat, lng: item.lng });
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported on this browser.");
      return;
    }

    setIsDetectingLocation(true);
    setLocationError("");

    navigator.geolocation.getCurrentPosition(
      async (positionValue) => {
        const lat = positionValue.coords.latitude;
        const lng = positionValue.coords.longitude;
        setForm((prev) => ({ ...prev, lat, lng }));
        setMapCenter({ lat, lng });

        try {
          const displayName = await resolveAddressFromCoordinates(lat, lng);
          if (displayName) {
            setForm((prev) => ({ ...prev, location: displayName, lat, lng }));
          }
        } catch (error) {
          if (error?.name === "AbortError") {
            return;
          }
          setLocationError("Location found, but address lookup failed.");
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        if (error.code === 1) {
          setLocationError("Location permission denied.");
          return;
        }
        if (error.code === 2) {
          setLocationError("Unable to detect your location.");
          return;
        }
        setLocationError("Location request timed out. Try again.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  const handleLocationInputChange = (value) => {
    setLocationError("");
    setForm((prev) => ({
      ...prev,
      location: value,
      lat: value.trim() ? prev.lat : null,
      lng: value.trim() ? prev.lng : null,
    }));
  };

  const position =
    form.lat !== null && form.lng !== null
      ? { lat: form.lat, lng: form.lng }
      : null;
  const mapZoom = position ? 14 : 10;

  const submit = async (event) => {
    event.preventDefault();

    if (!form.date || !form.time || !form.location.trim()) {
      alert("Please fill in the itinerary date, time, and location.");
      return;
    }

    if (
      dateBounds?.startDate &&
      dateBounds?.endDate &&
      (form.date < dateBounds.startDate || form.date > dateBounds.endDate)
    ) {
      alert("Itinerary date must stay within the event date range.");
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await onSubmit({
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        notes: form.notes,
        lat: form.lat,
        lng: form.lng,
      });
      onSuccess(data);
    } catch (error) {
      alert(error?.message || "Unable to save itinerary item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5"
    >
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-5">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>

      <div className="space-y-5 p-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Date <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <input
                ref={dateInputRef}
                required
                type="date"
                min={dateBounds?.startDate || undefined}
                max={dateBounds?.endDate || undefined}
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                value={form.date}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    date: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                aria-label="Open date picker"
                onClick={() => openNativePicker(dateInputRef.current)}
                className="absolute inset-y-1.5 right-1.5 inline-flex w-10 items-center justify-center rounded-md border-0 bg-emerald-50 text-emerald-700 transition-colors hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M8 7V3m8 4V3m-9 4h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900">
              Time <span className="text-red-500">*</span>
            </label>
            <div className="relative mt-2">
              <input
                ref={timeInputRef}
                required
                type="time"
                step="60"
                className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-900 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
                value={form.time}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    time: event.target.value,
                  }))
                }
              />
              <button
                type="button"
                aria-label="Open time picker"
                onClick={() => openNativePicker(timeInputRef.current)}
                className="absolute inset-y-1.5 right-1.5 inline-flex w-10 items-center justify-center rounded-md border-0 bg-sky-50 text-sky-700 transition-colors hover:bg-sky-100 focus:outline-none focus:ring-2 focus:ring-sky-500/30"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="relative" ref={locationBoxRef}>
          <label className="block text-sm font-semibold text-slate-900">
            Location <span className="text-red-500">*</span>
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              required
              className="block w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
              placeholder="Search location or type manually"
              value={form.location}
              onChange={(event) =>
                handleLocationInputChange(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  runSearchFromInput();
                }
              }}
            />
            <button
              type="button"
              onClick={runSearchFromInput}
              disabled={isSearchingLocation}
              className="rounded-lg border border-slate-300 bg-white px-3 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 sm:py-0"
            >
              {isSearchingLocation ? "..." : "Search"}
            </button>
          </div>

          {locationResults.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
              {locationResults.map((item) => (
                <li key={`${item.lat}-${item.lng}-${item.label}`}>
                  <button
                    type="button"
                    className="w-full rounded-md border-0 bg-white px-3 py-2 text-left text-xs text-slate-700 shadow-none transition-colors hover:bg-slate-100 focus:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    onClick={() => applyLocationSuggestion(item)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {isSearchingLocation ? (
            <p className="mt-1 text-xs text-slate-500">Searching places...</p>
          ) : null}
          {locationError ? (
            <p className="mt-1 text-xs text-red-600">{locationError}</p>
          ) : null}
        </div>

        <div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="block text-sm font-semibold text-slate-900">
              Pick Location on Map
            </label>
            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={isDetectingLocation}
              className="w-full rounded-lg bg-slate-900 px-3 py-2.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:py-1.5"
            >
              {isDetectingLocation ? "Detecting..." : "Use Current Location"}
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Click the map to pin exact coordinates for this stop.
          </p>
          <div className="mt-2 h-56 overflow-hidden rounded-lg border border-slate-300">
            <ItineraryLocationMap
              position={position}
              mapCenter={mapCenter}
              zoom={mapZoom}
              isMobileViewport={isMobileViewport}
              onPick={handlePickPoint}
            />
          </div>
          <p className="mt-2 text-xs text-slate-600">
            Coordinates:{" "}
            {position
              ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
              : "Not selected"}
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Notes
          </label>
          <textarea
            className="mt-2 block min-h-[110px] w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10"
            placeholder="Optional notes about this stop"
            value={form.notes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, notes: event.target.value }))
            }
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex flex-1 items-center justify-center rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? submittingLabel : submitLabel}
          </button>
          {typeof onCancel === "function" ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
