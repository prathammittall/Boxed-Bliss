"use client";

import Link from "next/link";
import React from "react";

type LoadingLinkProps = React.ComponentProps<typeof Link> & {
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

export default function LoadingLink({
  onClick,
  ...props
}: LoadingLinkProps) {
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e);
      }}
    />
  );
}

