import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';

export default forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command({ id: item.id, label: item.label });
    }
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }
      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }
      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }
      return false;
    },
  }));

  return (
    <div className="bg-white border-2 border-black rounded-lg shadow-[4px_4px_0px_#000] overflow-hidden flex flex-col min-w-[200px]">
      {props.items.length ? (
        props.items.map((item: any, index: number) => (
          <button
            className={`text-left px-4 py-2 font-bold text-[13px] border-b-2 border-black last:border-b-0 ${
              index === selectedIndex ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'
            }`}
            key={index}
            onClick={() => selectItem(index)}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {item.type === 'note' ? 'edit_document' : 'picture_as_pdf'}
              </span>
              <span className="truncate">{item.label}</span>
            </div>
          </button>
        ))
      ) : (
        <div className="px-4 py-2 font-semibold text-[13px] text-gray-500">No results</div>
      )}
    </div>
  );
});
