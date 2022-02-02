import type { ComputedDatum } from "@nivo/circle-packing";
import React from "react";

import type { DefaultViewerObject } from "../../utils/pst-extractor";
import style from "./CirclePacking.module.scss";

export const CirclePackingTooltip: React.FC<{
    node: ComputedDatum<DefaultViewerObject<string>>;
}> = ({ node }) => {
    return (
        <div className={style.circlePackingTooltip}>
            <strong>{node.data.name}</strong>: {node.percentage.toFixed(2)}%
        </div>
    );
};