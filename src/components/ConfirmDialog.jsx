import React from "react";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

export const ConfirmDialog = ({ visible, onHide, onConfirm, message }) => {
  return (
    <Dialog
      header={
        <div className="flex items-center gap-2">
          <i className="pi pi-exclamation-triangle text-amber-400 text-xl"></i>
          <span>Confirmación</span>
        </div>
      }
      visible={visible}
      style={{ width: "400px" }}
      onHide={onHide}
      breakpoints={{ "960px": "75vw", "640px": "90vw" }}
      footer={
        <div className="flex justify-end gap-2">
          <Button
            label="Cancelar"
            icon="pi pi-times"
            className="p-button-outlined p-button-sm"
            severity="secondary"
            onClick={onHide}
          />
          <Button
            label="Eliminar"
            icon="pi pi-trash"
            className="p-button-sm"
            severity="danger"
            onClick={onConfirm}
          />
        </div>
      }
    >
      <p className="m-0 text-[#cbd5e1] leading-relaxed">
        {message || "¿Estás seguro que deseas realizar esta acción?"}
      </p>
    </Dialog>
  );
};