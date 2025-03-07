import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

export const ConfirmDialog = ({ visible, onHide, onConfirm, message }) => {
  return (
    <Dialog
      header="Confirmación"
      visible={visible}
      style={{ width: "350px" }}
      onHide={onHide}
      breakpoints={{ "960px": "75vw", "640px": "90vw" }}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            label="No"
            icon="pi pi-times"
            className="p-button-rounded p-button-text p-button-sm p-button-white-gradient-border"
            onClick={onHide}
          />
          <Button
            label="Sí"
            icon="pi pi-check"
            className="p-button-rounded p-button-text p-button-sm p-button-white-gradient-border"
            onClick={onConfirm}
          />
        </div>
      }
    >
      <p className="m-0">{message || "¿Estás seguro que deseas realizar esta acción?"}</p>
    </Dialog>
  );
};
