import * as React from "react";

type Props = React.ImgHTMLAttributes<HTMLImageElement> & { fill?: boolean };

export default function Image({ alt = "", ...props }: Props) {
  // En Vite/React puro usamos <img />
  return <img alt={alt} {...props} />;
}
