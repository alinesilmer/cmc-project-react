import React from "react";
import { formatMoney } from "../money";
import type { Money } from "../types";

interface Props {
  value: Money | number | null | undefined;
  large?: boolean;
}

const ImporteDisplay: React.FC<Props> = ({ value, large }) => (
  <span style={{ fontWeight: 600, fontSize: large ? "1.4rem" : undefined, fontFamily: "Manrope, sans-serif" }}>
    {formatMoney(value)}
  </span>
);

export default ImporteDisplay;
