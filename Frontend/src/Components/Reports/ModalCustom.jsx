<div
  className="custom-modal-overlay"
  onClick={onClose}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
>
  <div className="custom-modal-content" onClick={(e) => e.stopPropagation()}>
    <div className="custom-modal-header">
      <h5 className="custom-modal-title" id="modal-title">
        {title}
      </h5>
      <Button
        variant="cancel"
        size="sm"
        onClick={onClose}
        aria-label="Close modal"
      >
        Close
      </Button>
    </div>
    <div className="custom-modal-body">{children}</div>
  </div>
</div>;
