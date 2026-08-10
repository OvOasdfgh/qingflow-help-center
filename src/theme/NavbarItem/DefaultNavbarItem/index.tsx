import React, {type ReactNode} from 'react';
import {Globe2} from 'lucide-react';
import DefaultNavbarItemMobile from '@theme/NavbarItem/DefaultNavbarItem/Mobile';
import DefaultNavbarItemDesktop from '@theme/NavbarItem/DefaultNavbarItem/Desktop';
import type {Props} from '@theme/NavbarItem/DefaultNavbarItem';

const websiteActionClass = 'navbar__external-action--website';

export default function DefaultNavbarItem({
  mobile = false,
  position,
  className,
  label,
  ...props
}: Props): ReactNode {
  const Comp = mobile ? DefaultNavbarItemMobile : DefaultNavbarItemDesktop;
  const isWebsiteAction = className?.split(' ').includes(websiteActionClass);

  return (
    <Comp
      {...props}
      className={className}
      label={
        isWebsiteAction ? (
          <>
            <Globe2
              aria-hidden="true"
              className="navbar__external-action-icon"
              size={16}
              strokeWidth={2}
            />
            <span>{label}</span>
          </>
        ) : (
          label
        )
      }
      activeClassName={
        props.activeClassName ??
        (mobile ? 'menu__link--active' : 'navbar__link--active')
      }
    />
  );
}
