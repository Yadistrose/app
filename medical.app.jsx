import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const activities = [
  "Exercising",
  "Sitting",
  "Climbing stairs",
  "Walking",
  "Taking medications",
  "Eating",
  "Other"
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
  "Passed out"
];

export default function HolterDiary() {
  const [entries, setEntries] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem("holterEntries");
    if (stored) setEntries(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("holterEntries", JSON.stringify(entries));
  }, [entries]);

  const updateEntry = (index, field, value) => {
    const updated = [...entries];
    updated[index][field] = value;
    setEntries(updated);
  };

  const toggleSymptom = (index, symptom) => {
    const updated = [...entries];
    const entry = updated[index];
    if (entry.symptoms.includes(symptom)) {
      entry.symptoms = entry.symptoms.filter(s => s !== symptom);
    } else {
      entry.symptoms.push(symptom);
    }
    setEntries(updated);
  };

  const addEntry = () => {
    setEntries([
      ...entries,
      { date: "", time: "", activity: "", symptoms: [], notes: "" }
    ]);
  };

  const exportCSV = () => {
    const rows = [
      ["Date", "Time", "Activity", "Symptoms", "Notes"],
      ...entries.map(e => [
        e.date,
        e.time,
        e.activity,
        e.symptoms.join("; "),
        e.notes.replace(/\n/g, " ")
      ])
    ];
    const csvContent = rows.map(r => r.map(field => `"${field}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "holter_diary.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-semibold text-center text-blue-900">Holter Diary</h1>

      <div className="flex justify-between items-center">
        <Button onClick={addEntry}>Add Entry</Button>
        <Button variant="outline" onClick={exportCSV}>Export to CSV</Button>
      </div>

      {entries.length === 0 && <p className="text-gray-600">No entries yet. Click "Add Entry" to begin.</p>}

      {entries.map((entry, index) => (
        <Card key={index} className="bg-white shadow-sm border">
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input
                  type="date"
                  value={entry.date}
                  onChange={e => updateEntry(index, "date", e.target.value)}
                />
              </div>
              <div>
                <Label>Time</Label>
                <Input
                  type="time"
                  value={entry.time}
                  onChange={e => updateEntry(index, "time", e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label>Activity</Label>
                <select
                  className="w-full border rounded p-2"
                  value={entry.activity}
                  onChange={e => updateEntry(index, "activity", e.target.value)}
                >
                  <option value="">-- Select an activity --</option>
                  {activities.map((act, i) => (
                    <option key={i} value={act}>{act}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Symptoms</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {symptoms.map((symptom, i) => (
                    <div key={i} className="flex items-center space-x-2">
                      <Checkbox
                        checked={entry.symptoms.includes(symptom)}
                        onCheckedChange={() => toggleSymptom(index, symptom)}
                      />
                      <Label>{symptom}</Label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={entry.notes}
                  onChange={e => updateEntry(index, "notes", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
