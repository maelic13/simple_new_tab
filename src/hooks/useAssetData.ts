import { useEffect, useState } from "react";

import { loadAsset } from "../lib/assets";

export function useAssetData(ref: string | undefined): string | undefined {
  const [data, setData] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;

    if (!ref) {
      setData(undefined);
      return;
    }

    loadAsset(ref)
      .then((asset) => {
        if (!cancelled) {
          setData(asset?.data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData(undefined);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [ref]);

  return data;
}
