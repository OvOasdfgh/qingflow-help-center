import React, {type ComponentProps, type ReactNode} from 'react';
import OriginalMDXImg from '@theme-original/MDXComponents/Img';

type Props = ComponentProps<'img'>;

const noReferrerHosts = new Set(['cdn.nlark.com', 'www.yuque.com']);

function requiresNoReferrer(src: string | undefined): boolean {
  if (!src) {
    return false;
  }

  try {
    return noReferrerHosts.has(new URL(src).hostname);
  } catch {
    return false;
  }
}

export default function MDXImg(props: Props): ReactNode {
  return (
    <OriginalMDXImg
      {...props}
      referrerPolicy={
        requiresNoReferrer(props.src) ? 'no-referrer' : props.referrerPolicy
      }
    />
  );
}
