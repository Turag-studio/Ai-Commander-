import os from "node:os";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Real process/host metrics — no mock data here, unlike most of the dashboard. */
export async function GET() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const cpuCount = os.cpus().length || 1;
  const loadAvg = os.loadavg()[0];
  const cpuLoadPercent = Math.min(100, (loadAvg / cpuCount) * 100);
  const processMemory = process.memoryUsage();

  return NextResponse.json({
    cpu: {
      cores: cpuCount,
      loadAverage1m: Number(loadAvg.toFixed(2)),
      loadPercent: Number(cpuLoadPercent.toFixed(1)),
    },
    memory: {
      totalMB: Math.round(totalMem / 1024 / 1024),
      usedMB: Math.round(usedMem / 1024 / 1024),
      freeMB: Math.round(freeMem / 1024 / 1024),
      usedPercent: Number(((usedMem / totalMem) * 100).toFixed(1)),
      processRssMB: Math.round(processMemory.rss / 1024 / 1024),
      processHeapMB: Math.round(processMemory.heapUsed / 1024 / 1024),
    },
    uptimeSeconds: Math.round(process.uptime()),
    platform: os.platform(),
    nodeVersion: process.version,
  });
}
