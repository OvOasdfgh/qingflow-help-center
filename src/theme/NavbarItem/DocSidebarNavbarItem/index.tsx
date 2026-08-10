import React, {type ReactNode} from 'react';
import {
  useActiveDocContext,
  useLayoutDocsSidebar,
} from '@docusaurus/plugin-content-docs/client';
import DefaultNavbarItem from '@theme/NavbarItem/DefaultNavbarItem';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import type {Props} from '@theme/NavbarItem/DocSidebarNavbarItem';

const mobileProductSections = [
  {label: '新手指南', to: '/docs/getting-started'},
  {label: '更新动态', to: '/docs/release-notes'},
  {label: '帮助文档', to: '/docs/product-guides/qingflow-introduction'},
  {
    label: '解决方案',
    to: '/docs/solutions/inventory-management',
  },
  {
    label: '搭建技巧',
    to: '/docs/building-guides/inventory-outbound-validation',
  },
  {label: '常见问题（FAQ）', to: '/docs/faq'},
  {label: '视频中心', to: '/docs/video-guides'},
  {label: '联系我们', to: '/docs/contact'},
];

export default function DocSidebarNavbarItem({
  sidebarId,
  label,
  docsPluginId,
  mobile,
  ...props
}: Props): ReactNode {
  const {activeDoc} = useActiveDocContext(docsPluginId);
  const sidebarLink = useLayoutDocsSidebar(sidebarId, docsPluginId).link;

  if (!sidebarLink) {
    throw new Error(
      `DocSidebarNavbarItem: Sidebar with ID "${sidebarId}" doesn't have anything to be linked to.`,
    );
  }

  if (mobile) {
    return (
      <DropdownNavbarItem
        {...props}
        mobile
        label={label ?? sidebarLink.label}
        items={mobileProductSections}
      />
    );
  }

  return (
    <DefaultNavbarItem
      exact
      {...props}
      isActive={() => activeDoc?.sidebar === sidebarId}
      label={label ?? sidebarLink.label}
      to={sidebarLink.path}
    />
  );
}
