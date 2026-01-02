import React from 'react';
import { ChevronRight, ChevronDown, Edit3, Trash2, Check, X } from 'lucide-react';

/**
 * Header riutilizzabile per gli elementi della libreria
 * Gestisce: expand/collapse, editing, delete
 */
export function LibraryItemHeader({
  icon: Icon,
  iconColor,
  name,
  count,
  isExpanded,
  onToggle,
  isEditing,
  editingName,
  onEditingNameChange,
  onSaveEdit,
  onCancelEdit,
  onStartEdit,
  onDelete,
  inputBgColor = 'bg-gray-800/50',
  inputBorderColor = 'border-gray-500',
  inputTextColor = 'text-white',
}) {
  if (isEditing) {
    return (
      <div className="flex-1 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <input
          type="text"
          value={editingName}
          onChange={(e) => onEditingNameChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSaveEdit();
            if (e.key === 'Escape') onCancelEdit();
          }}
          className={`flex-1 ${inputBgColor} ${inputTextColor} text-sm px-2 py-1 rounded border ${inputBorderColor} outline-none`}
          autoFocus
        />
        <button onClick={onSaveEdit} className="p-1 text-green-400 active:text-green-300">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={onCancelEdit} className="p-1 text-gray-400 active:text-gray-300">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={onToggle}
        className="flex-1 flex items-center gap-2"
      >
        {isExpanded ? (
          <ChevronDown className={`w-4 h-4 ${iconColor}`} />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <span className={`${inputTextColor} text-sm font-medium`}>{name}</span>
        {count !== undefined && (
          <span className={`${iconColor}/60 text-xs`}>({count} take)</span>
        )}
      </button>
      <button
        onClick={onStartEdit}
        className={`p-3 ${iconColor} active:opacity-70`}
      >
        <Edit3 className="w-4 h-4" />
      </button>
      <button
        onClick={onDelete}
        className="p-3 text-red-400 active:text-red-300"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </>
  );
}

export default LibraryItemHeader;
