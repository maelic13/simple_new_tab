import { useState } from "react";

import { useAssetData } from "../hooks/useAssetData";
import { fallbackLetter, getIconSource } from "../lib/icons";
import type { Shortcut } from "../types";

type IconImageProps = {
  shortcut: Shortcut;
};

export function IconImage({ shortcut }: IconImageProps) {
  const [failed, setFailed] = useState(false);
  const localAsset = useAssetData(shortcut.icon.kind === "localImageRef" ? shortcut.icon.ref : undefined);
  const src = shortcut.icon.kind === "localImageRef" ? localAsset : getIconSource(shortcut.icon, shortcut.url);

  if (!src || failed) {
    return <span className="shortcut-letter">{fallbackLetter(shortcut.name)}</span>;
  }

  return <img className="shortcut-icon" src={src} alt="" draggable={false} onError={() => setFailed(true)} />;
}
