import React, {type ReactNode} from 'react';
import {
  useActiveDocContext,
  useLayoutDocsSidebar,
} from '@docusaurus/plugin-content-docs/client';
import DefaultNavbarItem from '@theme/NavbarItem/DefaultNavbarItem';
import DropdownNavbarItem from '@theme/NavbarItem/DropdownNavbarItem';
import type {Props} from '@theme/NavbarItem/DocSidebarNavbarItem';

const mobileProductSections = [
  {label: '新手指南', to: '/docs/新手指南'},
  {label: '更新动态', to: '/docs/更新动态/更新日志'},
  {label: '帮助文档', to: '/docs/帮助文档/轻流简介'},
  {
    label: '解决方案',
    to: '/docs/解决方案/按场景分类/进销存-仓库/进销存方案介绍',
  },
  {
    label: '搭建技巧',
    to: '/docs/搭建技巧/按场景分类/进销存-仓库/如何在出库时进行出库数量的安全校验',
  },
  {label: '常见问题（FAQ）', to: '/docs/常见问题-faq/一句话qa'},
  {label: '视频中心', to: '/docs/视频中心'},
  {label: '联系我们', to: '/docs/联系我们'},
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
