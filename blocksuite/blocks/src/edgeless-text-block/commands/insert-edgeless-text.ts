import { focusTextModel } from '@blocksuite/affine-components/rich-text';
import type { Command } from '@blocksuite/block-std';
import { Bound } from '@blocksuite/global/utils';

import { EdgelessRootService } from '../../root-block/edgeless/edgeless-root-service.js';
import { getSurfaceBlock } from '../../surface-ref-block/utils.js';
import {
  EDGELESS_TEXT_BLOCK_MIN_HEIGHT,
  EDGELESS_TEXT_BLOCK_MIN_WIDTH,
  EdgelessTextBlockComponent,
} from '../edgeless-text-block.js';

export const insertEdgelessTextCommand: Command<
  never,
  'textId',
  {
    x: number;
    y: number;
  }
> = (ctx, next) => {
  const { std, x, y } = ctx;
  const host = std.host;
  const doc = host.doc;
  const edgelessService = std.getService('affine:page');
  const surface = getSurfaceBlock(doc);
  if (!(edgelessService instanceof EdgelessRootService) || !surface) {
    next();
    return;
  }

  const zoom = edgelessService.zoom;
  const textId = edgelessService.addBlock(
    'affine:edgeless-text',
    {
      xywh: new Bound(
        x - (EDGELESS_TEXT_BLOCK_MIN_WIDTH * zoom) / 2,
        y - (EDGELESS_TEXT_BLOCK_MIN_HEIGHT * zoom) / 2,
        EDGELESS_TEXT_BLOCK_MIN_WIDTH * zoom,
        EDGELESS_TEXT_BLOCK_MIN_HEIGHT * zoom
      ).serialize(),
    },
    surface.id
  );

  const blockId = doc.addBlock('affine:paragraph', { type: 'text' }, textId);
  host.updateComplete
    .then(() => {
      edgelessService.selection.set({
        elements: [textId],
        editing: true,
      });
      const disposable = edgelessService.selection.slots.updated.on(() => {
        const editing = edgelessService.selection.editing;
        const id = edgelessService.selection.selectedIds[0];
        if (!editing || id !== textId) {
          const textBlock = host.view.getBlock(textId);
          if (textBlock instanceof EdgelessTextBlockComponent) {
            textBlock.model.hasMaxWidth = true;
          }

          disposable.dispose();
        }
      });

      focusTextModel(std, blockId);
      host.updateComplete
        .then(() => {
          const edgelessText = host.view.getBlock(textId);
          const paragraph = host.view.getBlock(blockId);
          if (!edgelessText || !paragraph) return;

          const abortController = new AbortController();
          edgelessText.addEventListener(
            'focusout',
            e => {
              if (edgelessText.model.children.length > 1) return;
              if (
                !paragraph.model.text ||
                (paragraph.model.text.length === 0 && e.relatedTarget !== null)
              ) {
                doc.deleteBlock(edgelessText.model);
              }
            },
            {
              once: true,
              signal: abortController.signal,
            }
          );
          paragraph.model.deleted.once(() => {
            abortController.abort();
          });
          edgelessText.addEventListener(
            'beforeinput',
            () => {
              abortController.abort();
            },
            {
              once: true,
            }
          );
        })
        .catch(console.error);
    })
    .catch(console.error);

  next({ textId });
};
