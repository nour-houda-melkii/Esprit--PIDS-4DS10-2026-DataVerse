import { LivePairData } from "../../lib/types";
import { RefreshCw, WifiOff, Wifi } from "lucide-react";

export function LiveBadge({ pairData, onRefetch }: { pairData: LivePairData; onRefetch: () => void }) {
  if (pairData.loading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/25 bg-blue-500/10 px-2.5 py-1 text-[9px] font-bold text-blue-400">
        <RefreshCw className="h-2.5 w-2.5 animate-spin" />
        FETCHING
      </span>
    );
  }
  if (pairData.error) {
    return (
      <button
        onClick={onRefetch}
        title={`Error: ${pairData.error}. Click to retry.`}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-[9px] font-bold text-rose-400 hover:bg-rose-500/20 transition-colors"
      >
        <WifiOff className="h-2.5 w-2.5" />
        RETRY
      </button>
    );
  }
  if (pairData.lastUpdated) {
    const mins = Math.floor((Date.now() - pairData.lastUpdated.getTime()) / 60000);
    return (
      <button
        onClick={onRefetch}
        title="Refresh live data"
        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 text-[9px] font-bold text-emerald-400 hover:bg-emerald-500/10 transition-colors"
      >
        <Wifi className="h-2.5 w-2.5" />
        LIVE {mins > 0 ? `· ${mins}m ago` : "· just now"}
        {pairData.articles > 0 && ` · ${pairData.articles} art.`}
      </button>
    );
  }
  return null;
}