import Image from '@tiptap/extension-image';

/**
 * Image redimensionnable : node view vanilla avec poignée de redimensionnement
 * (drag horizontal). La largeur est persistée dans l'attribut `width` du node.
 */
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute('width'),
        renderHTML: (attributes) =>
          attributes.width ? { width: attributes.width } : {},
      },
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let currentNode = node;

      const wrapper = document.createElement('div');
      wrapper.className = 'note-image';
      wrapper.setAttribute('data-drag-handle', '');

      const img = document.createElement('img');
      img.src = currentNode.attrs.src;
      if (currentNode.attrs.alt) img.alt = currentNode.attrs.alt;
      if (currentNode.attrs.width) img.style.width = `${currentNode.attrs.width}px`;

      const handle = document.createElement('span');
      handle.className = 'note-image-handle';
      handle.contentEditable = 'false';

      wrapper.append(img, handle);

      let dragging = false;
      let startX = 0;
      let startWidth = 0;

      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        const width = Math.max(60, Math.round(startWidth + (event.clientX - startX)));
        img.style.width = `${width}px`;
      };

      const stopDrag = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
      };

      const onPointerUp = () => {
        if (!dragging) return;
        dragging = false;
        stopDrag();
        const width = Math.round(img.getBoundingClientRect().width);
        if (typeof getPos === 'function') {
          const pos = getPos();
          if (typeof pos === 'number') {
            editor
              .chain()
              .command(({ tr }) => {
                tr.setNodeMarkup(pos, undefined, {
                  ...currentNode.attrs,
                  width,
                });
                return true;
              })
              .run();
          }
        }
      };

      handle.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dragging = true;
        startX = event.clientX;
        startWidth = img.getBoundingClientRect().width;
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== currentNode.type.name) return false;
          currentNode = updatedNode;
          if (img.src !== updatedNode.attrs.src) img.src = updatedNode.attrs.src;
          img.style.width = updatedNode.attrs.width
            ? `${updatedNode.attrs.width}px`
            : '';
          return true;
        },
        destroy: stopDrag,
      };
    };
  },
});
