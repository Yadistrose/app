import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "holterEntries";

const activities = [
  "Exercising",
  "Sitting",
  "Climbing stairs",
  "Walking",
  "Taking medications",
  "Eating",
  "Other",
];

const symptoms = [
  "None or accidental push",
  "Light-headedness",
  "Rapid or fast beats",
  "Flutter or skipped beats",
  "Shortness of breath",
  "Chest pain or pressure",
  "Dizziness",
  "Tired or fatigued",
  "Passed out",
];

const createEntryId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `entry-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const createEmptyEntry = () => ({
  id: createEntryId(),
  date: "",
  time: "",
  activity: "",
  symptoms: [],
  notes: "",
});

const normalizeEntry = value => {
  if (!value || typeof value !== "object") {
    return createEmptyEntry();
  }

  const { id, date, time, activity, symptoms: storedSymptoms, notes } = value;

  return {
    id: typeof id === "string" && id.trim() ? id : createEntryId(),
    date: typeof date === "string" ? date : "",
    time: typeof time === "string" ? time : "",
    activity: typeof activity === "string" ? activity : "",
    symptoms: Array.isArray(storedSymptoms)
      ? symptoms.filter(option => storedSymptoms.includes(option))
      : [],
    notes: typeof notes === "string" ? notes : "",
  };
};

const sanitizeForCSV = value => {
  const normalized = (value ?? "").toString().replace(/\r?\n/g, " ");
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
};

const buildSymptomId = (entryId, symptom) =>
  `${entryId}-symptom-${symptom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

export default function HolterDiary() {
  const [entries, setEntries] = useState(() => [createEmptyEntry()]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      setIsHydrated(true);
      return;
    }

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setIsHydrated(true);
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setEntries(parsed.map(normalizeEntry));
      }
    } catch (error) {
      console.error("Unable to restore holter diary entries", error);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.error("Unable to persist holter diary entries", error);
    }
  }, [entries, isHydrated]);

  const activityOptions = useMemo(() => {
    const base = new Set(activities);
    const extras = entries
      .map(entry => entry.activity)
      .filter(activity => activity && !base.has(activity));

    return extras.length > 0 ? [...activities, ...new Set(extras)] : activities;
  }, [entries]);

  const updateEntryField = (id, field, value) => {
    setEntries(previous =>
      previous.map(entry =>
        entry.id === id ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const toggleSymptom = (id, symptom) => {
    setEntries(previous =>
      previous.map(entry => {
        if (entry.id !== id) return entry;

        const exists = entry.symptoms.includes(symptom);
        const nextSymptoms = exists
          ? entry.symptoms.filter(item => item !== symptom)
          : [...entry.symptoms, symptom];
        const orderedSymptoms = symptoms.filter(option =>
          nextSymptoms.includes(option),
        );

        return { ...entry, symptoms: orderedSymptoms };
      }),
    );
  };

  const addEntry = () => {
    setEntries(previous => [...previous, createEmptyEntry()]);
  };

  const removeEntry = id => {
    setEntries(previous => previous.filter(entry => entry.id !== id));
  };

  const exportCSV = () => {
    if (entries.length === 0) {
      console.warn("There are no entries to export.");
      return;
    }

    const rows = [
      ["Date", "Time", "Activity", "Symptoms", "Notes"],
      ...entries.map(entry => [
        entry.date,
        entry.time,
        entry.activity,
        entry.symptoms.join("; "),
        entry.notes,
      ]),
    ];

    const csvContent = rows
      .map(row => row.map(sanitizeForCSV).join(","))
      .join("\r\n");

    if (typeof window === "undefined" || typeof document === "undefined") {
      console.error("CSV export is only available in the browser.");
      return;
    }

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    try {
      const link = document.createElement("a");
      link.href = url;
      link.download = "holter_diary.csv";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold text-indigo-900">Holter Diary</h1>
          <p className="text-sm text-slate-600">
            Log your activities, symptoms, and notes throughout your monitoring period.
          </p>
        </header>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addEntry}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            Add Entry
          </button>

          <button
            type="button"
            onClick={exportCSV}
            disabled={entries.length === 0}
            className="inline-flex items-center justify-center rounded-md border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Export to CSV
          </button>
        </div>

        {entries.length === 0 ? (
          <p className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-center text-slate-600">
            No entries yet. Click &quot;Add Entry&quot; to begin.
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <section
                key={entry.id}
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-700">Entry {index + 1}</h2>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                    aria-label={`Remove entry ${index + 1}`}
                  >
                    Remove
                  </button>
                </header>

                <div className="grid gap-4 p-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700" htmlFor={`date-${entry.id}`}>
                      Date
                    </label>
                    <input
                      id={`date-${entry.id}`}
                      type="date"
                      value={entry.date}
                      onChange={event => updateEntryField(entry.id, "date", event.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700" htmlFor={`time-${entry.id}`}>
                      Time
                    </label>
                    <input
                      id={`time-${entry.id}`}
                      type="time"
                      value={entry.time}
                      onChange={event => updateEntryField(entry.id, "time", event.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700" htmlFor={`activity-${entry.id}`}>
                      Activity
                    </label>
                    <select
                      id={`activity-${entry.id}`}
                      value={entry.activity}
                      onChange={event => updateEntryField(entry.id, "activity", event.target.value)}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    >
                      <option value="">-- Select an activity --</option>
                      {activityOptions.map(activity => (
                        <option key={activity} value={activity}>
                          {activity}
                        </option>
                      ))}
                    </select>
                  </div>

                  <fieldset className="space-y-2 sm:col-span-2">
                    <legend className="text-sm font-medium text-slate-700">Symptoms</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {symptoms.map(symptom => {
                        const checkboxId = buildSymptomId(entry.id, symptom);

                        return (
                          <label
                            key={checkboxId}
                            className="flex items-center gap-2 text-sm text-slate-700"
                            htmlFor={checkboxId}
                          >
                            <input
                              id={checkboxId}
                              type="checkbox"
                              checked={entry.symptoms.includes(symptom)}
                              onChange={() => toggleSymptom(entry.id, symptom)}
                              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{symptom}</span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  <div className="space-y-2 sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700" htmlFor={`notes-${entry.id}`}>
                      Notes
                    </label>
                    <textarea
                      id={`notes-${entry.id}`}
                      value={entry.notes}
                      onChange={event => updateEntryField(entry.id, "notes", event.target.value)}
                      className="h-24 w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                      placeholder="Add any extra details you'd like to remember..."
                    />
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
