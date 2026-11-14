-- Run once on existing databases before deploying the Referenced Order field.
ALTER TABLE orders
  ADD COLUMN referencedOrderId INT UNSIGNED NULL AFTER reprint,
  ADD KEY idx_referencedOrderId (referencedOrderId),
  ADD CONSTRAINT fk_orders_referencedOrderId
    FOREIGN KEY (referencedOrderId) REFERENCES orders (orderId)
    ON DELETE RESTRICT ON UPDATE CASCADE;
