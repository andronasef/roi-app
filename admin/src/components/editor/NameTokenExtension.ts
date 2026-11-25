import { Node, mergeAttributes, nodePasteRule } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { NAME_TOKEN } from '@roi/shared';
import { NameChipView } from './NameChipView';

export const NameTokenNode = Node.create({
  name: 'nameToken',
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,
  selectable: true,

  parseHTML() {
    return [{ tag: 'span[data-name-token="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-name-token': 'true' }, HTMLAttributes), 'الاسم'];
  },

  renderText() {
    return NAME_TOKEN;
  },

  addNodeView() {
    return ReactNodeViewRenderer(NameChipView);
  },

  addPasteRules() {
    return [nodePasteRule({ find: /\{الاسم\}/g, type: this.type })];
  },
});
