import { Easing } from "remotion";
import { interpolate } from "remotion";
import React from "react";
import { Caption } from "@remotion/captions";
import { msToFrame } from "./helpers/ms-to-frame";

export const Word: React.FC<{
  readonly item: Caption;
  readonly frame: number;
  readonly transcriptionColor: string;
}> = ({ item, frame, transcriptionColor }) => {
  const opacity = interpolate(
    frame,
    [msToFrame(item.startMs), msToFrame(item.startMs) + 15],
    [0, 1],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  const translateY = interpolate(
    frame,
    [msToFrame(item.startMs), msToFrame(item.startMs) + 10],
    [0.25, 0],
    {
      easing: Easing.out(Easing.quad),
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    },
  );

  return (
    <span
      style={{
        display: "inline-block",
        opacity,
        translate: `0 ${translateY}em`,
        color: transcriptionColor,
      }}
    >
      {item.text}
    </span>
  );
};
