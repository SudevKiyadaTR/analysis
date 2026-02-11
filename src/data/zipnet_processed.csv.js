import { csvFormat, csvParse } from "d3-dsv";
import { readFile } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse dd/mm/yyyy format to Date object
function parseDate(dateStr) {
  if (!dateStr || dateStr.trim() === "") return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts.map((p) => parseInt(p));
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  return new Date(year, month - 1, day);
}

// Load and parse the zipnet CSV data
const csvData = await readFile(join(__dirname, "zipnet_data.csv"), "utf-8");
const data = csvParse(csvData);

const ageGroups = [
  { label: "0-12", min: 0, max: 12 },
  { label: "13-17", min: 13, max: 17 },
  { label: "18-35", min: 18, max: 35 },
  { label: "36-50", min: 36, max: 50 },
  { label: "51-65", min: 51, max: 65 },
  { label: "66+", min: 66, max: 200 },
];

// Process the data - extract key fields
const processedData = data
  .map((d) => {
    const reportingDate = parseDate(d.ReportingDate);
    return {
      name: d.Name,
      age: d.BirthYear
        ? new Date().getFullYear() - parseInt(d.BirthYear)
        : null,
      ageGroup: (() => {
        const age = d.BirthYear
          ? new Date().getFullYear() - parseInt(d.BirthYear)
          : null;
        if (age === null) return null;
        const group = ageGroups.find((g) => age >= g.min && age <= g.max);
        return group ? group.label : null;
      })(),
      birthYear: d.BirthYear ? parseInt(d.BirthYear) : null,
      sex: d.Sex,
      district: d.District,
      policeStation: d.PoliceStation,
      policePost: d.PolicePost,
      missingFrom: d.MissingFrom,
      dateFrom: parseDate(d.DateFrom),
      reportingDate: reportingDate,
      reportingYear: reportingDate ? reportingDate.getFullYear() : null,
      reportingMonth: reportingDate ? reportingDate.getMonth() + 1 : null,
      reportingDay: reportingDate ? reportingDate.getDate() : null,
      reportingDateMonth: `${reportingDate ? reportingDate.getDate() : null}-${reportingDate ? reportingDate.getMonth() + 1 : null}`,
      tracingDate: parseDate(d.TracingDate),
      tracingStatus: d.TracingStatus,
      description: d.Description,
      createdOn: parseDate(d.CreatedOn),
      dd_date: parseDate(d.DD_Date),
    };
  })
  .sort((a, b) => {
    if (!a.reportingDate && !b.reportingDate) return 0; // both null
    if (!a.reportingDate) return -1; // a is null → push to end
    if (!b.reportingDate) return -1; // b is null → push to start

    return a.reportingDate - b.reportingDate;
  }); // Sort by reporting date

// Write out csv formatted data
process.stdout.write(csvFormat(processedData));
