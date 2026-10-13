import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/utils";

export function useRpc<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let live = true;
    setLoading(true);
    setErr(null);
    fn()
      .then((v) => {
        if (live) setData(v);
      })
      .catch((e) => {
        if (live) setErr(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, deps);

  useEffect(() => {
    const cancel = reload();
    return cancel;
  }, [reload]);

  return { data, err, loading, reload, setData };
}
