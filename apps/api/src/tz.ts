// All servers run in UTC: the DB uses timestamp WITHOUT time zone, so every process must agree on one zone.
// Must be the first import of the entry point.
process.env.TZ = process.env.TZ || "UTC";
export {};
