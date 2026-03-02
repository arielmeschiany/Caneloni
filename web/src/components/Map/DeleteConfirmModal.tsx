'use client';

interface DeleteConfirmModalProps {
  locationName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ locationName, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-brown/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-tuscany-lg w-full max-w-sm mx-4 overflow-hidden animate-slide-up">
        <div className="px-6 py-5">
          <h3 className="text-lg font-serif font-bold text-brown mb-1">Delete Location?</h3>
          <p className="text-sm text-brown/70 mb-1">
            <span className="font-medium">"{locationName}"</span> will be permanently deleted.
          </p>
          <p className="text-sm text-red-600/80">
            This will also remove all reviews. This cannot be undone.
          </p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-brown/20 text-brown text-sm font-medium hover:bg-cream transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
