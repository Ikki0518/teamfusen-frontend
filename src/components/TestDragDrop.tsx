import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';

const TestDragDrop: React.FC = () => {
  const [items, setItems] = useState([
    { id: '1', content: 'アイテム1' },
    { id: '2', content: 'アイテム2' },
    { id: '3', content: 'アイテム3' },
  ]);

  const handleDragEnd = (result: DropResult) => {
    console.log('ドラッグ終了:', result);
    
    if (!result.destination) {
      console.log('ドロップ先がありません');
      return;
    }

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
    console.log('新しい順序:', newItems);
  };

  return (
    <div className="p-4 border border-gray-300 rounded-lg">
      <h3 className="text-lg font-bold mb-4">ドラッグ&ドロップテスト</h3>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="test-list">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`p-4 rounded ${
                snapshot.isDraggingOver ? 'bg-blue-100' : 'bg-gray-50'
              }`}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`p-3 mb-2 bg-white border rounded shadow ${
                        snapshot.isDragging ? 'opacity-50' : ''
                      }`}
                    >
                      {item.content}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default TestDragDrop;