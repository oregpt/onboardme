import React, { useState, useRef, useEffect } from 'react';

interface SortableItem {
  id: string | number;
  [key: string]: any;
}

interface SortableProps<T extends SortableItem> {
  items: T[];
  onReorder: (items: T[]) => void;
  children: (item: T, index: number, dragHandleProps: any) => React.ReactNode;
  className?: string;
}

export function Sortable<T extends SortableItem>({ 
  items, 
  onReorder, 
  children, 
  className = "" 
}: SortableProps<T>) {
  const [draggedItem, setDraggedItem] = useState<T | null>(null);
  const [draggedOverIndex, setDraggedOverIndex] = useState<number | null>(null);
  const dragStartY = useRef<number>(0);
  const draggedIndex = useRef<number>(-1);

  const handleDragStart = (e: React.DragEvent, item: T, index: number) => {
    setDraggedItem(item);
    draggedIndex.current = index;
    dragStartY.current = e.clientY;
    
    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedItem && index !== draggedIndex.current) {
      setDraggedOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (!draggedItem || dropIndex === draggedIndex.current) {
      setDraggedItem(null);
      setDraggedOverIndex(null);
      return;
    }

    const newItems = [...items];
    const draggedItemFromArray = newItems[draggedIndex.current];
    
    // Remove dragged item
    newItems.splice(draggedIndex.current, 1);
    
    // Insert at new position
    newItems.splice(dropIndex, 0, draggedItemFromArray);
    
    onReorder(newItems);
    setDraggedItem(null);
    setDraggedOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverIndex(null);
  };

  const getDragHandleProps = (item: T, index: number) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => handleDragStart(e, item, index),
    onDragEnd: handleDragEnd,
  });

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          key={item.id}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          className={`
            ${draggedItem?.id === item.id ? 'opacity-50' : ''}
            ${draggedOverIndex === index ? 'border-t-2 border-primary' : ''}
          `}
        >
          {children(item, index, getDragHandleProps(item, index))}
        </div>
      ))}
    </div>
  );
}
